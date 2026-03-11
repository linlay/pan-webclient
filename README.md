# pan-webclient

## 1. 项目简介
`pan-webclient` 是一个本机直跑优先的单用户私有网盘项目，提供文件浏览、预览、批量上传/下载、文本与 Markdown 在线编辑、垃圾桶，以及给原生 App 复用的文件接口。

## 2. 快速开始
### 前置要求
- Go 1.26+
- Node.js 25+ 与 npm 11+
- 系统提供 `htpasswd`（用于校验管理员 bcrypt hash）

### 初始化
```bash
cp .env.example .env
cp configs/local-public-key.example.pem configs/local-public-key.pem
```

运行时数据默认写入仓库根目录 `./data`。
挂载点运行时配置放在 `configs/mounts/*.json`，每个文件定义一个本机目录。
App JWT 本地验签公钥也放在运行根目录 `configs/` 下，推荐使用 `configs/local-public-key.pem`。

### 本地启动后端
```bash
make backend-run
```

### 本地启动前端
```bash
make frontend-install
make frontend-dev
```

### 编译 / 构建
```bash
make backend-build
make frontend-build
```

这些命令只生成本地产物，不会组装可分发目录：
- `make backend-build` 输出 `./bin/pan-api`
- `make frontend-build` 输出 `./frontend/dist`

### macOS 发布打包
```bash
make package-mac
cp release/.env.example release/.env
./release/start.sh
```

默认会产出 `./release` 目录，包含：
- `release/backend/pan-api`
- `release/web/`
- `release/configs/`
- `release/start.sh`
- `release/stop.sh`

### 测试
```bash
make backend-test
```

### `/apppan/` Bearer smoke test
先准备一个由宿主私钥签发、且能被 `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 对应公钥验签的 `RS256 JWT`，然后执行：

```bash
curl -H "Authorization: Bearer 你的-jwt-token" \
  http://127.0.0.1:11936/apppan/api/web/session/me
```

返回里应看到：
- `authMethod` 为 `token`
- `username` 为 token 里的 `sub`

需要继续验证挂载和文件接口时，可以直接用同一个 token：

```bash
curl -H "Authorization: Bearer 你的-jwt-token" \
  http://127.0.0.1:11936/apppan/api/mounts
```

如果想一次把 `/apppan/api` 主链路全跑完，再执行：

```bash
APPPAN_BEARER_TOKEN='你的-jwt-token' make apppan-smoke
```

可选参数：
- `APPPAN_BASE_URL`：默认 `http://127.0.0.1:11936/apppan/api`
- `APPPAN_MOUNT_ID`：未安装 `jq` 或需要指定挂载时显式传入
- `APPPAN_SHOW_HIDDEN=1`：连同隐藏文件一起验证

脚本会依次检查：
- `GET /apppan/api/web/session/me`
- `GET /apppan/api/mounts`
- `GET /apppan/api/tree`
- `GET /apppan/api/files`
- `GET /apppan/api/preview`
- `GET /apppan/api/tasks`

## 3. 配置说明
- 所有环境变量契约以 `.env.example` 为准，`.env` 不提交。
- 后端内置默认配置位于 `backend/internal/config/application.yml`，优先级低于环境变量。
- `APP_PORT` 控制后端监听端口，`WEB_PORT` 控制前端 webpack 开发端口。
- `WEB_ORIGIN` 显式配置时用于后端 CORS；未配置时后端会按 `http://127.0.0.1:${WEB_PORT}` 自动推导。
- `WEB_ORIGIN` 在后端静态托管前端、同源部署时通常不需要手动设置。
- 开发态 `webpack-dev-server` 不保证把 HMR WebSocket、调试资源或默认 favicon 请求都收口到 `/pan/`、`/apppan/`；严格子路径只保证 `make frontend-build` 后的静态产物。
- `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 用于声明 App JWT 本地验签公钥文件，默认值为 `./configs/local-public-key.pem`。
- `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 为相对路径时，按 `.env` 所在目录解析；开发态和部署态都推荐统一写 `./configs/local-public-key.pem`。
- `PAN_DATA_DIR` 用于声明运行时数据目录，默认值为 `./data`。
- `configs/` 是运行时配置目录，当前至少用于存放 `configs/mounts/*.json` 和 `configs/local-public-key.pem`。
- 挂载点主配置位于 `configs/mounts/*.json`，每个文件定义一个挂载：`{ "id": "...", "name": "...", "path": "..." }`。
- 当前前端采用“单工作区优先”展示：只配置 1 个挂载时，界面会弱化挂载名；配置多个挂载时，左侧目录树会显示多个根目录供切换。
- 应用内显示的“当前工作目录”来源于后端启动时加载的 `configs/mounts/*.json`；修改后需要重启后端。
- `PAN_MOUNTS` 仅保留兼容兜底，当 `configs/mounts/` 下没有任何运行时 `.json` 文件时才会读取。
- Web 鉴权使用 Cookie，会话签名依赖 `WEB_SESSION_SECRET`，它必须只由后端持有，否则任何人都能伪造会话。
- Web 登录密码不再读取明文，后端只接受 `AUTH_PASSWORD_HASH_BCRYPT`。
- App 鉴权只接受外部签发并由宿主注入的 Bearer token；后端使用 `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 指向的 RSA 公钥做 `RS256 JWT` 验签，不再提供本地 app 登录/刷新接口。

## 4. 部署
### 本机部署
```bash
make backend-build
make frontend-build
PAN_DATA_DIR=./data PAN_STATIC_DIR=frontend/dist ./bin/pan-api
```

生产静态托管时，`frontend/dist/index.html` 里的 JS、CSS 与 favicon 都使用相对路径，可同时挂到 `/pan/` 与 `/apppan/`，不会回退到站点根路径。

### macOS 发布目录
```bash
make package-mac
cp release/.env.example release/.env
./release/start.sh
./release/stop.sh
```

`build` 仍然只表示编译产物；`package-mac` 才会组装 `release/` 发布目录。

### 容器构建
```bash
docker build -t pan-webclient:latest .
```

容器镜像不会自动生成真实公钥文件。如果继续使用默认值 `APP_AUTH_LOCAL_PUBLIC_KEY_FILE=./configs/local-public-key.pem`，容器运行根目录下必须存在 `/app/configs/local-public-key.pem`，通常需要通过挂载或自定义镜像提供该文件；也可以显式把变量设置为容器内的绝对路径并挂载到对应位置。

### 敏感信息注入
- 生产或长期运行环境必须注入真实的 `WEB_SESSION_SECRET`、`AUTH_PASSWORD_HASH_BCRYPT` 与 `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 对应公钥文件。
- 不在仓库中提交真实用户名、密码 hash、私钥、公钥或宿主机路径；`configs/*.example.*` 只用于示例。

## 5. 运维
### 常见检查
- 确认 `configs/mounts/*.json` 指向真实可访问路径
- 确认 `WEB_PORT` 与前端开发地址一致；若手动设置了 `WEB_ORIGIN`，其值也必须与前端地址一致
- 确认 `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 指向有效的 RSA 公钥 PEM 文件
- 确认 `PAN_DATA_DIR` 可写，且其中的 `trash`、`tasks` 子目录可创建

### 常见问题排查
- Web 登录失败：检查 `PAN_ADMIN_USERNAME`、`AUTH_PASSWORD_HASH_BCRYPT` 是否与输入密码匹配
- App Bearer token 无法访问：检查宿主注入的 JWT 是否由对应私钥签发、是否过期，以及 `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 是否匹配
- 搜索结果为空：检查挂载目录是否可读，或确认文件名/路径确实匹配
- 下载任务失败：检查 `./data/tasks/artifacts` 写权限和源文件权限
- 恢复失败：确认原路径当前未被占用，且挂载点仍然存在
