package indexer

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"pan-webclient/apps/api/internal/fsops"
	"pan-webclient/apps/api/internal/mounts"
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

type TrashRecord struct {
	ID           string `json:"id"`
	MountID      string `json:"mountId"`
	OriginalPath string `json:"originalPath"`
	TrashPath    string `json:"trashPath"`
	DeletedAt    int64  `json:"deletedAt"`
	IsDir        bool   `json:"isDir"`
	Size         int64  `json:"size"`
	Name         string `json:"name"`
}

type Store struct {
	dataDir          string
	taskMetaDir      string
	taskArtifactsDir string
	trashMetaDir     string
	trashItemsDir    string
	mu               sync.RWMutex
}

func NewStore(dataDir string) *Store {
	return &Store{
		dataDir:          dataDir,
		taskMetaDir:      filepath.Join(dataDir, "tasks", "meta"),
		taskArtifactsDir: filepath.Join(dataDir, "tasks", "artifacts"),
		trashMetaDir:     filepath.Join(dataDir, "trash", "meta"),
		trashItemsDir:    filepath.Join(dataDir, "trash", "items"),
	}
}

func (s *Store) Init() error {
	for _, dir := range []string{s.dataDir, s.taskMetaDir, s.taskArtifactsDir, s.trashMetaDir, s.trashItemsDir} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}
	return s.ReconcileTasks()
}

func (s *Store) PutTask(task TaskRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return writeJSONFile(filepath.Join(s.taskMetaDir, task.ID+".json"), task)
}

func (s *Store) GetTask(id string) (TaskRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var task TaskRecord
	if err := readJSONFile(filepath.Join(s.taskMetaDir, id+".json"), &task); err != nil {
		return TaskRecord{}, err
	}
	return task, nil
}

func (s *Store) ListTasks(limit int) ([]TaskRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items, err := readTaskRecords(s.taskMetaDir)
	if err != nil {
		return nil, err
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].UpdatedAt == items[j].UpdatedAt {
			return items[i].CreatedAt > items[j].CreatedAt
		}
		return items[i].UpdatedAt > items[j].UpdatedAt
	})
	if limit > 0 && len(items) > limit {
		items = items[:limit]
	}
	return items, nil
}

func (s *Store) ReconcileTasks() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	items, err := readTaskRecords(s.taskMetaDir)
	if err != nil {
		return err
	}
	for _, task := range items {
		changed := false
		if task.Status == "pending" || task.Status == "running" {
			task.Status = "failed"
			task.Detail = "服务重启导致任务中断"
			changed = true
		}
		if task.Status == "success" && task.Artifact != "" {
			if _, err := os.Stat(task.Artifact); err != nil {
				task.Status = "failed"
				task.Detail = "任务产物不存在"
				task.DownloadURL = ""
				changed = true
			}
		}
		if changed {
			if err := writeJSONFile(filepath.Join(s.taskMetaDir, task.ID+".json"), task); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Store) PutTrash(record TrashRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return writeJSONFile(filepath.Join(s.trashMetaDir, record.ID+".json"), record)
}

func (s *Store) GetTrash(id string) (TrashRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var record TrashRecord
	if err := readJSONFile(filepath.Join(s.trashMetaDir, id+".json"), &record); err != nil {
		return TrashRecord{}, err
	}
	return record, nil
}

func (s *Store) ListTrash(limit int) ([]TrashRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	entries, err := os.ReadDir(s.trashMetaDir)
	if err != nil {
		return nil, err
	}
	items := make([]TrashRecord, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		var item TrashRecord
		if err := readJSONFile(filepath.Join(s.trashMetaDir, entry.Name()), &item); err != nil {
			continue
		}
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].DeletedAt > items[j].DeletedAt
	})
	if limit > 0 && len(items) > limit {
		items = items[:limit]
	}
	return items, nil
}

func (s *Store) DeleteTrashRecord(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	err := os.Remove(filepath.Join(s.trashMetaDir, id+".json"))
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

func (s *Store) TasksDir() string {
	return s.taskArtifactsDir
}

func (s *Store) TrashItemsDir() string {
	return s.trashItemsDir
}

func SearchMounts(items []mounts.Mount, query string, limit int, showHidden bool) ([]SearchHit, error) {
	needle := strings.ToLower(strings.TrimSpace(query))
	if needle == "" {
		return []SearchHit{}, nil
	}

	hits := make([]SearchHit, 0, min(limit, 32))
	for _, mount := range items {
		err := filepath.WalkDir(mount.Path, func(path string, d fs.DirEntry, walkErr error) error {
			if walkErr != nil {
				return nil
			}
			if path == mount.Path {
				return nil
			}

			name := d.Name()
			rel, err := filepath.Rel(mount.Path, path)
			if err != nil {
				return nil
			}
			relPath := cleanRelPath(rel)
			hidden := isHiddenRelPath(relPath)
			if hidden && !showHidden {
				if d.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}

			info, err := d.Info()
			if err != nil || info.Mode()&os.ModeSymlink != 0 {
				return nil
			}
			if !strings.Contains(strings.ToLower(name), needle) && !strings.Contains(strings.ToLower(relPath), needle) {
				return nil
			}

			hits = append(hits, SearchHit{
				MountID: mount.ID,
				Path:    relPath,
				Name:    name,
				IsDir:   info.IsDir(),
				Size:    info.Size(),
				ModTime: info.ModTime().Unix(),
				Mime:    mimeTypeForInfo(name, info),
			})
			if limit > 0 && len(hits) >= limit {
				return fs.SkipAll
			}
			return nil
		})
		if err != nil && err != fs.SkipAll {
			return nil, err
		}
		if limit > 0 && len(hits) >= limit {
			break
		}
	}

	sort.Slice(hits, func(i, j int) bool {
		if hits[i].IsDir != hits[j].IsDir {
			return hits[i].IsDir
		}
		if hits[i].Name == hits[j].Name {
			return hits[i].Path < hits[j].Path
		}
		return strings.ToLower(hits[i].Name) < strings.ToLower(hits[j].Name)
	})
	if limit > 0 && len(hits) > limit {
		hits = hits[:limit]
	}
	return hits, nil
}

func readTaskRecords(dir string) ([]TaskRecord, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	items := make([]TaskRecord, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		var item TaskRecord
		if err := readJSONFile(filepath.Join(dir, entry.Name()), &item); err != nil {
			continue
		}
		items = append(items, item)
	}
	return items, nil
}

func writeJSONFile(path string, payload any) error {
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(data, '\n'), 0o644)
}

func readJSONFile(path string, dst any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(data, dst); err != nil {
		return fmt.Errorf("decode %s: %w", path, err)
	}
	return nil
}

func cleanRelPath(path string) string {
	if path == "" || path == "." {
		return "/"
	}
	clean := filepath.ToSlash(filepath.Clean("/" + path))
	if clean == "." {
		return "/"
	}
	return clean
}

func isHiddenRelPath(path string) bool {
	for _, part := range strings.Split(path, "/") {
		if strings.HasPrefix(part, ".") && part != "." && part != ".." {
			return true
		}
	}
	return false
}

func mimeTypeForInfo(name string, info os.FileInfo) string {
	entry := fsops.Entry{Name: name, IsDir: info.IsDir()}
	if entry.IsDir {
		return "inode/directory"
	}
	return fsops.DetectMime(name, nil)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
