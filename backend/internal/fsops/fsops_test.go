package fsops

import (
	"os"
	"path/filepath"
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
