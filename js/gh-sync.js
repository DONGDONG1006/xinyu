/* GitHub DB 同步模块 —— 用 GitHub 仓库做云端数据库，无需额外注册任何平台 */
/* 读取: GET /repos/{owner}/{repo}/contents/data/db.json  → base64 解码 */
/* 写入: PUT /repos/{owner}/{repo}/contents/data/db.json  → base64 编码 + SHA */
/* 同步: 每 10 秒轮询，SHA 变化则拉取最新数据 */

var GH_CFG = (function(){ try { return JSON.parse(localStorage.getItem('xy_gh')||'{}'); }catch(e){ return {}; } })();
var GH_SHA = ''; /* 当前文件 SHA，更新时需带上 */
var GH_TIMER = null;

function ghSaveCfg(token, owner, repo) {
  GH_CFG = { token: token, owner: owner, repo: repo };
  try { localStorage.setItem('xy_gh', JSON.stringify(GH_CFG)); } catch(e) {}
}

function ghEnabled() { return !!(GH_CFG.token && GH_CFG.owner && GH_CFG.repo); }

function ghApi(path, method, body) {
  var url = 'https://api.github.com/repos/' + GH_CFG.owner + '/' + GH_CFG.repo + '/contents/' + path;
  var opts = { method: method||'GET', headers: { 'Authorization': 'token ' + GH_CFG.token, 'Accept': 'application/vnd.github+json', 'User-Agent': 'xinyu-workbench' } };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return fetch(url, opts).then(function(r){ return r.json(); });
}

/* 从 GitHub 拉取最新 DB */
function ghFetchDB(cb) {
  cb = cb || function(){};
  if (!ghEnabled()) { cb(); return; }
  ghApi('data/db.json').then(function(j) {
    if (j && j.content && j.sha) {
      GH_SHA = j.sha;
      try {
        var db = JSON.parse(atob(j.content.replace(/\n/g, '')));
        if (db) { DB = db; saveDBNoPush(); bindSyncAndRender(); }
      } catch(e) {}
    }
    cb();
  }).catch(function(){ cb(); });
}

/* 推送 DB 到 GitHub */
function ghPushDB() {
  if (!ghEnabled()) return;
  var content = btoa(unescape(encodeURIComponent(JSON.stringify(DB))));
  var body = { message: 'sync: ' + new Date().toISOString(), content: content };
  if (GH_SHA) body.sha = GH_SHA;
  ghApi('data/db.json', 'PUT', body).then(function(j) {
    if (j && j.content && j.content.sha) GH_SHA = j.content.sha;
  }).catch(function(){});
}

/* 启动 GitHub DB 轮询（10 秒间隔） */
function ghStartPolling() {
  if (GH_TIMER) clearInterval(GH_TIMER);
  GH_TIMER = setInterval(function() {
    if (!SUPPRESS_SYNC) ghFetchDB(function(){});
  }, 10000);
}
