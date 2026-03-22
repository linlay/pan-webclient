# pan-webclient

## 1. 项目简介
`pan-webclient` 是一个单用户私有网盘项目。当前标准架构为 Nginx-first：

- 浏览器只访问 Nginx
- Nginx 对外暴露 `/pan/`、`/apppan/`、`/pan/api/*`、`/apppan/api/*`
- 开发态额外暴露 `/hmr/ws` 供 webpack HMR 使用；除此之外，任何无二级路径的前端资源请求都不对外兼容
- Go 后端只处理内部 canonical API：`/api/*`
- 前端开发态仍使用 webpack dev server 做 HMR，但它只作为 Nginx 后面的内部服务

## 2. 快速开始
### 前置要求
- Docker Engine / Docker Desktop
- Docker Compose v2
- Go 1.26+（仅当你需要在宿主机直接执行 `make build` / `make build-backend`）
- Node.js 22+（仅当你需要在宿主机直接执行 `make build` / `make build-frontend`）

### 初始化
```bash
cp .env.example .env
cp configs/local-public-key.example.pem configs/local-public-key.pem
```

`APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 默认指向 `./configs/local-public-key.pem`。请替换成真实 RSA 公钥。

挂载点配置放在 `configs/mounts/*.json`。

### 本地开发
```bash
make run
```

`make run` 会先根据 `configs/mounts/*.json` 自动生成 `.cache/docker-compose.mounts.yml`，再调用开发态 `docker compose`。如果你直接手敲裸 `docker compose up`，这些自动生成的宿主机 bind mount 不会先被准备好。

仓库显式设置了固定容器名，所以 `docker ps` 里会看到 `pan-webclient-backend`、`pan-webclient-frontend-dev`、`pan-webclient-nginx`，不会带默认的 `-1` 后缀。

浏览器统一访问：

```text
http://127.0.0.1:${NGINX_PORT}/pan/
```

开发态 `frontend-dev` 容器内部监听标准 HTTP `80` 端口，只给 Nginx 反向代理使用，不对宿主机直接开放；浏览器不要直连该容器端口。

对外路径契约：

- UI 只允许 `/pan/*`、`/apppan/*`
- API 只允许 `/pan/api/*`、`/apppan/api/*`
- 开发态 HMR 只允许 `/hmr/ws`
- 除 `/` 会重定向到 `/pan/` 外，根路径下的 `/js/*`、`/css/*`、`/favicon*`、`/ws` 等前端资源请求一律不兼容

常用命令：

```bash
make stop
docker compose -f compose.yml -f compose.dev.yml -f .cache/docker-compose.mounts.yml logs -f nginx api frontend-dev
```

### 本地生产启动
```bash
make docker-up
```

这会启动本地生产形态的完整容器编排：

- `frontend` 使用生产镜像（Nginx + 静态资源）
- `api` 使用后端运行时镜像，而不是源码挂载 + `go run`
- 浏览器仍然只访问 Nginx 暴露的入口

它用于验证“本机 Docker Compose 下的真实生产容器形态”，不等于远程服务器部署脚本。

生产形态同样使用固定容器名，`docker ps` 里会显示 `pan-webclient-backend`、`pan-webclient-frontend`，不会带默认的 `-1` 后缀。

本地生产形态和开发形态遵守同一条对外路径规则：前端资源必须走 `/pan/*` 或 `/apppan/*`，不会保留根路径静态资源兼容入口。

常用命令：

```bash
make docker-down
docker compose -f compose.yml -f .cache/docker-compose.mounts.yml logs -f frontend api
```

## 3. 构建、运行与测试
### 一次构建前后端
```bash
make build
```

### 后端
```bash
make build-backend
```

- `make build-backend` 输出 `./bin/pan-api`

### 前端
```bash
make build-frontend
```

- `make build-frontend` 会在缺少依赖时自动执行 `npm ci`
- `make build-frontend` 输出 `./frontend/dist`

### 测试
Makefile 不再封装测试命令，直接使用各子项目原生命令：

```bash
cd backend && go test ./...
cd frontend && node --test src/api/routing.test.ts
```

### `/apppan/` smoke test
先启动开发环境或本地生产环境，再准备一个能被 `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 对应公钥验签的 `RS256 JWT`：

```bash
APPPAN_BEARER_TOKEN='你的-jwt-token' make apppan-smoke
```

默认验证入口：

```text
http://127.0.0.1:${NGINX_PORT}/apppan/api
```

### 基础 `curl` 测试
启动 `make run` 或 `make docker-up` 后，可以先做最小链路验证。对外入口建议始终打到 Nginx，而不是直接打 Go 服务。

先验证无鉴权健康检查：

```bash
curl -i http://127.0.0.1:${NGINX_PORT:-11946}/pan/api/health
curl -i http://127.0.0.1:${NGINX_PORT:-11946}/apppan/api/health
```

期望返回 `200 OK`，响应体类似：

```json
{"status":"ok"}
```

若重点验证 App 链路，先准备 Bearer Token，再用 `/apppan/api` 做最小检查：

```bash
export APPPAN_BASE_URL="http://127.0.0.1:${NGINX_PORT:-11946}/apppan/api"
export APPPAN_BEARER_TOKEN='你的-jwt-token'

curl -sS \
  -H "Authorization: Bearer ${APPPAN_BEARER_TOKEN}" \
  "${APPPAN_BASE_URL}/web/session/me"

curl -sS \
  -H "Authorization: Bearer ${APPPAN_BEARER_TOKEN}" \
  "${APPPAN_BASE_URL}/mounts"
```

如果本机装了 `jq`，可以继续验证首个挂载点的目录树和文件列表：

```bash
MOUNT_ID="$(
  curl -sS \
    -H "Authorization: Bearer ${APPPAN_BEARER_TOKEN}" \
    "${APPPAN_BASE_URL}/mounts" | jq -r '.[0].id'
)"

curl -sS \
  -H "Authorization: Bearer ${APPPAN_BEARER_TOKEN}" \
  "${APPPAN_BASE_URL}/tree?mountId=${MOUNT_ID}&path=%2F"

curl -sS \
  -H "Authorization: Bearer ${APPPAN_BEARER_TOKEN}" \
  "${APPPAN_BASE_URL}/files?mountId=${MOUNT_ID}&path=%2F"
```

想一次性跑完上述 App 冒烟检查，直接使用仓库脚本：

```bash
APPPAN_BEARER_TOKEN='你的-jwt-token' make apppan-smoke
```

## 4. 配置契约
`.env.example` 是环境变量契约，`.env` 不提交。

关键变量：

- `NGINX_PORT`：浏览器访问端口，默认 `11946`
- `API_PORT`：Go API 容器监听端口，默认 `8080`
- `WEB_SESSION_SECRET`：Web Cookie Session 签名密钥，必填
- `AUTH_PASSWORD_HASH_BCRYPT`：管理员密码 bcrypt hash，必填；在 Docker Compose 使用的仓库根 `.env` 中必须保留单引号，避免 `$2y$10$...` 被 Compose 当成变量插值；后端在读取运行时环境时会兼容剥离首尾成对引号
- `APP_AUTH_LOCAL_PUBLIC_KEY_FILE`：App Bearer Token 验签公钥，必填；相对路径按 `.env` 所在目录解析
- `PAN_DATA_DIR`：运行时数据目录，默认 `./data`；相对路径按 `.env` 所在目录解析

Web 登录当前依赖容器或运行环境内存在 `htpasswd` 命令；如果你自定义后端镜像，需要把该命令一并打进去，否则服务会在启动期直接报错而不是错误地返回 `INVALID_CREDENTIALS`。

运行时数据目录约定：

- 根目录 `./data` 是唯一默认运行时数据目录，解析基准是 `.env` 所在目录，不是进程当前工作目录
- 历史遗留 `apps/` 目录已废弃，不再承载数据、前端工程或构建产物
- 如需把数据放到别处，覆盖 `PAN_DATA_DIR`，不要重新引入 `apps/`

结构化运行时配置：

- `configs/`：完整配置根目录的一部分，部署时应整体可见，不要只挂某个子文件
- `configs/mounts/*.json`：挂载点定义；`source` 和相对 `path` 都按 `.env` 所在目录解析
- `configs/local-public-key.pem`：JWT 验签公钥

## 5. 容器路径约定
本项目支持在启动前根据 `configs/mounts/*.json` 自动生成 `api` 服务的 bind mount。推荐使用下面的结构：

```json
{
  "id": "downloads",
  "name": "下载",
  "source": "/Users/linlay-macmini/Downloads",
  "path": "/mnt/pan/downloads",
  "readOnly": true
}
```

字段说明：

- `id`：挂载点标识，必填
- `name`：挂载点名称，必填
- `source`：宿主机路径，可选；存在时项目启动入口会自动为 `api` 生成 bind mount
- `path`：容器内访问路径，可选；省略时默认等于 `source`
- `readOnly`：是否只读，可选，默认 `false`

兼容规则：

- 旧格式 `{ "id": "...", "name": "...", "path": "..." }` 仍然支持
- 但旧格式只定义运行时挂载点，不会自动生成宿主机 bind mount
- 要让本地 compose 启动时自动生效，请改用带 `source` 的新结构

容器内实际访问的一直是 `path`，所以它应该写容器内路径，而不是宿主机路径。例如：

```json
{
  "id": "home",
  "name": "Home",
  "source": "/Users/yourname/Home",
  "path": "/mnt/pan/home"
}
```

项目启动入口会自动把宿主机目录 bind mount 到 `/mnt/pan/home`。如果是你自己的 deployment / compose 体系，也要遵守同样的 source->path 映射关系。

默认开发 compose 只会把仓库挂到 `/workspace`，不会自动暴露宿主机任意目录。如果你要浏览仓库外目录，需要自行扩展 compose 挂载。

如果开发和生产需要不同挂载点，应该提供不同的 `configs/mounts/*.json` 内容或不同的挂载源；不要在代码里再分一套 dev/prod 路径解析逻辑。

## 6. 正式发布
`README.md` 是仓库级发布与部署主入口；离线包内的 `README.txt` 只补充 bundle 解压后的最小操作说明。

版本化离线 bundle 的设计、脚本职责、产物结构和跨项目复用建议，见 [docs/versioned-release-bundle.md](docs/versioned-release-bundle.md)。

### 版本规则
- 正式发布只认 Git tag，格式固定为 `vX.Y.Z`
- 每次本地构建只产出一个单架构 bundle：
  - `pan-webclient-vX.Y.Z-linux-arm64.tar.gz`
  - `pan-webclient-vX.Y.Z-linux-amd64.tar.gz`
- 产物输出目录固定为 `dist/release/`
- `arm64` 推荐在 Mac arm64 主机上构建
- `amd64` 推荐在 Windows/x86_64 主机上构建
- Mac 上构建 `amd64` 仅作为兜底方案，速度更慢，也更容易失败

### 本地构建正式发布 bundle
当前发布流程已经收敛为一步式入口：

Mac / Linux:

```bash
make release VERSION=v1.0.0 ARCH=arm64
```

Windows x86_64（PowerShell，需可用 `bash`）:

```powershell
$env:VERSION="v1.0.0"
$env:ARCH="amd64"
bash scripts/release.sh
```

该命令会一次性完成以下工作：
- 按目标架构构建后端和前端 release 镜像
- 组装离线部署目录结构
- 输出最终 bundle 到 `dist/release/pan-webclient-v1.0.0-linux-<arch>.tar.gz`

当前仓库不再提供 `build-release`、`package-release`、`check-release` 三段式命令，也不需要在 `make release` 前单独执行 `make build`。

### 离线 bundle 内容
每个 bundle 内固定包含：
- 两个镜像 tar：`images/pan-webclient-backend.tar`、`images/pan-webclient-frontend.tar`
- `compose.release.yml`
- `.env.example`
- `start.sh`、`stop.sh`
- `README.txt`
- `data/`
- `configs/local-public-key.example.pem`
- `configs/mounts/*.example.json`

### 手工上传
产物生成后，先手工上传，不依赖 GitHub Actions：

- GitHub Release：手工创建 release，再上传对应架构的 `pan-webclient-vX.Y.Z-linux-*.tar.gz`
- 自有服务器：建议上传到 `${repo}/${version}/`，例如 `pan-webclient/v1.0.0/`

示例：

```bash
scp dist/release/pan-webclient-v1.0.0-linux-arm64.tar.gz user@your-server:/srv/releases/pan-webclient/v1.0.0/
```

### 离线部署步骤
从 GitHub Release 或自有制品库下载与你目标主机架构一致的 bundle 后：

```bash
tar -xzf pan-webclient-v1.0.0-linux-amd64.tar.gz
cd pan-webclient
cp .env.example .env
cp configs/local-public-key.example.pem configs/local-public-key.pem
./start.sh
```

如需挂载宿主机目录，再补做这一步：

```bash
cp configs/mounts/home.example.json configs/mounts/home.json
```

部署注意点：
- `configs/local-public-key.pem` 必须替换成真实 RSA 公钥
- 如需启用挂载点，把 `configs/mounts/*.example.json` 复制为 `.json` 后再修改
- `start.sh` 会在本地镜像不存在时自动从 `images/*.tar` 执行 `docker load`
- `start.sh` 会自动根据 `configs/mounts/*.json` 生成 `.runtime/docker-compose.mounts.yml`
- 浏览器入口为 `http://127.0.0.1:${NGINX_PORT:-11946}/pan/`

### 升级与回滚
- 升级：下载新版本 bundle，解压后复用原有 `.env`、`configs/`、`data/`，执行 `./start.sh`
- 回滚：停止当前版本后，切回上一版本 bundle 并重新执行 `./start.sh`
- `compose.release.yml` 只引用预构建镜像，不在部署端执行 `build`

### 手工镜像调试
```bash
docker build -f backend/Dockerfile -t pan-webclient-backend:debug .
docker build -f frontend/Dockerfile -t pan-webclient-frontend:debug .
```

标准部署拓扑：
- `pan-webclient-frontend`：唯一对外入口，负责静态资源和 `/pan/api`、`/apppan/api` 代理
- `pan-webclient-backend`：内网服务，只监听 `/api/*`

## 7. 运维与排查
- 浏览器入口始终是 Nginx，不要直接访问 Go 端口
- 若 `/pan/api/*` 返回 502，先检查 `api` 容器是否启动、`API_PORT` 是否一致
- 若页面能打开但静态资源 404，先检查前端是否从 Nginx 提供，而不是误连到 Go
- 若挂载为空或访问失败，开发态先检查 `.cache/docker-compose.mounts.yml`，正式 release bundle 则检查 `.runtime/docker-compose.mounts.yml` 是否包含预期的 `source -> path` bind mount
- 若 App Bearer Token 无法访问，检查 JWT 是否由匹配私钥签发、是否过期，以及 `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 是否正确
