/* ============================================================
   甘肃新煜科技工作台 · AI 助手
   - 本地意图引擎：查询经营数据 / 跳转页面 / 快速新建 / 生成周报（离线、免密钥）
   - 可选云端大模型：管理员在「平台管理后台」配置 OpenAI 兼容接口后启用
   目标：协助平台使用者对平台内功能与信息进行"查询 + 编辑 + 处理"
   ============================================================ */
var AI = (function(){
  var open=false, msgs=[], lastText='';
  var cfg = loadCfg();

  function loadCfg(){
    try{ return JSON.parse(localStorage.getItem('xy_ai')||'null') || {enabled:false, base:'', model:'gpt-3.5-turbo', key:''}; }
    catch(e){ return {enabled:false, base:'', model:'gpt-3.5-turbo', key:''}; }
  }
  function saveCfg(){ try{ localStorage.setItem('xy_ai', JSON.stringify(cfg)); }catch(e){} }
  function getCfg(){ return cfg; }
  function setCfg(c){ cfg = {enabled:!!c.base, base:c.base||'', model:c.model||'gpt-3.5-turbo', key:c.key||''}; saveCfg(); refreshMode(); }

  function refreshMode(){
    var m=document.getElementById('aiMode'); if(m) m.textContent = cfg.enabled ? '云端大模型 · '+ (cfg.model||'') : '本地智能 · 离线可用';
  }
  function init(){
    refreshMode();
    if(msgs.length===0) welcome();
  }
  function toggle(){ open=!open; var p=document.getElementById('aiPanel'); if(p) p.classList.toggle('hide', !open); if(open) focusIn(); }
  function focusIn(){ var i=document.getElementById('aiIn'); if(i) i.focus(); }
  function welcome(){
    addMsg('bot','你好，我是<b>新煜 AI 助手</b>。我可以帮你：<br>· <b>查数据</b>：本月营收多少、应收多少、司机合规率…<br>· <b>办业务</b>：新增项目 / 合同 / 人员 / 跑动<br>· <b>出报告</b>：生成项目周报<br>· <b>找功能</b>：打开合同管理、经营驾驶舱…<br>试试下面的快捷指令 👇');
  }
  function addMsg(who, text, html){
    msgs.push({who:who, text:text, html:html});
    render();
  }
  function render(){
    var box=document.getElementById('aiMsgs'); if(!box) return;
    box.innerHTML = msgs.map(function(m){
      return '<div class="aimsg '+(m.who==='user'?'u':'b')+'">'+(m.html||esc(m.text))+'</div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }
  function send(text){
    var inp=document.getElementById('aiIn');
    var t=(text!=null?String(text):(inp?inp.value:'')).trim();
    if(!t) return;
    if(inp) inp.value='';
    lastText=t;
    addMsg('user', t);
    setTimeout(function(){ respond(t); }, 140);
  }

  /* ---------------- 意图理解 ---------------- */
  function grabName(t){
    var m=t.match(/(?:叫|名为|名称|项目名|是|名为)\s*["']?([^，。,.！!？?\s，]{2,20})["']?/);
    if(m) return m[1];
    m=t.match(/新增(.{2,16}?)(?:项目|合同|人员|业务人员|跑动)/); if(m) return m[1];
    return '';
  }
  function findProject(t){
    return (DB.projects||[]).filter(function(p){ return t.indexOf(p.name)>=0; })[0];
  }
  function understand(t){
    if(/你能做什么|帮助|怎么用|有哪些功能|hello|你好|hi|在吗/.test(t)) return {type:'help'};
    /* 创建类（优先于导航，避免"新增合同"被"合同"导航截走） */
    if(/新增项目|加个项目|创建项目|新建项目|录入项目|开个?项目/.test(t)) return {type:'addProject'};
    if(/新增合同|加个合同|创建合同|新建合同|录合同|签合同/.test(t)) return {type:'addContract'};
    if(/新增(业务)?人员|加个?人|创建人员|新建人员|录人员/.test(t)) return {type:'addStaff'};
    if(/新增跑动|记(一|个|笔)?跑动|创建跑动|新建跑动|添加跑动事项/.test(t)) return {type:'addRun'};
    if(/生成周报|写周报|项目周报|周报/.test(t)) return {type:'weekly'};
    if(/设(定|置)?(经营)?目标|改目标|年度目标|营收目标/.test(t)) return {type:'target'};
    /* 导航 */
    var navMap={'经营驾驶舱':'dash','驾驶舱':'dash','全域态势':'dash','新能源':'newenergy','大交通':'transport','网约车':'ride','车辆销售':'sales','销售':'sales',
      '合同管理':'contract','合同':'contract','业务财务':'fin','财务':'fin','跑动作战台':'run','跑动':'run','业务人员':'staff','人员管理':'staff','项目地图':'map','地图':'map',
      '项目详情':'detail','项目中心':'detail','管理后台':'admin','平台管理':'admin'};
    for(var k in navMap){ if(t.indexOf(k)>=0) return {type:'goto', page:navMap[k]}; }
    /* 查询类 */
    if(/营收|收入|产值/.test(t) && /多少|几|多少|有多|金额|多少万|目标/.test(t)) return {type:'qRevenue'};
    if(/回款|收款/.test(t)) return {type:'qRecv'};
    if(/净利|利润/.test(t)) return {type:'qNet'};
    if(/装机|并网|核准/.test(t)) return {type:'qMw'};
    if(/应收/.test(t)) return {type:'qAr'};
    if(/合同额|在手合同|合同金额/.test(t)) return {type:'qCt'};
    if(/合规率|双证|合规/.test(t)) return {type:'qComp'};
    if(/绩效|效率比|人员排名/.test(t)) return {type:'qPerf'};
    if(/项目.*进度|进度.*项目|.*进度/.test(t) && findProject(t)) return {type:'qProj'};
    return {type:'fallback'};
  }

  /* ---------------- 执行 ---------------- */
  function dispatch(it){
    var pg=allowedPages?allowedPages():['dash','newenergy','transport','ride','sales','contract','fin','run','staff','map','detail','admin'];
    switch(it.type){
      case 'help': return '我可以帮你查数据、办业务、出报告、找功能。比如：\n· 本月营收多少\n· 应收多少\n· 司机合规率\n· 新增一个风电项目\n· 生成周报\n· 打开合同管理';
      case 'addProject':
        if(!canAddProject()) return '请先登录后再新增项目。';
        openProjectAdd();
        var nm=grabName(lastText); if(nm){ var el=document.querySelector('#dbody [name="paName"]'); if(el) el.value=nm; }
        return '已打开「新增项目」表单'+(nm?'，名称已预填「'+nm+'」':'')+'，填完点「保存项目」即可。';
      case 'addContract':
        if(!canAddProject()) return '请先登录后再新增合同。';
        openContractAdd(); return '已打开「新增合同」表单，填完保存即可。';
      case 'addStaff':
        if(!requireManager('新增业务人员')) return '新增业务人员需要<b>管理者及以上权限</b>，请联系管理员开通。';
        openStaffAdd(); return '已打开「新增业务人员」表单，填完保存即可。';
      case 'addRun':
        openRunAdd(); return '已打开「新增跑动事项」表单，填完保存即可。';
      case 'weekly':
        if(!curProject && DB.projects && DB.projects[0]) curProject=DB.projects[0].id;
        genWeekly(); return '已为你生成当前项目的经营周报草稿，可在抽屉中查看并推送至例会。';
      case 'target':
        if(!isAdmin()) return '年度目标仅<b>管理员</b>可修改，请到「平台管理后台」操作或联系管理员。';
        go('admin'); return '已打开「平台管理后台 → 年度经营目标」，修改后点「保存目标」即可。';
      case 'goto':
        if(pg.indexOf(it.page)<0) return '你当前是<b>'+platformMode()+'</b>，无权限打开该功能，请联系管理员。';
        go(it.page); return '已为你打开：'+ (PAGE_SUB[it.page]||it.page);
      case 'qRevenue': {
        var snap=(typeof SNAP==='function')?SNAP():null;
        var rev = snap? Number(snap.plRev)||0 : (DB.finance.pl||[]).reduce(function(a,x){return a+(Number(x.rev)||0);},0);
        var tgt=(typeof TGT==='function')?TGT():{rev:0};
        var pct = (tgt&&tgt.rev>0)? Math.round(rev/tgt.rev*100):0;
        return '今年累计营收约 <b>'+fmt(rev)+' 万元</b>'+(tgt?('，年度目标完成率约 <b>'+pct+'%</b>（目标 '+fmt(tgt.rev)+' 万）'):'')+'（经营损益口径）。';
      }
      case 'qRecv':
        return '累计回款约 <b>'+fmt(arTotal())+' 万元</b>。';
      case 'qNet': {
        var pl=(typeof plSum==='function')?plSum():{net:0,gm:0};
        return '累计净利约 <b>'+fmt(pl.net)+' 万元</b>，净利率约 <b>'+(pl.gm||0).toFixed(1)+'%</b>。';
      }
      case 'qMw': {
        var b=(typeof BZ==='function')?BZ():null;
        return b? ('新能源累计装机 <b>'+fmt(b.ne.gridMW)+' MW</b>（已并网），核准 <b>'+fmt(b.ne.approvedMW)+' MW</b>，在推管道 <b>'+fmt(b.ne.pipelineMW)+' MW</b>。') : '暂无装机数据。';
      }
      case 'qAr':
        return '应收账款余额 <b>'+fmt(arTotal())+' 万元</b>，其中逾期 <b style="color:#ff4757">'+fmt(arOverdue())+' 万元</b>。';
      case 'qCt':
        return '在手合同额 收入类 <b>'+fmt(ctInAmount())+' 万元</b>，支出类 <b>'+fmt(ctOutAmount())+' 万元</b>。';
      case 'qComp': {
        var b=(typeof BZ==='function')?BZ():null;
        return b? ('网约车双证合规率 <b>'+b.rd.compliance+'%</b>'+(b.rd.compliance<90?'，<b style="color:#ff4757">低于 90% 红灯预警</b>':'，合规正常')+'。') : '暂无合规数据。';
      }
      case 'qPerf': {
        var top=(DB.staff||[]).slice().sort(function(a,b){return (b.contractAmt||0)-(a.contractAmt||0);}).slice(0,3)
          .map(function(s){return esc(s.name)+'（'+(fmt(s.contractAmt||0))+' 万）';}).join('、');
        return '人员绩效排名（按关联合同额）：'+(top||'暂无人员');
      }
      case 'qProj': {
        var p=findProject(lastText);
        return p? ('项目「'+esc(p.name)+'」当前进度 <b>'+p.progress+'%</b>，阶段：'+esc(p.stage||p.status||'推进中')+'，负责人 '+esc(p.owner||'—')+'。') : '未匹配到具体项目，可说「XX项目进度」。';
      }
    }
    return undefined; /* 交给 LLM / fallback */
  }

  function respond(t){
    var it=understand(t);
    var reply=dispatch(it);
    if(reply!==undefined){ addMsg('bot', reply); return; }
    /* 兜底：云端大模型（若配置） */
    addMsg('bot','⏳ 正在思考…', true);
    callLLM(t, function(c){
      /* 移除"正在思考"这条 */
      if(msgs.length && msgs[msgs.length-1].text==='⏳ 正在思考…') msgs.pop();
      if(c) addMsg('bot', c);
      else addMsg('bot','抱歉，我还不太理解。你可以试试：\n· 本月营收多少\n· 新增一个风电项目\n· 生成周报\n· 打开合同管理');
      render();
    });
  }
  function callLLM(t, cb){
    if(!cfg.enabled || !cfg.base){ cb(null); return; }
    try{
      fetch(cfg.base, {
        method:'POST',
        headers:Object.assign({'Content-Type':'application/json'}, cfg.key?{'Authorization':'Bearer '+cfg.key}:{}),
        body:JSON.stringify({ model:cfg.model, messages:[
          {role:'system', content:'你是甘肃新煜科技集团公司经营工作台的智能助手，用简体中文、分点、不超过160字回答经营与项目问题。'},
          {role:'user', content:t}
        ]})
      }).then(function(r){return r.json();}).then(function(j){
        var c=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
        cb(c||null);
      }).catch(function(){ cb(null); });
    }catch(e){ cb(null); }
  }

  return { init:init, toggle:toggle, send:send, getCfg:getCfg, setCfg:setCfg };
})();
