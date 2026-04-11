pan-webclient program bundle

本文件只说明 program bundle 解压后的最小操作。镜像发布和容器部署仍沿用原有 release-image 流程。

启动步骤
========

1. 复制 .env.example 为 .env，并填入真实配置值。
2. 如需独立宿主机运行，复制 configs/local-public-key.example.pem 为 configs/local-public-key.pem。
3. 如需挂载外部目录，复制 configs/mounts/*.example.json 为 *.json 并修改路径。
4. 运行 ./deploy.sh 预创建运行目录。
5. 运行 ./start.sh --daemon（Windows 使用 start.ps1 --daemon）启动服务。
6. 浏览器访问 http://127.0.0.1:8080/pan/（实际端口取决于 .env 中的 API_PORT）。
7. 运行 ./stop.sh 停止服务。

目录说明
========

.env.example                  — 环境变量模板
backend/pan-api               — 宿主机可执行程序
frontend/dist/                — 已构建的前端静态资源
start.* / stop.* / deploy.*   — 生命周期脚本
scripts/program-common.*      — 共享运行时辅助脚本
configs/                      — 公钥模板与挂载示例
