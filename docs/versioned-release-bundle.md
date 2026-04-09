# 双轨版本化发布：Program Bundle + Image Bundle

## 1. 目标与边界

`pan-webclient` 的正式 release 分成两条产线：

- program bundle：宿主机直接运行的完整程序包
- image bundle：Linux 容器镜像归档

两类产物都输出到 `dist/release/`，版本号统一来自根目录 `VERSION`，格式固定为 `vX.Y.Z`。

这里的 `program` 不是把旧的容器部署包改个名字，而是一条独立的宿主机运行产线：

- 可执行程序直接提供 `/pan/`、`/apppan/` 和对应 API
- 前端静态资源以 `frontend/dist` 形式随 program bundle 分发
- program bundle 不再附带镜像 tar 或 compose 文件

## 2. 对外入口

主入口是 program bundle：

```bash
make release
```

它等价于：

```bash
make release-program
```

镜像 bundle 入口：

```bash
make release-image
```

支持的输入变量：

- `VERSION`
- `ARCH`
- `PROGRAM_TARGETS`：仅 program bundle 使用，按 `PROGRAM_TARGETS + ARCH` 构建
- `PROGRAM_TARGET_MATRIX`：仅 program bundle 使用，按 `os/arch` 矩阵构建，优先级高于 `PROGRAM_TARGETS`

产物命名规则：

- `dist/release/pan-webclient-program-vX.Y.Z-darwin-<arch>.tar.gz`
- `dist/release/pan-webclient-program-vX.Y.Z-windows-<arch>.tar.gz`
- `dist/release/pan-webclient-image-vX.Y.Z-linux-<arch>.tar.gz`

## 3. Program Bundle

### 3.1 产物定位

program bundle 是宿主机直接运行的完整交付物。它不依赖 Nginx 或 Docker 才能提供浏览器入口。

当前默认 program 目标矩阵是：

- `darwin/arm64`
- `windows/amd64`

### 3.2 构建过程

`scripts/release-program.sh` 负责：

1. 校验 `VERSION` 和 `ARCH`
2. 按优先级解析 `PROGRAM_TARGET_MATRIX` 或 `PROGRAM_TARGETS`
3. 构建一份 `frontend/dist`
4. 按目标 `OS/ARCH` 组合交叉编译 `pan-api` / `pan-api.exe`
5. 组装 program bundle
6. 压缩为最终 tar.gz

### 3.3 bundle 内容

program bundle 解压后固定包含：

```text
pan-webclient/
  .env.example
  README.txt
  pan-api | pan-api.exe
  configs/
    local-public-key.example.pem
    mounts/
      *.example.json
  frontend/
    dist/
  start.sh
  stop.sh
  release-scripts/windows/
```

其中：

- Unix bundle（darwin/linux）带 `start.sh` / `stop.sh`
- Windows bundle 带 `release-scripts/windows/start.ps1`、`stop.ps1`、`start.cmd`、`stop.cmd`
- bundle 不包含 `images/`、`compose.release.yml` 或 Docker 启停脚本

### 3.4 运行方式

program bundle 解压后：

```bash
cp .env.example .env
cp configs/local-public-key.example.pem configs/local-public-key.pem
./start.sh
```

运行后，浏览器入口为：

```text
http://127.0.0.1:${API_PORT}/pan/
```

程序模式通过 `FRONTEND_DIST_DIR` 指向 bundle 内的 `./frontend/dist`，由 Go 服务直接托管前端静态资源。

### 3.5 后端在 program 模式下承担的职责

program 模式下，Go 服务替代 Nginx，直接实现：

- `/` -> `302 /pan/`
- `/pan/*` -> 前端资源与 SPA fallback
- `/apppan/*` -> 前端资源与 SPA fallback
- `/pan/api/*` -> 转发到 canonical `/api/*`
- `/apppan/api/*` -> 转发到 canonical `/api/*`

同时保留已有 canonical API 与分享、下载等后端接口。

## 4. Image Bundle

### 4.1 产物定位

image bundle 只负责分发 Linux 镜像，不负责提供宿主机程序运行模板。

### 4.2 构建过程

`scripts/release-image.sh` 会：

1. 校验 `VERSION` 和 `ARCH`
2. 构建后端和前端 release 镜像
3. 将两个镜像一次性导出
4. 用 `gzip` 压缩成：

```text
dist/release/pan-webclient-image-vX.Y.Z-linux-<arch>.tar.gz
```

### 4.3 导入方式

```bash
gzip -dc dist/release/pan-webclient-image-v1.0.0-linux-arm64.tar.gz | docker load
```

导入后得到：

- `pan-webclient-backend:v1.0.0`
- `pan-webclient-frontend:v1.0.0`

## 5. 脚本职责分层

当前发布脚本拆成四个主文件：

- `scripts/release.sh`
  - program bundle 的薄入口
- `scripts/release-program.sh`
  - program bundle 主实现
- `scripts/release-image.sh`
  - image bundle 主实现
- `scripts/release-common.sh`
  - 公共版本、架构、目标平台与镜像命名逻辑

Program 相关附属资产：

- `scripts/release-program-assets/`
- `release-scripts/windows/`

## 6. 验证重点

- `make release` 与 `make release-program` 行为一致
- `make release-program` 默认产出 `darwin/arm64` 和 `windows/amd64` 两个 program bundle
- program bundle 内包含二进制、配置模板和 `frontend/dist`
- program bundle 不包含镜像 tar 或 compose 文件
- host-run 程序正确提供 `/pan/`、`/apppan/`、`/pan/api/*`、`/apppan/api/*`
- `make release-image` 仍只产出 Linux image bundle
- 非法 `VERSION`、非法 `ARCH`、非法 `PROGRAM_TARGETS` 或非法 `PROGRAM_TARGET_MATRIX` 会快速失败

## 7. 迁移这套模式时建议保留的骨架

- 一个版本单一来源文件，例如 `VERSION`
- 一个公共 release helper，例如 `scripts/release-common.sh`
- 明确区分 `program` 和 `image` 两条产线
- 一个固定产物目录，例如 `dist/release/`
- 一套与 program bundle 对应的宿主机启停脚本

真正值得复用的是模式：

- `make release` 指向推荐的 program 交付物
- program bundle 和 image bundle 各自有清晰职责
- program bundle 自带前端产物和运行所需配置模板
- image bundle 只表达镜像分发，不混入宿主机运行逻辑
