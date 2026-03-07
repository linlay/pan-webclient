import type { FileTreeNode, MountRoot } from "../../../../../packages/contracts/index";

export function SidebarTree(props: {
  mounts: MountRoot[];
  currentMountId: string;
  currentPath: string;
  treeCache: Record<string, FileTreeNode[]>;
  expandedPaths: string[];
  onSelect: (mountId: string, path: string) => void;
  onToggle: (mountId: string, path: string) => void | Promise<void>;
}) {
  return (
    <div className="tree-root">
      {props.mounts.map((mount) => {
        const rootKey = `${mount.id}:/`;
        const children = props.treeCache[rootKey] ?? [];
        return (
          <div className="tree-group" key={mount.id}>
            <button
              className={`tree-node ${props.currentMountId === mount.id && props.currentPath === "/" ? "is-active" : ""}`}
              onClick={() => props.onSelect(mount.id, "/")}
            >
              <span>{mount.name}</span>
              <small>{mount.path}</small>
            </button>
            <div className="tree-children">
              {children.map((child) => (
                <TreeBranch
                  key={`${mount.id}:${child.path}`}
                  mountId={mount.id}
                  node={child}
                  currentMountId={props.currentMountId}
                  currentPath={props.currentPath}
                  treeCache={props.treeCache}
                  expandedPaths={props.expandedPaths}
                  onSelect={props.onSelect}
                  onToggle={props.onToggle}
                />
              ))}
            </div>
          </div>
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
  expandedPaths: string[];
  onSelect: (mountId: string, path: string) => void;
  onToggle: (mountId: string, path: string) => void | Promise<void>;
}) {
  const expanded = props.expandedPaths.includes(props.node.path);
  const children = props.treeCache[`${props.mountId}:${props.node.path}`] ?? [];

  return (
    <div className="tree-branch">
      <div className="tree-row">
        {props.node.hasChildren ? (
          <button className="icon-button" onClick={() => props.onToggle(props.mountId, props.node.path)}>
            {expanded ? "−" : "+"}
          </button>
        ) : (
          <span className="icon-spacer" />
        )}
        <button
          className={`tree-node ${props.currentMountId === props.mountId && props.currentPath === props.node.path ? "is-active" : ""}`}
          onClick={() => props.onSelect(props.mountId, props.node.path)}
        >
          <span>{props.node.name}</span>
        </button>
      </div>
      {expanded && children.length > 0 ? (
        <div className="tree-children">
          {children.map((child) => (
            <TreeBranch
              key={`${props.mountId}:${child.path}`}
              mountId={props.mountId}
              node={child}
              currentMountId={props.currentMountId}
              currentPath={props.currentPath}
              treeCache={props.treeCache}
              expandedPaths={props.expandedPaths}
              onSelect={props.onSelect}
              onToggle={props.onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
