package indexer

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"pan-webclient/apps/api/internal/fsops"
	"pan-webclient/apps/api/internal/trash"
)

type SearchHit struct {
	MountID string `json:"mountId"`
	Path    string `json:"path"`
	Name    string `json:"name"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime int64  `json:"modTime"`
	Mime    string `json:"mime"`
}

type TaskRecord struct {
	ID          string `json:"id"`
	Kind        string `json:"kind"`
	Status      string `json:"status"`
	Detail      string `json:"detail"`
	DownloadURL string `json:"downloadUrl"`
	Artifact    string `json:"artifactPath"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
}

type Store struct {
	dbPath string
	mu     sync.Mutex
}

func NewStore(dbPath string) *Store {
	return &Store{dbPath: dbPath}
}

func (s *Store) Init() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	schema := `
CREATE TABLE IF NOT EXISTS files (
  mount_id TEXT NOT NULL,
  rel_path TEXT NOT NULL,
  name TEXT NOT NULL,
  is_dir INTEGER NOT NULL,
  size INTEGER NOT NULL,
  mod_time INTEGER NOT NULL,
  mime TEXT NOT NULL,
  extension TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (mount_id, rel_path)
);
CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(rel_path);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT NOT NULL,
  download_url TEXT NOT NULL DEFAULT '',
  artifact_path TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS deleted_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mount_id TEXT NOT NULL,
  original_path TEXT NOT NULL,
  trash_path TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  is_dir INTEGER NOT NULL,
  size INTEGER NOT NULL
);`
	if err := s.exec(schema); err != nil {
		return err
	}
	return s.ensureFilesSchema()
}

func (s *Store) ReplaceMountSnapshot(mountID string, entries []fsops.Entry) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	builder := strings.Builder{}
	builder.WriteString("BEGIN;")
	builder.WriteString("DELETE FROM files WHERE mount_id = '")
	builder.WriteString(escape(mountID))
	builder.WriteString("';")
	for _, item := range entries {
		builder.WriteString("INSERT INTO files (mount_id, rel_path, name, is_dir, size, mod_time, mime, extension, hidden) VALUES ('")
		builder.WriteString(escape(item.MountID))
		builder.WriteString("','")
		builder.WriteString(escape(item.Path))
		builder.WriteString("','")
		builder.WriteString(escape(item.Name))
		builder.WriteString("',")
		builder.WriteString(boolInt(item.IsDir))
		builder.WriteString(",")
		builder.WriteString(strconv.FormatInt(item.Size, 10))
		builder.WriteString(",")
		builder.WriteString(strconv.FormatInt(item.ModTime, 10))
		builder.WriteString(",'")
		builder.WriteString(escape(item.Mime))
		builder.WriteString("','")
		builder.WriteString(escape(item.Extension))
		builder.WriteString("',")
		builder.WriteString(boolInt(item.Hidden))
		builder.WriteString(");")
	}
	builder.WriteString("COMMIT;")
	return s.exec(builder.String())
}

func (s *Store) Search(query string, limit int, showHidden bool) ([]SearchHit, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	pattern := "%" + escapeLike(query) + "%"
	hiddenFilter := " AND hidden = 0"
	if showHidden {
		hiddenFilter = ""
	}
	sql := fmt.Sprintf(
		"SELECT mount_id AS mountId, rel_path AS path, name, is_dir AS isDir, size, mod_time AS modTime, mime FROM files WHERE (name LIKE '%s' ESCAPE '\\' OR rel_path LIKE '%s' ESCAPE '\\')%s ORDER BY is_dir DESC, name ASC LIMIT %d;",
		pattern,
		pattern,
		hiddenFilter,
		limit,
	)
	output, err := s.queryJSON(sql)
	if err != nil {
		return nil, err
	}
	type searchRow struct {
		MountID string `json:"mountId"`
		Path    string `json:"path"`
		Name    string `json:"name"`
		IsDir   int    `json:"isDir"`
		Size    int64  `json:"size"`
		ModTime int64  `json:"modTime"`
		Mime    string `json:"mime"`
	}
	var rows []searchRow
	if len(output) == 0 {
		return []SearchHit{}, nil
	}
	if err := json.Unmarshal(output, &rows); err != nil {
		return nil, err
	}
	hits := make([]SearchHit, 0, len(rows))
	for _, row := range rows {
		hits = append(hits, SearchHit{
			MountID: row.MountID,
			Path:    row.Path,
			Name:    row.Name,
			IsDir:   row.IsDir == 1,
			Size:    row.Size,
			ModTime: row.ModTime,
			Mime:    row.Mime,
		})
	}
	return hits, nil
}

func (s *Store) ensureFilesSchema() error {
	type pragmaColumn struct {
		Name string `json:"name"`
	}

	output, err := s.queryJSON("PRAGMA table_info(files);")
	if err != nil {
		return err
	}
	var columns []pragmaColumn
	if err := json.Unmarshal(output, &columns); err != nil {
		return err
	}
	for _, column := range columns {
		if column.Name == "hidden" {
			return nil
		}
	}
	return s.exec("ALTER TABLE files ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;")
}

func (s *Store) UpsertTask(task TaskRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	sql := fmt.Sprintf(
		"INSERT INTO tasks (id, kind, status, detail, download_url, artifact_path, created_at, updated_at) VALUES ('%s','%s','%s','%s','%s','%s',%d,%d) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, status=excluded.status, detail=excluded.detail, download_url=excluded.download_url, artifact_path=excluded.artifact_path, updated_at=excluded.updated_at;",
		escape(task.ID), escape(task.Kind), escape(task.Status), escape(task.Detail), escape(task.DownloadURL), escape(task.Artifact), task.CreatedAt, task.UpdatedAt,
	)
	return s.exec(sql)
}

func (s *Store) GetTask(id string) (TaskRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	output, err := s.queryJSON(fmt.Sprintf("SELECT id, kind, status, detail, download_url AS downloadUrl, artifact_path AS artifactPath, created_at AS createdAt, updated_at AS updatedAt FROM tasks WHERE id = '%s' LIMIT 1;", escape(id)))
	if err != nil {
		return TaskRecord{}, err
	}
	var rows []TaskRecord
	if len(output) == 0 {
		return TaskRecord{}, fmt.Errorf("task not found")
	}
	if err := json.Unmarshal(output, &rows); err != nil {
		return TaskRecord{}, err
	}
	if len(rows) == 0 {
		return TaskRecord{}, fmt.Errorf("task not found")
	}
	return rows[0], nil
}

func (s *Store) RecordDelete(record trash.DeletedRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	sql := fmt.Sprintf(
		"INSERT INTO deleted_items (mount_id, original_path, trash_path, deleted_at, is_dir, size) VALUES ('%s','%s','%s',%d,%s,%d);",
		escape(record.MountID), escape(record.Original), escape(record.TrashPath), record.DeletedAt, boolInt(record.IsDir), record.Size,
	)
	return s.exec(sql)
}

func (s *Store) TasksDir() string {
	return filepath.Join(filepath.Dir(s.dbPath), "tasks")
}

func (s *Store) queryJSON(sql string) ([]byte, error) {
	cmd := exec.Command("sqlite3", "-json", s.dbPath, sql)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("sqlite query failed: %w: %s", err, strings.TrimSpace(string(output)))
	}
	trimmed := strings.TrimSpace(string(output))
	if trimmed == "" {
		return []byte("[]"), nil
	}
	return []byte(trimmed), nil
}

func (s *Store) exec(sql string) error {
	cmd := exec.Command("sqlite3", s.dbPath, sql)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("sqlite exec failed: %w: %s", err, strings.TrimSpace(string(output)))
	}
	return nil
}

func escape(v string) string {
	return strings.ReplaceAll(v, "'", "''")
}

func escapeLike(v string) string {
	v = strings.ReplaceAll(v, "\\", "\\\\")
	v = strings.ReplaceAll(v, "%", "\\%")
	v = strings.ReplaceAll(v, "_", "\\_")
	return escape(v)
}

func boolInt(v bool) string {
	if v {
		return "1"
	}
	return "0"
}

func SyncLoop(interval time.Duration, run func() error) func() {
	stop := make(chan struct{})
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				_ = run()
			case <-stop:
				return
			}
		}
	}()
	return func() { close(stop) }
}
