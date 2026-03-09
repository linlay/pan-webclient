# CLAUDE.md

## 1. 项目概览
`pan-webclient` 是一个全栈本地网盘项目，后端基于 Go 1.26，前端基于 React + Vite。系统面向单用户私有部署，核心目标是把宿主机白名单目录以安全的 Web 方式浏览和管理。

## 2. 技术栈
- Backend: Go 1.26, `net/http`, embedded JSON-style `application.yml`
- Frontend: React 19, TypeScript, Vite 7
- Storage: 宿主机文件系统 + `./data` 运行时目录
- Auth: Web Cookie session + externally issued App Bearer token
- Build: Makefile, Docker multi-stage build

## 3. 架构设计
- `backend` 提供鉴权、文件系统访问、搜索、预览、编辑、任务和垃圾桶 API。
- `frontend` 提供桌面和手机 H5 共用的文件管理界面，通过 HTTP API 调用后端。
- `packages/contracts` 放前后端共享 DTO 与错误码约定。
- 文件系统是真实数据源；搜索直接遍历当前挂载目录，不做二次索引缓存。
- 任务与垃圾桶元数据以 JSON 文件形式保存在 `./data/tasks` 与 `./data/trash`。

## 4. 目录结构
- `backend/cmd/server`: Go 服务入口
- `backend/internal/config`: 默认配置与加载器
- `backend/internal/auth`: Web session 与 App JWT 验签
- `backend/internal/mounts`: 挂载根目录模型
- `backend/internal/fsops`: 路径解析、安全校验与文件操作
- `backend/internal/indexer`: 磁盘搜索、任务与垃圾桶元数据存储
- `backend/internal/preview`: 预览类型判定
- `backend/internal/editor`: 文本与 Markdown 编辑
- `backend/internal/transfer`: 上传、批量下载任务
- `backend/internal/httpapi`: HTTP 路由与中间件
- `frontend/src`: React 应用
- `packages/contracts`: 共享接口协议

## 5. 数据结构
- `MountRoot`: 可挂载根目录定义
- `FileEntry`: 文件列表项，含路径、大小、MIME、修改时间和目录标识
- `FileTreeNode`: 目录树节点
- `PreviewMeta`: 预览元数据，含预览类型、流地址和文本内容
- `EditorDocument`: 在线编辑文档，含内容、版本与语法类型
- `TransferTask`: 上传/下载任务状态
- `TrashItem`: 垃圾桶条目
- `SearchHit`: 搜索结果
- `ApiError`: API 错误响应

## 6. API 定义
- 鉴权：`POST /api/web/session/login`、`POST /api/web/session/logout`、`GET /api/web/session/me`
- 浏览：`GET /api/mounts`、`GET /api/tree`、`GET /api/files`、`GET /api/search`
- 文件操作：`POST /api/files/folder`、`POST /api/files/copy`、`POST /api/files/move`、`POST /api/files/rename`、`POST /api/files/delete`
- 预览与编辑：`GET /api/preview`、`GET /api/files/content`、`PUT /api/files/content`、`GET /api/files/raw`
- 传输：`POST /api/uploads`、`POST /api/downloads/batch`、`GET /api/tasks`、`GET /api/tasks/:id`、`GET /api/tasks/:id/download`
- 垃圾桶：`GET /api/trash`、`POST /api/trash/restore`、`POST /api/trash/delete`

## 7. 开发要点
- 所有文件路径必须通过挂载解析器验证，禁止路径穿越和越权访问。
- 默认拒绝符号链接穿透根目录。
- 编辑器只允许文本类文件，并对大小做阈值限制。
- 删除采用软删除移动到回收目录，不直接执行不可恢复删除。
- 前端请求默认带 `credentials: include`，以支持 Web Cookie 鉴权。
- App 场景不在本项目内登录；宿主 WebView 负责注入 Bearer token，本项目只做 `RS256 JWT` 验签。

## 8. 开发流程
- 根目录复制 `.env.example` 到 `.env`
- 复制 `configs/local-public-key.example.pem` 到 `configs/local-public-key.pem`，并替换成真实 RSA 公钥
- 在 `configs/mounts/` 下创建一个或多个运行时 `.json` 挂载文件
- `make backend-run` 启动后端
- `make frontend-install && make frontend-dev` 启动前端开发服务器
- `make backend-test` 运行后端测试
- `make frontend-build` 生成静态前端资源，生产环境可由后端直接托管

## 9. 已知约束与注意事项
- 搜索为实时遍历磁盘，超大挂载目录下响应速度受文件数量影响。
- 服务重启后未完成任务会标记为失败，不做断点续跑。
- 分享链接、版本历史和多用户权限不在当前范围内。
- 后端必须持有 `WEB_SESSION_SECRET` 与管理员 bcrypt hash；App 私钥不在本项目内保存。
