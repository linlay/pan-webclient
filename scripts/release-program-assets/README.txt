pan-webclient program bundle

本文件只说明 program bundle 解压后的最小操作。仓库级发布流程、镜像发布和版本约束请查看源码仓库根 README。

启动步骤
========

1. 复制 .env.example 为 .env，并填入真实配置值。
2. 复制 configs/local-public-key.example.pem 为 configs/local-public-key.pem，
   替换为你的真实 RSA 公钥。
3. 如需挂载外部目录，复制 configs/mounts/*.example.json 为 *.json 并修改路径。
4. 运行 ./start.sh（Windows 使用 release-scripts/windows/start.cmd 或 start.ps1）。
5. 浏览器访问 http://127.0.0.1:8080/pan/（实际端口取决于 .env 中的 API_PORT）。
6. 运行 ./stop.sh（Windows 使用 release-scripts/windows/stop.cmd 或 stop.ps1）停止服务。

目录说明
========

.env.example                  — 环境变量模板
start.sh / stop.sh            — Unix（darwin/linux）启停脚本
release-scripts/windows/      — Windows 启停脚本
README.txt                    — 本文件
configs/                      — 配置文件与挂载示例
frontend/dist/                — 已构建的前端静态资源
pan-api / pan-api.exe         — 宿主机可执行程序

注意事项
========

- `FRONTEND_DIST_DIR` 默认指向 `./frontend/dist`，用于 host-run program 模式。
- 程序会直接提供 `/pan/`、`/apppan/`、`/pan/api/*`、`/apppan/api/*`，不依赖 Nginx。
- `.env` 中的 `API_PORT` 同时是浏览器入口端口和 API 监听端口。
