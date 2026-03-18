# CLAUDE.md

## 1. 项目概览
`pan-webclient` 是一个全栈单用户私有网盘项目。

- Backend: Go 1.26, `net/http`
- Frontend: React 18, TypeScript, Webpack
- Gateway: Nginx
- Storage: 宿主机文件系统 + `./data`
- Auth: Web Cookie Session + externally issued App Bearer token

## 2. 当前架构
- Nginx 是唯一浏览器入口。
- 开发态拓扑：`browser -> nginx -> frontend-dev + api`
- 生产态拓扑：`browser -> frontend-nginx -> api`
- Go 后端只处理 `/api/*`，不托管前端静态资源，不负责 `/pan/*`、`/apppan/*` 路由。
- 外部兼容路径 `/pan/api/*` 和 `/apppan/api/*` 由 Nginx 重写到内部 `/api/*`。
- 对外前端资源只允许走 `/pan/*`、`/apppan/*`；开发态 HMR 只允许 `/hmr/ws`。

## 3. 目录结构
- `backend/cmd/server`: Go 服务入口
- `backend/internal/config`: 默认配置与加载器
- `backend/internal/auth`: Web Session 与 App JWT 验签
- `backend/internal/httpapi`: 纯 API 路由
- `backend/internal/fsops`: 挂载解析、安全校验、文件操作
- `backend/internal/indexer`: 搜索、任务、垃圾桶元数据
- `backend/internal/editor`: 文本与 Markdown 编辑
- `backend/internal/preview`: 预览元数据构建
- `backend/internal/transfer`: 上传、批量下载任务
- `frontend/src`: React 应用
- `deploy/nginx`: 开发态 / 生产态 Nginx 配置
- `docker-compose.yml`: 本地生产编排
- `docker-compose.dev.yml`: 本地开发态 override

## 4. 配置原则
- `.env.example` 是环境变量契约。
- `backend/internal/config/application.yml` 是后端默认值。
- 根目录 `./data` 是唯一默认运行时数据目录；`apps/` 是已废弃的历史遗留目录。
- `configs/` 只存放运行时结构化配置和示例文件，不存真实密钥。
- `configs/mounts/*.json` 里的挂载路径应写容器内路径。

## 5. 开发命令
- `make build`: 串行构建前后端
- `make build-backend`: 构建 Go 二进制到 `./bin/pan-api`
- `make build-frontend`: 构建前端静态资源；缺少依赖时先执行 `npm ci`
- `make run`: 启动开发态 Nginx、Go API、webpack dev server
- `make stop`: 停止开发态服务
- `make docker-up`: 启动本地生产形态容器编排
- `make docker-down`: 停止本地生产形态服务
- 测试直接使用原生命令：`cd backend && go test ./...`、`cd frontend && node --test src/api/routing.test.ts`

## 6. 关键约束
- 不要把前端静态托管重新加回 Go。
- 浏览器端只通过 Nginx 暴露的 `/pan/`、`/apppan/` 访问系统。
- 除 `/` 重定向到 `/pan/` 和 API 入口外，不要兼容根路径静态资源或根路径 HMR `/ws`。
- 后端返回的资源链接使用 canonical `/api/*`；前端负责按当前 UI 基路径转换成外部可访问地址。
- App 私钥不保存在本仓库；仓库内只允许放公钥示例文件。
- 运行时若需要访问仓库外目录，必须在容器编排里显式增加 bind mount。
