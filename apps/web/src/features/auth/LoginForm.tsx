import { type FormEvent, useState } from "react";
import { IconDesktop, IconMoon, IconMore, IconSun } from "../shared/Icons";
import { MenuButton } from "../shared/MenuButton";

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
            <p className="muted">文件直接读磁盘，手机端优先的轻量文件工作区。</p>
          </div>

          <div className="login-theme-panel">
            <span className="theme-indicator">{props.resolvedTheme === "dark" ? "Night" : "Day"}</span>
            <MenuButton
              actions={[
                { label: "跟随系统", icon: <IconDesktop size={14} />, onSelect: () => props.onThemeModeChange("system") },
                { label: "浅色", icon: <IconSun size={14} />, onSelect: () => props.onThemeModeChange("light") },
                { label: "深色", icon: <IconMoon size={14} />, onSelect: () => props.onThemeModeChange("dark") },
              ]}
              align="right"
              buttonClassName="ghost-button compact-button"
              buttonContent={
                <>
                  <IconMore size={14} />
                  主题
                </>
              }
              buttonLabel="主题菜单"
            />
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
