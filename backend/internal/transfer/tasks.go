package transfer

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"pan-webclient/backend/internal/fsops"
	"pan-webclient/backend/internal/indexer"
)

type TaskItem = indexer.TaskItem

type Task struct {
	ID             string     `json:"id"`
	Kind           string     `json:"kind"`
	Status         string     `json:"status"`
	Detail         string     `json:"detail"`
	Items          []TaskItem `json:"items,omitempty"`
	TotalBytes     int64      `json:"totalBytes,omitempty"`
	CompletedBytes int64      `json:"completedBytes,omitempty"`
	DownloadURL    string     `json:"downloadUrl,omitempty"`
	CreatedAt      int64      `json:"createdAt"`
	UpdatedAt      int64      `json:"updatedAt"`
}

type Manager struct {
	store *indexer.Store
	ctx   context.Context
}

func NewManager(ctx context.Context, store *indexer.Store) *Manager {
	if ctx == nil {
		ctx = context.Background()
	}
	return &Manager{store: store, ctx: ctx}
}

func (m *Manager) Put(task Task, artifactPath string) error {
	return m.store.PutTask(indexer.TaskRecord{
		ID:             task.ID,
		Kind:           task.Kind,
		Status:         task.Status,
		Detail:         task.Detail,
		Items:          task.Items,
		TotalBytes:     task.TotalBytes,
		CompletedBytes: task.CompletedBytes,
		DownloadURL:    task.DownloadURL,
		Artifact:       artifactPath,
		CreatedAt:      task.CreatedAt,
		UpdatedAt:      task.UpdatedAt,
	})
}

func (m *Manager) Get(id string) (Task, string, error) {
	record, err := m.store.GetTask(id)
	if err != nil {
		return Task{}, "", err
	}
	task := Task{
		ID:             record.ID,
		Kind:           record.Kind,
		Status:         record.Status,
		Detail:         record.Detail,
		Items:          record.Items,
		TotalBytes:     record.TotalBytes,
		CompletedBytes: record.CompletedBytes,
		DownloadURL:    record.DownloadURL,
		CreatedAt:      record.CreatedAt,
		UpdatedAt:      record.UpdatedAt,
	}
	return task, record.Artifact, nil
}

func (m *Manager) List(limit int) ([]Task, error) {
	records, err := m.store.ListTasks(limit)
	if err != nil {
		return nil, err
	}
	items := make([]Task, 0, len(records))
	for _, record := range records {
		items = append(items, Task{
			ID:             record.ID,
			Kind:           record.Kind,
			Status:         record.Status,
			Detail:         record.Detail,
			Items:          record.Items,
			TotalBytes:     record.TotalBytes,
			CompletedBytes: record.CompletedBytes,
			DownloadURL:    record.DownloadURL,
			CreatedAt:      record.CreatedAt,
			UpdatedAt:      record.UpdatedAt,
		})
	}
	return items, nil
}

func (m *Manager) Delete(id string) error {
	task, artifact, err := m.Get(id)
	if err != nil {
		return err
	}
	if task.Status == "pending" || task.Status == "running" {
		return fmt.Errorf("task is still active")
	}
	if artifact != "" {
		if err := os.Remove(artifact); err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	return m.store.DeleteTask(id)
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
	taskItems, totalBytes, err := collectZipTaskItems(resolver, mountID, items)
	if err != nil {
		return Task{}, err
	}
	task := NewTask("download", "Preparing archive")
	task.Items = taskItems
	task.TotalBytes = totalBytes
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
			filename := SanitizeArchiveName(archiveName, "bundle.zip")
			artifactPath := filepath.Join(tasksDir, task.ID+"-"+filename)
		lastPersist := time.Now()
		persistProgress := func(force bool) {
			if !force && time.Since(lastPersist) < 250*time.Millisecond {
				return
			}
			task.UpdatedAt = time.Now().Unix()
			_ = m.Put(task, artifactPath)
			lastPersist = time.Now()
		}
			if err := buildZip(m.ctx, resolver, mountID, items, artifactPath, func(delta int64) {
				task.CompletedBytes += delta
				persistProgress(false)
			}); err != nil {
			task.Status = "failed"
			task.Detail = err.Error()
			task.UpdatedAt = time.Now().Unix()
			_ = m.Put(task, artifactPath)
			return
		}
		task.Status = "success"
		task.Detail = "Archive ready"
		task.CompletedBytes = task.TotalBytes
		task.DownloadURL = "/api/tasks/" + task.ID + "/download"
		task.UpdatedAt = time.Now().Unix()
		_ = m.Put(task, artifactPath)
	}()
	return task, nil
}

func StreamZipArchive(ctx context.Context, dst io.Writer, resolver *fsops.MountResolver, mountID string, items []string) error {
	return writeZipArchive(ctx, dst, resolver, mountID, items, nil)
}

func buildZip(ctx context.Context, resolver *fsops.MountResolver, mountID string, items []string, artifactPath string, onProgress func(int64)) error {
	dst, err := os.Create(artifactPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	return writeZipArchive(ctx, dst, resolver, mountID, items, onProgress)
}

func writeZipArchive(ctx context.Context, dst io.Writer, resolver *fsops.MountResolver, mountID string, items []string, onProgress func(int64)) error {
	if ctx == nil {
		ctx = context.Background()
	}
	zw := zip.NewWriter(dst)
	defer zw.Close()

	for _, item := range items {
		if err := ctx.Err(); err != nil {
			return err
		}
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
				if err := ctx.Err(); err != nil {
					return err
				}
				if err != nil || info.IsDir() {
					return err
				}
				rel, err := filepath.Rel(filepath.Dir(abs), path)
				if err != nil {
					return err
				}
				return addFileToZip(zw, path, rel, onProgress)
			}); err != nil {
				return err
			}
			continue
		}
		if err := addFileToZip(zw, abs, filepath.Base(abs), onProgress); err != nil {
			return err
		}
	}
	return nil
}

func addFileToZip(zw *zip.Writer, absPath, archivePath string, onProgress func(int64)) error {
	file, err := os.Open(absPath)
	if err != nil {
		return err
	}
	defer file.Close()

	writer, err := zw.Create(filepath.ToSlash(archivePath))
	if err != nil {
		return err
	}
	dst := io.Writer(writer)
	if onProgress != nil {
		dst = &progressWriter{writer: writer, onProgress: onProgress}
	}
	_, err = io.Copy(dst, file)
	return err
}

type progressWriter struct {
	writer     io.Writer
	onProgress func(int64)
}

func (w *progressWriter) Write(p []byte) (int, error) {
	n, err := w.writer.Write(p)
	if n > 0 && w.onProgress != nil {
		w.onProgress(int64(n))
	}
	return n, err
}

func collectZipTaskItems(resolver *fsops.MountResolver, mountID string, items []string) ([]TaskItem, int64, error) {
	taskItems := make([]TaskItem, 0, len(items))
	var totalBytes int64
	for _, item := range items {
		_, abs, clean, err := resolver.Resolve(mountID, item)
		if err != nil {
			return nil, 0, err
		}
		info, err := os.Stat(abs)
		if err != nil {
			return nil, 0, err
		}
		size := info.Size()
		if info.IsDir() {
			size, err = directoryFileBytes(abs)
			if err != nil {
				return nil, 0, err
			}
		}
		taskItems = append(taskItems, TaskItem{
			Name:  filepath.Base(abs),
			Path:  clean,
			Size:  size,
			IsDir: info.IsDir(),
		})
		totalBytes += size
	}
	return taskItems, totalBytes, nil
}

func directoryFileBytes(root string) (int64, error) {
	var total int64
	err := filepath.Walk(root, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if info.IsDir() {
			return nil
		}
		total += info.Size()
		return nil
	})
	return total, err
}

func SanitizeArchiveName(name, defaultName string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		name = defaultName
	}
	name = filepath.Base(name)
	if !strings.HasSuffix(strings.ToLower(name), ".zip") {
		name += ".zip"
	}
	return name
}
