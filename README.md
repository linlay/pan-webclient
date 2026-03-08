# pan-webclient

## 1. 项目简介
`pan-webclient` 是一个本机直跑优先的单用户私有网盘项目，提供 PC Web 文件浏览、预览、批量上传/下载、文本与 Markdown 在线编辑，以及给原生 App 复用的文件接口。

## 2. 快速开始
### 前置要求
- Go 1.26+
- Node.js 25+ 与 npm 11+
- 系统安装 `sqlite3`

### 初始化
```bash
cp .env.example .env
```

`.env.example` 中的 `SQLITE_PATH` / `PAN_TRASH_DIR` 默认按 `make api-run` 的工作目录 `apps/api` 解析。

### 本地启动后端
```bash
make api-run
```

### 本地启动前端
```bash
make web-install
make web-dev
```

### 构建
```bash
make api-build
make web-build
```

### 测试
```bash
make api-test
```

## 3. 配置说明
- 所有环境变量契约以 `.env.example` 为准，`.env` 不提交。
- 后端内置默认配置位于 `apps/api/internal/config/application.yml`，优先级低于环境变量。
- `PAN_MOUNTS` 用于声明可挂载根目录，格式为 `id|名称|绝对路径,id2|名称2|绝对路径2`。
- Web 鉴权使用 Cookie，会话签名依赖 `WEB_SESSION_SECRET`。
- App 鉴权使用 access token / refresh token，签名依赖 `APP_TOKEN_SIGNING_KEY`。

## 4. 部署
### 本机部署
```bash
make api-build
make web-build
SQLITE_PATH=./apps/api/data/pan.db PAN_TRASH_DIR=./apps/api/data/trash PAN_STATIC_DIR=apps/web/dist ./bin/pan-api
```

### 容器构建
```bash
docker build -t pan-webclient:latest .
```

### 敏感信息注入
- 生产或长期运行环境必须通过环境变量注入账号密码、签名密钥和挂载目录。
- 不在仓库中提交真实用户名、密码、密钥或宿主机路径。

## 5. 运维
### 常见检查
- 确认 `sqlite3` 可执行文件存在于 `PATH`
- 确认 `.env` 中的 `PAN_MOUNTS` 指向真实可访问路径
- 确认 `WEB_ORIGIN` 与前端开发地址一致
- 确认 `PAN_TRASH_DIR` 与 `SQLITE_PATH` 的父目录可写

### 常见问题排查
- 登录失败：检查 `PAN_ADMIN_USERNAME`、`PAN_ADMIN_PASSWORD`
- 搜索结果为空：等待启动扫描完成，或检查挂载目录是否可读
- 下载任务失败：检查临时任务目录和源文件权限
