/* ============================================================
   甘肃新煜科技工作台 · Cloudflare Pages Functions 后端
   能力：API 路由 + KV 云端存储 + 多设备数据同步（轮询模式）
   优势：永久在线、全球 CDN、免费额度充足（10万读/天、1000写/天）
   ============================================================
   KV 存储：
     - "sharedDB"     → 最新共享数据库 JSON
     - "dbVersion"    → 数据版本号（每次写入递增）
     - "session:<token>" → 会话信息 {name, role, ts}
     - "presence"     → 在线用户列表 JSON（带时间戳，60秒过期）
   ============================================================ */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

function json(res, obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: CORS
  });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch (e) {
    return {};
  }
}

/* 清理过期会话（60秒无心跳） */
async function cleanPresence(env) {
  try {
    const raw = await env.DB.get('presence');
    if (!raw) return [];
    const users = JSON.parse(raw);
    const now = Date.now();
    const active = users.filter(u => now - u.ts < 60000);
    if (active.length !== users.length) {
      await env.DB.put('presence', JSON.stringify(active));
    }
    return active;
  } catch (e) {
    return [];
  }
}

/* 更新在线状态 */
async function updatePresence(env, token, user) {
  const users = await cleanPresence(env);
  const idx = users.findIndex(u => u.token === token);
  const entry = { token, name: user.name, role: user.role, ts: Date.now() };
  if (idx >= 0) users[idx] = entry;
  else users.push(entry);
  await env.DB.put('presence', JSON.stringify(users));
  return users;
}

/* 主路由：处理所有 /api/* 请求 */
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  /* 健康检查 */
  if (path === '/api/ping') {
    return json(request, { ok: true, ts: Date.now() });
  }

  /* 数据快照（无需鉴权，返回最新 DB + 版本号） */
  if (path === '/api/snapshot') {
    try {
      const raw = await env.DB.get('sharedDB');
      const version = await env.DB.get('dbVersion') || '0';
      const db = raw ? JSON.parse(raw) : null;
      return json(request, { ok: true, db, version });
    } catch (e) {
      return json(request, { ok: true, db: null, version: '0' });
    }
  }

  /* 版本检查（轻量，仅返回版本号，用于高效轮询） */
  if (path === '/api/version') {
    try {
      const version = await env.DB.get('dbVersion') || '0';
      return json(request, { ok: true, version });
    } catch (e) {
      return json(request, { ok: true, version: '0' });
    }
  }

  /* 在线状态 */
  if (path === '/api/presence') {
    const token = url.searchParams.get('token');
    if (token) {
      try {
        const sessionRaw = await env.DB.get('session:' + token);
        if (sessionRaw) {
          const session = JSON.parse(sessionRaw);
          const users = await updatePresence(env, token, session);
          return json(request, { ok: true, users });
        }
      } catch (e) {}
    }
    const users = await cleanPresence(env);
    return json(request, { ok: true, users });
  }

  return json(request, { ok: false, msg: 'not found' }, 404);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const body = await readBody(request);

  /* 登录注册（前端已完成本地校验，仅登记 token） */
  if (path === '/api/login') {
    if (body.token) {
      const token = String(body.token);
      const session = { name: body.name || body.user || '来宾', role: body.role || 'guest', ts: Date.now() };
      try {
        await env.DB.put('session:' + token, JSON.stringify(session));
      } catch (e) {}
      return json(request, { ok: true, token });
    }
    return json(request, { ok: false, msg: '缺少 token' }, 400);
  }

  /* 写入数据（需有效 session） */
  if (path === '/api/db') {
    try {
      const sessionRaw = await env.DB.get('session:' + body.token);
      if (!sessionRaw) {
        return json(request, { ok: false, msg: '未登录' }, 403);
      }
      if (body.db) {
        await env.DB.put('sharedDB', JSON.stringify(body.db));
        /* 递增版本号 */
        const oldVer = parseInt(await env.DB.get('dbVersion') || '0', 10);
        await env.DB.put('dbVersion', String(oldVer + 1));
        /* 更新心跳 */
        const session = JSON.parse(sessionRaw);
        await updatePresence(env, body.token, session);
      }
      return json(request, { ok: true });
    } catch (e) {
      return json(request, { ok: false, msg: '写入失败' }, 500);
    }
  }

  return json(request, { ok: false, msg: 'not found' }, 404);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}
