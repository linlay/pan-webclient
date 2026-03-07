import { type FormEvent, useState } from "react";

export function LoginForm(props: {
  onLogin: (username: string, password: string) => Promise<void>;
  notice: { tone: "info" | "error"; text: string } | null;
}) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("change_me");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await props.onLogin(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <p className="eyebrow">Single-user private cloud</p>
      <h1>Sign in to your mounted disks</h1>
      <p className="muted">
        使用本机配置的管理员账号登录。Web 端使用 Cookie 会话，原生 App 可复用同一后端的 token 接口。
      </p>
      <label>
        用户名
        <input value={username} onChange={(event) => setUsername(event.target.value)} />
      </label>
      <label>
        密码
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      {error ? <div className="notice notice-error">{error}</div> : null}
      {!error && props.notice ? <div className={`notice notice-${props.notice.tone}`}>{props.notice.text}</div> : null}
      <button className="primary-button" disabled={loading} type="submit">
        {loading ? "Signing in..." : "进入网盘"}
      </button>
    </form>
  );
}
