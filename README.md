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

### 本地启动后端
```bash
make backend-run
```

### 本地启动前端
```bash
make frontend-install
make frontend-dev
```

### 构建
```bash
make backend-build
make frontend-build
```

### 测试
```bash
make backend-test
```

## 3. 配置说明
- 所有环境变量契约以 `.env.example` 为准，`.env` 不提交。
- 后端内置默认配置位于 `backend/internal/config/application.yml`，优先级低于环境变量。
- `APP_PORT` 控制后端监听端口，`WEB_PORT` 控制前端 Vite 开发端口。
- `WEB_ORIGIN` 显式配置时用于后端 CORS；未配置时后端会按 `http://127.0.0.1:${WEB_PORT}` 自动推导。
- `WEB_ORIGIN` 在后端静态托管前端、同源部署时通常不需要手动设置。
- `PAN_DATA_DIR` 用于声明运行时数据目录，默认值为 `./data`。
- 挂载点主配置位于 `configs/mounts/*.json`，每个文件定义一个挂载：`{ "id": "...", "name": "...", "path": "..." }`。
- 当前前端采用“单工作区优先”展示：只配置 1 个挂载时，界面会弱化挂载名；配置多个挂载时，左侧目录树会显示多个根目录供切换。
- 应用内显示的“当前工作目录”来源于后端启动时加载的 `configs/mounts/*.json`；修改后需要重启后端。
- `PAN_MOUNTS` 仅保留兼容兜底，当 `configs/mounts/` 下没有任何运行时 `.json` 文件时才会读取。
- Web 鉴权使用 Cookie，会话签名依赖 `WEB_SESSION_SECRET`，它必须只由后端持有，否则任何人都能伪造会话。
- Web 登录密码不再读取明文，后端只接受 `AUTH_PASSWORD_HASH_BCRYPT`。
- App 鉴权只接受外部签发并由宿主注入的 Bearer token；后端使用 `AUTH_APP_PUBLIC_KEY_FILE` 指向的 RSA 公钥做 `RS256 JWT` 验签，不再提供本地 app 登录/刷新接口。

## 4. 部署
### 本机部署
```bash
make backend-build
make frontend-build
PAN_DATA_DIR=./data PAN_STATIC_DIR=frontend/dist ./bin/pan-api
```

### 容器构建
```bash
docker build -t pan-webclient:latest .
```

### 敏感信息注入
- 生产或长期运行环境必须注入真实的 `WEB_SESSION_SECRET`、`AUTH_PASSWORD_HASH_BCRYPT` 与 `AUTH_APP_PUBLIC_KEY_FILE`。
- 不在仓库中提交真实用户名、密码 hash、私钥、公钥或宿主机路径；`configs/*.example.*` 只用于示例。

## 5. 运维
### 常见检查
- 确认 `configs/mounts/*.json` 指向真实可访问路径
- 确认 `WEB_PORT` 与前端开发地址一致；若手动设置了 `WEB_ORIGIN`，其值也必须与前端地址一致
- 确认 `AUTH_APP_PUBLIC_KEY_FILE` 指向有效的 RSA 公钥 PEM 文件
- 确认 `PAN_DATA_DIR` 可写，且其中的 `trash`、`tasks` 子目录可创建

### 常见问题排查
- Web 登录失败：检查 `PAN_ADMIN_USERNAME`、`AUTH_PASSWORD_HASH_BCRYPT` 是否与输入密码匹配
- App Bearer token 无法访问：检查宿主注入的 JWT 是否由对应私钥签发、是否过期，以及 `AUTH_APP_PUBLIC_KEY_FILE` 是否匹配
- 搜索结果为空：检查挂载目录是否可读，或确认文件名/路径确实匹配
- 下载任务失败：检查 `./data/tasks/artifacts` 写权限和源文件权限
- 恢复失败：确认原路径当前未被占用，且挂载点仍然存在
