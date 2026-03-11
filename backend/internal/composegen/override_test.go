package composegen

import (
	"strings"
	"testing"

	"pan-webclient/backend/internal/config"
)

func TestBuildOverrideGeneratesBindMounts(t *testing.T) {
	override, err := BuildOverride([]config.Mount{
		{ID: "downloads", Name: "Downloads", Source: "/Users/demo/Downloads", Path: "/mnt/pan/downloads", ReadOnly: true},
		{ID: "project", Name: "Project", Source: "/Users/demo/Project", Path: "/mnt/pan/project"},
	})
	if err != nil {
		t.Fatalf("BuildOverride() error = %v", err)
	}

	for _, want := range []string{
		"services:\n",
		"  api:\n",
		"source: '/Users/demo/Downloads'\n",
		"target: '/mnt/pan/downloads'\n",
		"read_only: true\n",
		"source: '/Users/demo/Project'\n",
		"target: '/mnt/pan/project'\n",
	} {
		if !strings.Contains(override, want) {
			t.Fatalf("override missing %q:\n%s", want, override)
		}
	}
}

func TestBuildOverrideDedupesIdenticalMounts(t *testing.T) {
	override, err := BuildOverride([]config.Mount{
		{Source: "/Users/demo/Downloads", Path: "/mnt/pan/downloads"},
		{Source: "/Users/demo/Downloads", Path: "/mnt/pan/downloads"},
	})
	if err != nil {
		t.Fatalf("BuildOverride() error = %v", err)
	}
	if got := strings.Count(override, "source: '/Users/demo/Downloads'"); got != 1 {
		t.Fatalf("expected one downloads mount, got %d:\n%s", got, override)
	}
}

func TestBuildOverrideRejectsConflictingDuplicateMounts(t *testing.T) {
	_, err := BuildOverride([]config.Mount{
		{Source: "/Users/demo/Downloads", Path: "/mnt/pan/downloads", ReadOnly: true},
		{Source: "/Users/demo/Downloads", Path: "/mnt/pan/downloads", ReadOnly: false},
	})
	if err == nil || !strings.Contains(err.Error(), "conflicting readOnly") {
		t.Fatalf("expected conflicting readOnly error, got %v", err)
	}
}

func TestBuildOverrideSkipsMountsWithoutSource(t *testing.T) {
	override, err := BuildOverride([]config.Mount{
		{ID: "legacy", Name: "Legacy", Path: "/mnt/pan/legacy"},
	})
	if err != nil {
		t.Fatalf("BuildOverride() error = %v", err)
	}
	if override != "services: {}\n" {
		t.Fatalf("override = %q, want empty services block", override)
	}
}
