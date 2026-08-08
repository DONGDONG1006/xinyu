# 部署到公有云（Railway / Render / Fly.io）— 云端实时同步

> 适用版本：v6.6 ｜ 零依赖 Node 后端 `server/server.js` ＋ 前端 PWA `workbench-app/`
> 目标：把工作台发布为**长期稳定的公网地址**，多设备（Mac / Win / iPhone / 安卓）打开同一域名即**实时数据同步**。

---

## 0. 先搞清两种部署形态

| 形态 | 做法 | 同步怎么开 | 适合谁 |
|------|------|-----------|--------|
| **A. 全栈同域部署（推荐）** | 把整个仓库（前端 ＋ `server.js`）一起部署到云平台，平台同时托管 PWA 和 `/api` | **打开平台域名 → 登录 → 自动连同源后端，零配置同步** | 想要「一个链接搞定一切」 |
| **B. 静态前端 ＋ 独立后端（混合）** | 前端丢到任意静态托管（CloudStudio / Vercel / GitHub Pages），后端自己跑在一台常驻服务器 | 前端「管理员 → 平台管理后台 → 系统设置 → 协同服务地址」填后端域名后开启 | 已有服务器 / 想前后端分离 |

本仓库已内置 **形态 A** 所需的一切：

```
server/deploy/
  Dockerfile            # 单进程同时托管 PWA 与 SSE 同步（构建上下文=仓库根）
  docker-compose.yml    # 一台机 docker compose 一把梭
  railway.toml          # Railway 一键部署配置（含 /data 持久卷）
  render.yaml           # Render Blueprints 配置（含 /data 磁盘）
  fly.toml              # Fly.io 配置（香港区域，/data 卷）
  nginx-xinyu.conf      # 域名 + HTTPS 反代（SSE 长连接关键配置已含）
  xinyu-workbench.service  # systemd 守护单元
  deploy.sh             # 一键部署脚本（自动选 Docker 或 Node+pm2）
```

> 形态 B 的脚本与静态托管，见根目录 `README.md` 第四节。

---

## 1. 第 0 步：把仓库推到 GitHub

本机仓库尚未初始化 git。在仓库根目录执行：

```bash
cd <本仓库目录>
git init -b main
git add .
git commit -m "甘肃新煜科技工作台 v6.6 · 全栈可部署"

# 在 GitHub 新建一个空仓库（不要勾 README/.gitignore），然后：
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

推送前请确认 `.gitignore` 已生效（不会包含 `.workbuddy/`、`server/db.json`、`*.bak` 等）。

---

## 2. 第 1 步：选一个云平台一键部署

三家都**读同一个 `server/deploy/Dockerfile`**，区别只在控制台点几下。任选其一。

### 方案 ① Railway（最省心，推荐新手）

1. 打开 https://railway.app → 用 GitHub 登录。
2. **New Project → Deploy from GitHub Repo** → 选本仓库。
3. Railway 自动读取 `railway.toml`：用 `server/deploy/Dockerfile` 构建、挂持久卷 `/data`。
4. 部署完成后，项目页 **Settings → Domains** 会分配一个公网域名，形如：
   ```
   https://xinyu-workbench.up.railway.app
   ```
5. 免费版有休眠（闲置后冷启动约几秒）；付费 `$5/月` 常驻无休眠。

### 方案 ② Render

1. 打开 https://render.com → 用 GitHub 登录。
2. **New → Blueprints** → 连接本仓库，Render 自动读取 `render.yaml`（最省事）；
   或 **New → Web Service → 选本仓库 → Environment 选 Docker → Dockerfile 路径填 `server/deploy/Dockerfile`**。
3. 部署完成后分配域名，形如：
   ```
   https://xinyu-workbench.onrender.com
   ```
4. Free 方案的磁盘是**临时盘**（实例重启可能清空 `db.json`）。应对：
   - 方案 a：升级为付费磁盘（render.yaml 已声明 `disk`，付费即持久）；
   - 方案 b：保持免费，用 App 内「管理员 → 导出全部数据」定期下载 JSON 备份。

### 方案 ③ Fly.io（延迟低，可选香港区域）

```bash
# 1) 安装并登录 flyctl
curl -L https://fly.io/install.sh | sh && fly auth login

# 2) 在仓库根初始化（按提示命名、选区域，如 hkg 香港）
fly launch --no-deploy

# 3) 创建持久卷
fly volumes create xinyu_data --region hkg --size 1

# 4) 部署（读取 fly.toml）
fly deploy
```

部署后分配域名，形如 `https://xinyu-workbench.fly.dev`。

---

## 3. 第 2 步：验证 + 开始用

**① 健康检查**（确认后端活着）：

```bash
curl https://<你的域名>/api/ping
# 期望返回：{"ok":true,"ts":...}
```

**② 浏览器打开你的域名** → 用前端内置管理员账号登录：

| 账号 | 密码 | 角色 |
|------|------|------|
| `admin` | `admin888` | 管理员 |

> 形态 A（同域部署）下，**登录即自动连同源后端**，顶栏出现「⦿ 云端同步已连接」。
> 首次登录后建议：管理员后台开通业务人员账号、并修改默认密码。

**③ 多设备实时同步验证**：

- 手机 Safari / Chrome 打开同一域名并登录 → 顶栏显示同一在线头像；
- 在电脑端改一条数据（如新增一个项目）→ 手机端**秒级自动刷新**一致；
- 手机「添加到主屏幕」即变为全屏独立 APP（PWA，离线可用）。

---

## 4. 第 3 步（可选）：自有域名 + HTTPS + VPS

若你有云服务器（有公网 IP）或想绑自己的域名：

### 方案 a：Docker Compose 一把梭（推荐）

```bash
# 在服务器上（仓库根目录）
docker compose -f server/deploy/docker-compose.yml up -d --build
# 访问 http://<公网IP>:8090
```

### 方案 b：systemd 守护 ＋ Nginx 反代

```bash
# 1) 放好单元文件并启动
sudo cp server/deploy/xinyu-workbench.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now xinyu-workbench

# 2) 放 Nginx 反代（已含 SSE 关键配置：proxy_buffering off 等）
sudo cp server/deploy/nginx-xinyu.conf /etc/nginx/sites-available/xinyu-workbench
sudo ln -s /etc/nginx/sites-available/xinyu-workbench /etc/nginx/sites-enabled/
sudo sed -i 's/workbench.你的域名.com/workbench.example.com/' /etc/nginx/sites-available/xinyu-workbench
sudo nginx -t && sudo systemctl reload nginx

# 3) 免费 HTTPS（自动签发并改写 443 段）
sudo certbot --nginx -d workbench.example.com
```

### 方案 c：不想买服务器？用 Cloudflare Tunnel 免费穿透

```bash
# 本机跑后端后，一条命令拿公网 HTTPS 域名（无需开放端口/备案）
cloudflared tunnel --url http://localhost:8090
```

---

## 5. 数据安全与运维

- **数据落盘**：协同后端把全量数据写入 `db.json`。Railway / Render / Fly 已挂载 `/data` 卷（`DB_PATH=/data/db.json`）；Docker Compose 落在卷 `xinyu-data`。
- **备份**：管理员后台「导出全部数据」下载 JSON；或定时 `cp server/db.json 备份路径/`。
- **恢复**：管理员后台「导入数据」即可把备份还原并广播到所有设备。
- **鉴权说明**：当前为演示级——前端做密码哈希存于本机/同步库，后端 `/api/login` 走 token 注册模式（不校验密码，仅登记在线状态）。**正式对外发布前**，请接入企业微信 / 钉钉 / OAuth，并在服务端加盐存储密码、`db.json` 加访问鉴权。
- **端口**：后端监听 `PORT`（默认 8090，云平台自动注入）；静态根指向 `workbench-app/`；已绑定 `0.0.0.0`。

---

## 6. 故障排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 打开域名是前端但顶栏无「同步」 | 形态 B 未填后端地址，或后端没起 | 同域部署则确认 `/api/ping` 通；混合部署去后台填「协同服务地址」 |
| `/api/ping` 返回 404 | 部署的不是全栈镜像（只传了前端） | 确认用了 `server/deploy/Dockerfile`，而非纯静态托管 |
| 同步连上但数据不更新 | SSE 被代理缓冲 | Nginx 必须含 `proxy_buffering off;`（本仓库 nginx-xinyu.conf 已含） |
| Render 免费版数据丢失 | 临时盘重启清空 | 升级付费磁盘，或定期「导出全部数据」备份 |
| 手机添加主屏后是网页不是 APP | 未走 HTTPS / manifest 未识别 | 必须用 **https** 域名打开；确认 `manifest.json` 可访问 |
