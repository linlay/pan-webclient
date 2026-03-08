package indexer

import (
	"encoding/json"
	"os/exec"
	"path/filepath"
	"testing"

	"pan-webclient/apps/api/internal/fsops"
)

type pragmaColumn struct {
	Name string `json:"name"`
}

func TestInitMigratesFilesTableAndSearchRespectsHidden(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "pan.db")
	cmd := exec.Command("sqlite3", dbPath, "CREATE TABLE files (mount_id TEXT NOT NULL, rel_path TEXT NOT NULL, name TEXT NOT NULL, is_dir INTEGER NOT NULL, size INTEGER NOT NULL, mod_time INTEGER NOT NULL, mime TEXT NOT NULL, extension TEXT NOT NULL, PRIMARY KEY (mount_id, rel_path));")
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("create legacy db: %v: %s", err, string(output))
	}

	store := NewStore(dbPath)
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}

	output, err := store.queryJSON("PRAGMA table_info(files);")
	if err != nil {
		t.Fatal(err)
	}
	var columns []pragmaColumn
	if err := json.Unmarshal(output, &columns); err != nil {
		t.Fatal(err)
	}
	if !hasColumn(columns, "hidden") {
		t.Fatalf("expected hidden column after migration, got %+v", columns)
	}

	entries := []fsops.Entry{
		{MountID: "root", Path: "/visible.txt", Name: "visible.txt", Mime: "text/plain", Extension: ".txt"},
		{MountID: "root", Path: "/.secret/note.txt", Name: "note.txt", Mime: "text/plain", Extension: ".txt", Hidden: true},
	}
	if err := store.ReplaceMountSnapshot("root", entries); err != nil {
		t.Fatal(err)
	}

	hiddenOff, err := store.Search("note", 10, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(hiddenOff) != 0 {
		t.Fatalf("expected hidden results to be filtered, got %+v", hiddenOff)
	}

	hiddenOn, err := store.Search("note", 10, true)
	if err != nil {
		t.Fatal(err)
	}
	if len(hiddenOn) != 1 || hiddenOn[0].Path != "/.secret/note.txt" {
		t.Fatalf("expected hidden result with toggle enabled, got %+v", hiddenOn)
	}
}

func hasColumn(columns []pragmaColumn, name string) bool {
	for _, column := range columns {
		if column.Name == name {
			return true
		}
	}
	return false
}
