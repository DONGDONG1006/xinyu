/* 甘肃新煜科技工作台 · Service Worker（离线缓存应用壳 v6.17 · GitHub DB 同步） */
var CACHE='xy-workbench-v6.17';
var SHELL=['./','./index.html','./manifest.json','./css/app.css',
  './js/data.js','./js/gh-sync.js','./js/charts.js','./js/modules.js','./js/overview.js','./js/ai.js','./js/app.js',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png','./icons/favicon.svg',
  './icons/splash-1284x2778.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL).catch(function(){});}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){if(k!==CACHE)return caches.delete(k);}));}).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  // 协同 API（登录/SSE/共享数据）不经过缓存，直接走网络
  var _u; try{ _u=new URL(req.url); }catch(e){ _u=null; }
  if(_u && (_u.pathname.indexOf('/api/')===0 || _u.pathname.indexOf('/sync/')===0)) return;
  // 导航请求：缓存优先，失败回退到首页
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).catch(function(){return caches.match('./index.html');}));
    return;
  }
  // 静态资源：缓存优先，回退到网络
  e.respondWith(caches.match(req).then(function(m){return m||fetch(req).then(function(res){
    if(res.ok){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp);});}
    return res;
  }).catch(function(){return m;});}));
});
