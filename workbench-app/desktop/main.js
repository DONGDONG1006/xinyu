/* ============================================================
   甘肃新煜科技工作台 · 独立桌面客户端（Electron 外壳）
   作用：把 Web 工作台打包成可双击运行的桌面 APP（Mac/Windows/Linux）
   运行：cd desktop && npm install && npm start
   打包：npm install -g electron-builder && npm run dist
   ============================================================ */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.PORT || 8090;

/* 定位 server/server.js：开发态在 ../server，打包后在 resources/app/server */
function findServer(){
  const cands = [
    path.join(__dirname, '..', 'server', 'server.js'),
    path.join(__dirname, 'server', 'server.js'),
    (process.resourcesPath ? path.join(process.resourcesPath, 'app', 'server', 'server.js') : null)
  ].filter(Boolean);
  for (const c of cands){ if (fs.existsSync(c)) return c; }
  return null;
}

let serverProc = null;
function startServer(){
  const srv = findServer();
  if (!srv){ console.warn('未找到协同后端 server/server.js，将以离线模式（file://）启动'); return null; }
  try{
    serverProc = spawn(process.platform === 'win32' ? 'node.exe' : 'node', [srv], {
      env: Object.assign({}, process.env, { PORT: String(PORT) }),
      stdio: 'ignore'
    });
    return serverProc;
  }catch(e){ console.warn('启动协同后端失败：', e.message); return null; }
}

function serverReady(cb){
  let tries = 0;
  const timer = setInterval(function(){
    http.get('http://127.0.0.1:' + PORT + '/', function(r){
      clearInterval(timer); cb(true);
    }).on('error', function(){
      if (++tries > 40){ clearInterval(timer); cb(false); }
    });
  }, 250);
}

let win = null;
function createWindow(){
  win = new BrowserWindow({
    width: 1366, height: 860, minWidth: 980, minHeight: 640,
    backgroundColor: '#000000',
    icon: path.join(__dirname, '..', 'icons', 'icon-512.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  win.on('closed', function(){ win = null; });

  const url = 'http://127.0.0.1:' + PORT + '/';
  serverReady(function(ok){
    if (ok){ win.loadURL(url); }
    else { // 后端未就绪：直接用本地文件离线运行（无多设备协同，本机数据可用）
      win.loadFile(path.join(__dirname, '..', 'index.html'));
    }
  });
}

app.whenReady().then(function(){
  startServer();
  createWindow();
  app.on('activate', function(){ if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', function(){
  if (serverProc){ try{ serverProc.kill(); }catch(e){} }
  if (process.platform !== 'darwin') app.quit();
});
