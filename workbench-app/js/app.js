/* ============================================================
   甘肃新煜科技工作台 · 核心逻辑
   ============================================================ */
var curProject = 'lin-gang';
var TODAY = new Date('2026-08-08');

/* ---------------- 工具 ---------------- */
function fmt(n,d){ n=Number(n)||0; return n.toLocaleString('zh-CN',{minimumFractionDigits:d||0,maximumFractionDigits:d||0}); }
function todayStr(){ return TODAY.toISOString().slice(0,10); }
function days(a,b){ if(!a) return 0; return Math.round((new Date(b||todayStr())-new Date(a))/864e5); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function uid(p){ return (p||'x')+Date.now().toString(36)+Math.floor(Math.random()*900+100); }
function toast(msg){
  var t=document.getElementById('toast'); t.textContent=msg; t.classList.add('on');
  clearTimeout(t._tm); t._tm=setTimeout(function(){t.classList.remove('on')},2400);
}
function tag(txt,cls){ return '<span class="tag '+cls+'">'+esc(txt)+'</span>'; }
function bar(pct,cls){ pct=Math.max(0,Math.min(100,pct||0)); return '<div class="bar '+(cls||'')+'"><i style="width:'+pct+'%"></i></div>'; }
function tbl(head,rows,cls){
  return '<table class="'+(cls||'')+'"><thead><tr>'+head+'</tr></thead><tbody>'+rows+'</tbody></table>';
}
function kpi(k,v,unit,d,cls,onclick){
  return '<div class="kpi '+(cls||'')+'"'+(onclick?' onclick="'+onclick+'"':'')+'>'+
    '<div class="k">'+esc(k)+'</div><div class="v">'+v+(unit?'<small>'+unit+'</small>':'')+'</div><div class="d">'+(d||'')+'</div></div>';
}

/* ---------------- 导航 ---------------- */
var PAGE_SUB={dash:'经营驾驶舱',newenergy:'新能源项目',transport:'大交通机电',ride:'网约车平台',
  sales:'车辆销售',contract:'合同管理',fin:'业务财务',run:'跑动作战台',staff:'业务人员管理',map:'项目地图',detail:'项目详情',admin:'平台管理',expense:'费用报销',approval:'审批中心'};
function go(page){
  document.querySelectorAll('section[id^="p-"]').forEach(function(s){s.classList.add('hide')});
  var el=document.getElementById('p-'+page); if(el) el.classList.remove('hide');
  document.querySelectorAll('.side .nav').forEach(function(n){n.classList.toggle('on',n.dataset.page===page)});
  document.querySelectorAll('.bottomnav .b').forEach(function(n){n.classList.toggle('on',n.dataset.page===page)});
  document.getElementById('mbSub').textContent=PAGE_SUB[page]||'';
  document.getElementById('side').classList.remove('open');
  window.scrollTo(0,0);
  var R={dash:renderDash,newenergy:renderNewEnergy,transport:renderTransport,ride:renderRide,
    sales:renderSales,contract:renderContract,fin:renderFin,run:renderRun,staff:renderStaff,map:renderMap,detail:renderDetail,admin:renderAdmin,expense:renderExpense,approval:renderApproval};
  if(R[page]) R[page]();
  /* v5.0：为每个功能页刷新关键信息摘要条 */
  if(typeof renderDigest==='function') renderDigest(page);
}
function toggleNav(){ document.getElementById('side').classList.toggle('open'); }
function goDetail(id){ curProject=id; go('detail'); }
function renderProjNav(){
  document.getElementById('projNav').innerHTML = DB.projects.map(function(p){
    return '<div class="nav sm" onclick="goDetail(\''+p.id+'\')">'+esc(p.name)+'</div>';
  }).join('');
}

/* ============ 账号 / 密码登录 + 角色权限 ============ */
var CUR_USER=null;
function isAdmin(){ return !!(CUR_USER && CUR_USER.role==='admin'); }
function isManager(){ return !!(CUR_USER && (CUR_USER.role==='admin'||CUR_USER.role==='manager')); }
function roleName(r){ return r==='admin'?'管理员':r==='manager'?'管理者':'成员'; }
function requireAdmin(act){ if(!isAdmin()){ toast('需要管理员权限：'+(act||'')); return false; } return true; }
function requireManager(act){ if(!isManager()){ toast('需要管理者及以上权限：'+(act||'')); return false; } return true; }
function pushAudit(act){
  try{ DB.auditLog=DB.auditLog||[];
    DB.auditLog.unshift({t:new Date().toISOString(),username:CUR_USER?CUR_USER.username:'?',name:CUR_USER?CUR_USER.name:'?',role:CUR_USER?CUR_USER.role:'?',act:act,dev:(navigator.userAgent||'').slice(0,46)});
    if(DB.auditLog.length>200) DB.auditLog.length=200;
  }catch(e){}
}
function bootAuth(){
  var s=null; try{ s=localStorage.getItem('xy_session'); }catch(e){}
  if(s){ try{ var u=JSON.parse(s); var rec=(DB.users||[]).filter(function(x){return x.id===u.id;})[0];
    if(rec && !rec.disabled){ CUR_USER={id:rec.id,username:rec.username,name:rec.name,role:rec.role}; return true; } }catch(e){} }
  return false;
}
/* ============ 公司 Logo（甘肃新煜科技） ============
   六边形能量框（科技/能源）+ 上升箭头（新：新生·向上·新能源）+ 光核光芒（煜：光耀）
   渐变使用固定橙（品牌色），在明/暗主题下均清晰。idp 用于避免同页多实例的 SVG 渐变 id 冲突。 */
function xyLogo(idp){
  idp=idp||'a';
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="甘肃新煜科技">'
    +'<defs>'
    +'<linearGradient id="xyg'+idp+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#ff6b35"/></linearGradient>'
    +'<radialGradient id="xys'+idp+'" cx="0.5" cy="0.45" r="0.62"><stop offset="0" stop-color="#ffe3b0"/><stop offset="0.55" stop-color="#ff8c1a"/><stop offset="1" stop-color="#ff6b35"/></radialGradient>'
    +'</defs>'
    +'<path d="M32 3 L57.1 17.5 L57.1 46.5 L32 61 L6.9 46.5 L6.9 17.5 Z" fill="none" stroke="url(#xyg'+idp+')" stroke-width="2.6" stroke-linejoin="round"/>'
    +'<path d="M23 21 L32 11 L41 21" fill="none" stroke="url(#xyg'+idp+')" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<circle cx="32" cy="39" r="8.5" fill="url(#xys'+idp+')"/>'
    +'<g stroke="#ff8c1a" stroke-width="2" stroke-linecap="round">'
    +'<line x1="43" y1="39" x2="46.5" y2="39"/><line x1="39.78" y1="46.22" x2="42.27" y2="49.71"/>'
    +'<line x1="32" y1="50" x2="32" y2="53.5"/><line x1="24.22" y1="46.22" x2="21.73" y2="49.71"/>'
    +'<line x1="21" y1="39" x2="17.5" y2="39"/><line x1="24.22" y1="31.78" x2="21.73" y2="28.29"/>'
    +'<line x1="39.78" y1="31.78" x2="42.27" y2="28.29"/>'
    +'</g></svg>';
}

/* ============ 明暗主题（跟随系统 + 手动三态） ============ */
var THEME_KEY='xy_theme';
function themeMode(){ try{ return localStorage.getItem(THEME_KEY)||'system'; }catch(e){ return 'system'; } }
function applyTheme(){
  var m=themeMode(), dark;
  if(m==='dark') dark=true;
  else if(m==='light') dark=false;
  else dark = !(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  paintThemeSwitch();
}
function setTheme(m){ try{ localStorage.setItem(THEME_KEY,m); }catch(e){} applyTheme(); toast('主题：'+(m==='system'?'跟随系统':(m==='light'?'浅色':'深色'))); }
function paintThemeSwitch(){
  var mode=themeMode();
  document.querySelectorAll('.themesw button').forEach(function(b){ b.classList.toggle('on', b.dataset.t===mode); });
}
if(window.matchMedia){
  var _mq=window.matchMedia('(prefers-color-scheme: dark)');
  var _onChange=function(){ if(themeMode()==='system') applyTheme(); };
  if(_mq.addEventListener) _mq.addEventListener('change',_onChange); else if(_mq.addListener) _mq.addListener(_onChange);
}

function loginGateHTML(){
  return ''+
  '<div class="lgwrap">'+
    '<div class="lgcard">'+
      '<div class="lgbrand"><div class="lglogo">'+xyLogo('lg')+'</div><div><div class="lgn">甘肃新煜科技工作台</div><div class="lgs">GROUP OPERATION CONSOLE</div></div></div>'+
      '<div class="lgtitle">账号登录</div>'+
      '<div class="lgf">'+
        '<label>账号</label><input id="lgU" class="lgi" placeholder="请输入账号" autocomplete="username">'+
        '<label>密码</label><input id="lgP" class="lgi" type="password" placeholder="请输入密码" autocomplete="current-password" onkeydown="if(event.key===\'Enter\')submitLogin()">'+
      '</div>'+
      '<button class="btn pri lgbtn" onclick="submitLogin()">登 录</button>'+
      '<div class="lghint">业务人员账号由管理员在「平台管理后台 · 用户管理」开通；首次登录由本人设置密码。<br>如忘记密码，请联系管理员重置。</div>'+
    '</div>'+
  '</div>';
}
function showLoginGate(){ var g=document.getElementById('loginGate'); if(!g) return; g.innerHTML=loginGateHTML(); g.classList.remove('hide'); var i=document.getElementById('lgU'); if(i) i.focus(); }
function hideLoginGate(){ var g=document.getElementById('loginGate'); if(g){ g.classList.add('hide'); g.innerHTML=''; } }
var _pendingSetPwdUser=null;
function submitLogin(){
  var u=(document.getElementById('lgU').value||'').trim();
  var p=(document.getElementById('lgP').value||'');
  if(!u||!p){ toast('请输入账号和密码'); return; }
  var rec=(DB.users||[]).filter(function(x){ return x.username===u; })[0];
  if(!rec){ toast('账号不存在'); return; }
  if(rec.disabled){ toast('该账号已被禁用，请联系管理员'); return; }
  if(rec.mustSetPwd){ _pendingSetPwdUser=rec; showSetPwdGate(rec); return; }
  if(rec.pwd!==hashPwd(p)){ toast('密码错误'); return; }
  completeLogin(rec);
}
function completeLogin(rec){
  CUR_USER={id:rec.id,username:rec.username,name:rec.name,role:rec.role};
  try{ localStorage.setItem('xy_session',JSON.stringify({id:rec.id})); }catch(e){}
  pushAudit('登录');
  hideLoginGate(); applyAuthUI(); connectSync(); go(landingPage());
  if(typeof AI!=='undefined' && AI.init) AI.init();
  toast('欢迎，'+rec.name+' · '+platformMode());
}
function setPwdGateHTML(rec){
  return ''+
  '<div class="lgwrap">'+
    '<div class="lgcard">'+
      '<div class="lgbrand"><div class="lglogo">'+xyLogo('sp')+'</div><div><div class="lgn">首次登录 · 设置密码</div><div class="lgs">'+esc(rec.name)+'（'+esc(rec.username)+'）</div></div></div>'+
      '<div class="lgtitle">账号已开通，请设置你的登录密码</div>'+
      '<div class="lgf">'+
        '<label>新密码（至少 6 位）</label><input id="sp1" class="lgi" type="password" placeholder="设置登录密码" autocomplete="new-password" onkeydown="if(event.key===\'Enter\')submitSetPwd()">'+
        '<label>确认密码</label><input id="sp2" class="lgi" type="password" placeholder="再次输入" autocomplete="new-password" onkeydown="if(event.key===\'Enter\')submitSetPwd()">'+
      '</div>'+
      '<button class="btn pri lgbtn" onclick="submitSetPwd()">设置并进入</button>'+
      '<div class="lghint">该账号由管理员开通，首次登录需自行设置密码后方可使用。密码仅保存在本机。</div>'+
    '</div>'+
  '</div>';
}
function showSetPwdGate(rec){ var g=document.getElementById('loginGate'); if(!g)return; g.innerHTML=setPwdGateHTML(rec); g.classList.remove('hide'); var i=document.getElementById('sp1'); if(i)i.focus(); }
function submitSetPwd(){
  var np=document.getElementById('sp1').value||'';
  var cp=document.getElementById('sp2').value||'';
  if(np.length<6){ toast('密码至少 6 位'); return; }
  if(np!==cp){ toast('两次输入的密码不一致'); return; }
  var rec=_pendingSetPwdUser; if(!rec){ toast('会话失效，请重新登录'); showLoginGate(); return; }
  rec.pwd=hashPwd(np); rec.mustSetPwd=false; saveDB(); _pendingSetPwdUser=null;
  completeLogin(rec);
}
function platformMode(){ return isManager()? '管理层平台' : (CUR_USER? '业务人员平台':'未登录'); }
function allowedPages(){
  /* 管理层 / 管理员：全部功能 + 管理后台；业务人员：聚焦本人业务平台 */
  if(isManager()) return ['dash','newenergy','transport','ride','sales','contract','fin','run','staff','map','detail','admin','expense','approval'];
  return ['run','contract','staff','detail','map','expense'];
}
function applyRoleUI(){
  var ap=allowedPages();
  document.querySelectorAll('.side .nav[data-page]').forEach(function(n){ n.classList.toggle('hide', ap.indexOf(n.dataset.page)<0); });
  document.querySelectorAll('.bottomnav .b[data-page]').forEach(function(n){ n.classList.toggle('hide', ap.indexOf(n.dataset.page)<0); });
  document.querySelectorAll('.adminOnly').forEach(function(n){ n.classList.toggle('hide', !isAdmin()); });
  var ng=document.querySelector('.navgrp.adminOnly'); if(ng) ng.classList.toggle('hide', !isAdmin());
  var fab=document.getElementById('aiFab'); if(fab) fab.classList.toggle('hide', !CUR_USER);
}
function applyAuthUI(){
  applyRoleUI();
  ['usrBadge','usrBadgeD'].forEach(function(id){
    var b=document.getElementById(id);
    if(b){ if(CUR_USER){ b.innerHTML='<span class="usr" onclick="if(confirm(\'退出登录？\'))logoutAll()">'+esc(CUR_USER.name)+' · '+roleName(CUR_USER.role)+' · '+platformMode()+' ▾</span>'; } else { b.innerHTML=''; } }
  });
  renderPresence();
}
function landingPage(){ return isManager()? 'dash' : 'run'; }
function logoutAll(){
  if(SYNC.es) try{ SYNC.es.close(); }catch(e){}
  SYNC.on=false; SYNC.token=null; SYNC.user=null; SYNC.users=[];
  try{ localStorage.removeItem('xy_session'); localStorage.removeItem('xy_token'); localStorage.removeItem('xy_user'); }catch(e){}
  CUR_USER=null; hideLoginGate(); showLoginGate(); applyAuthUI();
}
function connectSync(){
  if(SYNC.on) return;
  var u=CUR_USER?CUR_USER.username:'guest';
  var nm=CUR_USER?CUR_USER.name:u, rl=CUR_USER?CUR_USER.role:'guest';
  fetch(apiURL('/api/login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:u,name:nm,role:rl,token:uid('t')})})
    .then(function(r){return r.json();}).then(function(j){
      if(j&&j.ok){ SYNC.token=j.token; SYNC.user={name:nm,role:rl}; SYNC.on=true;
        try{ localStorage.setItem('xy_token',j.token); localStorage.setItem('xy_user',JSON.stringify(SYNC.user)); }catch(e){}
        startStream(); renderPresence(); toast('协同已连接：'+nm);
      }
    }).catch(function(){ /* 离线：本机数据仍可正常工作 */ });
}
function openLogin(){ connectSync(); }

/* ============ 平台管理后台（管理员） ============ */
function renderAdmin(){
  if(!requireAdmin('访问管理后台')){ if(!isAdmin()) go('dash'); return; }
  var rows=(DB.users||[]).map(function(u){
    var me=(CUR_USER&&u.id===CUR_USER.id);
    var acts='<button class="btn sm" onclick="openResetPwd(\''+u.id+'\')">改密</button> '+
      '<button class="btn sm '+(u.disabled?'':'dgr')+'" onclick="toggleUser(\''+u.id+'\')">'+(u.disabled?'启用':'禁用')+'</button> ';
    acts += me ? '<span class="tag ok">当前</span>' : '<button class="btn sm dgr" onclick="deleteUser(\''+u.id+'\')">删除</button>';
    return '<tr><td>'+esc(u.username)+'</td><td>'+esc(u.name)+'</td>'+
      '<td><span class="tag '+(u.role==='admin'?'pur':u.role==='manager'?'cy':'gy')+'">'+roleName(u.role)+'</span></td>'+
      '<td>'+(u.disabled?'<span class="tag dgr">已禁用</span>':'<span class="tag ok">正常</span>')+'</td>'+
      '<td>'+esc(u.createdAt||'')+'</td><td class="act">'+acts+'</td></tr>';
  }).join('');
  document.getElementById('admUsers').innerHTML='<table class="utbl"><thead><tr><th>账号</th><th>姓名</th><th>角色</th><th>状态</th><th>创建</th><th>操作</th></tr></thead><tbody>'+rows+'</tbody></table>';

  var perms=[['经营数据查看','view','view','view'],['项目 / 合同 增改','—','edit','edit'],['项目 / 合同 删除','—','del','del'],
    ['跑动 / 费用 填报','add','add','add'],['用户与账号管理','—','—','user'],['系统设置 / 目标','—','—','sys'],['数据导出导入 / 清库','—','—','data']];
  var mr='<table class="rmatrix"><thead><tr><th>权限项</th><th>成员</th><th>管理者</th><th>管理员</th></tr></thead><tbody>';
  perms.forEach(function(p){ mr+='<tr><td>'+p[0]+'</td>'+[p[1],p[2],p[3]].map(function(v){
    return '<td>'+(v==='—'?'<span class="tag dgr">✕</span>':'<span class="tag ok">✓ '+(v==='view'?'查看':v==='edit'?'增改':v==='del'?'删除':v==='add'?'填报':v==='user'?'管理':v==='sys'?'设置':v==='data'?'维护':'')+'</span>')+'</td>';
  }).join('')+'</tr>'; });
  mr+='</tbody></table>';
  document.getElementById('admMatrix').innerHTML=mr;

  var t=TGT();
  document.getElementById('admTargets').innerHTML=
    '<div class="f2">'+fld('营收目标（万元）','tgRev','',t.rev)+fld('回款目标（万元）','tgRecv','',t.recv)+'</div>'+
    '<div class="f2">'+fld('净利目标（万元）','tgNet','',t.net)+fld('装机目标（MW）','tgMw','',t.mw)+'</div>'+
    '<button class="btn pri" onclick="saveTargets()">保存目标</button>';

  var ac=(typeof AI!=='undefined'&&AI.getCfg)?AI.getCfg():{};
  document.getElementById('admSys').innerHTML=
    '<div class="row" style="gap:10px;flex-wrap:wrap">'+
    '<button class="btn" onclick="exportAll()">⬇ 导出全部数据</button>'+
    '<button class="btn" onclick="importData()">⬆ 导入数据</button>'+
    '<button class="btn dgr" onclick="if(requireAdmin(\'恢复示例数据\'))resetDB()">恢复示例数据</button>'+
    '</div><div class="note">导出为 JSON 备份；导入将覆盖本机数据并同步到其他设备。恢复示例数据会清空本机业务数据。</div>'+
    '<div class="sect tech" style="margin-top:16px">AI 助手（可选云端大模型）<span class="ln"></span></div>'+
    '<div class="note">默认使用本地意图引擎（离线、免密钥、零成本）；如需更强对话与写作能力，可接入任意 OpenAI 兼容接口。</div>'+
    '<div class="f2">'+fld('接口地址','aiBase',ac.base||'https://api.openai.com/v1/chat/completions')+fld('模型','aiModel',ac.model||'gpt-3.5-turbo')+'</div>'+
    fld('API Key','aiKey',ac.key||'')+
    '<button class="btn pri" onclick="saveAiCfg()">保存 AI 配置</button>'+

    '<div class="sect tech" style="margin-top:16px">协同服务（多设备实时同步）<span class="ln"></span></div>'+
    '<div class="note">部署到公网后，在此填入协同后端地址即可实现跨设备实时数据同步。留空则使用当前访问地址（同源）。后端为 <code>server/server.js</code>（Node 零依赖）。</div>'+
    fld('协同服务地址','syncUrl',API_BASE||'（同源 / 离线模式）')+
    '<button class="btn pri" onclick="saveSyncCfg()">保存同步配置</button>';

  var al=(DB.auditLog||[]).map(function(a){
    return '<div class="audit"><span class="at">'+esc((a.t||'').replace('T',' ').slice(0,19))+'</span>'+
      '<span class="an">'+esc(a.name)+'（'+esc(a.username)+'·'+roleName(a.role)+'）</span>'+
      '<span class="aa">'+esc(a.act)+'</span>'+
      '<span class="ad">'+esc(a.dev)+'</span></div>';
  }).join('') || '<div class="note">暂无登录记录</div>';
  document.getElementById('admAudit').innerHTML=al;
}
function openUserAdd(){
  if(!requireAdmin('新增账号')) return;
  var html=fld('登录账号','uaUser','')+fld('姓名','uaName','')+fldSel('角色','uaRole',['admin','manager','member'])+
    '<label class="ckrow"><input type="checkbox" name="uaForce" checked> 开通后由本人首次登录设置密码（不预设初始密码）</label>'+
    '<div id="uaPwdWrap">'+fld('初始密码（未勾选时生效）','uaPwd','')+'</div>'+
    '<div class="note">成员 / 业务人员账号由管理员在此开通使用权限；勾选后，本人首次登录时自行设置密码，更安全。</div>';
  openDrawer('＋ 开通账号',html,function(){
    var un=_v('uaUser'); if(!un){toast('请填写登录账号');return;}
    if((DB.users||[]).filter(function(x){return x.username===un;}).length){ toast('该账号已存在'); return; }
    var force=!!(document.querySelector('#dbody [name="uaForce"]')||{}).checked;
    var pw=force?null:(_v('uaPwd')||'123456');
    DB.users=DB.users||[];
    DB.users.push({id:uid('u'),username:un,name:_v('uaName')||un,role:_v('uaRole')||'member',pwd:pw?hashPwd(pw):null,mustSetPwd:!!force,disabled:false,createdAt:todayStr()});
    saveDB(); closeDrawer(); renderAdmin(); toast(force?('账号已开通：'+un+'（请通知本人首次登录设置密码）'):('账号已创建：'+un+'（初始密码 '+pw+'）'));
  },{priText:'开通账号'});
}
function openResetPwd(id){
  if(!requireAdmin('重置密码')) return;
  var u=(DB.users||[]).filter(function(x){return x.id===id;})[0]; if(!u) return;
  openDrawer('重置密码 · '+u.name,fld('新密码','rpPwd','')+'<div class="note">将覆盖该账号当前密码。</div>',function(){
    var pw=_v('rpPwd'); if(!pw){toast('请填写新密码');return;}
    u.pwd=hashPwd(pw); saveDB(); closeDrawer(); toast('密码已重置：'+u.username);
  },{priText:'确认重置'});
}
function toggleUser(id){
  if(!requireAdmin('启用/禁用账号')) return;
  var u=(DB.users||[]).filter(function(x){return x.id===id;})[0]; if(!u) return;
  if(CUR_USER&&u.id===CUR_USER.id){ toast('不能禁用当前登录账号'); return; }
  u.disabled=!u.disabled; saveDB(); renderAdmin(); toast(u.disabled?'已禁用：'+u.username:'已启用：'+u.username);
}
function deleteUser(id){
  if(!requireAdmin('删除账号')) return;
  var u=(DB.users||[]).filter(function(x){return x.id===id;})[0]; if(!u) return;
  if(CUR_USER&&u.id===CUR_USER.id){ toast('不能删除当前登录账号'); return; }
  if(!confirm('确认删除账号「'+u.username+'」？')) return;
  DB.users=DB.users.filter(function(x){return x.id!==id}); saveDB(); renderAdmin(); toast('账号已删除：'+u.username);
}
function saveTargets(){
  if(!requireAdmin('修改年度目标')) return;
  DB.targets=DB.targets||{};
  DB.targets.rev=Math.max(0,_num('tgRev')); DB.targets.recv=Math.max(0,_num('tgRecv'));
  DB.targets.net=Math.max(0,_num('tgNet')); DB.targets.mw=Math.max(0,_num('tgMw'));
  saveDB(); toast('年度目标已保存');
  if(typeof renderDashV5==='function') renderDashV5();
}
function exportAll(){
  try{ var blob=new Blob([JSON.stringify(DB)],{type:'application/json'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='新煜工作台数据_'+todayStr()+'.json'; a.click();
    toast('已导出数据备份');
  }catch(e){ toast('导出失败'); }
}
function importData(){
  if(!requireAdmin('导入数据')) return;
  var inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange=function(){ var f=inp.files[0]; if(!f) return;
    var rd=new FileReader();
    rd.onload=function(){ try{ DB=ensureV5(JSON.parse(rd.result)); saveDB(); renderProjNav(); if(typeof renderDashV5==='function') renderDashV5(); toast('数据已导入'); }catch(e){ toast('文件解析失败'); } };
    rd.readAsText(f);
  };
  inp.click();
}
function saveAiCfg(){
  if(!requireAdmin('配置 AI')) return;
  var base=(document.querySelector('#admSys [name="aiBase"]')||{}).value||'';
  var model=(document.querySelector('#admSys [name="aiModel"]')||{}).value||'';
  var key=(document.querySelector('#admSys [name="aiKey"]')||{}).value||'';
  if(typeof AI!=='undefined'&&AI.setCfg) AI.setCfg({enabled:!!base, base:base, model:model, key:key});
  if(typeof AI!=='undefined'&&AI.init) AI.init();
  toast(base?'AI 已切换为云端大模型':'AI 已设为本地引擎');
}
function saveSyncCfg(){
  if(!requireAdmin('配置协同')) return;
  var url=(document.querySelector('#admSys [name="syncUrl"]')||{}).value||'';
  setApiBase(url);
  if(SYNC.on){ try{ if(SYNC.es) SYNC.es.close(); }catch(e){} SYNC.on=false; SYNC.token=null; }
  connectSync();
  toast(url?'协同地址已设为：'+url+' · 正在连接…':'已恢复同源模式（离线/本地后端）');
}

/* ---------------- 抽屉 ---------------- */
var pendingSubmit=function(){closeDrawer()};
function openDrawer(title,html,onSubmit,opts){
  opts=opts||{};
  document.getElementById('dtitle').textContent=title;
  document.getElementById('dbody').innerHTML=html||'';
  var pri=document.getElementById('dfpri');
  pri.textContent=opts.priText||'派单并通知';
  pri.style.display=opts.hidePri?'none':'';
  pendingSubmit=onSubmit||function(){closeDrawer()};
  document.getElementById('drawer').classList.add('on');
  document.getElementById('mask').classList.add('on');
  document.getElementById('dbody').scrollTop=0;
}
function runSubmit(){ pendingSubmit(); }
function closeDrawer(){
  document.getElementById('drawer').classList.remove('on');
  document.getElementById('mask').classList.remove('on');
}
function _v(n){ var el=document.querySelector('#dbody [name="'+n+'"]'); return el?String(el.value).trim():''; }
function _num(n){ return Number(String(_v(n)).replace(/[^0-9.\-]/g,''))||0; }
function _chip(g){ var c=document.querySelector('#dbody .chips[data-g="'+(g||'1')+'"] .chip.on'); return c?c.textContent:''; }
function chips(g,arr,def){
  return '<div class="chips" data-g="'+g+'">'+arr.map(function(x){
    return '<span class="chip'+(x===def?' on':'')+'" onclick="pickChip(this)">'+esc(x)+'</span>';
  }).join('')+'</div>';
}
function pickChip(el){
  el.parentNode.querySelectorAll('.chip').forEach(function(c){c.classList.remove('on')});
  el.classList.add('on');
}
function fld(label,name,ph,val,attr){ return '<div class="field"><label>'+label+'</label><input name="'+name+'" placeholder="'+(ph||'')+'" value="'+esc(val||'')+'" '+(attr||'')+'></div>'; }
function fldSel(label,name,opts,val,attr){
  return '<div class="field"><label>'+label+'</label><select name="'+name+'" '+(attr||'')+'>'+opts.map(function(o){
    return '<option'+(o===val?' selected':'')+'>'+esc(o)+'</option>'}).join('')+'</select></div>';
}
function fldArea(label,name,ph,val){ return '<div class="field"><label>'+label+'</label><textarea name="'+name+'" rows="3" placeholder="'+(ph||'')+'">'+esc(val||'')+'</textarea></div>'; }

/* 通用派单表单 */
function taskForm(pre){
  pre=pre||{};
  return fld('事项','tfTitle','如：对接省发改委推动消纳指标',pre.title)+
    '<div class="f2">'+fld('责任人','tfOwner','张总',pre.owner)+fld('完成期限','tfDue','2026-08-20',pre.due)+'</div>'+
    fldSel('关联项目','tfProj',DB.projects.map(function(p){return p.name}),pre.proj)+
    '<div class="field"><label>紧急度</label>'+chips('1',['常规','重要','紧急·董事长关注'],pre.level||'重要')+'</div>'+
    fldArea('要求与背景','tfNote','说明卡点、已尝试的路径、需要的资源',pre.note);
}
function openTaskAdd(pre){
  openDrawer('派单督办',taskForm(pre),function(){
    var t=_v('tfTitle')||'未命名事项';
    DB.tasks.unshift({id:uid('t'),title:t,project:_v('tfProj'),owner:_v('tfOwner')||'待指派',due:_v('tfDue')||'',status:'待办'});
    saveDB(); closeDrawer(); toast('已派单：'+t); refresh();
  });
}

/* ---------------- 项目新增 / 删除 ---------------- */
function openProjectAdd(){
  if(!requireManager('新增项目')) return;
  var html=
    fld('项目名称','paName','如：临港 100MW 光伏治沙')+
    fldSel('业务线','paLine',['新能源','大交通','网约车','车辆销售'])+
    '<div class="f2">'+fld('所属城市','paCity','兰州')+fld('负责人','paOwner','张总')+'</div>'+
    '<div class="f2">'+fld('总投资（万元）','paInv','5000')+fld('当前进度（%）','paProg','0')+'</div>'+
    fldArea('项目概况 / 关键诉求','paNote','如：需协调省发改委推动消纳指标');
  openDrawer('＋ 新增项目',html,function(){
    var nm=_v('paName'); if(!nm){toast('请填写项目名称');return;}
    var line=_v('paLine')||'新能源';
    var typeMap={'新能源':'光伏','大交通':'高速机电','网约车':'平台运营','车辆销售':'车辆销售'};
    var id='p'+Date.now().toString(36);
    DB.projects.push({id:id,name:nm,line:line,type:typeMap[line]||line,city:_v('paCity')||'',owner:_v('paOwner')||'',
      stage:'推进中',addr:_v('paCity')||'',invTotal:_num('paInv'),invDone:0,progress:Math.max(0,Math.min(100,_num('paProg'))),
      status:'推进中',note:_v('paNote'),geo:{lng:103.8,lat:36.0},updated:todayStr()});
    if(!DB.nodes)DB.nodes={}; if(!DB.people)DB.people={}; if(!DB.orgs)DB.orgs={}; if(!DB.docs)DB.docs={};
    saveDB(); closeDrawer(); curProject=id; renderProjNav(); go('detail'); toast('项目已新增：'+nm);
  },{priText:'保存项目'});
}
function deleteProject(id){
  if(!requireManager('删除项目')) return;
  var p=projById(id); if(!p) return;
  if(!confirm('确认删除项目「'+p.name+'」？\n将一并删除其关键节点、关键人、相关公司、图纸，以及关联合同 / 跑动 / 业务费用，且不可恢复。')) return;
  DB.projects=DB.projects.filter(function(x){return x.id!==id});
  ['nodes','people','orgs','docs'].forEach(function(k){ if(DB[k]) delete DB[k][id]; });
  DB.contracts=DB.contracts.filter(function(c){return c.project!==id});
  DB.run=DB.run.filter(function(r){return r.project!==id});
  DB.expenses=DB.expenses.filter(function(e){return e.projectId!==id});
  (DB.staff||[]).forEach(function(s){ if(s.projects) s.projects=s.projects.filter(function(x){return x!==id}); });
  if(curProject===id) curProject=DB.projects[0]?DB.projects[0].id:'';
  saveDB();
  if(typeof renderMap==='function') renderMap();
  renderProjNav();
  if(typeof renderDigest==='function') renderDigest('detail');
  renderDetail();
  toast('项目「'+p.name+'」已删除');
}

/* ---------------- 聚合计算 ---------------- */
function ctInAmount(){ return DB.contracts.filter(function(c){return c.dir==='收'}).reduce(function(a,c){return a+c.amount},0); }
function ctOutAmount(){ return DB.contracts.filter(function(c){return c.dir==='付'}).reduce(function(a,c){return a+c.amount},0); }
function overduePlans(){
  var out=[];
  DB.contracts.forEach(function(c){
    (c.plans||[]).forEach(function(p){
      if(!p.actual && p.planDate && days(p.planDate)>0 && p.status!=='未到期')
        out.push({c:c,p:p,od:days(p.planDate)});
    });
  });
  return out.sort(function(a,b){return b.od*b.p.amount-a.od*a.p.amount});
}
function duePlans(n){
  var out=[];
  DB.contracts.forEach(function(c){
    (c.plans||[]).forEach(function(p){
      if(!p.actual && p.planDate){
        var dd=days(todayStr(),p.planDate);
        if(dd>=-30&&dd<=n) out.push({c:c,p:p,dd:dd});
      }
    });
  });
  return out.sort(function(a,b){return a.dd-b.dd});
}
function arTotal(){ return DB.finance.ar.reduce(function(a,x){return a+x.amount},0); }
function arOverdue(){ return DB.finance.ar.filter(function(x){return x.age>0}).reduce(function(a,x){return a+x.amount},0); }
function apTotal(){ return DB.finance.ap.reduce(function(a,x){return a+x.amount},0); }
function plSum(){
  var r=0,c=0,e=0;
  DB.finance.pl.forEach(function(x){r+=x.rev;c+=x.cost;e+=x.exp});
  var be=bizExpTotal();
  return {rev:r,cost:c,exp:e,bizExp:be,gross:r-c,net:r-c-e-be,gm:((r-c)/r*100)};
}
function stuckRuns(){ return DB.run.filter(function(r){return r.status==='卡点'||days(r.due)>0&&r.status!=='已办结'}); }
function lateNodes(){
  var out=[];
  Object.keys(DB.nodes).forEach(function(pid){
    DB.nodes[pid].forEach(function(n){
      if(n.status==='延期'||(!n.actual&&n.plan&&days(n.plan)>0&&n.status!=='已完成'))
        out.push({pid:pid,n:n,od:days(n.plan)});
    });
  });
  return out.sort(function(a,b){return b.od-a.od});
}

/* ---------------- 经营驾驶舱 ---------------- */
function renderDash(){
  var pl=plSum(), od=overduePlans(), ln=lateNodes();
  var minCash=Math.min.apply(0,DB.finance.cash13);
  document.getElementById('dashKpi').innerHTML=
    kpi('在手合同额（收入类）',fmt(ctInAmount()),'万元','共 '+DB.contracts.filter(function(c){return c.dir==='收'}).length+' 份 · <b class="cy">履约中</b>','','go(\'contract\')')+
    kpi('本年营业收入',fmt(pl.rev),'万元','毛利率 <b class="'+(pl.gm>=20?'dn':'wn')+'">'+pl.gm.toFixed(1)+'%</b> · 净利 '+fmt(pl.net)+' 万','','go(\'fin\')')+
    kpi('应收账款余额',fmt(arTotal()),'万元','其中逾期 <b class="up">'+fmt(arOverdue())+'</b> 万元','danger','finTab(\'ar\')')+
    kpi('13 周最低资金',fmt(minCash),'万元',(minCash<DB.finance.cashSafe?'<b class="up">跌破安全线</b>':'高于安全线 '+fmt(minCash-DB.finance.cashSafe)+' 万'),(minCash<DB.finance.cashSafe?'danger':'ok'),'finTab(\'cash\')')+
    kpi('逾期收付款节点',od.length,'个','涉及金额 <b class="up">'+fmt(od.reduce(function(a,x){return a+x.p.amount},0))+'</b> 万元',(od.length?'danger':'ok'),'go(\'contract\')')+
    kpi('跑动卡点',stuckRuns().length,'项','关键节点延期 <b class="up">'+ln.length+'</b> 个','warn','go(\'run\')');

  /* 预警聚合 */
  var A=[];
  ln.forEach(function(x){
    A.push({lv:x.od>7?'r':'y',t:'【节点延期】'+x.n.name,s:projName(x.pid)+' · 责任人 '+x.n.owner+' · 对接 '+x.n.dep+' · 逾期 '+x.od+' 天',
      a:'逾期'+x.od+'天',score:x.od*800,act:function(){goDetail(x.pid);setTimeout(function(){dtTab('nodes')},60)}});
  });
  od.forEach(function(x){
    A.push({lv:x.od>15?'r':'y',t:'【'+(x.c.dir==='收'?'应收逾期':'应付逾期')+'】'+x.p.name,
      s:x.c.name+' · '+x.c.party+' · 计划 '+x.p.planDate+' · 逾期 '+x.od+' 天',
      a:fmt(x.p.amount)+'万',score:x.od*x.p.amount,act:function(){openContractView(x.c.id)}});
  });
  DB.finance.ar.filter(function(x){return x.age>60}).forEach(function(x){
    A.push({lv:'r',t:'【应收超期】'+x.party,s:x.project+' · 账龄 '+x.age+' 天 · '+x.status+' · 责任人 '+x.owner,
      a:fmt(x.amount)+'万',score:x.age*x.amount,act:function(){finTab('ar')}});
  });
  DB.run.filter(function(r){return r.status==='卡点'}).forEach(function(r){
    A.push({lv:'r',t:'【跑动卡点】'+r.matter,s:projName(r.project)+' · '+r.where+' · 责任人 '+r.owner+' · 滞留 '+days(r.created)+' 天',
      a:'滞留'+days(r.created)+'天',score:days(r.created)*600,act:function(){go('run')}});
  });
  A.sort(function(a,b){return b.score-a.score});
  window._alerts=A;
  document.getElementById('dashAlerts').innerHTML = A.length? A.slice(0,7).map(function(x,i){
    return '<div class="alert '+x.lv+'" onclick="_alerts['+i+'].act()"><span class="dot"></span>'+
      '<div class="tx"><div class="tt">'+esc(x.t)+'</div><div class="ss">'+esc(x.s)+'</div></div>'+
      '<div class="amt">'+x.a+'</div></div>';
  }).join('') : '<div class="note">当前无红黄灯预警。</div>';

  /* 现金流 */
  var f=DB.finance.inv;
  document.getElementById('chCash').innerHTML=area(f.map(function(x){return x.rc}),f.map(function(x){return x.m.slice(2)}),C_CY);

  /* 健康度 */
  var H=[['新能源项目',62,'手续卡点 2 项','y'],['大交通机电',78,'进度款申报滞后','y'],
    ['网约车平台',88,'合规达标 · 单车毛利改善','g'],['新能源车销售',54,'库存车龄偏高 · 毛利下滑','r']];
  document.getElementById('dashHealth').innerHTML=H.map(function(h){
    return '<div class="li"><div class="t">'+h[0]+'<div class="s">'+h[2]+'</div></div>'+
      '<div style="width:110px">'+bar(h[1],h[3]==='r'?'r':h[3]==='y'?'y':'g')+'</div>'+
      '<div class="mono" style="width:38px;text-align:right;color:var(--txt)">'+h[1]+'</div></div>';
  }).join('');

  /* 待我审批 */
  document.getElementById('dashApproval').innerHTML=DB.approvals.map(function(a){
    var dd=days(todayStr(),a.due);
    return '<div class="li" onclick="openApproval(\''+a.id+'\')" style="cursor:pointer">'+
      '<div class="t">'+esc(a.title)+'<div class="s">'+a.type+' · '+a.applicant+' · 限 '+a.due+'</div></div>'+
      '<div class="mono" style="color:var(--txt)">'+(a.amount==='—'?'—':a.amount+' 万')+'</div>'+
      tag(dd<0?'已逾期':dd+' 天内',dd<0?'t-red':dd<=2?'t-yel':'t-blu')+'</div>';
  }).join('');

  /* 合同预警 */
  var dp=duePlans(45).slice(0,6);
  document.getElementById('dashContract').innerHTML= dp.length? dp.map(function(x){
    return '<div class="li" onclick="openContractView(\''+x.c.id+'\')" style="cursor:pointer">'+
      '<div class="t">'+esc(x.p.name)+'<div class="s">'+esc(x.c.name)+'</div></div>'+
      '<div class="mono" style="color:var(--txt)">'+(x.c.dir==='收'?'+':'-')+fmt(x.p.amount)+'</div>'+
      tag(x.dd<0?'逾期'+(-x.dd)+'天':x.dd+'天后',x.dd<0?'t-red':x.dd<=14?'t-yel':'t-blu')+'</div>';
  }).join('') : '<div class="note">未来 45 天无到期收付款节点。</div>';

  /* v5.0 全域态势层：HUD / 模块矩阵 / 目标仪表 / 雷达 / 流向 / 动态流 / 热力 */
  if(typeof renderDashV5==='function') renderDashV5();
}
function openApproval(id){
  var a=DB.approvals.filter(function(x){return x.id===id})[0]; if(!a)return;
  openDrawer('审批 · '+a.title,
    '<div class="dsec">申请信息</div>'+
    '<div class="kv"><div class="k">类型</div><div class="v">'+a.type+'</div>'+
    '<div class="k">金额</div><div class="v mono">'+(a.amount==='—'?'—':a.amount+' 万元')+'</div>'+
    '<div class="k">申请人</div><div class="v">'+a.applicant+'</div>'+
    '<div class="k">时限</div><div class="v">'+a.due+'</div></div>'+
    '<div class="dsec">审批意见</div>'+fldArea('意见','apNote','同意 / 补充材料后再议 / 驳回原因'),
    function(){
      DB.approvals=DB.approvals.filter(function(x){return x.id!==id});
      saveDB(); closeDrawer(); toast('已审批：'+a.title); renderDash();
    },{priText:'同意并归档'});
}

/* ============ 费用报销 / 审批流（出差 · 招待 · 报销） ============ */
function appTypeLabel(t){ return t==='trip'?'出差申请':t==='ent'?'招待申请':'报销申请'; }
function appTypeIcon(t){ return t==='trip'?'✈':t==='ent'?'🍽':'¥'; }
function appStatusTag(s){ return s==='pending'?tag('待审批','t-yel'):s==='approved'?tag('已通过','t-grn'):tag('已驳回','t-red'); }
function appAmount(a){ return a.type==='reimb' ? (a.total||0) : (a.amount||0); }
function appProjLine(a){ var p=a.projectId?projName(a.projectId):''; return [a.line,p].filter(Boolean).join(' · ')||'—'; }
function appSummary(a){
  if(a.type==='trip') return '前往 '+esc(a.dest)+' · '+esc(a.startDate)+' 至 '+esc(a.endDate)+'（'+(a.days||0)+' 天）';
  if(a.type==='ent') return '对象：'+esc(a.guest)+' · '+(a.headcount||0)+' 人 · '+esc(a.reason||'');
  if(a.type==='reimb'){ var rel=(DB.applications.filter(function(x){return x.id===a.relatedId})[0]||{}).title||'无';
    return '关联：'+esc(rel)+' · 借款抵扣 '+yuan(a.advance||0); }
  return '';
}
function appKv(k,v){ return '<div class="k">'+esc(k)+'</div><div class="v">'+esc(v)+'</div>'; }
function appFlowStep(cls,title,sub){ return '<div class="st"><span class="dot '+(cls||'')+'"></span><div class="c"><div class="t">'+esc(title)+'</div><div class="s">'+esc(sub||'')+'</div></div></div>'; }

/* ---------- 业务人员：费用报销（我的申请） ---------- */
var EXP_FILTER='all';
function expFilterSet(f){ EXP_FILTER=f; document.querySelectorAll('#expFilter button').forEach(function(b){b.classList.toggle('on',b.dataset.f===f);}); renderExpense(); }
function renderExpense(){
  if(!document.getElementById('expList')) return;
  var all=(DB.applications||[]).filter(function(a){return a.applicant===CUR_USER.username;});
  var list=all.filter(function(a){ return EXP_FILTER==='all'||a.status===EXP_FILTER; });
  var pending=all.filter(function(a){return a.status==='pending';}).length;
  var approved=all.filter(function(a){return a.status==='approved';}).length;
  var pendReimb=all.filter(function(a){return a.type==='reimb'&&a.status==='pending';})
    .reduce(function(s,a){return s+(a.total||0);},0);
  document.getElementById('expKpi').innerHTML=
    kpi('我的申请',all.length,'单','提交记录')+
    kpi('待审批',pending,'单','审批中',pending?'warn':'ok')+
    kpi('已通过',approved,'单','', 'ok')+
    kpi('待报销金额',yuan(pendReimb),'','报销类待审合计','warn');
  document.getElementById('expList').innerHTML = list.length? list.map(function(a){
    return '<div class="li" style="cursor:pointer" onclick="openAppView(\''+a.id+'\')">'+
      '<div class="t"><span class="apptag">'+appTypeIcon(a.type)+' '+appTypeLabel(a.type)+'</span> '+esc(a.title)+
        '<div class="s">'+appProjLine(a)+' · '+appSummary(a)+'</div></div>'+
      '<div class="mono" style="color:var(--txt);min-width:78px;text-align:right">'+yuan(appAmount(a))+'</div>'+
      appStatusTag(a.status)+
      (a.status==='pending'?'<button class="btn sm" onclick="event.stopPropagation();openAppView(\''+a.id+'\')">查看</button>':'')+
      '</div>';
  }).join('') : '<div class="note">暂无申请。点击右上角提交出差 / 招待 / 报销申请。</div>';
}
function openTripApply(){
  var html=
    '<div class="f2">'+fldSel('业务线','trLine',['新能源','大交通','网约车','车辆销售'],'新能源')+
      fldSel('关联项目','trProj',['（不关联）'].concat(DB.projects.map(function(p){return p.name})),'（不关联）')+'</div>'+
    fld('出差事由','trReason','如：临港项目接入评审对接')+
    '<div class="f2">'+fld('目的地','trDest','张掖')+fld('交通工具','trTrans','高铁')+'</div>'+
    '<div class="f2">'+fld('开始日期','trStart',todayStr())+fld('结束日期','trEnd',todayStr())+'</div>'+
    '<div class="sect" style="margin:8px 0 4px">预估费用（元）</div>'+
    '<div class="f2">'+fld('交通费','trT',0)+fld('住宿费','trH',0)+'</div>'+
    '<div class="f2">'+fld('补贴/其他','trA',0)+fld('预估合计','trSum','提交后生成')+'</div>'+
    fldArea('备注','trNote','行程安排 / 需协调资源');
  openDrawer('出差申请',html,function(){
    var t=Number(_v('trT'))||0,h=Number(_v('trH'))||0,a=Number(_v('trA'))||0,total=t+h+a;
    if(!_v('trReason')){ toast('请填写出差事由'); return; }
    var pn=_v('trProj'), pid=(DB.projects.filter(function(p){return p.name===pn})[0]||{}).id||'';
    var sd=_v('trStart'),ed=_v('trEnd');
    var days=Math.max(0,Math.round((new Date(ed)-new Date(sd))/864e5))+(sd&&ed?1:0);
    DB.applications=DB.applications||[];
    DB.applications.unshift({id:uid('ap'),type:'trip',title:_v('trReason'),
      applicant:CUR_USER.username,applicantName:CUR_USER.name,line:_v('trLine'),projectId:pid,
      status:'pending',createdAt:todayStr(),submitAt:todayStr(),
      dest:_v('trDest'),reason:_v('trReason'),startDate:sd,endDate:ed,days:days,transport:_v('trTrans'),
      estTransport:t,estHotel:h,estAllowance:a,amount:total,note:_v('trNote')});
    saveDB(); closeDrawer(); toast('出差申请已提交，待审批'); renderExpense();
  },{priText:'提交申请'});
}
function openEntApply(){
  var html=
    '<div class="f2">'+fldSel('业务线','enLine',['新能源','大交通','网约车','车辆销售'],'新能源')+
      fldSel('关联项目','enProj',['（不关联）'].concat(DB.projects.map(function(p){return p.name})),'（不关联）')+'</div>'+
    fld('招待对象','enGuest','如：省发改委能源处')+
    fld('招待事由','enReason','如：项目前期手续协调推进')+
    '<div class="f2">'+fld('人数','enHc',1)+fld('预估费用(元)','enAmt',0)+'</div>'+
    fldArea('备注','enNote','地点 / 标准说明');
  openDrawer('招待申请',html,function(){
    var amt=Number(_v('enAmt'))||0;
    if(!_v('enGuest')){ toast('请填写招待对象'); return; }
    var pn=_v('enProj'), pid=(DB.projects.filter(function(p){return p.name===pn})[0]||{}).id||'';
    DB.applications=DB.applications||[];
    DB.applications.unshift({id:uid('ap'),type:'ent',title:_v('enReason')||('招待：'+_v('enGuest')),
      applicant:CUR_USER.username,applicantName:CUR_USER.name,line:_v('enLine'),projectId:pid,
      status:'pending',createdAt:todayStr(),submitAt:todayStr(),
      guest:_v('enGuest'),reason:_v('enReason'),headcount:Number(_v('enHc'))||1,estAmount:amt,amount:amt,note:_v('enNote')});
    saveDB(); closeDrawer(); toast('招待申请已提交，待审批'); renderExpense();
  },{priText:'提交申请'});
}
function openReimbApply(){
  var related=(DB.applications||[]).filter(function(a){return (a.type==='trip'||a.type==='ent')&&a.status==='approved';});
  var relOpts=['（无）'].concat(related.map(function(a){return a.title+' ['+a.id+']';}));
  var html=
    '<div class="note" style="margin-bottom:8px">报销可关联已通过的出差 / 招待申请（可选）。报销明细按科目填写，合计自动计算。</div>'+
    '<div class="f2">'+fldSel('业务线','rmLine',['新能源','大交通','网约车','车辆销售'],'新能源')+
      fldSel('关联项目','rmProj',['（不关联）'].concat(DB.projects.map(function(p){return p.name})),'（不关联）')+'</div>'+
    fldSel('关联申请','rmRel',relOpts,'（无）')+
    '<div class="sect" style="margin:8px 0 4px">费用明细（元）</div>'+
    '<div class="f2">'+fld('交通费','rmT',0)+fld('住宿费','rmH',0)+'</div>'+
    '<div class="f2">'+fld('餐饮招待费','rmM',0)+fld('办公及其他','rmO',0)+'</div>'+
    '<div class="f2">'+fld('借款/预付款抵扣','rmAdv',0)+fld('报销合计(元)','rmSum','提交后生成')+'</div>'+
    fldArea('说明','rmNote','发票号 / 费用说明');
  openDrawer('报销申请',html,function(){
    var t=Number(_v('rmT'))||0,h=Number(_v('rmH'))||0,m=Number(_v('rmM'))||0,o=Number(_v('rmO'))||0;
    var total=t+h+m+o, adv=Number(_v('rmAdv'))||0;
    if(!total){ toast('请至少填写一项费用'); return; }
    var pn=_v('rmProj'), pid=(DB.projects.filter(function(p){return p.name===pn})[0]||{}).id||'';
    var rel=_v('rmRel'), rid = (rel&&rel!=='（无）')? rel.slice(rel.lastIndexOf('[')+1,-1):'';
    DB.applications=DB.applications||[];
    DB.applications.unshift({id:uid('ap'),type:'reimb',title:_v('rmNote')?('报销：'+_v('rmNote').slice(0,12)):'费用报销',
      applicant:CUR_USER.username,applicantName:CUR_USER.name,line:_v('rmLine'),projectId:pid,
      status:'pending',createdAt:todayStr(),submitAt:todayStr(),relatedId:rid,advance:adv,
      items:[
        {category:'交通费',amount:t,note:_v('rmNote'),invoiceNo:''},
        {category:'住宿费',amount:h,note:'',invoiceNo:''},
        {category:'餐饮招待费',amount:m,note:'',invoiceNo:''},
        {category:'办公及其他',amount:o,note:'',invoiceNo:''}
      ].filter(function(x){return x.amount>0;}),
      total:total,amount:total,note:_v('rmNote')});
    saveDB(); closeDrawer(); toast('报销申请已提交，待审批'); renderExpense();
  },{priText:'提交申请'});
}

/* ---------- 申请详情（只读 + 审批流） ---------- */
function openAppView(id){
  var a=(DB.applications||[]).filter(function(x){return x.id===id})[0]; if(!a) return;
  var info='';
  if(a.type==='trip'){
    info='<div class="kv">'+appKv('目的地',a.dest)+appKv('起止',a.startDate+' 至 '+a.endDate+'（'+(a.days||0)+' 天）')+
      appKv('交通工具',a.transport)+appKv('预估交通费',yuan(a.estTransport))+appKv('预估住宿费',yuan(a.estHotel))+
      appKv('补贴/其他',yuan(a.estAllowance))+appKv('预估合计',yuan(a.amount))+appKv('事由',a.reason)+'</div>';
  } else if(a.type==='ent'){
    info='<div class="kv">'+appKv('招待对象',a.guest)+appKv('人数',(a.headcount||0)+' 人')+appKv('预估费用',yuan(a.estAmount))+appKv('事由',a.reason)+'</div>';
  } else {
    var rel=(DB.applications.filter(function(x){return x.id===a.relatedId})[0]||{}).title||'—';
    var itemRows=(a.items||[]).map(function(it){return '<div class="li"><div class="t">'+esc(it.category)+'<div class="s">'+(it.note||'')+'</div></div><div class="mono" style="color:var(--txt)">'+yuan(it.amount)+'</div></div>';}).join('');
    info='<div class="kv">'+appKv('关联申请',rel)+appKv('借款抵扣',yuan(a.advance||0))+appKv('报销合计',yuan(a.total))+appKv('应付金额',yuan((a.total||0)-(a.advance||0)))+'</div>'+
      '<div class="sect" style="margin:8px 0 4px">费用明细</div><div class="card" style="border:0;background:transparent;padding:0">'+itemRows+'</div>';
  }
  var flow='<div class="flow">'+
    appFlowStep('y','提交申请',a.applicantName+' · '+a.submitAt)+
    (a.status==='pending'?appFlowStep('y','审批中','等待管理层审批'):
      appFlowStep(a.status==='approved'?'g':'r', a.status==='approved'?'审批通过':'审批驳回', (a.auditorName||'')+' · '+(a.auditAt||'')+(a.auditNote?(' · '+a.auditNote):'')))+
    '</div>';
  openDrawer(appTypeLabel(a.type)+' · 详情',
    '<div class="dsec">基本信息</div>'+
    '<div class="kv">'+appKv('标题',a.title)+appKv('类型',appTypeLabel(a.type))+appKv('申请人',a.applicantName)+
      appKv('业务线/项目',appProjLine(a))+appKv('状态',a.status==='pending'?'待审批':a.status==='approved'?'已通过':'已驳回')+'</div>'+
    '<div class="dsec">申请内容</div>'+info+
    '<div class="dsec">审批流程</div>'+flow,
    function(){ closeDrawer(); },{priText:'关闭',hidePri:true});
}

/* ---------- 管理层：审批中心 ---------- */
var APPR_FILTER='pending';
function apprFilterSet(f){ APPR_FILTER=f; document.querySelectorAll('#aprFilter button').forEach(function(b){b.classList.toggle('on',b.dataset.f===f);}); renderApproval(); }
function renderApproval(){
  if(!document.getElementById('aprList')) return;
  var all=(DB.applications||[]);
  var list=all.filter(function(a){ return APPR_FILTER==='all'|| (APPR_FILTER==='pending'?a.status==='pending':a.status===APPR_FILTER); });
  list=list.slice().sort(function(a,b){
    var ra=a.status==='pending'?0:1, rb=b.status==='pending'?0:1;
    if(ra!==rb) return ra-rb;
    return (b.submitAt||'').localeCompare(a.submitAt||'');
  });
  var pending=all.filter(function(a){return a.status==='pending';}).length;
  var approved=all.filter(function(a){return a.status==='approved';}).length;
  var rejected=all.filter(function(a){return a.status==='rejected';}).length;
  var pendAmt=all.filter(function(a){return a.status==='pending';}).reduce(function(s,a){return s+appAmount(a);},0);
  document.getElementById('aprKpi').innerHTML=
    kpi('待审批',pending,'单','需我处理',pending?'danger':'ok')+
    kpi('已通过',approved,'单','', 'ok')+
    kpi('已驳回',rejected,'单','', 'warn')+
    kpi('待审金额',yuan(pendAmt),'','各类申请合计','warn');
  document.getElementById('aprList').innerHTML= list.length? list.map(function(a){
    var act = a.status==='pending'
      ? '<button class="btn sm pri" onclick="event.stopPropagation();openAppAudit(\''+a.id+'\')">审批</button>'
      : appStatusTag(a.status);
    return '<div class="li" style="cursor:pointer" onclick="openAppView(\''+a.id+'\')">'+
      '<div class="t"><span class="apptag">'+appTypeIcon(a.type)+' '+appTypeLabel(a.type)+'</span> '+esc(a.title)+
        '<div class="s">'+esc(a.applicantName)+' · '+appProjLine(a)+'</div></div>'+
      '<div class="mono" style="color:var(--txt);min-width:78px;text-align:right">'+yuan(appAmount(a))+'</div>'+
      act+'</div>';
  }).join('') : '<div class="note">暂无相关申请。</div>';
}
function openAppAudit(id){
  if(!requireManager('审批费用申请')) return;
  var a=(DB.applications||[]).filter(function(x){return x.id===id})[0]; if(!a) return;
  openDrawer('审批 · '+appTypeLabel(a.type),
    '<div class="dsec">申请信息</div>'+
    '<div class="kv">'+appKv('申请人',a.applicantName)+appKv('类型',appTypeLabel(a.type))+appKv('业务线/项目',appProjLine(a))+appKv('金额',yuan(appAmount(a)))+appKv('提交',a.submitAt)+'</div>'+
    '<div class="sect" style="margin:8px 0 4px">'+esc(a.title)+'</div>'+
    '<div class="note">'+(a.type==='trip'?('目的地 '+esc(a.dest)+' · '+a.startDate+'~'+a.endDate):a.type==='ent'?('对象 '+esc(a.guest)+' · '+(a.headcount||0)+' 人'):'报销合计 '+yuan(a.total)+' · 借款抵扣 '+yuan(a.advance||0))+'</div>'+
    '<div class="dsec">审批意见</div>'+fldArea('意见','auNote','同意 / 补充材料 / 驳回原因')+
    '<div class="row" style="margin-top:10px;gap:10px">'+
      '<button class="btn pri" style="flex:1" onclick="auditApp(\''+id+'\',\'approved\')">通过</button>'+
      '<button class="btn dgr" style="flex:1" onclick="auditApp(\''+id+'\',\'rejected\')">驳回</button>'+
    '</div>',
    function(){ closeDrawer(); },{priText:'',hidePri:true});
}
function auditApp(id,decision){
  var a=(DB.applications||[]).filter(function(x){return x.id===id})[0]; if(!a) return;
  if(!requireManager('审批费用申请')) return;
  var note=_v('auNote')||'';
  if(decision==='rejected' && !note){ toast('驳回请填写原因'); return; }
  a.status=decision; a.auditor=CUR_USER.username; a.auditorName=CUR_USER.name; a.auditAt=todayStr(); a.auditNote=note;
  saveDB(); closeDrawer();
  toast(decision==='approved'?'已通过：'+a.title:'已驳回：'+a.title);
  pushAudit((decision==='approved'?'通过':'驳回')+'费用申请·'+appTypeLabel(a.type));
  renderApproval();
}
function exportApplications(){
  var head=['类型','标题','申请人','业务线','项目','金额(元)','状态','提交','审批人','审批意见'];
  var rows=(DB.applications||[]).map(function(a){return [appTypeLabel(a.type),a.title,a.applicantName,a.line,a.projectId?projName(a.projectId):'',appAmount(a),a.status==='pending'?'待审批':a.status==='approved'?'已通过':'已驳回',a.submitAt,a.auditorName||'',a.auditNote||''];});
  csvDownload('甘肃新煜科技_费用申请_'+todayStr()+'.csv',[head].concat(rows));
}

/* ---------------- 新能源 ---------------- */
function renderNewEnergy(){
  var ne=DB.projects.filter(function(p){return p.line==='新能源'});
  var totalInv=ne.reduce(function(a,p){return a+p.invTotal},0);
  document.getElementById('neKpi').innerHTML=
    kpi('在建/开发项目',ne.length,'个','总投资 '+fmt(totalInv)+' 万元')+
    kpi('累计完成投资',fmt(ne.reduce(function(a,p){return a+p.invDone},0)),'万元','投资完成率 <b class="cy">'+(ne.reduce(function(a,p){return a+p.invDone},0)/totalInv*100).toFixed(1)+'%</b>')+
    kpi('开发管道容量',BZ().ne.pipelineMW,'MW','其中已核准 '+BZ().ne.approvedMW+' MW','ok')+
    kpi('前期手续卡点',BZ().ne.stuck,'项','消纳指标 · 接入评审','danger','go(\'run\')');
  document.getElementById('nePipe').innerHTML=funnel([
    ['资源储备',BZ().ne.pipelineMW,'6 个项目'],['已备案/核准',BZ().ne.approvedMW,'3 个'],['手续办理中',100,'1 个'],
    ['开工建设',BZ().ne.buildMW,'1 个'],['并网运营',BZ().ne.gridMW,'—']
  ]);
  /* 手续矩阵 */
  var procs=['备案核准','土地/用海','环评','水保','接入系统','消纳指标','施工许可'];
  var st={'lin-gang':['ok','ok','ok','ok','ing','stuck','wait'],'xi-ping':['ok','ing','ok','ok','ok','ok','ok'],
    'charge':['ok','ok','ok','na','ok','na','ok']};
  var mp={ok:['已办结','m-ok'],ing:['办理中','m-ing'],wait:['待启动','m-wait'],stuck:['卡点','m-stuck'],na:['不适用','m-na']};
  var rows=Object.keys(st).map(function(pid){
    return '<tr><td class="nm" style="white-space:nowrap">'+esc(projName(pid))+'</td>'+
      st[pid].map(function(s,i){
        return '<td class="c '+mp[s][1]+'" onclick="openTaskAdd({title:\''+procs[i]+'办理\',proj:\''+projName(pid)+'\'})">'+mp[s][0]+'</td>';
      }).join('')+'</tr>';
  }).join('');
  document.getElementById('neMatrix').innerHTML=tbl('<th>项目</th>'+procs.map(function(p){return '<th style="text-align:center">'+p+'</th>'}).join(''),rows,'mx');
  /* 台账 */
  document.getElementById('neList').innerHTML=tbl(
    '<th>项目</th><th>类型</th><th>阶段</th><th>进度</th><th class="n">总投资</th><th class="n">已完成</th><th>负责人</th><th>风险</th>',
    ne.map(function(p){
      return '<tr onclick="goDetail(\''+p.id+'\')"><td class="nm">'+esc(p.name)+'</td><td>'+p.type+'</td><td>'+tag(p.stage,'t-blu')+'</td>'+
        '<td style="min-width:90px">'+bar(p.progress)+'</td><td class="n">'+fmt(p.invTotal)+'</td><td class="n">'+fmt(p.invDone)+'</td>'+
        '<td>'+p.owner+'</td><td>'+(p.risk.length?p.risk.map(function(r){return tag(r,'t-red')}).join(' '):tag('无','t-grn'))+'</td></tr>';
    }).join(''));
}

/* ---------------- 大交通 ---------------- */
function renderTransport(){
  var T=BZ().tr;
  document.getElementById('trKpi').innerHTML=
    kpi('在手工程合同额',fmt(T.engIn),'万元','G30 标段 · 履约 '+T.perf+'%')+
    kpi('设备供应在手',fmt(T.equipIn),'万元','监控 / 收费 / 通信')+
    kpi('可申报未申报',fmt(T.claimable),'万元','<b class="up">纯管理损失</b> · 立即申报','danger','openTaskAdd({title:\'G30 第三期进度款申报\',owner:\'王工\',due:\'2026-08-15\'})')+
    kpi('应收账龄 >120 天',fmt(T.ar120),'万元','白银交投 · 拟法务介入','warn','finTab(\'ar\')');
  document.getElementById('trFunnel').innerHTML=funnel([
    ['商机线索',T.bidTotal,'42,600 万'],['已投标',9,'21,800 万'],['入围',5,'12,400 万'],
    ['中标',T.bidWin,fmt(T.engIn)+' 万'],['已签约',T.bidWin,fmt(T.engIn)+' 万']
  ]);
  var sp=[['监控摄像机','呆滞 186 天',420,'r'],['光纤收发器','缺口 · 影响 9 月安装',0,'y'],
    ['收费亭设备','库存正常',260,'g'],['可变情报板','呆滞 92 天',180,'y']];
  document.getElementById('trSupply').innerHTML=sp.map(function(s){
    return '<div class="li"><div class="t">'+s[0]+'<div class="s">'+s[1]+'</div></div>'+
      '<div class="mono" style="color:var(--txt)">'+(s[2]?fmt(s[2])+' 万':'—')+'</div>'+
      tag(s[3]==='r'?'呆滞':s[3]==='y'?'关注':'正常',s[3]==='r'?'t-red':s[3]==='y'?'t-yel':'t-grn')+'</div>';
  }).join('');
  document.getElementById('trAge').innerHTML=bars([1760,620,180,412,268],['0-30天','31-60','61-90','91-120','>120'],C_UP,' 万');
}

/* ---------------- 网约车 ---------------- */
function renderRide(){
  var D=BZ().rd;
  document.getElementById('rdKpi').innerHTML=
    kpi('在营车辆',fmt(D.cars),'台','本月净增 <b class="dn">+'+D.netAdd+'</b>')+
    kpi('日均流水',D.dailyRev,'万元','单车日均 '+D.perCarRev+' 元','ok')+
    kpi('双证合规率',D.compliance,'%','<b class="dn">达标</b>（红线 90%）','ok')+
    kpi('司机月流失率',D.churn,'%','<b class="up">高于目标 5%</b>','warn');
  var cp=[['车证（运输证）','1,286 / 1,286',100,'g'],['人证（驾驶员证）','1,175 / 1,286',D.compliance,'g'],
    ['车辆年检到期 30 天内','38 台',0,'y'],['司机证到期 30 天内','52 人',0,'y'],['平台经营许可','有效期至 2028-05',100,'g']];
  document.getElementById('rdCompliance').innerHTML=cp.map(function(c){
    return '<div class="li"><div class="t">'+c[0]+'<div class="s">'+c[1]+'</div></div>'+
      (c[2]?'<div style="width:100px">'+bar(c[2],c[3])+'</div><div class="mono" style="width:52px;text-align:right;color:var(--txt)">'+c[2]+'%</div>'
        :tag('待处理','t-yel'))+'</div>';
  }).join('');
  var un=[['司机端流水','300.0','元'],['平台抽成（18%）','54.0','元'],['车辆折旧','38.5','元'],
    ['保险与维保','16.2','元'],['充电成本（代付）','12.0','元'],['单车日毛利','-12.7','元']];
  document.getElementById('rdUnit').innerHTML=un.map(function(u,i){
    return '<div class="li"><div class="t">'+u[0]+'</div><div class="mono" style="color:'+(i===un.length-1?(parseFloat(u[1])<0?'var(--up)':'var(--dn)'):'var(--txt)')+';font-weight:'+(i===un.length-1?700:400)+'">'+u[1]+' '+u[2]+'</div></div>';
  }).join('')+'<div class="note" style="margin-top:8px">单车日毛利为负，主要由折旧与抽成结构造成。<b>建议：</b>把在营司机导入购车协同池，用"以租转购"改善资产结构。</div>';
  document.getElementById('rdFunnel').innerHTML=funnel([
    ['在营司机',1286,'台'],['车龄>3年',486,'换车窗口'],['流水达标',312,'具备按揭条件'],['进入购车池',186,'已建档'],['本年成交',58,'成交率 31%']
  ]);
}

/* ---------------- 车辆销售 ---------------- */
function renderSales(){
  var L=BZ().sl;
  document.getElementById('slKpi').innerHTML=
    kpi('本年销量',fmt(L.unitsYTD),'台','同比 <b class="up">'+L.yoy+'%</b>','warn')+
    kpi('销售收入',fmt(L.rev),'万元','单车均价 '+L.avgPrice+' 万元')+
    kpi('单车毛利',L.unitGross,'万元','毛利率 <b class="wn">'+L.grossRate+'%</b>','warn')+
    kpi('库存资金占用',fmt(L.stockCapital),'万元','车龄 >90 天 <b class="up">'+L.stockOld+' 台</b>','danger');
  document.getElementById('slFunnel').innerHTML=funnel([
    ['线索',2860,'条'],['到店',1120,'39%'],['试驾',684,'61%'],['报价',498,'73%'],['成交',412,'83%']
  ]);
  document.getElementById('slAge').innerHTML=bars([48,62,39,25,11],['0-30天','31-60','61-90','91-120','>120'],C_WN,' 台');
  document.getElementById('slPool').innerHTML=tbl(
    '<th>线索来源</th><th class="n">线索量</th><th class="n">成交</th><th class="n">成交率</th><th class="n">单车毛利</th><th>结论</th>',
    [['网约车司机（协同池）',186,58,'31.2%','1.42 万','t-grn','最高效通道 · 应单独考核'],
     ['外部广告投放',1480,159,'10.7%','0.86 万','t-yel','成本高 · 压缩预算'],
     ['自然进店',820,142,'17.3%','0.94 万','t-blu','稳定基本盘'],
     ['老客转介',374,53,'14.2%','1.18 万','t-blu','可加激励']].map(function(r){
      return '<tr><td class="nm">'+r[0]+'</td><td class="n">'+fmt(r[1])+'</td><td class="n">'+r[2]+'</td><td class="n">'+r[3]+'</td><td class="n">'+r[4]+'</td><td>'+tag(r[6],r[5])+'</td></tr>';
    }).join(''));
}

/* ---------------- 跑动作战台 ---------------- */
function runForm(pre){
  pre=pre||{};
  return fld('事项名称','rfMatter','如：接入系统评审',pre.matter)+
    '<div class="f2">'+fldSel('关联项目','rfProj',DB.projects.map(function(p){return p.name}),pre.proj)+
    fld('对接单位','rfWhere','如：国网甘肃省电力公司',pre.where)+'</div>'+
    '<div class="f2">'+fld('责任人','rfOwner','张总',pre.owner)+fld('办结期限','rfDue','2026-08-30',pre.due)+'</div>'+
    '<div class="field"><label>当前状态</label>'+chips('1',['待办','进行中','卡点','已办结'],pre.status||'待办')+'</div>'+
    '<div class="field"><label>升级层级</label>'+chips('2',['执行层','分管领导','董事长'],'执行层')+'</div>'+
    fldArea('对方承诺 / 下一步动作','rfNote','记录对方口头承诺与到期日，这是跑动最易流失的资产');
}
function openRunAdd(){
  openDrawer('新增跑动事项',runForm(),function(){
    var m=_v('rfMatter'); if(!m){toast('请填写事项名称');return}
    var pn=_v('rfProj'), pid=(DB.projects.filter(function(p){return p.name===pn})[0]||{}).id||curProject;
    DB.run.unshift({id:uid('r'),project:pid,matter:m,where:_v('rfWhere')||'—',owner:_v('rfOwner')||'待指派',
      due:_v('rfDue')||'',status:_chip('1')||'待办',level:_chip('2')==='董事长'?3:_chip('2')==='分管领导'?2:1,
      created:todayStr(),note:_v('rfNote')});
    saveDB(); closeDrawer(); toast('已建档：'+m); refresh();
  },{priText:'建档并派单'});
}
function renderRun(){
  var R=DB.run, stuck=R.filter(function(r){return r.status==='卡点'});
  var over=R.filter(function(r){return r.due&&days(r.due)>0&&r.status!=='已办结'});
  var done=R.filter(function(r){return r.status==='已办结'}).length;
  document.getElementById('runKpi').innerHTML=
    kpi('在追踪事项',R.length,'项','本月新增 '+R.filter(function(r){return days(r.created)<=30}).length+' 项')+
    kpi('卡点事项',stuck.length,'项','需领导层介入',(stuck.length?'danger':'ok'))+
    kpi('已逾期',over.length,'项','最长滞留 '+(R.length?Math.max.apply(0,R.map(function(r){return days(r.created)})):0)+' 天','warn')+
    kpi('办结率',(R.length?(done/R.length*100).toFixed(0):0),'%','考核口径：办结率而非拜访次数','ok');
  document.getElementById('runList').innerHTML=tbl(
    '<th>事项</th><th>项目</th><th>卡在哪</th><th>责任人</th><th>滞留</th><th>期限</th><th>状态</th><th>升级</th><th></th>',
    R.map(function(r){
      var st=days(r.created), od=r.due?days(r.due):0;
      var lv=st>=30?'董事长·例会':st>=15?'董事长':st>=7?'分管领导':'执行层';
      return '<tr><td class="nm">'+esc(r.matter)+'</td><td>'+esc(projName(r.project))+'</td><td>'+esc(r.where)+'</td>'+
        '<td>'+esc(r.owner)+'</td><td class="n '+(st>15?'up':'')+'">'+st+' 天</td>'+
        '<td class="n '+(od>0?'up':'')+'">'+(r.due||'—')+'</td>'+
        '<td>'+tag(r.status,r.status==='卡点'?'t-red':r.status==='进行中'?'t-blu':r.status==='已办结'?'t-grn':'t-gry')+'</td>'+
        '<td>'+tag(lv,st>=15?'t-red':st>=7?'t-yel':'t-gry')+'</td>'+
        '<td><button class="btn sm" onclick="event.stopPropagation();closeRun(\''+r.id+'\')">办结</button></td></tr>';
    }).join(''));
}
function closeRun(id){
  var r=DB.run.filter(function(x){return x.id===id})[0]; if(!r)return;
  r.status='已办结'; saveDB(); toast('已办结：'+r.matter); renderRun(); refreshBadges();
}

/* ---------------- 业务财务 ---------------- */
var finT='overview';
function finTab(t){
  finT=t; go('fin');
  document.querySelectorAll('#finTabs button').forEach(function(b){b.classList.toggle('on',b.dataset.t===t)});
  renderFinBody();
}
function renderFin(){
  var pl=plSum(), minCash=Math.min.apply(0,DB.finance.cash13);
  document.getElementById('finKpi').innerHTML=
    kpi('营业收入（本年）',fmt(pl.rev),'万元','四条业务线合计')+
    kpi('毛利 / 毛利率',fmt(pl.gross),'万元','<b class="'+(pl.gm>=20?'dn':'wn')+'">'+pl.gm.toFixed(1)+'%</b>',pl.gm>=20?'ok':'warn')+
    kpi('净利润',fmt(pl.net),'万元','净利率 '+(pl.net/pl.rev*100).toFixed(1)+'%',pl.net>0?'ok':'danger')+
    kpi('应收 / 应付',fmt(arTotal())+' / '+fmt(apTotal()),'万','净敞口 '+fmt(arTotal()-apTotal())+' 万元','warn')+
    kpi('13 周最低资金',fmt(minCash),'万元',(minCash<DB.finance.cashSafe?'<b class="up">跌破安全线</b>':'安全'),(minCash<DB.finance.cashSafe?'danger':'ok'))+
    kpi('留抵退税可申请',fmt(210),'万元','<b class="dn">尚未申请</b> · 建议本月办理','ok');
  document.querySelectorAll('#finTabs button').forEach(function(b){b.classList.toggle('on',b.dataset.t===finT)});
  renderFinBody();
}
function renderFinBody(){
  var F=DB.finance, box=document.getElementById('finBody'), h='';
  if(finT==='overview'){
    var pl=plSum();
    h+='<div class="row"><div class="card"><div class="sect" style="margin:0 0 10px">开票 vs 回款（近 12 月）</div>'+
      '<div class="chart">'+dualBars(F.inv.map(function(x){return x.iv}),F.inv.map(function(x){return x.rc}),F.inv.map(function(x){return x.m.slice(2)}))+'</div>'+
      '<div class="legend"><span><i style="background:#ffb347"></i>开票额</span><span><i style="background:#ff8c1a"></i>回款额</span>'+
      '<span style="margin-left:auto">回款/开票比 <b class="mono cy">'+(F.inv.reduce(function(a,x){return a+x.rc},0)/F.inv.reduce(function(a,x){return a+x.iv},0)*100).toFixed(1)+'%</b></span></div></div>'+
      '<div class="card"><div class="sect" style="margin:0 0 10px">分业务线收入结构</div>'+
      '<div class="chart">'+hbars(F.pl.map(function(x){return [x.line,x.rev]}))+'</div>'+
      '<div class="note" style="margin-top:10px">收入结构较均衡，但<b>新能源车销售同比 -4.1%</b> 且毛利率最低，需优先处置库存车龄。</div></div></div>';
    h+='<div class="card" style="margin-top:14px"><div class="sect" style="margin:0 0 10px">业财一体链路 <span class="tip">合同 → 收入 → 开票 → 回款</span></div>'+
      '<div class="scroll">'+tbl('<th>环节</th><th class="n">金额（万元）</th><th class="n">转化率</th><th>缺口分析</th>',
      [['在手合同额（收入类）',ctInAmount(),'—','—'],
       ['已确认收入',plSum().rev,(plSum().rev/ctInAmount()*100).toFixed(1)+'%','按履约进度确认'],
       ['已开票',F.inv.reduce(function(a,x){return a+x.iv},0),(F.inv.reduce(function(a,x){return a+x.iv},0)/plSum().rev*100).toFixed(1)+'%','开票滞后于收入确认'],
       ['已回款',F.inv.reduce(function(a,x){return a+x.rc},0),(F.inv.reduce(function(a,x){return a+x.rc},0)/F.inv.reduce(function(a,x){return a+x.iv},0)*100).toFixed(1)+'%','回款缺口即应收余额']
      ].map(function(r){return '<tr><td class="nm">'+r[0]+'</td><td class="n">'+fmt(r[1])+'</td><td class="n cy">'+r[2]+'</td><td>'+r[3]+'</td></tr>'}).join(''))+'</div></div>';
  }
  else if(finT==='pl'){
    var t=plSum();
    h+='<div class="card"><div class="sect" style="margin:0 0 10px">分业务线经营损益（本年累计 · 万元）</div><div class="scroll">'+
      tbl('<th>业务线</th><th class="n">收入</th><th class="n">成本</th><th class="n">毛利</th><th class="n">毛利率</th><th class="n">其他费用</th><th class="n">业务费用</th><th class="n">净利</th><th class="n">同比</th>',
      F.pl.map(function(x){
        var g=x.rev-x.cost, be=bizExpByLine(x.line), n=g-x.exp-be, gm=g/x.rev*100;
        return '<tr><td class="nm">'+x.line+'</td><td class="n">'+fmt(x.rev)+'</td><td class="n">'+fmt(x.cost)+'</td>'+
          '<td class="n">'+fmt(g)+'</td><td class="n '+(gm>=20?'dn':gm>=10?'wn':'up')+'">'+gm.toFixed(1)+'%</td>'+
          '<td class="n">'+fmt(x.exp)+'</td>'+
          '<td class="n wn" title="业务人员报销/拓展费用(万元)">'+fmt(be)+'</td>'+
          '<td class="n '+(n>0?'dn':'up')+'">'+fmt(n)+'</td>'+
          '<td class="n '+(x.yoy>0?'up':'dn')+'">'+(x.yoy>0?'+':'')+x.yoy+'%</td></tr>';
      }).join('')+
      '<tr style="background:rgba(255,140,26,.05)"><td class="nm">合计</td><td class="n">'+fmt(t.rev)+'</td><td class="n">'+fmt(t.cost)+'</td>'+
      '<td class="n">'+fmt(t.gross)+'</td><td class="n cy">'+t.gm.toFixed(1)+'%</td><td class="n">'+fmt(t.exp)+'</td>'+
      '<td class="n wn">'+fmt(t.bizExp)+'</td><td class="n dn">'+fmt(t.net)+'</td><td class="n">—</td></tr>')+'</div></div>';
    h+='<div class="card" style="margin-top:14px"><div class="sect" style="margin:0 0 10px">收入 · 成本 · 费用(含业务费用) · 净利 结构</div>'+
      '<div class="chart">'+stackRow(F.pl.map(function(x){return [x.line,x.rev,x.cost,x.exp+bizExpByLine(x.line)]}))+'</div>'+
      '<div class="legend"><span><i style="background:#ffb347"></i>成本</span><span><i style="background:#ff6b35"></i>费用(含业务费用)</span><span><i style="background:#19c37d"></i>净利</span></div></div>';
    h+='<div class="note" style="margin-top:12px"><b>业务费用已并入损益口径：</b>业务人员报销与拓展费用本年合计 <b class="wn">¥'+fmt(Math.round(bizExpTotal()*10000))+
      '</b>（'+fmt(bizExpTotal())+' 万元），作为「业务费用」单独列示。净利 = 收入 − 成本 − 其他费用 − 业务费用。'+
      '网约车平台同比 +26.5% 增长最快但净利最薄；新能源车销售是唯一负增长业务线，建议把网约车司机购车协同池的考核权重提高。</div>';
  }
  else if(finT==='ar'){
    var ar=F.ar.slice().sort(function(a,b){return b.age*b.amount-a.age*a.amount});
    h+='<div class="row"><div class="card"><div class="sect" style="margin:0 0 10px">应收账龄分布</div>'+
      '<div class="chart">'+bars([1760,620,180,412,268],['0-30天','31-60','61-90','91-120','>120'],C_UP,' 万')+'</div></div>'+
      '<div class="card"><div class="sect" style="margin:0 0 10px">Top 欠款方</div>'+
      '<div class="chart">'+hbars(ar.slice(0,5).map(function(x){return [x.party.slice(0,10),x.amount,x.age>90?C_UP:x.age>30?C_WN:C_CY]}))+'</div></div></div>';
    h+='<div class="card" style="margin-top:14px"><div class="sect" style="margin:0 0 10px">应收明细 <span class="tip">按 账龄 × 金额 风险排序</span></div><div class="scroll">'+
      tbl('<th>欠款方</th><th>项目</th><th class="n">金额</th><th class="n">账龄</th><th>到期日</th><th>责任人</th><th>状态</th><th></th>',
      ar.map(function(x){
        return '<tr><td class="nm">'+esc(x.party)+'</td><td>'+esc(x.project)+'</td><td class="n">'+fmt(x.amount)+'</td>'+
          '<td class="n '+(x.age>90?'up':x.age>30?'wn':'')+'">'+(x.age>0?x.age+' 天':'未逾期')+'</td>'+
          '<td class="mono">'+x.due+'</td><td>'+x.owner+'</td>'+
          '<td>'+tag(x.status,x.age>120?'t-red':x.age>30?'t-yel':'t-blu')+'</td>'+
          '<td><button class="btn sm" onclick="openTaskAdd({title:\'催收：'+esc(x.party)+' '+x.amount+'万\',owner:\''+x.owner+'\'})">派催收</button></td></tr>';
      }).join(''))+'</div>'+
      '<div class="note" style="margin-top:10px"><b>最容易拿回的现金：</b>G30 第三期进度款 1,760 万<b class="up">已具备申报条件但未申报</b>，'+
      '不涉及任何客户博弈，属于纯管理损失，应作为本周第一优先级。</div></div>';
  }
  else if(finT==='ap'){
    h+='<div class="card"><div class="sect" style="margin:0 0 10px">应付账款与到期安排</div><div class="scroll">'+
      tbl('<th>供应商/机构</th><th>类型</th><th class="n">金额</th><th>到期日</th><th class="n">剩余天数</th><th>状态</th>',
      F.ap.slice().sort(function(a,b){return new Date(a.due)-new Date(b.due)}).map(function(x){
        var dd=days(todayStr(),x.due);
        return '<tr><td class="nm">'+esc(x.party)+'</td><td>'+x.type+'</td><td class="n">'+fmt(x.amount)+'</td>'+
          '<td class="mono">'+x.due+'</td><td class="n '+(dd<15?'wn':'')+'">'+dd+' 天</td>'+
          '<td>'+tag(x.status,dd<0?'t-red':dd<30?'t-yel':'t-gry')+'</td></tr>';
      }).join(''))+'</div>'+
      '<div class="note" style="margin-top:10px">应付合计 <b class="mono">'+fmt(apTotal())+'</b> 万元；与应收 <b class="mono">'+fmt(arTotal())+
      '</b> 万元相比净敞口 <b class="mono cy">'+fmt(arTotal()-apTotal())+'</b> 万元。'+
      '<b>10 月为付款高峰</b>（金风尾款 3,900 万），需提前 45 天锁定资金来源。</div></div>';
  }
  else if(finT==='cash'){
    var lab=[];for(var i=1;i<=13;i++)lab.push('W'+i);
    h+='<div class="card"><div class="sect" style="margin:0 0 10px">未来 13 周资金预测 <span class="tip">跌破安全线自动预警</span></div>'+
      '<div class="chart">'+cashLine(F.cash13,F.cashSafe,lab)+'</div>'+
      '<div class="note" style="margin-top:10px"><b>诊断：</b>第 8 周（10 月中）资金降至 <b class="up mono">'+fmt(Math.min.apply(0,F.cash13))+
      '</b> 万元，跌破安全线 '+fmt(F.cashSafe)+' 万元，主因是金风尾款与大华验收款集中付出。'+
      '<b>建议动作：</b>① 立即申报 G30 进度款 1,760 万；② 与金风协商吊装款拆分为两期；③ 启动留抵退税 210 万。</div></div>';
    h+='<div class="row" style="margin-top:14px"><div class="card"><div class="sect" style="margin:0 0 10px">未来 90 天资金流入（收入类合同）</div>'+
      '<div class="scroll">'+cashFlowTable('收')+'</div></div>'+
      '<div class="card"><div class="sect" style="margin:0 0 10px">未来 90 天资金流出（支出类合同）</div>'+
      '<div class="scroll">'+cashFlowTable('付')+'</div></div></div>';
  }
  else if(finT==='tax'){
    h+='<div class="row"><div class="card"><div class="sect" style="margin:0 0 10px">税务事项</div>'+
      tbl('<th>事项</th><th class="n">金额（万元）</th><th>说明</th>',
      F.tax.map(function(x){return '<tr><td class="nm">'+x.name+'</td><td class="n">'+fmt(x.amount)+'</td><td>'+(x.note||'—')+'</td></tr>'}).join(''))+
      '<div class="note" style="margin-top:10px"><b>留抵退税 210 万元符合条件但尚未申请</b>，属于可直接变现的资金，建议本月内办理。</div></div>'+
      '<div class="card"><div class="sect" style="margin:0 0 10px">费用预算执行</div>'+
      tbl('<th>科目</th><th class="n">预算</th><th class="n">实际</th><th class="n">执行率</th><th>状态</th>',
      F.budgetExec.map(function(x){
        var r=x.act/x.bud*100;
        return '<tr><td class="nm">'+x.item+'</td><td class="n">'+fmt(x.bud)+'</td><td class="n">'+fmt(x.act)+'</td>'+
          '<td class="n '+(r>100?'up':r>90?'wn':'dn')+'">'+r.toFixed(0)+'%</td>'+
          '<td>'+tag(r>100?'超预算':r>90?'临界':'受控',r>100?'t-red':r>90?'t-yel':'t-grn')+'</td></tr>';
      }).join(''))+'</div></div>';
  }
  box.innerHTML=h;
}
function cashFlowTable(dir){
  var rows=duePlans(90).filter(function(x){return x.c.dir===dir});
  if(!rows.length) return '<div class="note">未来 90 天无该方向的收付款节点。</div>';
  var total=rows.reduce(function(a,x){return a+x.p.amount},0);
  return tbl('<th>日期</th><th>事项</th><th>对方</th><th class="n">金额</th><th>状态</th>',
    rows.map(function(x){
      return '<tr onclick="openContractView(\''+x.c.id+'\')"><td class="mono">'+x.p.planDate+'</td>'+
        '<td class="nm">'+esc(x.p.name)+'</td><td>'+esc(x.c.party.slice(0,12))+'</td>'+
        '<td class="n '+(dir==='收'?'dn':'up')+'">'+(dir==='收'?'+':'-')+fmt(x.p.amount)+'</td>'+
        '<td>'+tag(x.dd<0?'逾期 '+(-x.dd)+' 天':x.dd+' 天后',x.dd<0?'t-red':x.dd<=30?'t-yel':'t-gry')+'</td></tr>';
    }).join('')+
    '<tr style="background:rgba(255,140,26,.05)"><td colspan="3" class="nm">合计</td><td class="n '+(dir==='收'?'dn':'up')+'">'+
    (dir==='收'?'+':'-')+fmt(total)+'</td><td>—</td></tr>');
}

/* ---------------- 全局刷新 ---------------- */
function refreshBadges(){
  var s=DB.run.filter(function(r){return r.status==='卡点'||r.status==='待办'}).length;
  document.getElementById('navRun').textContent=s;
  var od=overduePlans().length;
  var ct=document.getElementById('navCt');
  ct.textContent=od; ct.style.display=od?'':'none';
}
function refresh(){
  refreshBadges(); renderProjNav();
  var cur=document.querySelector('section[id^="p-"]:not(.hide)');
  if(cur) go(cur.id.slice(2));
}
function genWeekly(){
  var p=projById(curProject);
  var rs=DB.run.filter(function(r){return r.project===curProject});
  var nodes=(DB.nodes[curProject]||[]);
  var late=nodes.filter(function(n){return n.status==='延期'});
  var cs=DB.contracts.filter(function(c){return c.project===curProject});
  openDrawer('《'+p.name+'》经营周报草稿',
    '<div class="dsec">进度概况</div><div class="kv">'+
    '<div class="k">总体进度</div><div class="v mono">'+p.progress+'%</div>'+
    '<div class="k">累计投资</div><div class="v mono">'+fmt(p.invDone)+' / '+fmt(p.invTotal)+' 万元</div>'+
    '<div class="k">关键节点</div><div class="v">共 '+nodes.length+' 个，已完成 '+nodes.filter(function(n){return n.status==='已完成'}).length+' 个，延期 <b style="color:var(--up)">'+late.length+'</b> 个</div>'+
    '<div class="k">在手合同</div><div class="v">'+cs.length+' 份 · '+fmt(cs.reduce(function(a,c){return a+c.amount},0))+' 万元</div>'+
    '<div class="k">跑动事项</div><div class="v">'+rs.length+' 项，卡点 '+rs.filter(function(r){return r.status==='卡点'}).length+' 项</div></div>'+
    '<div class="dsec">本周重点风险</div>'+
    (late.length?late.map(function(n){return '<div class="li"><div class="t">'+esc(n.name)+'<div class="s">对接 '+esc(n.dep)+' · 责任人 '+esc(n.owner)+' · 逾期 '+days(n.plan)+' 天</div></div></div>'}).join(''):'<div class="note">无延期节点。</div>')+
    '<div class="dsec">下周计划</div><div class="note">'+(rs.slice(0,4).map(function(r){return '· '+r.matter+'（'+r.owner+'，'+(r.due||'待定')+'）'}).join('<br>')||'—')+'</div>',
    function(){ closeDrawer(); toast('周报已生成并推送至经营例会'); },{priText:'推送至例会'});
}

/* ---------------- 初始化 ---------------- */
function tickClock(){
  var d=new Date();
  var s=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)+' '+
    ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+':'+('0'+d.getSeconds()).slice(-2);
  var c=document.getElementById('clock'); if(c) c.textContent='◉ 实时 '+s;
  var m=document.getElementById('mbClock'); if(m) m.textContent=s.slice(11,16);
}
function init(){
  applyTheme();
  /* 启动屏：注入 LOGO，init 完成后淡出 */
  var sp=document.getElementById('splash');
  if(sp){ var sl=document.getElementById('splashLogo'); if(sl) sl.innerHTML=xyLogo('sp'); }
  function hideSplash(){ if(sp){ sp.classList.add('fade'); setTimeout(function(){ if(sp.parentNode) sp.remove(); },550); } }
  setTimeout(hideSplash, 900);
  document.querySelectorAll('.side .nav[data-page]').forEach(function(n){
    n.onclick=function(){ go(n.dataset.page) };
  });
  document.querySelectorAll('.bottomnav .b').forEach(function(n){
    n.onclick=function(){ go(n.dataset.page) };
  });
  document.querySelectorAll('#finTabs button').forEach(function(b){
    b.onclick=function(){ finT=b.dataset.t;
      document.querySelectorAll('#finTabs button').forEach(function(x){x.classList.toggle('on',x===b)});
      renderFinBody(); };
  });
  document.querySelectorAll('#dtTabs button').forEach(function(b){
    b.onclick=function(){ dtTab(b.dataset.t) };
  });
  document.querySelectorAll('#ctFilter button').forEach(function(b){
    b.onclick=function(){ ctFilter=b.dataset.f;
      document.querySelectorAll('#ctFilter button').forEach(function(x){x.classList.toggle('on',x===b)});
      renderCtList(); };
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeDrawer(); });
  renderProjNav(); refreshBadges();
  tickClock(); setInterval(tickClock,1000);
  if(typeof AI!=='undefined' && AI.init) AI.init();
  /* 登录鉴权：未登录弹出登录网关，已登录恢复会话并按角色进入对应平台 */
  if(bootAuth()){ applyAuthUI(); connectSync(); go(landingPage()); } else { applyAuthUI(); showLoginGate(); }
  renderPresence();
}

/* ---------------- 多设备协同（登录 + SSE 实时联动） ---------------- */
var API_BASE=(function(){ try{ return localStorage.getItem('xy_apibase')||''; }catch(e){ return ''; } })();
function apiURL(p){ return API_BASE+p; }
function setApiBase(url){
  if(!url) url='';
  /* 去除尾部斜杠 */
  while(url.endsWith('/')) url=url.slice(0,-1);
  try{ localStorage.setItem('xy_apibase',url); }catch(e){}
  API_BASE=url;
}
var SYNC={on:false,token:null,user:null,es:null,users:[],status:'off'};
var SUPPRESS_SYNC=false;
var R_MAP={dash:renderDash,newenergy:renderNewEnergy,transport:renderTransport,ride:renderRide,
  sales:renderSales,contract:renderContract,fin:renderFin,run:renderRun,staff:renderStaff,map:renderMap,detail:renderDetail,admin:renderAdmin};
function afterSave(){ if(SYNC.on && !SUPPRESS_SYNC) syncPush(); }
function syncPush(){
  if(!SYNC.token) return;
  try{ fetch(apiURL('/api/db'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:SYNC.token,db:DB})}).catch(function(){}); }catch(e){}
}
function saveDBNoPush(){ SUPPRESS_SYNC=true; saveDB(); SUPPRESS_SYNC=false; }
function bindSyncAndRender(){
  renderProjNav(); refreshBadges();
  var cur=document.querySelector('section[id^="p-"]:not(.hide)');
  if(cur){ var id=cur.id.slice(2); if(id==='detail') renderDetail(); else if(R_MAP[id]) R_MAP[id](); }
}
function doLogin(user,pass){
  fetch(apiURL('/api/login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:user,pass:pass})})
    .then(function(r){return r.json();}).then(function(j){
      if(!j.ok){ toast(j.msg||'登录失败'); return; }
      SYNC.token=j.token; SYNC.user=j.user; SYNC.on=true;
      try{ localStorage.setItem('xy_token',j.token); localStorage.setItem('xy_user',JSON.stringify(j.user)); }catch(e){}
      startStream(); closeDrawer(); renderPresence();
      toast('已登录：'+j.user.name+' · 协同已开启');
    }).catch(function(){ toast('协同服务未连接（离线模式）'); });
}
function startStream(){
  if(!SYNC.token) return;
  if(SYNC.es) try{ SYNC.es.close(); }catch(e){}
  try{
    var es=new EventSource(apiURL('/api/stream?token='+encodeURIComponent(SYNC.token)));
    SYNC.es=es; SYNC.status='conn'; renderPresence();
    es.onopen=function(){ SYNC.status='on'; renderPresence(); };
    es.onmessage=function(ev){
      var m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
      if(m.type==='snapshot'){ if(m.db){ DB=m.db; saveDBNoPush(); bindSyncAndRender(); } else { syncPush(); } }
      else if(m.type==='update'){ if(m.db){ DB=m.db; saveDBNoPush(); bindSyncAndRender(); toast('其他设备已更新 · 已同步'); } }
      else if(m.type==='presence'){ SYNC.users=m.users||[]; renderPresence(); }
    };
    es.onerror=function(){ SYNC.status='off'; renderPresence(); };
  }catch(e){}
}
function renderPresence(){
  var html='';
  if(SYNC.on && SYNC.user){
    var lbl = SYNC.status==='on' ? '⦿ 云端同步已连接' : (SYNC.status==='conn' ? '⦿ 同步连接中…' : '⦿ 协同中');
    html='<span class="sync '+(SYNC.status==='on'?'on':'')+'" onclick="if(SYNC.on) logout()" title="多设备实时协同已开启 · 点击退出">'+lbl+' · '+esc(SYNC.user.name)+'</span>';
    (SYNC.users||[]).forEach(function(x){ html+='<span class="avt" title="'+esc(x.name)+' 在线">'+esc((x.name||'?').slice(0,1))+'</span>'; });
  } else {
    html='<span class="sync off" onclick="openLogin()" title="当前为本地离线模式，数据仅存本机；登录并连接协同服务可实时同步">⦿ 本地离线 · 点击连接</span>';
  }
  ['presence','presenceFoot'].forEach(function(id){ var el=document.getElementById(id); if(el) el.innerHTML=html; });
}
/* openLogin 已在本文件上方「账号 / 密码登录 + 角色权限」段重定义为 connectSync（本地登录后连接协同） */
function logout(){
  if(SYNC.es) try{ SYNC.es.close(); }catch(e){}
  SYNC.on=false; SYNC.token=null; SYNC.user=null; SYNC.es=null; SYNC.users=[];
  try{ localStorage.removeItem('xy_token'); localStorage.removeItem('xy_user'); }catch(e){}
  renderPresence(); toast('已退出协同（本机数据保留）');
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();

/* PWA */
if('serviceWorker' in navigator && location.protocol.indexOf('http')===0){
  window.addEventListener('load',function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
}
