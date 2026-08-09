#!/bin/bash
# ============================================================
# 甘肃新煜科技工作台 · 一键启动公网同步服务
# 用法：在终端执行  bash start-sync.sh
# 原理：自动寻找空闲端口 → 启动 Node 后端 + Cloudflare Tunnel 免费隧道
#       → 拿到公网 HTTPS 域名 → 手机/任何设备打开即实时同步
# 优势：Cloudflare Tunnel 自动重连、全球 CDN 加速，比 SSH 隧道稳定得多
# 注意：此终端窗口需保持打开（关闭则同步断开）
# ============================================================
set -e

# 项目根目录（脚本所在目录）
ROOT="$(cd "$(dirname "$0")" && pwd)"
NODE="/Users/Zhuanz/.workbuddy/binaries/node/versions/22.22.2/bin/node"
# 如果指定 node 不存在，尝试系统 node
[ -x "$NODE" ] || NODE="$(which node 2>/dev/null || echo /usr/bin/node)"

DBFILE="$ROOT/server/db.json"

# ---------- 查找 cloudflared ----------
CFBIN=""
for cf in ~/bin/cloudflared /usr/local/bin/cloudflared /opt/homebrew/bin/cloudflared "$(which cloudflared 2>/dev/null)"; do
  if [ -x "$cf" ]; then
    CFBIN="$cf"
    break
  fi
done

# 如果没找到 cloudflared，自动下载安装
if [ -z "$CFBIN" ]; then
  echo "▶ 未检测到 cloudflared，正在自动下载安装..."
  ARCH=$(uname -m)
  if [ "$ARCH" = "arm64" ]; then
    CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"
  else
    CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz"
  fi
  mkdir -p ~/bin
  TGZ="/tmp/cloudflared-download.tgz"
  curl -sL --max-time 120 -o "$TGZ" "$CF_URL" || {
    echo "  ✗ 下载失败，请检查网络后重试"
    echo "  手动安装：brew install cloudflared 或从 https://github.com/cloudflare/cloudflared/releases 下载"
    exit 1
  }
  tar xzf "$TGZ" -C ~/bin/ 2>/dev/null && chmod +x ~/bin/cloudflared
  CFBIN=~/bin/cloudflared
  if "$CFBIN" --version >/dev/null 2>&1; then
    echo "  ✓ cloudflared 安装成功"
  else
    echo "  ✗ cloudflared 安装失败"
    exit 1
  fi
fi

echo "═══════════════════════════════════════════════════════"
echo "  甘肃新煜科技工作台 · 公网同步服务启动"
echo "  （Cloudflare Tunnel · 自动重连 · 全球 CDN）"
echo "═══════════════════════════════════════════════════════"
echo ""

# ---------- 自动寻找空闲端口 ----------
echo "▶ [0/3] 自动寻找空闲端口..."
PORT=0
for try_port in 8090 8091 8092 8093 8094 8095 8096 8097 8098 8099; do
  if ! lsof -nP -iTCP:$try_port -sTCP:LISTEN >/dev/null 2>&1; then
    PORT=$try_port
    break
  fi
done
if [ $PORT -eq 0 ]; then
  echo "  ✗ 8090-8099 全部被占用，请手动释放"
  exit 1
fi
echo "  ✓ 使用端口 $PORT"
echo ""

# ---------- 1. 启动后端 ----------
echo "▶ [1/3] 启动协同后端 (端口 $PORT)..."
cd "$ROOT"
PORT=$PORT DB_PATH="$DBFILE" "$NODE" server/server.js &
SRV_PID=$!
sleep 2

# 验证后端
if curl -s --max-time 5 "http://localhost:$PORT/api/ping" | grep -q '"ok":true'; then
  echo "  ✓ 后端已启动 (PID $SRV_PID)"
else
  echo "  ✗ 后端启动失败，请检查 node 是否可用"
  kill $SRV_PID 2>/dev/null
  exit 1
fi
echo ""

# ---------- 2. 建立 Cloudflare 公网隧道 ----------
echo "▶ [2/3] 建立 Cloudflare 公网隧道..."
TUNNEL_LOG=$(mktemp)
"$CFBIN" tunnel --url http://localhost:$PORT > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!
echo "  等待分配公网域名（约 10-15 秒）..."
sleep 12

# 提取公网域名（trycloudflare.com 格式）
PUBLIC_URL=""
for i in 1 2 3 4 5; do
  PUBLIC_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$TUNNEL_LOG" | head -1)
  if [ -n "$PUBLIC_URL" ]; then
    break
  fi
  echo "  等待中... ($i/5)"
  sleep 3
done

if [ -z "$PUBLIC_URL" ]; then
  echo "  ✗ 隧道建立失败，原始输出："
  cat "$TUNNEL_LOG" | tail -10
  kill $SRV_PID $TUNNEL_PID 2>/dev/null
  exit 1
fi
echo "  ✓ 公网域名已分配：$PUBLIC_URL"
echo ""

# ---------- 3. 验证 ----------
echo "▶ [3/3] 验证公网访问..."
if curl -s --max-time 15 "$PUBLIC_URL/api/ping" | grep -q '"ok":true'; then
  echo "  ✓ 公网验证通过！实时同步已就绪"
else
  echo "  ⚠ 公网验证未通过，可能需等待几秒后重试"
  echo "  域名已分配，请手动打开 $PUBLIC_URL 确认"
fi
echo ""

echo "═══════════════════════════════════════════════════════"
echo "  ✅ 部署完成！"
echo ""
echo "  📌 公网访问地址（手机/电脑/任何设备打开）："
echo ""
echo "     $PUBLIC_URL"
echo ""
echo "  📱 手机加到主屏幕："
echo "     iPhone：Safari 打开上面地址 → 分享 → 添加到主屏幕"
echo "     鸿蒙/安卓：Chrome 打开 → 菜单 → 添加到主屏幕"
echo ""
echo "  🔑 登录账号：admin / admin888"
echo ""
echo "  ☁️ 数据实时同步：多设备同时打开此地址，"
echo "     一端修改数据，其他设备秒级刷新"
echo ""
echo "  ⚠️ 重要：保持此终端窗口打开！关闭窗口则同步服务停止。"
echo "     下次使用重新运行 bash start-sync.sh 即可。"
echo ""
echo "  💾 数据备份：管理后台 → 系统维护 → 导出全部数据（JSON）"
echo ""
echo "  🔄 Cloudflare 隧道会自动重连，比之前更稳定"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "服务运行中... 按 Ctrl+C 停止"
echo "后端 PID: $SRV_PID  |  隧道 PID: $TUNNEL_PID  |  端口: $PORT"

# 捕获退出信号，清理进程
trap "echo ''; echo '正在停止服务...'; kill $SRV_PID $TUNNEL_PID 2>/dev/null; echo '已停止，再见。'; exit 0" INT TERM
wait
