#!/bin/bash
# ============================================================
# 甘肃新煜科技工作台 · 一键启动公网同步服务
# 用法：在终端执行  bash start-sync.sh
# 原理：启动 Node 后端(8090) + localhost.run 免费内网穿透隧道
#       → 拿到公网 HTTPS 域名 → 手机/任何设备打开即实时同步
# 注意：此终端窗口需保持打开（关闭则同步断开）
# ============================================================
set -e

# 项目根目录（脚本所在目录）
ROOT="$(cd "$(dirname "$0")" && pwd)"
NODE="/Users/Zhuanz/.workbuddy/binaries/node/versions/22.22.2/bin/node"
# 如果指定 node 不存在，尝试系统 node
[ -x "$NODE" ] || NODE="$(which node 2>/dev/null || echo /usr/bin/node)"

PORT=8090
DBFILE="$ROOT/server/db.json"

echo "═══════════════════════════════════════════════════════"
echo "  甘肃新煜科技工作台 · 公网同步服务启动"
echo "═══════════════════════════════════════════════════════"
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

# ---------- 2. 建立公网隧道 ----------
echo "▶ [2/3] 建立公网隧道 (localhost.run 免费服务)..."
TUNNEL_LOG=$(mktemp)
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:$PORT nokey@localhost.run > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!
echo "  等待分配公网域名（约 10 秒）..."
sleep 12

# 提取公网域名
PUBLIC_URL=$(grep -o 'https://[a-z0-9]*\.lhr\.life' "$TUNNEL_LOG" | head -1)

if [ -z "$PUBLIC_URL" ]; then
  echo "  ✗ 隧道建立失败，原始输出："
  cat "$TUNNEL_LOG"
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
fi
echo ""

echo "═══════════════════════════════════════════════════════"
echo "  ✅ 部署完成！"
echo ""
echo "  📌 公网访问地址（手机/电脑/任何设备打开）："
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
echo "     下次使用重新运行 bash start-sync.sh 即可（域名会变）。"
echo ""
echo "  💾 数据备份：管理后台 → 系统维护 → 导出全部数据（JSON）"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "服务运行中... 按 Ctrl+C 停止"
echo "后端 PID: $SRV_PID  |  隧道 PID: $TUNNEL_PID"

# 捕获退出信号，清理进程
trap "echo ''; echo '正在停止服务...'; kill $SRV_PID $TUNNEL_PID 2>/dev/null; echo '已停止，再见。'; exit 0" INT TERM
wait
