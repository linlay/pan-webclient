package transfer

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"pan-webclient/apps/api/internal/fsops"
	"pan-webclient/apps/api/internal/indexer"
)

type Task struct {
	ID          string `json:"id"`
	Kind        string `json:"kind"`
	Status      string `json:"status"`
	Detail      string `json:"detail"`
	DownloadURL string `json:"downloadUrl,omitempty"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
}

type Manager struct {
	store *indexer.Store
	mu    sync.RWMutex
	cache map[string]Task
}

func NewManager(store *indexer.Store) *Manager {
	return &Manager{
		store: store,
		cache: map[string]Task{},
	}
}

func (m *Manager) Put(task Task, artifactPath string) error {
	m.mu.Lock()
	m.cache[task.ID] = task
	m.mu.Unlock()
	return m.store.UpsertTask(indexer.TaskRecord{
		ID:          task.ID,
		Kind:        task.Kind,
		Status:      task.Status,
		Detail:      task.Detail,
		DownloadURL: task.DownloadURL,
		Artifact:    artifactPath,
		CreatedAt:   task.CreatedAt,
		UpdatedAt:   task.UpdatedAt,
	})
}

func (m *Manager) Get(id string) (Task, string, error) {
	m.mu.RLock()
	task, ok := m.cache[id]
	m.mu.RUnlock()
	if ok {
		record, err := m.store.GetTask(id)
		if err == nil {
			return task, record.Artifact, nil
		}
		return task, "", nil
	}
	record, err := m.store.GetTask(id)
	if err != nil {
		return Task{}, "", err
	}
	task = Task{
		ID:          record.ID,
		Kind:        record.Kind,
		Status:      record.Status,
		Detail:      record.Detail,
		DownloadURL: record.DownloadURL,
		CreatedAt:   record.CreatedAt,
		UpdatedAt:   record.UpdatedAt,
	}
	return task, record.Artifact, nil
}

func NewTask(kind, detail string) Task {
	now := time.Now().Unix()
	return Task{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Kind:      kind,
		Status:    "pending",
		Detail:    detail,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func (m *Manager) StartZipTask(resolver *fsops.MountResolver, mountID string, items []string, archiveName string) (Task, error) {
	task := NewTask("download", "Preparing archive")
	if err := m.Put(task, ""); err != nil {
		return Task{}, err
	}
	go func() {
		task.Status = "running"
		task.Detail = "Building ZIP archive"
		task.UpdatedAt = time.Now().Unix()
		_ = m.Put(task, "")

		tasksDir := m.store.TasksDir()
		_ = os.MkdirAll(tasksDir, 0o755)
		filename := sanitizeArchiveName(archiveName)
		artifactPath := filepath.Join(tasksDir, task.ID+"-"+filename)
		if err := buildZip(resolver, mountID, items, artifactPath); err != nil {
			task.Status = "failed"
			task.Detail = err.Error()
			task.UpdatedAt = time.Now().Unix()
			_ = m.Put(task, artifactPath)
			return
		}
		task.Status = "success"
		task.Detail = "Archive ready"
		task.DownloadURL = "/api/tasks/" + task.ID + "/download"
		task.UpdatedAt = time.Now().Unix()
		_ = m.Put(task, artifactPath)
	}()
	return task, nil
}

func buildZip(resolver *fsops.MountResolver, mountID string, items []string, artifactPath string) error {
	dst, err := os.Create(artifactPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	zw := zip.NewWriter(dst)
	defer zw.Close()

	for _, item := range items {
		_, abs, _, err := resolver.Resolve(mountID, item)
		if err != nil {
			return err
		}
		info, err := os.Stat(abs)
		if err != nil {
			return err
		}
		if info.IsDir() {
			if err := filepath.Walk(abs, func(path string, info os.FileInfo, err error) error {
				if err != nil || info.IsDir() {
					return err
				}
				rel, err := filepath.Rel(filepath.Dir(abs), path)
				if err != nil {
					return err
				}
				return addFileToZip(zw, path, rel)
			}); err != nil {
				return err
			}
			continue
		}
		if err := addFileToZip(zw, abs, filepath.Base(abs)); err != nil {
			return err
		}
	}
	return nil
}

func addFileToZip(zw *zip.Writer, absPath, archivePath string) error {
	file, err := os.Open(absPath)
	if err != nil {
		return err
	}
	defer file.Close()

	writer, err := zw.Create(filepath.ToSlash(archivePath))
	if err != nil {
		return err
	}
	_, err = io.Copy(writer, file)
	return err
}

func sanitizeArchiveName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "bundle.zip"
	}
	name = filepath.Base(name)
	if !strings.HasSuffix(strings.ToLower(name), ".zip") {
		name += ".zip"
	}
	return name
}
