# CLAUDE.md

## 1. 项目概览
`pan-webclient` 是一个全栈本地网盘项目，后端基于 Go 1.26，前端基于 React + Vite。系统面向单用户私有部署，核心目标是把宿主机白名单目录以安全的 Web 方式浏览和管理。

## 2. 技术栈
- Backend: Go 1.26, `net/http`, embedded JSON-style `application.yml`, system `sqlite3`
- Frontend: React 19, TypeScript, Vite 7
- Storage: 宿主机文件系统 + SQLite 索引数据库
- Auth: Web Cookie session + App access/refresh token
- Build: Makefile, Docker multi-stage build

## 3. 架构设计
- `apps/api` 提供鉴权、文件系统访问、索引、预览、编辑和传输任务 API。
- `apps/web` 提供 Finder 风格的 PC Web 界面，通过 HTTP API 调用后端。
- `packages/contracts` 放前后端共享 DTO 与错误码约定。
- 文件系统是真实数据源；SQLite 只保存索引、任务和软删除记录。
- 后端定时扫描挂载根目录并刷新索引，前端以挂载点、目录树、文件列表和预览面板为核心布局。

## 4. 目录结构
- `apps/api/cmd/server`: Go 服务入口
- `apps/api/internal/config`: 默认配置与加载器
- `apps/api/internal/auth`: Web session 与 App token
- `apps/api/internal/mounts`: 挂载根目录模型
- `apps/api/internal/fsops`: 路径解析、安全校验与文件操作
- `apps/api/internal/indexer`: SQLite 索引与搜索
- `apps/api/internal/preview`: 预览类型判定
- `apps/api/internal/editor`: 文本与 Markdown 编辑
- `apps/api/internal/transfer`: 上传、批量下载任务
- `apps/api/internal/httpapi`: HTTP 路由与中间件
- `apps/web/src`: React 应用
- `packages/contracts`: 共享接口协议

## 5. 数据结构
- `MountRoot`: 可挂载根目录定义
- `FileEntry`: 文件列表项，含路径、大小、MIME、修改时间和目录标识
- `FileTreeNode`: 目录树节点
- `PreviewMeta`: 预览元数据，含预览类型、流地址和文本内容
- `EditorDocument`: 在线编辑文档，含内容、版本与语法类型
- `TransferTask`: 上传/下载任务状态
- `SearchHit`: 搜索结果
- `ApiError`: API 错误响应

## 6. API 定义
- 鉴权：`POST /api/web/session/login`、`POST /api/web/session/logout`、`GET /api/web/session/me`、`POST /api/app/auth/login`、`POST /api/app/auth/refresh`
- 浏览：`GET /api/mounts`、`GET /api/tree`、`GET /api/files`、`GET /api/search`
- 文件操作：`POST /api/files/folder`、`POST /api/files/copy`、`POST /api/files/move`、`POST /api/files/rename`、`POST /api/files/delete`
- 预览与编辑：`GET /api/preview`、`GET /api/files/content`、`PUT /api/files/content`、`GET /api/files/raw`
- 传输：`POST /api/uploads`、`POST /api/downloads/batch`、`GET /api/tasks/:id`、`GET /api/tasks/:id/download`

## 7. 开发要点
- 所有文件路径必须通过挂载解析器验证，禁止路径穿越和越权访问。
- 默认拒绝符号链接穿透根目录。
- 编辑器只允许文本类文件，并对大小做阈值限制。
- 删除采用软删除移动到回收目录，不直接执行不可恢复删除。
- 前端请求默认带 `credentials: include`，以支持 Web Cookie 鉴权。

## 8. 开发流程
- 根目录复制 `.env.example` 到 `.env`
- `make api-run` 启动后端
- `make web-install && make web-dev` 启动前端开发服务器
- `make api-test` 运行后端测试
- `make web-build` 生成静态前端资源，生产环境可由后端直接托管

## 9. 已知约束与注意事项
- 当前 SQLite 访问依赖系统自带 `sqlite3` 命令行工具。
- 索引同步采用周期性扫描刷新，不依赖外部内核文件监听库。
- 回收站 UI、分享链接、版本历史和多用户权限不在首版范围内。
