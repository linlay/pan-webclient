import { type FormEvent, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

export function LoginForm(props: {
  notice: { tone: "info" | "error"; text: string } | null;
  themeMode: ThemeMode;
  resolvedTheme: "light" | "dark";
  onLogin: (username: string, password: string) => Promise<void>;
  onThemeModeChange: (mode: ThemeMode) => void;
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
    <div className="login-page">
      <section className="login-card">
        <div className="login-header">
          <div>
            <p className="eyebrow">Pan Workspace</p>
            <h1>登录到你的网盘工作区</h1>
            <p className="muted">更紧凑的桌面网盘界面，保持原有文件管理、预览和文本编辑能力。</p>
          </div>

          <div className="login-theme-panel">
            <span className="theme-indicator">{props.resolvedTheme === "dark" ? "Night" : "Day"}</span>
            <div className="segmented-control" role="tablist" aria-label="Theme mode">
              {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
                <button
                  aria-selected={props.themeMode === mode}
                  className={`segment ${props.themeMode === mode ? "is-active" : ""}`}
                  key={mode}
                  onClick={() => props.onThemeModeChange(mode)}
                  role="tab"
                  type="button"
                >
                  {mode === "system" ? "自动" : mode === "light" ? "浅色" : "深色"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>用户名</span>
            <input onChange={(event) => setUsername(event.target.value)} value={username} />
          </label>

          <label className="field">
            <span>密码</span>
            <input onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
          </label>

          {error ? <div className="notice notice-error">{error}</div> : null}
          {!error && props.notice ? <div className={`notice notice-${props.notice.tone}`}>{props.notice.text}</div> : null}

          <div className="login-actions">
            <button className="primary-button login-submit" disabled={loading} type="submit">
              {loading ? "登录中..." : "进入工作区"}
            </button>
            <p className="muted">Web 端继续使用 Cookie 会话，不改变现有鉴权流程。</p>
          </div>
        </form>
      </section>
    </div>
  );
}
