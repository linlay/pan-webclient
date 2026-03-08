import type { FileTreeNode, MountRoot } from "../../../../../packages/contracts/index";

export function SidebarTree(props: {
  mounts: MountRoot[];
  currentMountId: string;
  currentPath: string;
  treeCache: Record<string, FileTreeNode[]>;
  treeCacheKeySuffix: string;
  expandedPaths: string[];
  onSelect: (mountId: string, path: string) => void;
  onToggle: (mountId: string, path: string) => void | Promise<void>;
}) {
  return (
    <div className="tree-root">
      {props.mounts.map((mount) => {
        const children = props.treeCache[treeCacheKey(mount.id, "/", props.treeCacheKeySuffix)] ?? [];
        const activeRoot = props.currentMountId === mount.id && props.currentPath === "/";

        return (
          <section className="tree-group" key={mount.id}>
            <button
              className={`tree-node tree-root-node ${activeRoot ? "is-active" : ""}`}
              onClick={() => props.onSelect(mount.id, "/")}
              type="button"
            >
              <span className="tree-node-title">{mount.name}</span>
              <small>{mount.path}</small>
            </button>

            <div className="tree-children">
              {children.map((child) => (
                <TreeBranch
                  currentMountId={props.currentMountId}
                  currentPath={props.currentPath}
                  expandedPaths={props.expandedPaths}
                  key={`${mount.id}:${child.path}`}
                  mountId={mount.id}
                  node={child}
                  onSelect={props.onSelect}
                  onToggle={props.onToggle}
                  treeCache={props.treeCache}
                  treeCacheKeySuffix={props.treeCacheKeySuffix}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TreeBranch(props: {
  mountId: string;
  node: FileTreeNode;
  currentMountId: string;
  currentPath: string;
  treeCache: Record<string, FileTreeNode[]>;
  treeCacheKeySuffix: string;
  expandedPaths: string[];
  onSelect: (mountId: string, path: string) => void;
  onToggle: (mountId: string, path: string) => void | Promise<void>;
}) {
  const expanded = props.expandedPaths.includes(props.node.path);
  const active = props.currentMountId === props.mountId && props.currentPath === props.node.path;
  const children = props.treeCache[treeCacheKey(props.mountId, props.node.path, props.treeCacheKeySuffix)] ?? [];

  return (
    <div className="tree-branch">
      <div className="tree-branch-row">
        {props.node.hasChildren ? (
          <button
            aria-expanded={expanded}
            className="tree-toggle"
            onClick={() => props.onToggle(props.mountId, props.node.path)}
            type="button"
          >
            {expanded ? "−" : "+"}
          </button>
        ) : (
          <span className="tree-toggle-spacer" />
        )}

        <button
          className={`tree-node ${active ? "is-active" : ""}`}
          onClick={() => props.onSelect(props.mountId, props.node.path)}
          type="button"
        >
          <span className="tree-node-label">
            <span className="tree-node-dot" />
            <span>{props.node.name}</span>
          </span>
        </button>
      </div>

      {expanded && children.length > 0 ? (
        <div className="tree-children">
          {children.map((child) => (
            <TreeBranch
              currentMountId={props.currentMountId}
              currentPath={props.currentPath}
              expandedPaths={props.expandedPaths}
              key={`${props.mountId}:${child.path}`}
              mountId={props.mountId}
              node={child}
              onSelect={props.onSelect}
              onToggle={props.onToggle}
              treeCache={props.treeCache}
              treeCacheKeySuffix={props.treeCacheKeySuffix}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function treeCacheKey(mountId: string, path: string, showHidden: string) {
  return `${mountId}:${showHidden}:${path}`;
}
