package fsops

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"

	"pan-webclient/backend/internal/mounts"
)

func TestListDirectoryAndTreeRespectShowHidden(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "visible.txt"))
	mustWriteFile(t, filepath.Join(root, ".hidden.txt"))
	mustWriteFile(t, filepath.Join(root, ".secret", "note.txt"))

	resolver := NewMountResolver([]mounts.Mount{{ID: "root", Name: "Root", Path: root}})

	visibleEntries, err := ListDirectory(resolver, "root", "/", false)
	if err != nil {
		t.Fatal(err)
	}
	if len(visibleEntries) != 1 || visibleEntries[0].Name != "visible.txt" {
		t.Fatalf("expected only visible.txt without hidden toggle, got %+v", visibleEntries)
	}

	allEntries, err := ListDirectory(resolver, "root", "/", true)
	if err != nil {
		t.Fatal(err)
	}
	if !containsEntry(allEntries, ".hidden.txt") || !containsEntry(allEntries, ".secret") {
		t.Fatalf("expected hidden entries with toggle enabled, got %+v", allEntries)
	}

	visibleTree, err := Tree(resolver, "root", "/", false)
	if err != nil {
		t.Fatal(err)
	}
	if len(visibleTree) != 0 {
		t.Fatalf("expected no visible directories without toggle, got %+v", visibleTree)
	}

	allTree, err := Tree(resolver, "root", "/", true)
	if err != nil {
		t.Fatal(err)
	}
	if len(allTree) != 1 || allTree[0].Name != ".secret" || !allTree[0].HasChildren {
		t.Fatalf("expected hidden directory with children, got %+v", allTree)
	}
}

func TestSaveUploadedFileAddsIncrementingSuffixForCollisions(t *testing.T) {
	testCases := []struct {
		name         string
		existing     []string
		incomingName string
		wantName     string
	}{
		{
			name:         "file with extension",
			existing:     []string{"a.jpg", "a-1.jpg"},
			incomingName: "a.jpg",
			wantName:     "a-2.jpg",
		},
		{
			name:         "hidden file without extension",
			existing:     []string{".env"},
			incomingName: ".env",
			wantName:     ".env-1",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			for _, existing := range tc.existing {
				mustWriteFile(t, filepath.Join(root, existing))
			}
			resolver := NewMountResolver([]mounts.Mount{{ID: "root", Name: "Root", Path: root}})

			entry, written, err := SaveUploadedFile(
				resolver,
				"root",
				"/",
				tc.incomingName,
				strings.NewReader("new-content"),
			)
			if err != nil {
				t.Fatal(err)
			}
			if written != int64(len("new-content")) {
				t.Fatalf("written = %d, want %d", written, len("new-content"))
			}
			if entry.Name != tc.wantName {
				t.Fatalf("entry.Name = %q, want %q", entry.Name, tc.wantName)
			}
			if entry.Path != "/"+tc.wantName {
				t.Fatalf("entry.Path = %q, want %q", entry.Path, "/"+tc.wantName)
			}

			data, err := os.ReadFile(filepath.Join(root, tc.wantName))
			if err != nil {
				t.Fatal(err)
			}
			if string(data) != "new-content" {
				t.Fatalf("uploaded file content = %q, want %q", string(data), "new-content")
			}
			originalData, err := os.ReadFile(filepath.Join(root, tc.existing[0]))
			if err != nil {
				t.Fatal(err)
			}
			if string(originalData) != "ok" {
				t.Fatalf("original file content = %q, want %q", string(originalData), "ok")
			}
		})
	}
}

func TestMovePathFallsBackToCopyWhenRenameCrossesDevices(t *testing.T) {
	originalRename := moveRename
	moveRename = func(oldpath, newpath string) error {
		return &os.LinkError{
			Op:  "rename",
			Old: oldpath,
			New: newpath,
			Err: syscall.EXDEV,
		}
	}
	t.Cleanup(func() {
		moveRename = originalRename
	})

	t.Run("file", func(t *testing.T) {
		root := t.TempDir()
		src := filepath.Join(root, "src.txt")
		dst := filepath.Join(root, "moved", "dst.txt")
		mustWriteFile(t, src)
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			t.Fatal(err)
		}

		if err := MovePath(src, dst); err != nil {
			t.Fatal(err)
		}
		if _, err := os.Stat(src); !os.IsNotExist(err) {
			t.Fatalf("expected source removed after move, got %v", err)
		}
		data, err := os.ReadFile(dst)
		if err != nil {
			t.Fatal(err)
		}
		if string(data) != "ok" {
			t.Fatalf("moved file content = %q, want %q", string(data), "ok")
		}
	})

	t.Run("directory", func(t *testing.T) {
		root := t.TempDir()
		src := filepath.Join(root, "folder")
		dst := filepath.Join(root, "moved", "folder")
		mustWriteFile(t, filepath.Join(src, "nested.txt"))
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			t.Fatal(err)
		}

		if err := MovePath(src, dst); err != nil {
			t.Fatal(err)
		}
		if _, err := os.Stat(src); !os.IsNotExist(err) {
			t.Fatalf("expected source removed after move, got %v", err)
		}
		data, err := os.ReadFile(filepath.Join(dst, "nested.txt"))
		if err != nil {
			t.Fatal(err)
		}
		if string(data) != "ok" {
			t.Fatalf("moved nested file content = %q, want %q", string(data), "ok")
		}
	})
}

func TestMovePathReturnsErrExistWhenFallbackTargetAlreadyExists(t *testing.T) {
	originalRename := moveRename
	moveRename = func(oldpath, newpath string) error {
		return &os.LinkError{
			Op:  "rename",
			Old: oldpath,
			New: newpath,
			Err: syscall.EXDEV,
		}
	}
	t.Cleanup(func() {
		moveRename = originalRename
	})

	root := t.TempDir()
	src := filepath.Join(root, "src.txt")
	dst := filepath.Join(root, "dst.txt")
	mustWriteFile(t, src)
	mustWriteFile(t, dst)

	err := MovePath(src, dst)
	if !errors.Is(err, os.ErrExist) {
		t.Fatalf("err = %v, want %v", err, os.ErrExist)
	}
}

func mustWriteFile(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("ok"), 0o644); err != nil {
		t.Fatal(err)
	}
}

func containsEntry(entries []Entry, name string) bool {
	for _, entry := range entries {
		if entry.Name == name {
			return true
		}
	}
	return false
}
