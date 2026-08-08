#!/usr/bin/env bash
# 甘肃新煜科技工作台 · 后端一键部署（适用于一台有公网 IP 的 Linux 云主机）
# 用途：在你的服务器上跑起协同后端 → 一个进程同时托管 PWA 与多设备实时同步。
# 用法：
#   1) 把整个仓库上传到服务器某目录（例如 /opt/xinyu-workbench）
#   2) 在该目录执行：  bash server/deploy/deploy.sh
#   3) 防火墙放行 8090（docker 模式已自动映射）；访问 http://<公网IP>:8090
#   4) 若要域名+HTTPS，再按 server/deploy/nginx-xinyu.conf 配置 Nginx + certbot
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "==> 工作台目录: $APP_DIR"

# 优先使用 Docker（最省心，自带进程守护与数据卷）
if command -v docker >/dev/null 2>&1 && command -v docker compose >/dev/null 2>&1; then
  echo "==> 检测到 Docker，使用容器方式部署"
  cd "$APP_DIR"
  docker compose -f server/deploy/docker-compose.yml up -d --build
  echo "==> 已启动： http://<本机公网IP>:8090"
  exit 0
fi

# 退化方案：Node 直接跑 + pm2 守护
echo "==> 未检测到 Docker，使用 Node + pm2"
command -v node >/dev/null 2>&1 || { echo "请先安装 Node.js 20+"; exit 1; }

mkdir -p /opt/xinyu-workbench 2>/dev/null || true
if [ "$APP_DIR" != "/opt/xinyu-workbench" ]; then
  echo "==> 复制仓库到 /opt/xinyu-workbench"
  rm -rf /opt/xinyu-workbench && cp -r "$APP_DIR" /opt/xinyu-workbench
fi

cd /opt/xinyu-workbench
command -v pm2 >/dev/null 2>&1 || npm install -g pm2
export PORT=8090 DB_PATH=/opt/xinyu-workbench/server/db.json
pm2 start server/server.js --name xinyu-workbench --update-env
pm2 save
echo "==> 已启动（pm2 守护）： http://<本机公网IP>:8090"
echo "==> 开机自启： pm2 startup 并按提示执行输出命令"
