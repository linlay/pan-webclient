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
- `API_PORT`：Go 服务监听端口，默认 `8080`；在 host-run program bundle 中，这也是浏览器访问端口
- `FRONTEND_DIST_DIR`：host-run program bundle 使用的前端静态资源目录；容器部署可留空
- `WEB_SESSION_SECRET`：Web Cookie Session 签名密钥，必填
- `AUTH_PASSWORD_HASH_BCRYPT`：管理员密码 bcrypt hash，必填；在 Docker Compose 使用的仓库根 `.env` 中必须保留单引号，避免 `$2y$10$...` 被 Compose 当成变量插值；后端在读取运行时环境时会兼容剥离首尾成对引号
- `APP_AUTH_LOCAL_PUBLIC_KEY_FILE`：App Bearer Token 验签公钥，必填；相对路径按 `.env` 所在目录解析
- `PAN_DATA_DIR`：运行时数据目录，默认 `./data`；相对路径按 `.env` 所在目录解析

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
`README.md` 是仓库级发布与部署主入口；各 release bundle 内的 `README.txt` 只补充解压后的最小操作说明。

版本化离线 bundle 的设计、脚本职责、产物结构和跨项目复用建议，见 [docs/versioned-release-bundle.md](docs/versioned-release-bundle.md)。

### 版本规则
- 正式发布只认 Git tag，格式固定为 `vX.Y.Z`
- 发布产物分两条线：
  - program bundle：`pan-webclient-program-vX.Y.Z-darwin-<arch>.tar.gz` / `pan-webclient-program-vX.Y.Z-windows-<arch>.tar.gz`
  - image bundle：`pan-webclient-image-vX.Y.Z-linux-<arch>.tar.gz`
- 产物输出目录固定为 `dist/release/`
- `release` / `release-program` 默认固定打 `darwin/arm64` 和 `windows/amd64`
- `release-image` 固定打 Linux 镜像产物

### 本地构建正式发布 bundle
主入口是 host-run 的 program bundle：

Mac / Linux:

```bash
make release VERSION=v1.0.0
```

它等价于：

```bash
make release-program VERSION=v1.0.0
```

也可以显式指定矩阵：

```bash
PROGRAM_TARGET_MATRIX=darwin/arm64,windows/amd64 make release-program VERSION=v1.0.0
```

也可以继续使用旧的单架构覆盖方式：

```bash
PROGRAM_TARGETS=darwin make release-program VERSION=v1.0.0 ARCH=arm64
PROGRAM_TARGETS=windows make release-program VERSION=v1.0.0 ARCH=amd64
```

变量优先级：
- 设置了 `PROGRAM_TARGET_MATRIX` 时，按 `os/arch` 矩阵构建
- 否则如果设置了 `PROGRAM_TARGETS`，按 `PROGRAM_TARGETS + ARCH` 构建
- 否则默认使用 `darwin/arm64,windows/amd64`

该命令会一次性完成以下工作：
- 构建一份 `frontend/dist`
- 按目标平台交叉编译 `pan-api` / `pan-api.exe`
- 组装 host-run program bundle
- 输出到 `dist/release/pan-webclient-program-v1.0.0-<target-os>-<arch>.tar.gz`

导出原始镜像 bundle：

```bash
make release-image VERSION=v1.0.0 ARCH=arm64
```

该命令会：
- 按目标架构构建后端和前端 release 镜像
- 把两个镜像一起导出成一个可直接 `docker load` 的 gzip 压缩包
- 输出产物到 `dist/release/pan-webclient-image-v1.0.0-linux-<arch>.tar.gz`

当前仓库不再提供 `build-release`、`package-release`、`check-release` 三段式命令，也不需要在 `make release` 前单独执行 `make build`。

### Program bundle 内容
program bundle 固定包含：
- `pan-api` 或 `pan-api.exe`
- `.env.example`
- `README.txt`
- `configs/local-public-key.example.pem`
- `configs/mounts/*.example.json`
- `frontend/dist/`
- Unix（darwin/linux）: `start.sh`、`stop.sh`
- Windows: `release-scripts/windows/start.ps1`、`stop.ps1`、`start.cmd`、`stop.cmd`

program bundle 不包含 Docker 镜像 tar，也不包含 `compose.release.yml`。

### Image bundle 内容
image bundle 是单个 gzip 压缩后的 Docker 镜像归档，导入后会同时得到：
- `pan-webclient-backend:$VERSION`
- `pan-webclient-frontend:$VERSION`

### 手工上传
产物生成后，先手工上传，不依赖 GitHub Actions：

- GitHub Release：手工创建 release，再上传对应架构的 program bundle 或 image bundle
- 自有服务器：建议上传到 `${repo}/${version}/`，例如 `pan-webclient/v1.0.0/`

示例：

```bash
scp dist/release/pan-webclient-program-v1.0.0-darwin-arm64.tar.gz user@your-server:/srv/releases/pan-webclient/v1.0.0/
```

### Program bundle 启动
从 GitHub Release 或自有制品库下载目标平台对应的 program bundle 后：

```bash
tar -xzf pan-webclient-program-v1.0.0-darwin-arm64.tar.gz
cd pan-webclient
cp .env.example .env
cp configs/local-public-key.example.pem configs/local-public-key.pem
./start.sh
```

Windows 使用：

```powershell
copy .env.example .env
copy configs\local-public-key.example.pem configs\local-public-key.pem
release-scripts\windows\start.cmd
```

如需挂载宿主机目录，再补做：

```bash
cp configs/mounts/home.example.json configs/mounts/home.json
```

部署注意点：
- `configs/local-public-key.pem` 必须替换成真实 RSA 公钥
- 如需启用挂载点，把 `configs/mounts/*.example.json` 复制为 `.json` 后再修改
- `FRONTEND_DIST_DIR` 默认应指向 program bundle 内的 `./frontend/dist`
- 浏览器入口为 `http://127.0.0.1:${API_PORT:-8080}/pan/`

### Image bundle 导入

```bash
gzip -dc dist/release/pan-webclient-image-v1.0.0-linux-arm64.tar.gz | docker load
```

### 升级与回滚
- program bundle 升级：下载新版本 bundle，解压后复用原有 `.env`、`configs/`、`data/`，执行新的启动脚本
- program bundle 回滚：停止当前版本后，切回上一版本 bundle 并重新执行启动脚本
- image bundle 只负责分发镜像，不直接附带 compose 运行模板

### 手工镜像调试
```bash
docker build -f backend/Dockerfile -t pan-webclient-backend:debug .
docker build -f frontend/Dockerfile -t pan-webclient-frontend:debug .
```

标准运行拓扑：
- image 模式：`pan-webclient-frontend` 作为对外入口，代理到 `pan-webclient-backend`
- program 模式：`pan-api` 直接提供 `/pan/`、`/apppan/` 和对应 API

## 7. 运维与排查
- image 模式下浏览器入口始终是 Nginx，不要直接访问 Go 容器端口
- program 模式下浏览器直接访问 `API_PORT`
- 若 `/pan/api/*` 返回 502，先检查 image 模式里的 `api` 容器是否启动、`API_PORT` 是否一致
- 若 program 模式页面能打开但静态资源 404，先检查 `FRONTEND_DIST_DIR` 是否指向正确的 `frontend/dist`
- 若挂载为空或访问失败，开发态先检查 `.cache/docker-compose.mounts.yml`；program 模式则检查 `configs/mounts/*.json` 是否指向预期宿主机目录
- 若 App Bearer Token 无法访问，检查 JWT 是否由匹配私钥签发、是否过期，以及 `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 是否正确

## 8. 桌面集成

pan-webclient 通过插件系统导入 zenmind-desktop。

### 打包插件
```bash
make release-program
```

产物为 `dist/release/pan-webclient-program-*.tar.gz`，包含 `manifest.json`。

### 安装
在 zenmind-desktop 控制中心点击"安装插件"，选择上述 tar.gz 包。

### 登录鉴权
桌面端通过 RS256 JWT 自动建立网盘会话：
1. zenmind-desktop 持有 RSA 私钥，签发短期 JWT
2. pan-webclient 使用 `APP_AUTH_LOCAL_PUBLIC_KEY_FILE` 指向的公钥验签
3. 验签通过后，`/api/app/session/exchange` 端点签发 Web Session Cookie

密钥对由 zenmind-app-server 管理。zenmind-desktop 可通过 `panAuth.setupFromAppServer` 从认证服务导出密钥对，再通过 `panAuth.distributePublicKey` 将公钥写入 pan-webclient 的 `configs/local-public-key.pem`。
