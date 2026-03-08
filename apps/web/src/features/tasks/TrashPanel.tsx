import type { TrashItem } from "../../../../../packages/contracts/index";
import { IconArrowLeft, IconRefresh, IconTrash } from "../shared/Icons";

export function TrashPanel(props: {
  items: TrashItem[];
  onBack?: () => void;
  onRefresh: () => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="panel-card task-card">
      <div className="panel-heading">
        <div>
          <span>垃圾桶</span>
          <strong>{props.items.length === 0 ? "空" : `${props.items.length} 项`}</strong>
        </div>
        <div className="toolbar">
          {props.onBack ? (
            <button className="icon-button" onClick={props.onBack} type="button">
              <IconArrowLeft />
            </button>
          ) : null}
          <button className="icon-button" onClick={props.onRefresh} type="button">
            <IconRefresh />
          </button>
        </div>
      </div>

      {props.items.length === 0 ? (
        <div className="empty-state compact">
          <strong>垃圾桶是空的</strong>
          <p>删除的文件会先进入这里，之后可以恢复或彻底删除。</p>
        </div>
      ) : (
        <div className="task-list">
          {props.items.map((item) => (
            <div className="trash-item" key={item.id}>
              <div className="trash-item-copy">
                <div className="trash-item-title">
                  <IconTrash size={16} />
                  <strong>{item.name}</strong>
                </div>
                <p>{item.originalPath}</p>
                <small>{new Date(item.deletedAt * 1000).toLocaleString()}</small>
              </div>
              <div className="toolbar">
                <button className="ghost-button compact-button" onClick={() => props.onRestore(item.id)} type="button">
                  恢复
                </button>
                <button className="ghost-button compact-button danger-text" onClick={() => props.onDelete(item.id)} type="button">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
