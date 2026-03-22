# 版本化离线打包方案

## 1. 目标与边界

这套方案的目标，是把项目产出成一个带明确版本号、单目标架构、可离线部署的 release bundle，方便上传到 GitHub Release、自建制品库或内网服务器，再由部署端直接解压运行。

它解决的是“如何交付可运行版本”，不是“如何分发源码”或“如何保留构建中间产物”：

- 交付物是一个最终 bundle，而不是源码压缩包。
- bundle 内包含预构建镜像和最小部署资产，部署端不需要源码构建环境。
- 每次构建只产出一个目标架构 bundle，不做多架构合包。

当前仓库的版本单一来源是根目录 `VERSION` 文件，正式版本格式固定为 `vX.Y.Z`。仓库级发布约定里把正式版本管理为 Git tag；脚本实现层面，`scripts/release.sh` 当前直接校验传入的 `VERSION` 是否匹配 `vX.Y.Z`。以当前项目为例，版本为 `v0.1.0` 时，最终产物命名规则为：

- `pan-webclient-v0.1.0-linux-arm64.tar.gz`
- `pan-webclient-v0.1.0-linux-amd64.tar.gz`

## 2. 方案总览

从可复用的角度看，这套方案可以拆成四层：

1. 版本层：用一个单一来源文件统一管理版本号。
2. 构建层：按目标架构构建后端和前端 release 镜像。
3. 组装层：把镜像 tar、compose 文件、启动脚本、配置模板一起组装成离线目录。
4. 交付层：把离线目录再压成最终 bundle，输出到固定产物目录。

在 `pan-webclient` 里，上面四层分别落在这些位置：

- 版本来源：`VERSION`
- 构建入口：`make release` / `scripts/release.sh`
- 模板资产：`scripts/release-assets/`
- 最终产物目录：`dist/release/`

这个模型复用到别的项目时，项目名、镜像名、配置文件内容都可以换，但“四层结构”建议保留。

## 3. 本项目是怎么打包的

### 3.1 打包入口

本项目的一步式正式发布入口是：

```bash
make release
```

`Makefile` 最终会把 `VERSION` 和 `ARCH` 传给 `scripts/release.sh`：

```bash
VERSION=$(VERSION) ARCH=$(ARCH) bash scripts/release.sh
```

也可以直接执行脚本：

```bash
bash scripts/release.sh
```

常见用法：

```bash
make release VERSION=v1.0.0 ARCH=arm64
make release VERSION=v1.0.0 ARCH=amd64
```

其中：

- `VERSION` 默认读取根目录 `VERSION`
- `ARCH` 未显式传入时，会按 `uname -m` 自动识别为 `amd64` 或 `arm64`
- 脚本内部会把 `ARCH` 转成 `linux/<arch>` 作为 Docker buildx 的目标平台

### 3.2 打包输入

`scripts/release.sh` 的主要输入包括：

- 版本号：`VERSION` 文件或环境变量 `VERSION`
- 目标架构：环境变量 `ARCH` 或当前机器架构
- 容器构建定义：`backend/Dockerfile`、`frontend/Dockerfile`
- release 模板资产：`scripts/release-assets/compose.release.yml`
- release 模板资产：`scripts/release-assets/start.sh`
- release 模板资产：`scripts/release-assets/stop.sh`
- release 模板资产：`scripts/release-assets/README.txt`
- 配置模板：`.env.example`
- 配置模板：`configs/local-public-key.example.pem`
- 挂载配置示例：`configs/mounts/*.example.json`

脚本还会强校验版本格式：

- 只接受 `vX.Y.Z`
- 不符合时直接失败，不继续构建

这里要区分两层约束：

- 发布流程约束：README 约定正式发布版本应对应 Git tag
- 脚本实现约束：`scripts/release.sh` 只关心 `VERSION` 最终是否是合法的 `vX.Y.Z`

### 3.3 构建过程

打包脚本先构建两个 release 镜像：

- 后端镜像：`pan-webclient-backend:<VERSION>`
- 前端镜像：`pan-webclient-frontend:<VERSION>`

对应命令由 `docker buildx build` 完成，并直接导出为 Docker 镜像 tar，而不是只留在本机 build cache：

```bash
docker buildx build \
  --platform "linux/$ARCH" \
  --file backend/Dockerfile \
  --tag "pan-webclient-backend:$VERSION" \
  --output "type=docker,dest=.../pan-webclient-backend.tar" \
  .
```

```bash
docker buildx build \
  --platform "linux/$ARCH" \
  --file frontend/Dockerfile \
  --tag "pan-webclient-frontend:$VERSION" \
  --output "type=docker,dest=.../pan-webclient-frontend.tar" \
  .
```

这两个镜像的职责很清楚：

- 后端镜像提供 Go API 服务，同时内置 `composemounts` 工具
- 前端镜像提供 Nginx 和已构建好的静态资源

### 3.4 组装过程

镜像构建完成后，脚本会在临时目录组装一个标准离线目录 `pan-webclient/`，然后把下面这些内容拷进去：

- `images/pan-webclient-backend.tar`
- `images/pan-webclient-frontend.tar`
- `compose.release.yml`
- `start.sh`
- `stop.sh`
- `README.txt`
- `.env.example`
- `configs/local-public-key.example.pem`
- `configs/mounts/*.example.json`
- 空的 `data/` 目录

同时会做一个关键处理：把 bundle 内 `.env.example` 里的 `PAN_VERSION` 改成当前构建版本，保证部署端复制 `.env.example` 后，默认镜像标签就和 bundle 内镜像一致。

### 3.5 最终输出

最后一步是把整个 `pan-webclient/` 目录压缩成最终 bundle：

```bash
dist/release/pan-webclient-vX.Y.Z-linux-<arch>.tar.gz
```

这就是对外分发的正式交付物，也是“带版本打包”真正要产出的文件。

## 4. 打哪些包，产物分别在哪里

建议把“包”区分成两层看：镜像层产物和交付层产物。

### 4.1 镜像层产物

镜像层产物存在于 bundle 的 `images/` 目录中：

- `images/pan-webclient-backend.tar`
- `images/pan-webclient-frontend.tar`

它们不是最终对外分发文件，但它们是 bundle 的核心内容。部署端如果本机还没有对应标签的镜像，`start.sh` 会自动从这里执行 `docker load`。

### 4.2 交付层产物

交付层产物只有一个，就是最终离线 bundle：

- `dist/release/pan-webclient-vX.Y.Z-linux-arm64.tar.gz`
- `dist/release/pan-webclient-vX.Y.Z-linux-amd64.tar.gz`

注意：

- 每次构建只会产出其中一个架构包
- `dist/release/` 是固定输出目录，适合做上传、归档和校验入口
- `dist/` 已被 `.gitignore` 忽略，不进入版本库

### 4.3 bundle 解压后的运行时结构

bundle 解压后，目录大致如下：

```text
pan-webclient/
  .env.example
  compose.release.yml
  start.sh
  stop.sh
  README.txt
  images/
    pan-webclient-backend.tar
    pan-webclient-frontend.tar
  configs/
    local-public-key.example.pem
    mounts/
      *.example.json
  data/
```

部署启动后，还会在本地生成一些运行时文件：

- `.env`：由使用者从 `.env.example` 复制并填入真实配置
- `configs/local-public-key.pem`：真实 RSA 公钥
- `configs/mounts/*.json`：真实挂载配置
- `.runtime/docker-compose.mounts.yml`：启动时动态生成的挂载 compose override

这些文件里，最重要的职责分别是：

- `.env`：控制版本号、端口、鉴权和运行参数
- `configs/`：保存部署端特有配置，不进镜像
- `data/`：保存运行期数据，便于升级和回滚时复用
- `.runtime/`：保存启动时生成的临时编排文件，不作为交付资产

## 5. 部署端如何消费这些包

这套方案的关键，不是“如何把 bundle 传过去”，而是“部署端拿到 bundle 后不用重新 build”。

### 5.1 标准部署步骤

部署端拿到 bundle 后，最小步骤是：

```bash
tar -xzf pan-webclient-v1.0.0-linux-amd64.tar.gz
cd pan-webclient
cp .env.example .env
cp configs/local-public-key.example.pem configs/local-public-key.pem
./start.sh
```

如果需要挂载宿主机目录，再补充：

```bash
cp configs/mounts/home.example.json configs/mounts/home.json
```

### 5.2 `start.sh` 做了什么

`scripts/release-assets/start.sh` 是离线 bundle 的实际启动入口，它按顺序完成这些事情：

1. 校验 `.env` 是否存在。
2. 校验 `configs/local-public-key.pem` 是否存在。
3. 校验宿主机上有 Docker Engine 和 docker compose v2。
4. 从 `.env` 读取 `PAN_VERSION`。
5. 计算出要启动的镜像标签：
   - `pan-webclient-backend:$PAN_VERSION`
   - `pan-webclient-frontend:$PAN_VERSION`
6. 如果本机没有这些镜像，就从 `images/*.tar` 自动执行 `docker load`。
7. 创建 `.runtime/`、`data/`、`configs/mounts/` 等运行目录。
8. 运行后端镜像内置的 `/app/composemounts`，生成 `.runtime/docker-compose.mounts.yml`。
9. 执行：

```bash
docker compose -f compose.release.yml -f .runtime/docker-compose.mounts.yml up -d
```

这意味着部署端完全不需要重新编译前后端，也不需要持有源码。

### 5.3 `stop.sh` 做了什么

`stop.sh` 使用同一组 compose 文件执行：

```bash
docker compose -f compose.release.yml -f .runtime/docker-compose.mounts.yml down --remove-orphans
```

它的职责很单纯：按当前版本配置停止 release bundle 启动的容器。

### 5.4 `compose.release.yml` 的角色

release compose 和开发 compose 的思路不同：

- 它只引用预构建镜像
- 它不在部署端执行 `build`
- 它把配置和数据目录从宿主机挂到容器

以当前项目为例：

- `api` 服务使用 `pan-webclient-backend:${PAN_VERSION:-latest}`
- `frontend` 服务使用 `pan-webclient-frontend:${PAN_VERSION:-latest}`

这就是这套方案可以离线部署的根本原因。

## 6. 升级、回滚与交付建议

### 6.1 升级

升级时，建议下载新版本 bundle，解压到新目录后复用旧目录里的这些内容：

- `.env`
- `configs/`
- `data/`

然后执行新的 `./start.sh`。这样既切换了镜像版本，也保留了部署端配置和数据。

### 6.2 回滚

回滚时，停止当前版本后，切回上一版 bundle 目录，再执行上一版的 `./start.sh` 即可。

这个模型成立的前提是：

- 每个版本都有自己独立的 bundle
- 配置和数据目录可以在相邻版本间复用
- 镜像标签和 `PAN_VERSION` 保持一致

### 6.3 上传建议

当前仓库是手工上传产物，不依赖 GitHub Actions。常见放置方式有两种：

- GitHub Release：上传 `dist/release/` 下对应架构的 bundle
- 自有服务器：按 `${repo}/${version}/` 组织，例如 `pan-webclient/v1.0.0/`

这部分不是脚本强约束，但建议在别的项目里也保持“固定产物目录 + 固定文件命名”，这样后续接自动化最省心。

## 7. 复用到其他项目时必须保留的最小骨架

如果你要把这套做法迁移到其他项目，建议至少保留下面这些结构和约定。

### 7.1 必保留的文件与目录

- 一个版本单一来源文件，例如 `VERSION`
- 一个统一 release 脚本，例如 `scripts/release.sh`
- 一个 release 模板目录，例如 `scripts/release-assets/`
- 一个固定产物目录，例如 `dist/release/`
- 一个部署端环境变量模板，例如 `.env.example`

### 7.2 必保留的流程约束

- 版本号必须在打包前确定，且来自单一来源
- 每次构建只产出一个目标架构包
- 必须先构建 release 镜像，再导出成 tar
- 必须把镜像 tar 和部署资产一起打进 bundle
- 部署端只能依赖 Docker / docker compose，不依赖源码构建工具链
- 部署端启动入口应是脚本，而不是要求人工手写 `docker compose` 命令

### 7.3 建议一起保留的命名规则

- bundle 文件名中包含：项目名、版本号、目标 OS、目标架构
- 镜像标签直接使用版本号
- 产物目录固定，避免不同版本到处散落

如果别的项目沿用这个模式，一个很常见的替换清单是：

- 项目名
- 后端镜像名
- 前端镜像名
- release compose 服务名
- `.env.example` 中的业务配置项
- 启动脚本中的访问入口地址

## 8. 本项目特有实现 vs 可复用通用做法

### 8.1 通用做法

下面这些是值得跨项目复用的核心模式：

- 用 `VERSION` 作为版本单一来源
- 只接受正式语义化版本格式
- 一次只构建一个目标架构 bundle
- 通过 `docker buildx build` 直接导出镜像 tar
- 用“镜像 tar + compose + 启停脚本 + 配置模板”组成离线 bundle
- bundle 解压后可直接启动，不要求再构建镜像

### 8.2 `pan-webclient` 的项目特有实现

下面这些属于当前项目的具体落地，迁移时通常需要改名或替换：

- 镜像命名：`pan-webclient-backend`、`pan-webclient-frontend`
- bundle 命名：`pan-webclient-vX.Y.Z-linux-<arch>.tar.gz`
- 挂载 override 生成方式：通过后端镜像内置的 `composemounts`
- 公钥文件约定：`configs/local-public-key.pem`
- 挂载配置约定：`configs/mounts/*.json`
- 浏览器入口约定：`http://127.0.0.1:${NGINX_PORT:-11946}/pan/`
- release compose 中的服务划分：`api` + `frontend`

复用时，优先保留“模式”，再替换“项目名和业务配置”。这样复用成本最低，也最不容易把脚本耦死在某一个仓库里。

## 9. 对其他项目的落地建议

如果你准备在另一个项目里复用，建议按下面顺序落地：

1. 先确定最终交付物是不是也要做成“单 bundle 离线部署包”。
2. 定义版本单一来源和 bundle 命名规则。
3. 确定要预构建的镜像集合。
4. 准备 release-assets 目录，把 compose、启停脚本、README 模板放进去。
5. 写一个统一 release 脚本，把“构建镜像 tar -> 组装目录 -> 压缩输出”串起来。
6. 固定产物目录和上传路径。
7. 最后再根据项目差异替换镜像名、配置项和访问入口。

对大多数内部项目来说，这套模式最适合下面这类场景：

- 目标环境网络受限
- 部署端不方便安装完整构建工具链
- 需要版本明确、升级回滚简单
- 希望交付物能直接发给运维或客户使用

## 10. 本项目里的关键文件索引

为了后续复用时快速对照，本项目当前的关键文件如下：

- `VERSION`：版本号单一来源
- `Makefile`：`make release` 的外层入口
- `scripts/release.sh`：正式打包主脚本
- `scripts/release-assets/compose.release.yml`：release 编排模板
- `scripts/release-assets/start.sh`：release 启动脚本
- `scripts/release-assets/stop.sh`：release 停止脚本
- `scripts/release-assets/README.txt`：bundle 内最小操作说明
- `.env.example`：部署环境变量模板

如果后续这套方案继续演进，优先更新这些文件和本文档，避免 README、脚本和实际交付行为出现偏差。
