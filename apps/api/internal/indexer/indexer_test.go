package indexer

import (
	"os"
	"path/filepath"
	"testing"

	"pan-webclient/apps/api/internal/mounts"
)

func TestSearchMountsRespectsHidden(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "visible.txt"), []byte("visible"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(root, ".secret"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".secret", "note.txt"), []byte("note"), 0o644); err != nil {
		t.Fatal(err)
	}

	hiddenOff, err := SearchMounts([]mounts.Mount{{ID: "root", Name: "Root", Path: root}}, "note", 10, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(hiddenOff) != 0 {
		t.Fatalf("expected hidden entries to be filtered, got %+v", hiddenOff)
	}

	hiddenOn, err := SearchMounts([]mounts.Mount{{ID: "root", Name: "Root", Path: root}}, "note", 10, true)
	if err != nil {
		t.Fatal(err)
	}
	if len(hiddenOn) != 1 || hiddenOn[0].Path != "/.secret/note.txt" {
		t.Fatalf("expected hidden search result, got %+v", hiddenOn)
	}
}

func TestStoreReconcileTasksAndTrashRecords(t *testing.T) {
	dataDir := t.TempDir()
	store := NewStore(dataDir)
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}

	if err := store.PutTask(TaskRecord{
		ID:        "pending",
		Kind:      "download",
		Status:    "pending",
		Detail:    "queued",
		CreatedAt: 10,
		UpdatedAt: 10,
	}); err != nil {
		t.Fatal(err)
	}

	if err := store.PutTask(TaskRecord{
		ID:          "success",
		Kind:        "download",
		Status:      "success",
		Detail:      "ready",
		Artifact:    filepath.Join(dataDir, "tasks", "artifacts", "missing.zip"),
		DownloadURL: "/api/tasks/success/download",
		CreatedAt:   20,
		UpdatedAt:   20,
	}); err != nil {
		t.Fatal(err)
	}

	if err := store.ReconcileTasks(); err != nil {
		t.Fatal(err)
	}

	items, err := store.ListTasks(10)
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 tasks, got %d", len(items))
	}
	if items[0].Status != "failed" || items[1].Status != "failed" {
		t.Fatalf("expected reconciled failed tasks, got %+v", items)
	}

	record := TrashRecord{
		ID:           "trash-1",
		MountID:      "root",
		OriginalPath: "/gone.txt",
		TrashPath:    filepath.Join(store.TrashItemsDir(), "gone.txt"),
		DeletedAt:    30,
		Name:         "gone.txt",
	}
	if err := store.PutTrash(record); err != nil {
		t.Fatal(err)
	}

	trashItems, err := store.ListTrash(10)
	if err != nil {
		t.Fatal(err)
	}
	if len(trashItems) != 1 || trashItems[0].ID != "trash-1" {
		t.Fatalf("expected stored trash item, got %+v", trashItems)
	}

	if err := store.DeleteTrashRecord("trash-1"); err != nil {
		t.Fatal(err)
	}
	trashItems, err = store.ListTrash(10)
	if err != nil {
		t.Fatal(err)
	}
	if len(trashItems) != 0 {
		t.Fatalf("expected empty trash metadata after delete, got %+v", trashItems)
	}
}
