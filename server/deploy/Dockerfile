# 甘肃新煜科技工作台 · 协同后端镜像
# 构建上下文必须为仓库根目录：
#   docker build -f server/deploy/Dockerfile -t xinyu-workbench ..
# 一个 Node 进程同时托管 PWA（workbench-app）与 SSE 实时同步。
FROM node:20-alpine

WORKDIR /app

# 仅依赖零依赖的 server.js + 前端静态资源
COPY server/server.js /app/server.js
COPY workbench-app /app/workbench-app

ENV PORT=8090
ENV DB_PATH=/app/data/db.json

EXPOSE 8090

VOLUME ["/app/data"]

CMD ["node", "server.js"]
