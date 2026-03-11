# pan-webclient

## 1. 项目简介
`pan-webclient` 是一个单用户私有网盘项目。当前标准架构为 Nginx-first：

- 浏览器只访问 Nginx
- Nginx 对外暴露 `/pan/`、`/apppan/`、`/pan/api/*`、`/apppan/api/*`
- Go 后端只处理内部 canonical API：`/api/*`
- 前端开发态仍使用 webpack dev server 做 HMR，但它只作为 Nginx 后面的内部服务

## 2. 快速开始
### 前置要求
- Docker Engine / Docker Desktop
- Docker Compose v2
- Go 1.26+（仅当你需要在宿主机直接执行 `make backend-test` / `make backend-build`）
- Node.js 22+（仅当你需要在宿主机直接执行 `make frontend-build` / `make frontend-test`）

### 初始化
```bash
cp .env.example .env
cp configs/local-public-key.example.pem configs/local-public-key.pem
```

`APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 默认指向 `./configs/local-public-key.pem`。请替换成真实 RSA 公钥。

挂载点配置放在 `configs/mounts/*.json`。

### 本地开发
```bash
make dev-up
```

浏览器统一访问：

```text
http://127.0.0.1:${NGINX_PORT}/pan/
```

开发态 `frontend-dev` 容器内部监听标准 HTTP `80` 端口，只给 Nginx 反向代理使用，不对宿主机直接开放；浏览器不要直连该容器端口。

常用命令：

```bash
make dev-logs
make dev-down
```

### 本地生产链路模拟
```bash
make prod-sim-up
```

这会使用前端生产镜像（Nginx + 静态资源）联调 Go API，用于验证静态部署链路。

关闭：

```bash
make prod-sim-down
```

## 3. 构建与测试
### 后端
```bash
make backend-build
make backend-test
```

- `make backend-build` 输出 `./bin/pan-api`

### 前端
```bash
make frontend-install
make frontend-build
make frontend-test
```

- `make frontend-build` 输出 `./frontend/dist`

### `/apppan/` smoke test
先启动开发环境或生产模拟环境，再准备一个能被 `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 对应公钥验签的 `RS256 JWT`：

```bash
APPPAN_BEARER_TOKEN='你的-jwt-token' make apppan-smoke
```

默认验证入口：

```text
http://127.0.0.1:${NGINX_PORT}/apppan/api
```

## 4. 配置契约
`.env.example` 是环境变量契约，`.env` 不提交。

关键变量：

- `NGINX_PORT`：浏览器访问端口，默认 `11946`
- `API_PORT`：Go API 容器监听端口，默认 `8080`
- `WEB_SESSION_SECRET`：Web Cookie Session 签名密钥，必填
- `AUTH_PASSWORD_HASH_BCRYPT`：管理员密码 bcrypt hash，必填；在 Docker Compose 使用的仓库根 `.env` 中必须保留单引号，避免 `$2y$10$...` 被 Compose 当成变量插值；后端在读取运行时环境时会兼容剥离首尾成对引号
- `APP_AUTH_LOCAL_PUBLIC_KEY_FILE`：App Bearer Token 验签公钥，必填
- `PAN_DATA_DIR`：运行时数据目录，默认 `./data`

Web 登录当前依赖容器或运行环境内存在 `htpasswd` 命令；如果你自定义后端镜像，需要把该命令一并打进去，否则服务会在启动期直接报错而不是错误地返回 `INVALID_CREDENTIALS`。

运行时数据目录约定：

- 根目录 `./data` 是唯一默认运行时数据目录
- 历史遗留 `apps/` 目录已废弃，不再承载数据、前端工程或构建产物
- 如需把数据放到别处，覆盖 `PAN_DATA_DIR`，不要重新引入 `apps/`

结构化运行时配置：

- `configs/mounts/*.json`：挂载点定义
- `configs/local-public-key.pem`：JWT 验签公钥

## 5. 容器路径约定
本项目已经切换到容器优先架构，`configs/mounts/*.json` 中的 `path` 应该写容器内路径，而不是宿主机路径。

例如：

```json
{
  "id": "home",
  "name": "Home",
  "path": "/mnt/pan/home"
}
```

然后在你的 compose / deployment 里把宿主机目录 bind mount 到 `/mnt/pan/home`。

默认开发 compose 只会把仓库挂到 `/workspace`，不会自动暴露宿主机任意目录。如果你要浏览仓库外目录，需要自行扩展 compose 挂载。

## 6. 镜像构建
### 后端镜像
```bash
docker build -f backend/Dockerfile -t pan-api:latest .
```

### 前端网关镜像
```bash
docker build -f frontend/Dockerfile -t pan-frontend-nginx:latest .
```

标准部署拓扑：

- `pan-frontend-nginx`：唯一对外入口，负责静态资源和 `/pan/api`、`/apppan/api` 代理
- `pan-api`：内网服务，只监听 `/api/*`

## 7. 运维与排查
- 浏览器入口始终是 Nginx，不要直接访问 Go 端口
- 若 `/pan/api/*` 返回 502，先检查 `api` 容器是否启动、`API_PORT` 是否一致
- 若页面能打开但静态资源 404，先检查前端是否从 Nginx 提供，而不是误连到 Go
- 若挂载为空或访问失败，先确认 `configs/mounts/*.json` 写的是容器内路径，并且对应目录已被 bind mount
- 若 App Bearer Token 无法访问，检查 JWT 是否由匹配私钥签发、是否过期，以及 `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 是否正确
