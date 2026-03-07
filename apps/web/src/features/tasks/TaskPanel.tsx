import type { TransferTask } from "../../../../../packages/contracts/index";

export function TaskPanel(props: {
  tasks: TransferTask[];
  onOpenTask: (id: string) => void;
}) {
  return (
    <section className="panel-card">
      <div className="panel-heading">
        <span>任务队列</span>
        <strong>{props.tasks.length}</strong>
      </div>
      <div className="task-list">
        {props.tasks.map((task) => (
          <button className="task-item" key={task.id} onClick={() => props.onOpenTask(task.id)}>
            <div>
              <strong>{task.kind === "upload" ? "上传" : "下载"}</strong>
              <p>{task.detail}</p>
            </div>
            <span className={`task-status status-${task.status}`}>{task.status}</span>
          </button>
        ))}
        {props.tasks.length === 0 ? <div className="empty-state compact">暂无任务。</div> : null}
      </div>
    </section>
  );
}
