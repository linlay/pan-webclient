pan-webclient — 离线部署包

本文件只说明 bundle 解压后的最小操作。仓库级发布流程、上传方式和版本约束请查看源码仓库根 README。

部署步骤
========

1. 复制 .env.example 为 .env，填入真实配置值。
2. 复制 configs/local-public-key.example.pem 为 configs/local-public-key.pem，
   替换为你的真实 RSA 公钥。
3. 如需挂载外部目录，复制 configs/mounts/*.example.json 为 *.json 并修改路径。
4. 运行 ./start.sh 启动服务。
5. 浏览器访问 http://127.0.0.1:11946/pan/（实际端口取决于 .env 中的 NGINX_PORT）。
6. 运行 ./stop.sh 停止服务。

目录说明
========

.env.example                  — 环境变量模板
docker-compose.release.yml    — 容器编排
start.sh                      — 启动脚本（会按需加载 images/*.tar，并生成 .runtime/docker-compose.mounts.yml）
stop.sh                       — 停止脚本
README.txt                    — 本文件
configs/                      — 配置文件与挂载示例
data/                         — 运行时数据目录
images/                       — Docker 镜像 tar 文件

注意事项
========

- 需要 Docker Engine 20+ 和 docker compose v2。
- .env 中的 PAN_VERSION 必须与镜像标签一致；打包产物中的 .env.example 已默认写入当前版本。
- configs/local-public-key.pem 是必需文件，缺失时 start.sh 会报错。
- 如未创建任何 mounts 配置，start.sh 仍会生成空的 .runtime/docker-compose.mounts.yml 后启动。
