package transfer

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"pan-webclient/backend/internal/fsops"
	"pan-webclient/backend/internal/indexer"
	"pan-webclient/backend/internal/mounts"
)

func TestSanitizeArchiveName(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		defaultName string
		want        string
	}{
		{name: "default", input: "", defaultName: "bundle.zip", want: "bundle.zip"},
		{name: "append zip", input: "report", defaultName: "bundle.zip", want: "report.zip"},
		{name: "base only", input: "../nested/share", defaultName: "share.zip", want: "share.zip"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := SanitizeArchiveName(tc.input, tc.defaultName); got != tc.want {
				t.Fatalf("SanitizeArchiveName(%q, %q) = %q, want %q", tc.input, tc.defaultName, got, tc.want)
			}
		})
	}
}

func TestStreamZipArchiveHonorsCanceledContext(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "hello.txt"), []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	var buf bytes.Buffer
	err := StreamZipArchive(ctx, &buf, fsops.NewMountResolver([]mounts.Mount{{ID: "root", Name: "Root", Path: root}}), "root", []string{"/hello.txt"})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("StreamZipArchive() error = %v, want context canceled", err)
	}
}

func TestStartZipTaskMarksFailureWhenManagerContextCanceled(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "hello.txt"), []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}

	store := indexer.NewStore(t.TempDir())
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	manager := NewManager(ctx, store)
	cancel()

	task, err := manager.StartZipTask(fsops.NewMountResolver([]mounts.Mount{{ID: "root", Name: "Root", Path: root}}), "root", []string{"/hello.txt"}, "")
	if err != nil {
		t.Fatalf("StartZipTask() error = %v", err)
	}

	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		record, err := store.GetTask(task.ID)
		if err != nil {
			t.Fatal(err)
		}
		if record.Status == "failed" {
			if record.Detail != context.Canceled.Error() {
				t.Fatalf("task detail = %q, want %q", record.Detail, context.Canceled.Error())
			}
			return
		}
		time.Sleep(20 * time.Millisecond)
	}

	record, err := store.GetTask(task.ID)
	if err != nil {
		t.Fatal(err)
	}
	t.Fatalf("task status = %q, want failed", record.Status)
}

func TestStreamZipArchiveProducesZip(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "hello.txt"), []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}

	var buf bytes.Buffer
	err := StreamZipArchive(context.Background(), &buf, fsops.NewMountResolver([]mounts.Mount{{ID: "root", Name: "Root", Path: root}}), "root", []string{"/hello.txt"})
	if err != nil {
		t.Fatalf("StreamZipArchive() error = %v", err)
	}

	reader, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	if err != nil {
		t.Fatal(err)
	}
	if len(reader.File) != 1 || reader.File[0].Name != "hello.txt" {
		t.Fatalf("unexpected zip contents: %+v", reader.File)
	}
}
