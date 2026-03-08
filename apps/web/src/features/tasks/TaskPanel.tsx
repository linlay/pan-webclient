import type { TransferTask } from "../../../../../packages/contracts/index";
import { IconArrowLeft, IconDownload, IconUpload } from "../shared/Icons";

export function TaskPanel(props: {
  tasks: TransferTask[];
  collapsed: boolean;
  onToggle: () => void;
  onOpenTask: (id: string) => void;
  onBack?: () => void;
}) {
  const activeCount = props.tasks.filter((task) => task.status === "pending" || task.status === "running").length;

  return (
    <section className="panel-card task-card">
      <div className="panel-heading">
        <div>
          <span>任务队列</span>
          <strong>{props.tasks.length === 0 ? "暂无任务" : `${props.tasks.length} 条记录`}</strong>
        </div>
        <div className="toolbar">
          {props.onBack ? (
            <button className="icon-button" onClick={props.onBack} type="button">
              <IconArrowLeft />
            </button>
          ) : null}
          {activeCount > 0 ? <span className="pill-label active-pill">{activeCount} 进行中</span> : null}
          <button className="ghost-button compact-button" onClick={props.onToggle} type="button">
            {props.collapsed ? "展开" : "收起"}
          </button>
        </div>
      </div>

      {props.collapsed ? (
        <div className="task-summary">
          <p className="muted">{activeCount > 0 ? "有活动任务正在刷新状态。" : "任务面板已折叠。"}</p>
        </div>
      ) : (
        <div className="task-list">
          {props.tasks.map((task) => (
            <button className="task-item" key={task.id} onClick={() => props.onOpenTask(task.id)} type="button">
              <div className="task-item-copy">
                <div className="task-item-title">
                  {task.kind === "upload" ? <IconUpload size={16} /> : <IconDownload size={16} />}
                  <strong>{task.kind === "upload" ? "上传" : "下载"}</strong>
                </div>
                <p>{task.detail}</p>
              </div>
              <span className={`task-status status-${task.status}`}>{translateStatus(task.status)}</span>
            </button>
          ))}

          {props.tasks.length === 0 ? (
            <div className="empty-state compact">
              <strong>暂无任务</strong>
              <p>上传文件或批量下载后，状态会显示在这里。</p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function translateStatus(status: TransferTask["status"]) {
  switch (status) {
    case "success":
      return "完成";
    case "failed":
      return "失败";
    case "running":
      return "进行中";
    default:
      return "等待中";
  }
}
