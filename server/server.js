/* ============================================================
   甘肃新煜科技工作台 · 协同后端（零依赖 Node）
   能力：静态资源托管 + 登录鉴权 + 共享数据 + SSE 实时广播
   目标：多设备（MacBook / Windows / iPhone / 华为）协同编辑与联动
   运行：node server/server.js   （端口可用 PORT 环境变量覆盖，默认 8090）
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', 'workbench-app');
const PORT = process.env.PORT || 8090;
const DBFILE = process.env.DB_PATH || path.join(__dirname, 'db.json');

/* 演示账号（生产请接企业微信/钉钉/OAuth 并加密存储） */
const USERS = [
  { user: 'admin', pass: 'xy2026',  name: '系统管理员', role: '管理员' },
  { user: 'zhang', pass: '123456', name: '张总',       role: '管理者' },
  { user: 'li',    pass: '123456', name: '李总',       role: '管理者' },
  { user: 'wang',  pass: '123456', name: '王工',       role: '业务'   },
  { user: 'zhao',  pass: '123456', name: '赵经理',     role: '业务'   }
];

const sessions = new Map(); // token -> {name, role}
const clients = new Map();  // token -> {user, res}

let sharedDB = null;
try { if (fs.existsSync(DBFILE)) sharedDB = JSON.parse(fs.readFileSync(DBFILE, 'utf8')); } catch (e) { sharedDB = null; }
function saveShared() {
  if (!sharedDB) return;
  try {
    const dir = path.dirname(DBFILE);
    if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DBFILE, JSON.stringify(sharedDB));
  } catch (e) {}
}

function send(res, obj) { try { res.write('data: ' + JSON.stringify(obj) + '\n\n'); } catch (e) {} }
function presence() {
  const users = [];
  clients.forEach(c => users.push(c.user));
  clients.forEach(c => send(c.res, { type: 'presence', users: users }));
}

function mime(p) {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (p.endsWith('.json')) return 'application/json; charset=utf-8';
  if (p.endsWith('.svg')) return 'image/svg+xml';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function serveStatic(req, res) {
  const url = req.url.split('?')[0];
  let fp = path.join(ROOT, url === '/' ? 'index.html' : url);
  fp = path.normalize(fp);
  if (fp.indexOf(ROOT) !== 0) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': mime(fp) });
    res.end(data);
  });
}

function readBody(req, cb) {
  let b = '';
  req.on('data', d => { b += d; if (b.length > 5e6) req.destroy(); });
  req.on('end', () => { try { cb(JSON.parse(b || '{}')); } catch (e) { cb({}); } });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');

  /* -------- 协同 API -------- */
  if (u.pathname.indexOf('/api/') === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    /* 健康检查（监控 / 探针用） */
    if (u.pathname === '/api/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ts: Date.now() }));
      return;
    }

    if (u.pathname === '/api/login' && req.method === 'POST') {
      readBody(req, d => {
        /* 协同注册模式：前端已完成本地账号校验，仅登记 token 用于在线状态与广播 */
        if (d.token) {
          const token = String(d.token);
          sessions.set(token, { name: d.name || d.user || '来宾', role: d.role || 'guest' });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, token }));
          return;
        }
        /* 兼容旧版：直接用服务端演示账号校验 */
        const user = USERS.filter(x => x.user === d.user && x.pass === d.pass)[0];
        if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, msg: '用户名或密码错误' })); return; }
        const token = crypto.randomBytes(12).toString('hex');
        sessions.set(token, { name: user.name, role: user.role });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, token, user: { name: user.name, role: user.role } }));
      });
      return;
    }

    /* 数据快照（无需鉴权，供前端登录前拉取最新用户列表） */
    if (u.pathname === '/api/snapshot' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, db: sharedDB }));
      return;
    }

    if (u.pathname === '/api/db' && req.method === 'POST') {
      readBody(req, d => {
        if (!sessions.get(d.token)) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, msg: '未登录' })); return; }
        if (d.db) { sharedDB = d.db; saveShared(); broadcast({ type: 'update', db: sharedDB, by: sessions.get(d.token).name }, d.token); }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }

    if (u.pathname === '/api/stream' && req.method === 'GET') {
      const token = u.searchParams.get('token');
      const me = sessions.get(token);
      if (!me) { res.writeHead(403); res.end('unauthorized'); return; }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
      res.write('retry: 3000\n\n');
      clients.set(token, { user: me, res: res });
      send(res, { type: 'snapshot', db: sharedDB, by: me.name });
      presence();
      req.on('close', () => { clients.delete(token); presence(); });
      return;
    }

    res.writeHead(404); res.end('not found');
    return;
  }

  /* -------- 静态资源（PWA 外壳） -------- */
  serveStatic(req, res);
});

function broadcast(obj, exceptToken) {
  clients.forEach((c, token) => { if (token !== exceptToken) send(c.res, obj); });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('甘肃新煜科技工作台 · 协同服务已启动');
  console.log('本机访问：http://localhost:' + PORT);
  console.log('局域网/外部访问：http://<本机IP>:' + PORT + '  （手机/其他设备用同一地址打开即可多设备协同）');
});
