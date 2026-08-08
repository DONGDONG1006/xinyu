/* ============================================================
   甘肃新煜科技工作台 · 合同管理 + 项目详情（关键节点 / 关键人 / 相关公司 / 合同 / 图纸预算概算）
   ============================================================ */

/* ==================================================================
   一、合同管理
   ================================================================== */
var ctFilter='all';
function ctById(id){ return DB.contracts.filter(function(c){return c.id===id})[0]; }
/* 依据「业务线 + 签订日期」实时重算合同编号并写入对应输入框 */
function ctAutoNo(lineId, signedId, codeId){
  var line=_v(lineId)||'新能源项目';
  var signed=_v(signedId)||todayStr();
  var el=document.querySelector('#dbody [name="'+codeId+'"]');
  if(el) el.value=makeContractNo(line, signed);
}
function ctSettleRate(c){ return c.amount? Math.round(c.settled/c.amount*100):0; }
function ctRisk(c){
  var od=(c.plans||[]).filter(function(p){return !p.actual&&p.planDate&&days(p.planDate)>0&&p.status!=='未到期'});
  if(od.length) return {lv:'r',txt:'收付逾期 '+od.length+' 笔'};
  if(c.risk) return {lv:'y',txt:c.risk};
  if(c.perf<50&&days(c.end)>-90) return {lv:'y',txt:'履约进度偏慢'};
  return {lv:'g',txt:'正常'};
}
function renderContract(){
  var ins=DB.contracts.filter(function(c){return c.dir==='收'}),
      outs=DB.contracts.filter(function(c){return c.dir==='付'});
  var od=overduePlans();
  var recv=ins.reduce(function(a,c){return a+c.settled},0);
  var paid=outs.reduce(function(a,c){return a+c.settled},0);
  var reten=DB.contracts.reduce(function(a,c){return a+(c.retention||0)},0);
  var thisYear=DB.contracts.filter(function(c){return (c.signed||'').slice(0,4)==='2026'});
  document.getElementById('ctKpi').innerHTML=
    kpi('在手合同总额',fmt(ctInAmount()+ctOutAmount()),'万元','收入 '+fmt(ctInAmount())+' / 支出 '+fmt(ctOutAmount()))+
    kpi('本年新签',fmt(thisYear.reduce(function(a,c){return a+c.amount},0)),'万元',thisYear.length+' 份合同','ok')+
    kpi('已收款（收入类）',fmt(recv),'万元','收款率 <b class="cy">'+(recv/ctInAmount()*100).toFixed(1)+'%</b>')+
    kpi('已付款（支出类）',fmt(paid),'万元','付款率 '+(paid/ctOutAmount()*100).toFixed(1)+'%')+
    kpi('逾期收付节点',od.length,'笔',(od.length?'涉及 <b class="up">'+fmt(od.reduce(function(a,x){return a+x.p.amount},0))+'</b> 万元':'无逾期'),(od.length?'danger':'ok'))+
    kpi('质保金在押',fmt(reten),'万元','到期需主动申请退还','warn');

  /* 风险预警 */
  var AL=[];
  od.forEach(function(x){
    AL.push({lv:x.od>15?'r':'y',t:'【'+(x.c.dir==='收'?'应收逾期':'应付逾期')+'】'+x.p.name,
      s:x.c.code+' · '+x.c.name+' · '+x.c.party+' · 计划 '+x.p.planDate,a:fmt(x.p.amount)+'万',id:x.c.id});
  });
  DB.contracts.forEach(function(c){
    (c.changes||[]).forEach(function(g){
      if(g.status==='审批中') AL.push({lv:'y',t:'【变更待批】'+g.name,s:c.code+' · '+c.name+' · 提出 '+g.date,a:fmt(g.amount)+'万',id:c.id});
    });
    if(c.warranty&&c.warranty!=='—'){
      var dd=days(todayStr(),c.warranty);
      if(dd>=0&&dd<=180) AL.push({lv:'y',t:'【质保到期临近】'+c.name,s:c.code+' · 质保期至 '+c.warranty+' · 剩余 '+dd+' 天，需提前申请退还质保金',a:fmt(c.retention)+'万',id:c.id});
    }
    if(c.perf<50&&c.end&&days(c.end)>-120)
      AL.push({lv:'y',t:'【履约滞后】'+c.name,s:c.code+' · 履约 '+c.perf+'% · 合同截止 '+c.end,a:c.perf+'%',id:c.id});
  });
  document.getElementById('ctAlert').innerHTML= AL.length? AL.slice(0,8).map(function(x){
    return '<div class="alert '+x.lv+'" onclick="openContractView(\''+x.id+'\')"><span class="dot"></span>'+
      '<div class="tx"><div class="tt">'+esc(x.t)+'</div><div class="ss">'+esc(x.s)+'</div></div><div class="amt">'+x.a+'</div></div>';
  }).join('') : '<div class="note">全部合同履约与收付正常。</div>';

  /* 90 天节点 */
  var dp=duePlans(90);
  document.getElementById('ctSchedule').innerHTML= dp.length? tbl(
    '<th>日期</th><th>收付事项</th><th>合同</th><th class="n">金额</th><th>状态</th>',
    dp.slice(0,12).map(function(x){
      return '<tr onclick="openContractView(\''+x.c.id+'\')"><td class="mono">'+x.p.planDate+'</td>'+
        '<td class="nm">'+esc(x.p.name)+'</td><td>'+esc(x.c.code)+'</td>'+
        '<td class="n '+(x.c.dir==='收'?'dn':'up')+'">'+(x.c.dir==='收'?'+':'-')+fmt(x.p.amount)+'</td>'+
        '<td>'+tag(x.dd<0?'逾期 '+(-x.dd)+' 天':x.dd+' 天后',x.dd<0?'t-red':x.dd<=30?'t-yel':'t-gry')+'</td></tr>';
    }).join('')) : '<div class="note">未来 90 天无收付款节点。</div>';

  /* 类别构成 */
  var mix={};
  DB.contracts.forEach(function(c){ mix[c.cat]=(mix[c.cat]||0)+c.amount });
  document.getElementById('ctMix').innerHTML=hbars(Object.keys(mix).map(function(k){return [k,mix[k]]}));

  renderCtList();
}
function renderCtList(){
  var L=DB.contracts.filter(function(c){
    if(ctFilter==='in') return c.dir==='收';
    if(ctFilter==='out') return c.dir==='付';
    if(ctFilter==='risk') return ctRisk(c).lv!=='g';
    return true;
  });
  document.getElementById('ctList').innerHTML=tbl(
    '<th>合同编号</th><th>合同名称</th><th>相对方</th><th>方向</th><th>业务线</th><th class="n">合同额</th><th>履约进度</th><th class="n">已收付</th><th>风险</th><th>关联项目</th>',
    L.map(function(c){
      var r=ctRisk(c);
      return '<tr onclick="openContractView(\''+c.id+'\')">'+
        '<td class="mono" style="color:var(--txt)">'+esc(c.code)+'</td>'+
        '<td class="nm">'+esc(c.name)+'</td><td>'+esc(c.party)+'</td>'+
        '<td>'+tag(c.dir==='收'?'收入':'支出',c.dir==='收'?'t-grn':'t-pu')+'</td>'+
        '<td>'+tag(c.line||'—','t-blu')+'</td>'+
        '<td class="n">'+fmt(c.amount)+'</td>'+
        '<td style="min-width:96px">'+bar(c.perf,c.perf<50?'y':'')+'<span class="mono" style="font-size:11px;color:var(--txt3)">'+c.perf+'%</span></td>'+
        '<td class="n">'+fmt(c.settled)+'</td>'+
        '<td>'+tag(r.txt,r.lv==='r'?'t-red':r.lv==='y'?'t-yel':'t-grn')+'</td>'+
        '<td>'+esc(c.project?projName(c.project):'—')+'</td></tr>';
    }).join('')||'<tr><td colspan="10" style="text-align:center;color:var(--txt3)">无匹配合同</td></tr>');
}
function openContractView(id){
  var c=ctById(id); if(!c) return;
  var r=ctRisk(c);
  var planRows=(c.plans||[]).map(function(p,i){
    var st=p.actual?'已完成':(p.planDate&&days(p.planDate)>0&&p.status!=='未到期'?'逾期':p.status);
    var cls=p.actual?'t-grn':st==='逾期'?'t-red':st==='待付'||st==='待收'?'t-yel':'t-gry';
    return '<tr><td class="mono">'+p.no+'</td><td class="nm">'+esc(p.name)+'</td>'+
      '<td class="n">'+p.ratio+'%</td><td class="n">'+fmt(p.amount)+'</td>'+
      '<td class="mono">'+p.planDate+'</td><td class="mono">'+(p.actual||'—')+'</td>'+
      '<td>'+tag(p.actual?(c.dir==='收'?'已收':'已付'):st,cls)+'</td>'+
      '<td>'+(p.actual?'':'<button class="btn sm" onclick="event.stopPropagation();settlePlan(\''+c.id+'\','+i+')">登记'+(c.dir==='收'?'收款':'付款')+'</button>')+'</td></tr>';
  }).join('');
  var chgRows=(c.changes||[]).length? (c.changes).map(function(g){
    return '<tr><td class="mono">'+g.no+'</td><td class="nm">'+esc(g.name)+'</td><td class="n">'+fmt(g.amount)+'</td>'+
      '<td class="mono">'+g.date+'</td><td>'+tag(g.status,g.status==='已批准'?'t-grn':'t-yel')+'</td></tr>';
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--txt3)">暂无变更签证</td></tr>';

  openDrawer(c.code+' · 合同详情',
    '<div class="dsec">基本信息</div>'+
    '<div class="kv">'+
    '<div class="k">合同名称</div><div class="v">'+esc(c.name)+'</div>'+
    '<div class="k">相对方</div><div class="v">'+esc(c.party)+'</div>'+
    '<div class="k">方向 / 类别</div><div class="v">'+(c.dir==='收'?'收入类':'支出类')+' · '+c.cat+'</div>'+
    '<div class="k">业务线</div><div class="v">'+esc(c.line||'—')+'</div>'+
    '<div class="k">合同金额</div><div class="v mono" style="font-size:15px;font-weight:700">'+fmt(c.amount)+' 万元</div>'+
    '<div class="k">签订日期</div><div class="v mono">'+c.signed+'</div>'+
    '<div class="k">履约期限</div><div class="v mono">'+c.start+' ~ '+c.end+'</div>'+
    '<div class="k">我方负责人</div><div class="v">'+esc(c.owner)+'</div>'+
    '<div class="k">关联项目</div><div class="v">'+(c.project?esc(projName(c.project)):'—')+'</div>'+
    '<div class="k">质保期至</div><div class="v mono">'+c.warranty+'</div>'+
    '<div class="k">风险状态</div><div class="v">'+tag(r.txt,r.lv==='r'?'t-red':r.lv==='y'?'t-yel':'t-grn')+'</div>'+
    '</div>'+
    '<div class="dsec">履约与资金执行</div>'+
    '<div class="row" style="grid-template-columns:1fr 1fr;gap:10px">'+
      '<div class="card" style="padding:11px"><div style="font-size:11px;color:var(--txt3)">履约进度</div>'+
        '<div class="mono" style="font-size:20px;color:var(--ct);margin:4px 0">'+c.perf+'%</div>'+bar(c.perf)+'</div>'+
      '<div class="card" style="padding:11px"><div style="font-size:11px;color:var(--txt3)">'+(c.dir==='收'?'收款':'付款')+'进度</div>'+
        '<div class="mono" style="font-size:20px;color:var(--ct);margin:4px 0">'+ctSettleRate(c)+'%</div>'+bar(ctSettleRate(c),'g')+'</div>'+
    '</div>'+
    '<div class="kv" style="margin-top:10px">'+
    '<div class="k">已开票</div><div class="v mono">'+fmt(c.invoiced)+' 万元</div>'+
    '<div class="k">已'+(c.dir==='收'?'收':'付')+'款</div><div class="v mono">'+fmt(c.settled)+' 万元</div>'+
    '<div class="k">开票未'+(c.dir==='收'?'收':'付')+'</div><div class="v mono" style="color:var(--wn)">'+fmt(c.invoiced-c.settled)+' 万元</div>'+
    '<div class="k">质保金</div><div class="v mono">'+fmt(c.retention)+' 万元</div>'+
    '</div>'+
    '<div class="dsec">收付款计划 vs 实际</div><div class="scroll">'+
    tbl('<th>期次</th><th>事项</th><th class="n">比例</th><th class="n">金额</th><th>计划日</th><th>实际日</th><th>状态</th><th></th>',planRows)+'</div>'+
    '<div class="dsec">变更 · 签证</div><div class="scroll">'+
    tbl('<th>编号</th><th>变更事项</th><th class="n">金额</th><th>日期</th><th>状态</th>',chgRows)+'</div>'+
    '<div class="dsec">操作</div>'+
    '<div class="chips">'+
      (isManager()?'<span class="chip" onclick="openContractEdit(\''+c.id+'\')">✎ 编辑合同</span>':'')+
      '<span class="chip" onclick="openChangeAdd(\''+c.id+'\')">＋ 登记变更签证</span>'+
      '<span class="chip" onclick="openInvoice(\''+c.id+'\')">＋ 登记开票</span>'+
      '<span class="chip" onclick="openTaskAdd({title:\'催办：'+esc(c.name)+'\',owner:\''+esc(c.owner)+'\'})">派单督办</span>'+
    '</div>',
    function(){ closeDrawer(); },{priText:'关闭'});
}
function settlePlan(cid,i){
  var c=ctById(cid); if(!c) return;
  var p=c.plans[i];
  p.actual=todayStr(); p.status=c.dir==='收'?'已收':'已付';
  c.settled=Math.min(c.amount,c.settled+p.amount);
  c.perf=Math.min(100,Math.max(c.perf,Math.round(c.settled/c.amount*100)));
  saveDB(); toast('已登记'+(c.dir==='收'?'收款':'付款')+' '+fmt(p.amount)+' 万元');
  openContractView(cid); refreshBadges();
}
function openChangeAdd(cid){
  var c=ctById(cid);
  openDrawer('登记变更签证 · '+c.code,
    fld('变更编号','cgNo','BG-0'+((c.changes||[]).length+1))+
    fld('变更事项','cgName','如：监控点位增加 12 处')+
    '<div class="f2">'+fld('变更金额（万元）','cgAmt','186')+fld('提出日期','cgDate',todayStr())+'</div>'+
    '<div class="field"><label>状态</label>'+chips('1',['审批中','已批准','已否决'],'审批中')+'</div>'+
    fldArea('变更依据','cgNote','业主指令 / 设计变更单 / 现场签证编号'),
    function(){
      c.changes=c.changes||[];
      c.changes.push({no:_v('cgNo')||'BG',name:_v('cgName')||'未命名变更',amount:_num('cgAmt'),date:_v('cgDate')||todayStr(),status:_chip('1')});
      saveDB(); toast('变更已登记'); openContractView(cid);
    },{priText:'保存'});
}
function openInvoice(cid){
  var c=ctById(cid); if(!c) return;
  var remain=(c.amount||0)-(c.invoiced||0);
  var ym=todayStr().slice(0,7).replace('-','');
  var n=(DB.invoices||[]).filter(function(x){return x.no&&x.no.indexOf('INV-'+ym)===0;}).length;
  var defNo='INV-'+ym+'-'+('00'+(n+1)).slice(-3);
  openDrawer('登记开票 · '+c.code,
    '<div class="note" style="margin-bottom:8px">合同可开余额 <b class="mono">'+fmt(remain)+'</b> 万元（已开 '+fmt(c.invoiced)+'）。开票后回写入「业务财务 → 开票」台账，并联动项目推进与回款。</div>'+
    fld('开票编号','ivNo',defNo)+
    '<div class="f2">'+fld('开票金额（万元）','ivAmt',remain)+fld('开票日期','ivDate',todayStr())+'</div>'+
    fldSel('发票类型','ivType',['增值税专用发票','增值税普通发票','电子发票'],'增值税专用发票')+
    '<div class="f2">'+fld('税额（万元）','ivTax',(remain/1.13*0.13).toFixed(1))+fld('到期日','ivDue','')+'</div>'+
    '<div class="field"><label>状态</label>'+chips('1',['待开','已开','已寄'],'已开')+'</div>'+
    fldArea('备注','ivNote','对应收付款计划期次 / 邮寄信息'),
    function(){
      var a=_num('ivAmt'); if(!a){toast('请填写开票金额');return}
      DB.invoices=DB.invoices||[];
      DB.invoices.unshift({id:uid('iv'),no:_v('ivNo')||defNo,contractId:c.id,contractCode:c.code,party:c.party,
        amount:a,tax:_num('ivTax'),type:_v('ivType'),status:_chip('1'),issueDate:_v('ivDate'),dueDate:_v('ivDue'),note:_v('ivNote')});
      c.invoiced=Math.min(c.amount,c.invoiced+a);
      saveDB(); toast('已登记开票 '+fmt(a)+' 万元'); openContractView(cid);
    },{priText:'保存开票'});
}
function openContractAdd(){
  if(!canAddProject()){ toast('请先登录后再新增合同'); return; }
  openDrawer('新增合同',
    '<div class="f2">'+fld('合同编号','nfCode','',makeContractNo('新能源项目', todayStr()))+fldSel('方向','nfDir',['收','付'])+'</div>'+
    '<div class="note">合同编号按「业务线 + 签订年月」自动生成（格式 <b>XY-&lt;业务线&gt;-&lt;YYYYMM&gt;-&lt;当年序号&gt;</b>），管理者可手动修改；切换业务线或签订日期将自动重算。'+
      '<button type="button" class="btn sm" onclick="ctAutoNo(\'nfLine\',\'nfSigned\',\'nfCode\')">↻ 重新生成</button></div>'+
    fld('合同名称','nfName','如：XX 工程施工合同')+
    fld('相对方','nfParty','如：甘肃省交通建设集团有限公司')+
    '<div class="f2">'+fldSel('业务线','nfLine',['新能源项目','大交通机电','网约车平台','新能源车销售'],'新能源项目',"onchange=\"ctAutoNo('nfLine','nfSigned','nfCode')\"")+
      fldSel('合同类别','nfCat',['工程施工','设备采购','设计咨询','运营服务','车辆销售','融资','其他'])+'</div>'+
    '<div class="f2">'+fld('合同金额（万元）','nfAmt','8800')+fld('我方负责人','nfOwner','王工')+'</div>'+
    '<div class="f2">'+fld('签订日期','nfSigned','',todayStr(),"onchange=\"ctAutoNo('nfLine','nfSigned','nfCode')\"")+fld('开始日期','nfStart',todayStr())+'</div>'+
    '<div class="f2">'+fld('结束日期','nfEnd','2027-12-31')+fld('质保期至','nfWar','2029-12-31')+'</div>'+
    fldSel('关联项目','nfProj',['（不关联）'].concat(visibleProjects().map(function(p){return p.name})))+
    '<div class="f2">'+fld('质保金（万元）','nfRet','0')+'</div>'+
    fldArea('风险提示','nfRisk','如：账期 90 天，付款集中在 9 月')+
    '<div class="note">保存后可在合同详情中逐条录入<b>收付款计划</b>与<b>变更签证</b>。</div>',
    function(){
      var n=_v('nfName'); if(!n){toast('请填写合同名称');return}
      var code=_v('nfCode').trim();
      if(code){
        var dup=DB.contracts.filter(function(x){return x.code===code})[0];
        if(dup){ toast('合同编号已存在：'+code); return; }
      }
      var pn=_v('nfProj'), pid=(DB.projects.filter(function(p){return p.name===pn})[0]||{}).id||'';
      DB.contracts.unshift({id:uid('c'),code:code||makeContractNo(_v('nfLine')||'新能源项目', _v('nfSigned')||todayStr()),name:n,
        party:_v('nfParty')||'—',dir:_v('nfDir'),cat:_v('nfCat'),line:_v('nfLine')||'新能源项目',project:pid,amount:_num('nfAmt'),
        signed:_v('nfSigned'),start:_v('nfStart'),end:_v('nfEnd'),owner:_v('nfOwner')||'待指派',
        status:'履约中',perf:0,invoiced:0,settled:0,retention:_num('nfRet'),warranty:_v('nfWar')||'—',
        risk:_v('nfRisk'),plans:[],changes:[]});
      saveDB(); closeDrawer(); toast('合同已建档：'+n); renderContract(); refreshBadges();
    },{priText:'保存并建档'});
}
/* 编辑合同：仅管理者及以上可进入；合同编号（含业务线/年份）修改权限于管理者 */
function openContractEdit(id){
  if(!requireManager('编辑合同')) return;
  var c=ctById(id); if(!c) return;
  openDrawer('编辑合同 · '+c.code,
    '<div class="f2">'+fld('合同编号','efCode','',c.code,"oninput=\"ctAutoNo('efLine','efSigned','efCode')\"")+fldSel('方向','efDir',['收','付'],c.dir)+'</div>'+
    '<div class="note">合同编号仅在<b>管理者</b>权限下可手动修改；修改后系统校验唯一性。切换业务线或签订日期将自动重算。</div>'+
    fld('合同名称','efName', c.name)+
    fld('相对方','efParty', c.party)+
    '<div class="f2">'+fldSel('业务线','efLine',['新能源项目','大交通机电','网约车平台','新能源车销售'], c.line||'新能源项目', "onchange=\"ctAutoNo('efLine','efSigned','efCode')\"")+
      fldSel('合同类别','efCat',['工程施工','设备采购','设计咨询','运营服务','车辆销售','融资','其他'], c.cat)+'</div>'+
    '<div class="f2">'+fld('合同金额（万元）','efAmt', c.amount)+fld('我方负责人','efOwner', c.owner)+'</div>'+
    '<div class="f2">'+fld('签订日期','efSigned','',c.signed, "onchange=\"ctAutoNo('efLine','efSigned','efCode')\"")+fld('履约期限起','efStart', c.start)+'</div>'+
    '<div class="f2">'+fld('履约期限止','efEnd', c.end)+fld('质保期至','efWar', c.warranty)+'</div>'+
    '<div class="f2">'+fldSel('关联项目','efProj', ['（不关联）'].concat(visibleProjects().map(function(p){return p.name})), c.project?projName(c.project):'（不关联）')+fld('质保金（万元）','efRet', c.retention)+'</div>'+
    fldArea('风险提示','efRisk', c.risk),
    function(){
      var n=_v('efName'); if(!n){toast('请填写合同名称');return}
      var newCode=_v('efCode').trim();
      if(newCode && newCode!==c.code){
        var dup=DB.contracts.filter(function(x){return x.id!==id && x.code===newCode})[0];
        if(dup){ toast('合同编号已存在：'+newCode); return; }
      }
      var pn=_v('efProj'), pid=(DB.projects.filter(function(p){return p.name===pn})[0]||{}).id||'';
      c.code=newCode||c.code;
      c.name=n; c.party=_v('efParty')||c.party; c.dir=_v('efDir'); c.cat=_v('efCat');
      c.line=_v('efLine')||c.line||'新能源项目';
      c.amount=_num('efAmt'); c.owner=_v('efOwner')||c.owner;
      c.signed=_v('efSigned')||c.signed; c.start=_v('efStart'); c.end=_v('efEnd');
      c.warranty=_v('efWar')||'—'; c.retention=_num('efRet');
      c.project=pid; c.risk=_v('efRisk');
      saveDB(); closeDrawer(); toast('合同已更新：'+n); renderContract(); refreshBadges();
    },{priText:'保存修改'});
}
function exportContracts(){
  var head=['合同编号','合同名称','相对方','方向','业务线','类别','金额(万元)','签订日','起止','负责人','履约%','已收付','质保金','关联项目','风险'];
  var rows=DB.contracts.map(function(c){
    return [c.code,c.name,c.party,c.dir==='收'?'收入':'支出',c.line||'—',c.cat,c.amount,c.signed,c.start+'~'+c.end,
      c.owner,c.perf,c.settled,c.retention,c.project?projName(c.project):'',ctRisk(c).txt];
  });
  var csv='\ufeff'+[head].concat(rows).map(function(r){
    return r.map(function(x){return '"'+String(x).replace(/"/g,'""')+'"'}).join(',');
  }).join('\n');
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download='甘肃新煜科技_合同台账_'+todayStr()+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast('合同台账已导出 CSV');
}

/* ==================================================================
   二、项目详情
   ================================================================== */
var dtT='overview';
function switchProject(id){ curProject=id; renderDetail(); }
function dtTab(t){
  dtT=t;
  document.querySelectorAll('#dtTabs button').forEach(function(b){b.classList.toggle('on',b.dataset.t===t)});
  renderDtBody();
}
function renderDetail(){
  var dt=document.getElementById('dtTabs'), db=document.getElementById('dtBody');
  if(!DB.projects.length){
    var dn=document.getElementById('dtName'); if(dn)dn.textContent='项目详情';
    var ds=document.getElementById('dtSel'); if(ds)ds.innerHTML='';
    var dh=document.getElementById('dtHead'); if(dh)dh.innerHTML='<div class="note" style="margin:8px 0">暂无项目，请点击右上角「＋ 新增」创建项目。</div>';
    if(dt)dt.style.display='none';
    if(db)db.innerHTML='';
    return;
  }
  if(dt)dt.style.display='';
  var p=projById(curProject);
  document.getElementById('dtName').textContent=p.name;
  document.getElementById('dtSel').innerHTML=visibleProjects().map(function(x){
    return '<option value="'+x.id+'"'+(x.id===curProject?' selected':'')+'>'+esc(x.name)+'</option>'}).join('');
  var nodes=DB.nodes[curProject]||[], ppl=DB.people[curProject]||[], orgs=DB.orgs[curProject]||[];
  var cs=DB.contracts.filter(function(c){return c.project===curProject});
  var late=nodes.filter(function(n){return n.status==='延期'}).length;
  document.getElementById('dtHead').innerHTML=
    '<div style="display:flex;gap:22px;flex-wrap:wrap;align-items:center">'+
    '<div><div style="font-size:11px;color:var(--txt3)">项目类型</div><div style="font-size:15px;color:var(--ct);margin-top:3px">'+p.type+' · '+p.stage+'</div></div>'+
    '<div><div style="font-size:11px;color:var(--txt3)">建设地点</div><div style="font-size:15px;color:var(--ct);margin-top:3px">'+esc(p.addr)+'</div></div>'+
    '<div><div style="font-size:11px;color:var(--txt3)">总投资</div><div class="mono" style="font-size:15px;color:var(--ct);margin-top:3px">'+fmt(p.invTotal)+' 万元</div></div>'+
    '<div><div style="font-size:11px;color:var(--txt3)">已完成投资</div><div class="mono" style="font-size:15px;color:var(--ct);margin-top:3px">'+fmt(p.invDone)+' 万（'+(p.invDone/p.invTotal*100).toFixed(0)+'%）</div></div>'+
    '<div><div style="font-size:11px;color:var(--txt3)">项目负责人</div><div style="font-size:15px;color:var(--ct);margin-top:3px">'+p.owner+'</div></div>'+
    '<div style="flex:1;min-width:150px"><div style="font-size:11px;color:var(--txt3);margin-bottom:5px">总体进度 '+p.progress+'%</div>'+bar(p.progress)+'</div>'+
    '</div>'+
    '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'+
      tag('关键节点 '+nodes.length+' 个','t-blu')+(late?tag('延期 '+late+' 个','t-red'):tag('无延期','t-grn'))+
      tag('关键人 '+ppl.length+' 位','t-cy')+tag('相关公司 '+orgs.length+' 家','t-pu')+
      tag('合同 '+cs.length+' 份 / '+fmt(cs.reduce(function(a,c){return a+c.amount},0))+' 万','t-yel')+
      (p.risk.length?p.risk.map(function(r){return tag('风险：'+r,'t-red')}).join(''):'')+
    '</div>';
  renderDtBody();
}
function renderDtBody(){
  var f={overview:dtOverview,nodes:dtNodes,people:dtPeople,orgs:dtOrgs,contract:dtContracts,staff:dtStaff,doc:dtDoc};
  document.getElementById('dtBody').innerHTML=(f[dtT]||dtOverview)();
  if(dtT==='nodes') document.getElementById('ndGantt').innerHTML=nodeGantt();
  if(dtT==='doc'){ renderDocKpi(); renderDoc();
    document.querySelectorAll('#doctabs button').forEach(function(b){ b.onclick=function(){docJump(b.dataset.t)} }); }
}

/* ---------- 总览 ---------- */
function dtOverview(){
  var p=projById(curProject);
  var procs=[['备案核准','已办结','2025-07-18','张总'],['用地/用海','已办结','2025-12-06','陈工'],
    ['环评批复','已办结','2026-03-10','陈工'],['水土保持','已办结','2026-03-22','陈工'],
    ['接入系统','办理中','—','李工'],['消纳指标','卡点','—','张总'],['施工许可','待启动','—','陈工']];
  var rs=DB.run.filter(function(r){return r.project===curProject});
  return '<div class="sect">手续办理清单</div><div class="card scroll">'+
    tbl('<th>手续事项</th><th>状态</th><th>办结日期</th><th>责任人</th><th></th>',
      procs.map(function(x){
        return '<tr><td class="nm">'+x[0]+'</td>'+
          '<td>'+tag(x[1],x[1]==='已办结'?'t-grn':x[1]==='办理中'?'t-blu':x[1]==='卡点'?'t-red':'t-gry')+'</td>'+
          '<td class="mono">'+x[2]+'</td><td>'+x[3]+'</td>'+
          '<td><button class="btn sm" onclick="openTaskAdd({title:\''+x[0]+'\',owner:\''+x[3]+'\'})">派单</button></td></tr>';
      }).join(''))+'</div>'+
    '<div class="sect">跑动记录</div><div class="card scroll">'+
    (rs.length? tbl('<th>事项</th><th>对接单位</th><th>责任人</th><th>滞留</th><th>期限</th><th>状态</th>',
      rs.map(function(r){
        return '<tr><td class="nm">'+esc(r.matter)+'</td><td>'+esc(r.where)+'</td><td>'+r.owner+'</td>'+
          '<td class="n '+(days(r.created)>15?'up':'')+'">'+days(r.created)+' 天</td><td class="mono">'+(r.due||'—')+'</td>'+
          '<td>'+tag(r.status,r.status==='卡点'?'t-red':r.status==='进行中'?'t-blu':r.status==='已办结'?'t-grn':'t-gry')+'</td></tr>';
      }).join('')) : '<div class="note">暂无跑动记录。</div>')+'</div>'+
    '<div class="note" style="margin-top:12px"><b>诊断：</b>'+
    (p.risk.length? '当前主要卡点为「'+p.risk.join('」「')+'」，集中在执行层跑动无法突破，建议由董事长直接对接分管副市长/厅领导，预计可缩短 20 天以上。'
      : '项目运行平稳，无重大卡点。')+'</div>';
}

/* ---------- 关键节点 ---------- */
function nodeList(){ if(!DB.nodes[curProject]) DB.nodes[curProject]=[]; return DB.nodes[curProject]; }
function nodeGantt(){
  var N=nodeList(); if(!N.length) return '<div class="note">暂无节点。</div>';
  var ds=N.map(function(n){return new Date(n.plan).getTime()}).filter(function(x){return !isNaN(x)});
  var mn=Math.min.apply(0,ds), mx=Math.max.apply(0,ds), span=(mx-mn)||1;
  var prev=mn;
  return gantt(N.map(function(n){
    var t=new Date(n.plan).getTime(); if(isNaN(t)) t=prev;
    var s=(prev-mn)/span*100, w=Math.max((t-prev)/span*100,3);
    prev=t;
    return [n.name,s,w,n.status];
  }));
}
function dtNodes(){
  var N=nodeList();
  var done=N.filter(function(n){return n.status==='已完成'}).length;
  var late=N.filter(function(n){return n.status==='延期'}).length;
  var onTime=N.filter(function(n){return n.actual&&n.plan&&days(n.plan,n.actual)<=0}).length;
  return '<div class="grid kpis" style="margin-bottom:12px">'+
    kpi('关键节点总数',N.length,'个','覆盖立项到并网全周期')+
    kpi('已完成',done,'个','完成率 '+(N.length?(done/N.length*100).toFixed(0):0)+'%','ok')+
    kpi('延期节点',late,'个',(late?'<b class="up">需立即升级处理</b>':'无延期'),(late?'danger':'ok'))+
    kpi('按期完成率',(done?(onTime/done*100).toFixed(0):0),'%','已完成节点中按期的比例',(done&&onTime/done<0.8?'warn':'ok'))+
    '</div>'+
    '<div class="card" style="margin-bottom:14px"><div class="sect" style="margin:0 0 10px">节点时序（甘特）</div><div class="chart" id="ndGantt"></div>'+
    '<div class="legend"><span><i style="background:#00d68f"></i>已完成</span><span><i style="background:#ff8c1a"></i>进行中</span>'+
    '<span><i style="background:#ff4757"></i>延期</span><span><i style="background:#6b6258"></i>未开始</span></div></div>'+
    '<div class="sect">节点台账 <span class="tip" style="margin-left:auto"><button class="btn pri" onclick="openNodeAdd()">＋ 新增关键节点</button></span></div>'+
    '<div class="card"><div class="tl">'+
    (N.length? N.map(function(n,i){
      var cls=n.status==='已完成'?'done':n.status==='延期'?'late':n.status==='进行中'?'':'todo';
      var od=(!n.actual&&n.plan)?days(n.plan):0;
      return '<div class="it '+cls+'" onclick="openNodeView('+i+')" style="cursor:pointer">'+
        '<div class="hd"><span class="nm">'+esc(n.name)+'</span>'+
        tag(n.status,n.status==='已完成'?'t-grn':n.status==='延期'||n.status==='受阻'?'t-red':n.status==='进行中'?'t-cy':'t-gry')+
        (od>0&&n.status!=='已完成'?tag('逾期 '+od+' 天','t-red'):'')+'</div>'+
        '<div class="meta"><span>计划 <b>'+n.plan+'</b></span><span>实际 <b>'+(n.actual||'—')+'</b></span>'+
        '<span>责任人 <b>'+esc(n.owner)+'</b></span><span>对接 '+esc(n.dep)+'</span></div>'+
        (n.impact?'<div class="meta"><span style="color:var(--txt3)">影响：'+esc(n.impact)+'</span></div>':'')+
        '</div>';
    }).join('') : '<div class="note">尚未录入关键节点，点击右上角新增。</div>')+
    '</div></div>'+nodeKanban()+nodeAnalysis();
}
/* CRM 式节点看板：按状态分列，体现管控与执行 */
function nodeStatusCols(){ return ['未开始','进行中','延期','受阻','已完成']; }
function nodeKanban(){
  var N=nodeList(); if(!N.length) return '';
  var cols=nodeStatusCols();
  return '<div class="sect" style="margin-top:16px">节点看板（CRM 管控视图）</div><div class="kanban">'+
    cols.map(function(c){
      var items=N.filter(function(n){return (n.status||'未开始')===c;});
      return '<div class="kcol kc-'+({ '未开始':'todo','进行中':'doing','延期':'late','受阻':'block','已完成':'done'}[c])+'">'+
        '<div class="kh">'+c+' <span class="kc">'+items.length+'</span></div>'+
        items.map(function(n,i){
          var realIdx=N.indexOf(n);
          return '<div class="kcard" onclick="openNodeView('+realIdx+')">'+
            '<div class="kn">'+esc(n.name)+'</div>'+
            '<div class="kmeta"><span>'+esc(n.owner||'—')+'</span><span class="mono">'+n.plan+'</span></div>'+
            '<div class="ktags">'+tag(n.priority||'中',(n.priority==='高'?'t-red':n.priority==='中'?'t-yel':'t-blu'))+tag(n.risk||'无',(n.risk==='高'?'t-red':n.risk==='中'?'t-yel':'t-grn'))+'</div>'+
            '<div class="kprog">'+bar(n.progress!=null?n.progress:0)+'<span>'+(n.progress!=null?n.progress:0)+'%</span></div>'+
            '</div>';
        }).join('')+
        '</div>';
    }).join('')+'</div>';
}
/* 节点执行分析：完成度 / 逾期 / 风险 / 优先级分布 */
function nodeAnalysis(){
  var N=nodeList(); if(!N.length) return '';
  var avg=Math.round(N.reduce(function(a,n){return a+(n.progress!=null?n.progress:0);},0)/N.length);
  var od=N.filter(function(n){return n.status!=='已完成'&&n.plan&&days(n.plan)>0;}).length;
  var hi=N.filter(function(n){return n.risk==='高';}).length;
  var blk=N.filter(function(n){return n.status==='延期'||n.status==='受阻';}).length;
  var dist=function(key,arr){ return arr.map(function(v){ var c=N.filter(function(n){return (n[key]||(key==='risk'?'无':(key==='priority'?'中':'')))===v;}).length; return v+' '+c; }).join(' · '); };
  return '<div class="sect" style="margin-top:16px">节点执行分析</div><div class="card"><div class="grid kpis" style="margin-bottom:10px">'+
    kpi('整体完成度',avg,'%','各节点进度均值',avg>=60?'ok':'warn')+
    kpi('逾期节点',od,'个','计划日已过的未完节点',od?'danger':'ok')+
    kpi('高风险节点',hi,'个','风险等级=高',hi?'danger':'ok')+
    kpi('卡点(延期/受阻)',blk,'个','需升级处理',blk?'danger':'ok')+
    '</div>'+
    '<div class="note">风险分布：'+dist('risk',['高','中','低','无'])+'　|　优先级分布：'+dist('priority',['高','中','低'])+
    '<br>建议：高风险且逾期的节点应自动升级至分管领导，纳入经营例会强制议题。</div></div>';
}
function nodeForm(n){
  n=n||{};
  return fld('节点名称','ndName','如：接入系统评审通过',n.name)+
    '<div class="f2">'+fld('计划完成日','ndPlan','2026-08-20',n.plan)+fld('实际完成日','ndActual','留空表示未完成',n.actual)+'</div>'+
    '<div class="f2">'+fld('责任人','ndOwner','李工',n.owner)+fld('对接单位','ndDep','国网甘肃省电力公司',n.dep)+'</div>'+
    '<div class="field"><label>节点状态（CRM 管控）</label>'+chips('1',['未开始','进行中','延期','受阻','已完成'],n.status||'未开始')+'</div>'+
    '<div class="f2"><div class="field"><label>优先级</label>'+chips('3',['高','中','低'],n.priority||'中')+'</div>'+
      '<div class="field"><label>风险等级</label>'+chips('4',['高','中','低','无'],n.risk||'无')+'</div></div>'+
    '<div class="f2">'+fld('完成进度 %','ndProg',(n.progress!=null?n.progress:0),n.progress!=null?n.progress:0)+fld('影响说明','ndImpact','该节点卡住会影响什么',n.impact)+'</div>'+
    fldArea('备注','ndNote','批复文号 / 关键条件 / 前置依赖',n.note);
}
function openNodeAdd(){
  if(!canEditProj(projById(curProject))){ toast('仅项目创建人或管理者可编辑本项目'); return; }
  openDrawer('新增关键节点',nodeForm(),function(){
    var nm=_v('ndName'); if(!nm){toast('请填写节点名称');return}
    nodeList().push({id:uid('n'),name:nm,plan:_v('ndPlan'),actual:_v('ndActual'),status:_chip('1'),
      owner:_v('ndOwner')||'待指派',dep:_v('ndDep')||'—',impact:_v('ndImpact'),note:_v('ndNote'),
      priority:_chip('3'),risk:_chip('4'),progress:Number(_v('ndProg'))||0});
    nodeList().sort(function(a,b){return new Date(a.plan)-new Date(b.plan)});
    saveDB(); closeDrawer(); toast('节点已新增：'+nm); renderDetail();
  },{priText:'保存节点'});
}
function openNodeView(i){
  var N=nodeList(), n=N[i]; if(!n) return;
  var od=(!n.actual&&n.plan)?days(n.plan):0;
  openDrawer('节点 · '+n.name,
    '<div class="dsec">节点信息</div><div class="kv">'+
    '<div class="k">状态</div><div class="v">'+tag(n.status,n.status==='已完成'?'t-grn':n.status==='延期'?'t-red':'t-cy')+(od>0&&n.status!=='已完成'?' <span class="up mono">逾期 '+od+' 天</span>':'')+'</div>'+
    '<div class="k">计划完成</div><div class="v mono">'+n.plan+'</div>'+
    '<div class="k">实际完成</div><div class="v mono">'+(n.actual||'—')+'</div>'+
    '<div class="k">责任人</div><div class="v">'+esc(n.owner)+'</div>'+
    '<div class="k">对接单位</div><div class="v">'+esc(n.dep)+'</div>'+
    '<div class="k">优先级</div><div class="v">'+tag(n.priority||'中',(n.priority==='高'?'t-red':n.priority==='中'?'t-yel':'t-blu'))+'</div>'+
    '<div class="k">风险等级</div><div class="v">'+tag(n.risk||'无',(n.risk==='高'?'t-red':n.risk==='中'?'t-yel':'t-grn'))+'</div>'+
    '<div class="k">完成进度</div><div class="v">'+bar(n.progress!=null?n.progress:0)+' '+(n.progress!=null?n.progress:0)+'%</div>'+
    '<div class="k">影响</div><div class="v">'+esc(n.impact||'—')+'</div>'+
    '<div class="k">备注</div><div class="v">'+esc(n.note||'—')+'</div></div>'+
    '<div class="dsec">编辑</div>'+nodeForm(n)+
    '<div class="dsec">快捷动作</div><div class="chips">'+
    '<span class="chip" onclick="openTaskAdd({title:\'推动节点：'+esc(n.name)+'\',owner:\''+esc(n.owner)+'\',due:\''+n.plan+'\'})">派单督办</span>'+
    '<span class="chip" onclick="markNodeDone('+i+')">标记已完成</span>'+
    (isAdmin()?'<span class="chip" onclick="delNode('+i+')">删除节点</span>':'')+'</div>',
    function(){
      if(!canEditProj(projById(curProject))){ toast('仅项目创建人或管理者可编辑本项目'); return; }
      n.name=_v('ndName')||n.name; n.plan=_v('ndPlan'); n.actual=_v('ndActual');
      n.status=_chip('1'); n.owner=_v('ndOwner'); n.dep=_v('ndDep');
      n.priority=_chip('3'); n.risk=_chip('4'); n.progress=Number(_v('ndProg'))||0;
      n.impact=_v('ndImpact'); n.note=_v('ndNote');
      saveDB(); closeDrawer(); toast('节点已更新'); renderDetail();
    },{priText:'保存修改'});
}
function markNodeDone(i){
  var n=nodeList()[i]; n.actual=todayStr(); n.status='已完成';
  saveDB(); closeDrawer(); toast('节点已标记完成'); renderDetail();
}
function delNode(i){
  if(!canDeleteBiz()){ toast('删除节点仅管理员可操作'); return; }
  if(!confirm('确定删除该节点？')) return;
  nodeList().splice(i,1); saveDB(); closeDrawer(); toast('节点已删除'); renderDetail();
}

/* ---------- 关键人 · 联系人 ---------- */
function pplList(){ if(!DB.people[curProject]) DB.people[curProject]=[]; return DB.people[curProject]; }

/* ===== 关键人独立模块：跨项目汇总 + 与项目/合同/开票联动 ===== */
var PPL_FILTER='all';
function pplFilterSet(f){ PPL_FILTER=f; document.querySelectorAll('#pplFilter button').forEach(function(b){b.classList.toggle('on',b.dataset.f===f);}); renderPeople(); }
/* 汇总所有可见项目的关键人，并计算每人所属项目 / 关联合同额 / 关联开票额 */
function pplAll(){
  var out=[];
  visibleProjects().forEach(function(p){
    var arr=DB.people[p.id]||[];
    var cs=DB.contracts.filter(function(c){return c.project===p.id});
    var ctAmt=cs.reduce(function(a,c){return a+(c.amount||0)},0);
    var invs=(DB.invoices||[]).filter(function(iv){ return cs.some(function(c){return c.id===iv.contractId}); });
    var ivAmt=invs.reduce(function(a,iv){return a+(iv.amount||0)},0);
    arr.forEach(function(pp){
      out.push({ p:pp, projectId:p.id, projectName:p.name, projectLine:p.line,
        contractAmount:ctAmt, invoiceAmount:ivAmt, contractCount:cs.length, invoiceCount:invs.length });
    });
  });
  return out;
}
function renderPeople(){
  if(!document.getElementById('pplList')) return;
  var all=pplAll();
  var list = PPL_FILTER==='all'? all : all.filter(function(x){return x.p.level===PPL_FILTER;});
  var dec=all.filter(function(x){return x.p.level==='决策'}).length,
      inf=all.filter(function(x){return x.p.level==='影响'}).length,
      exe=all.filter(function(x){return x.p.level==='执行'}).length;
  var totalInv=all.reduce(function(a,x){return a+x.invoiceAmount},0);
  var totalCt=all.reduce(function(a,x){return a+x.contractAmount},0);
  document.getElementById('pplKpi').innerHTML=
    kpi('在册关键人',all.length,'位','决策 '+dec+' / 影响 '+inf+' / 执行 '+exe)+
    kpi('决策层覆盖',dec,'位','能拍板的关键人',(dec?'ok':'danger'))+
    kpi('关联合同额',fmt(totalCt),'万元','关键人所属项目合同总额','')+
    kpi('关联开票额',fmt(totalInv),'万元','已开票金额（业财联动）','ok');
  document.getElementById('pplList').innerHTML = list.length?
    tbl('<th>姓名</th><th>职务</th><th>单位/机构</th><th>决策层级</th><th>电话</th><th>所属项目</th><th class="n">关联合同(万)</th><th class="n">已开票(万)</th><th></th>',
      list.map(function(x){
        var p=x.p;
        return '<tr style="cursor:pointer" onclick="goDetail(\''+x.projectId+'\')">'+
          '<td class="nm"><b>'+esc(p.name)+'</b></td>'+
          '<td>'+esc(p.title||'—')+'</td>'+
          '<td>'+esc(p.org||'—')+'</td>'+
          '<td>'+tag(p.level||'执行', p.level==='决策'?'t-red':p.level==='影响'?'t-yel':'t-blu')+'</td>'+
          '<td class="mono">'+esc(p.phone||'—')+'</td>'+
          '<td>'+esc(x.projectName)+'<div class="s" style="color:var(--txt3)">'+esc(x.projectLine||'')+'</div></td>'+
          '<td class="n">'+(x.contractCount?fmt(x.contractAmount):'—')+'</td>'+
          '<td class="n cy">'+(x.invoiceCount?fmt(x.invoiceAmount):'—')+'</td>'+
          '<td><span class="chip" onclick="event.stopPropagation();goDetail(\''+x.projectId+'\')">查看项目</span></td></tr>';
      }).join(''))
    : '<div class="note">暂无关键人。在「项目详情 → 关键人·联系人」中录入后，此处自动汇总并联动合同与开票。</div>'+
      '<div class="note" style="margin-top:8px;color:var(--txt3)">业务员仅可见本人负责项目的关键人。</div>';
}
function heatBar(h){
  var s='<span class="heat">';
  for(var i=1;i<=5;i++) s+='<i class="'+(i<=h?'on':'')+'"></i>';
  return s+'</span>';
}
function dtPeople(){
  var P=pplList();
  var dec=P.filter(function(x){return x.level==='决策'}),
      inf=P.filter(function(x){return x.level==='影响'}),
      exe=P.filter(function(x){return x.level==='执行'});
  var soon=P.filter(function(x){return x.next&&days(todayStr(),x.next)<=14});
  var cold=P.filter(function(x){return x.heat<=2});
  return '<div class="grid kpis" style="margin-bottom:12px">'+
    kpi('在册关键人',P.length,'位','决策 '+dec.length+' / 影响 '+inf.length+' / 执行 '+exe.length)+
    kpi('14 天内需接触',soon.length,'位','按接触计划提醒',(soon.length?'warn':'ok'))+
    kpi('关系需加温',cold.length,'位','关系温度 ≤2 的关键人',(cold.length?'danger':'ok'))+
    kpi('决策层覆盖',dec.length,'位','决策链是否有缺口',(dec.length?'ok':'danger'))+
    '</div>'+
    '<div class="sect">决策链地图 <span class="tip">谁能拍板 · 谁能影响 · 谁在办事</span></div>'+
    '<div class="card" style="margin-bottom:14px"><div class="chain">'+
      chainCol('决策层 · 能拍板',dec)+chainCol('影响层 · 能说话',inf)+chainCol('执行层 · 在办事',exe)+
    '</div>'+
    (dec.length?'':'<div class="note" style="margin-top:10px"><b class="up">决策层缺口：</b>当前未识别到能拍板的关键人，项目推进将高度依赖运气，建议优先补齐。</div>')+
    '</div>'+
    '<div class="sect">联系人名录 <span class="tip" style="margin-left:auto"><button class="btn pri" onclick="openPersonAdd()">＋ 新增联系人</button></span></div>'+
    '<div class="people">'+
    (P.length? P.map(function(p,i){
      var dd=p.next?days(todayStr(),p.next):999;
      return '<div class="pcard" onclick="openPersonView('+i+')">'+
        '<span class="lvl '+(p.level==='决策'?'d':p.level==='影响'?'i':'e')+'">'+p.level+'</span>'+
        '<div class="top"><div class="av">'+esc(p.name.slice(0,1))+'</div>'+
        '<div><div class="nm">'+esc(p.name)+'</div><div class="ti">'+esc(p.title)+'</div></div></div>'+
        '<div class="rows">'+
        '<div>单位：'+esc(p.org)+'</div>'+
        '<div>电话：<b>'+esc(p.phone)+'</b>'+(p.wechat&&p.wechat!=='—'?' · 微信 '+esc(p.wechat):'')+'</div>'+
        '<div>关系温度：'+heatBar(p.heat)+'</div>'+
        '<div>最近接触：<b>'+(p.last||'—')+'</b> · 下次：<b style="color:'+(dd<=7?'var(--wn)':'var(--txt2)')+'">'+(p.next||'待定')+'</b></div>'+
        '</div></div>';
    }).join('') : '<div class="note">尚未录入联系人，点击右上角新增。</div>')+
    '</div>';
}
function chainCol(title,arr){
  return '<div class="lv"><div class="h">'+title+'（'+arr.length+'）</div>'+
    (arr.length? arr.map(function(p){
      return '<div class="p"><b>'+esc(p.name)+'</b> · '+esc(p.title)+'<br><span style="color:var(--txt3);font-size:11px">'+esc(p.org)+'</span></div>';
    }).join('') : '<div class="p" style="color:var(--txt3)">— 暂无 —</div>')+'</div>';
}
function personForm(p){
  p=p||{};
  return '<div class="f2">'+fld('姓名','pfName','马建国',p.name)+fld('职务','pfTitle','副主任',p.title)+'</div>'+
    fld('所在单位/部门','pfOrg','甘肃省发展改革委 能源处',p.org)+
    '<div class="field"><label>决策层级（负责人定位）</label>'+chips('1',['决策','影响','执行'],p.level||'执行')+'</div>'+
    '<div class="f2">'+fld('联系电话','pfPhone','139****2210',p.phone)+fld('微信/其他','pfWx','—',p.wechat)+'</div>'+
    '<div class="f2">'+fld('电子邮箱','pfEmail','name@company.com',p.email)+fld('所属项目角色','pfRole','对接 / 审批 / 经办',p.role||'对接')+'</div>'+
    '<div class="field"><label>关系温度（1 冷 → 5 热）</label>'+chips('2',['1','2','3','4','5'],String(p.heat||3))+'</div>'+
    '<div class="f2">'+fld('最近接触日','pfLast',todayStr(),p.last)+fld('下次接触计划','pfNext','2026-08-20',p.next)+'</div>'+
    fld('沟通偏好','pfPref','重数据 / 讲流程 / 要结论',p.pref)+
    fldArea('关系备注','pfNote','分管什么、在意什么、由谁引荐、承诺过什么',p.note);
}
function openPersonAdd(){
  if(!canEditProj(projById(curProject))){ toast('仅项目创建人或管理者可编辑本项目'); return; }
  openDrawer('新增关键人 / 联系人',personForm(),function(){
    var n=_v('pfName'); if(!n){toast('请填写姓名');return}
    pplList().push({id:uid('p'),name:n,title:_v('pfTitle'),org:_v('pfOrg'),level:_chip('1'),
      phone:_v('pfPhone')||'—',wechat:_v('pfWx')||'—',email:_v('pfEmail')||'—',role:_v('pfRole')||'对接',heat:Number(_chip('2'))||3,
      last:_v('pfLast'),next:_v('pfNext'),pref:_v('pfPref'),note:_v('pfNote')});
    saveDB(); closeDrawer(); toast('已建档：'+n); renderDetail();
  },{priText:'保存联系人'});
}
function openPersonView(i){
  var P=pplList(), p=P[i]; if(!p) return;
  openDrawer(p.name+' · '+p.title,
    '<div class="dsec">档案</div><div class="kv">'+
    '<div class="k">单位</div><div class="v">'+esc(p.org)+'</div>'+
    '<div class="k">决策层级</div><div class="v">'+tag(p.level,p.level==='决策'?'t-red':p.level==='影响'?'t-yel':'t-blu')+'</div>'+
    '<div class="k">电话</div><div class="v mono">'+esc(p.phone)+'</div>'+
    '<div class="k">微信</div><div class="v">'+esc(p.wechat)+'</div>'+
    '<div class="k">邮箱</div><div class="v">'+esc(p.email||'—')+'</div>'+
    '<div class="k">项目角色</div><div class="v">'+esc(p.role||'—')+'</div>'+
    '<div class="k">关系温度</div><div class="v">'+heatBar(p.heat)+'</div>'+
    '<div class="k">最近接触</div><div class="v mono">'+(p.last||'—')+'</div>'+
    '<div class="k">下次计划</div><div class="v mono">'+(p.next||'—')+'</div>'+
    '<div class="k">沟通偏好</div><div class="v">'+esc(p.pref||'—')+'</div>'+
    '<div class="k">关系备注</div><div class="v">'+esc(p.note||'—')+'</div></div>'+
    '<div class="dsec">编辑档案</div>'+personForm(p)+
    '<div class="dsec">快捷动作</div><div class="chips">'+
    '<span class="chip" onclick="logContact('+i+')">记一次接触（今天）</span>'+
    '<span class="chip" onclick="openTaskAdd({title:\'拜访 '+esc(p.name)+'（'+esc(p.org)+'）\',owner:\''+projById(curProject).owner+'\'})">安排拜访</span>'+
    (isAdmin()?'<span class="chip" onclick="delPerson('+i+')">删除</span>':'')+'</div>',
    function(){
      if(!canEditProj(projById(curProject))){ toast('仅项目创建人或管理者可编辑本项目'); return; }
      p.name=_v('pfName')||p.name; p.title=_v('pfTitle'); p.org=_v('pfOrg'); p.level=_chip('1');
      p.phone=_v('pfPhone'); p.wechat=_v('pfWx'); p.email=_v('pfEmail'); p.role=_v('pfRole'); p.heat=Number(_chip('2'))||3;
      p.last=_v('pfLast'); p.next=_v('pfNext'); p.pref=_v('pfPref'); p.note=_v('pfNote');
      saveDB(); closeDrawer(); toast('档案已更新'); renderDetail();
    },{priText:'保存修改'});
}
function logContact(i){
  var p=pplList()[i]; p.last=todayStr(); p.heat=Math.min(5,p.heat+1);
  saveDB(); closeDrawer(); toast('已记录接触，关系温度 +1'); renderDetail();
}
function delPerson(i){
  if(!canDeleteBiz()){ toast('删除联系人仅管理员可操作'); return; }
  if(!confirm('确定删除该联系人档案？')) return;
  pplList().splice(i,1); saveDB(); closeDrawer(); toast('已删除'); renderDetail();
}

/* ---------- 相关公司 ---------- */
function orgList(){ if(!DB.orgs[curProject]) DB.orgs[curProject]=[]; return DB.orgs[curProject]; }
function dtOrgs(){
  var O=orgList();
  var types={};
  O.forEach(function(o){ types[o.type]=(types[o.type]||0)+1 });
  var coop=O.filter(function(o){return o.status==='合作中'}).length;
  var amt=O.reduce(function(a,o){return a+(o.amount||0)},0);
  return '<div class="grid kpis" style="margin-bottom:12px">'+
    kpi('相关公司',O.length,'家',Object.keys(types).slice(0,3).join(' / ')||'—')+
    kpi('合作中',coop,'家','洽谈/询价中 '+(O.length-coop)+' 家','ok')+
    kpi('涉及合同/意向额',fmt(amt),'万元','含在手与拟签')+
    kpi('关键供应缺口',O.filter(function(o){return o.status==='询价中'||o.status==='洽谈中'}).length,'项','未锁定的关键方','warn')+
    '</div>'+
    '<div class="sect">参建与合作单位 <span class="tip" style="margin-left:auto"><button class="btn pri" onclick="openOrgAdd()">＋ 新增公司</button></span></div>'+
    '<div class="card scroll">'+
    (O.length? tbl('<th>公司名称</th><th>类型</th><th>承担角色</th><th>对接人</th><th>联系电话</th><th class="n">金额(万)</th><th>信用</th><th>合作状态</th>',
      O.map(function(o,i){
        return '<tr onclick="openOrgView('+i+')"><td class="nm">'+esc(o.name)+'</td>'+
          '<td>'+tag(o.type,o.type.indexOf('业主')>=0?'t-cy':o.type.indexOf('设计')>=0?'t-blu':o.type.indexOf('供应')>=0?'t-pu':o.type.indexOf('金融')>=0?'t-yel':'t-gry')+'</td>'+
          '<td>'+esc(o.role)+'</td><td>'+esc(o.contact)+'</td><td class="mono">'+esc(o.phone)+'</td>'+
          '<td class="n">'+(o.amount?fmt(o.amount):'—')+'</td><td>'+esc(o.credit)+'</td>'+
          '<td>'+tag(o.status,o.status==='合作中'?'t-grn':o.status==='洽谈中'?'t-yel':o.status==='询价中'?'t-blu':'t-gry')+'</td></tr>';
      }).join('')) : '<div class="note">尚未录入相关公司，点击右上角新增。</div>')+'</div>'+
    '<div class="note" style="margin-top:12px"><b>梳理要点：</b>相关公司要回答三个问题——'+
    '<b>谁决定我们能不能干</b>（业主、政府、电网）、<b>谁决定我们干得好不好</b>（设计、施工、监理）、'+
    '<b>谁决定我们赚不赚钱</b>（供应商、金融机构）。每一家都应有明确对接人与合作状态。</div>';
}
function orgForm(o){
  o=o||{};
  return fld('公司全称','ofName','甘肃省电力设计院',o.name)+
    fldSel('公司类型','ofType',['业主/项目公司','业主','政府/公用','设计院','施工总包','监理/咨询','设备供应商','金融机构','其他'],o.type)+
    fld('承担角色','ofRole','初设 + 接入系统设计',o.role)+
    '<div class="f2">'+fld('对接人','ofContact','李振华',o.contact)+fld('联系电话','ofPhone','137****8899',o.phone)+'</div>'+
    '<div class="f2">'+fld('涉及金额（万元）','ofAmt','860',o.amount)+fldSel('信用评级','ofCredit',['A','B','C','—'],o.credit)+'</div>'+
    '<div class="field"><label>合作状态</label>'+chips('1',['合作中','洽谈中','询价中','暂停','已终止'],o.status||'合作中')+'</div>'+
    fldArea('备注','ofNote','历史合作情况、账期、风险点',o.note);
}
function openOrgAdd(){
  if(!canEditProj(projById(curProject))){ toast('仅项目创建人或管理者可编辑本项目'); return; }
  openDrawer('新增相关公司',orgForm(),function(){
    var n=_v('ofName'); if(!n){toast('请填写公司名称');return}
    orgList().push({id:uid('o'),name:n,type:_v('ofType'),role:_v('ofRole'),contact:_v('ofContact')||'—',
      phone:_v('ofPhone')||'—',amount:_num('ofAmt'),credit:_v('ofCredit'),status:_chip('1'),note:_v('ofNote')});
    saveDB(); closeDrawer(); toast('已建档：'+n); renderDetail();
  },{priText:'保存公司'});
}
function openOrgView(i){
  var O=orgList(), o=O[i]; if(!o) return;
  var cs=DB.contracts.filter(function(c){return c.party===o.name});
  openDrawer(o.name,
    '<div class="dsec">公司档案</div><div class="kv">'+
    '<div class="k">类型</div><div class="v">'+esc(o.type)+'</div>'+
    '<div class="k">承担角色</div><div class="v">'+esc(o.role)+'</div>'+
    '<div class="k">对接人</div><div class="v">'+esc(o.contact)+' · <span class="mono">'+esc(o.phone)+'</span></div>'+
    '<div class="k">涉及金额</div><div class="v mono">'+(o.amount?fmt(o.amount)+' 万元':'—')+'</div>'+
    '<div class="k">信用评级</div><div class="v">'+esc(o.credit)+'</div>'+
    '<div class="k">合作状态</div><div class="v">'+tag(o.status,o.status==='合作中'?'t-grn':'t-yel')+'</div>'+
    '<div class="k">备注</div><div class="v">'+esc(o.note||'—')+'</div></div>'+
    '<div class="dsec">关联合同（'+cs.length+'）</div>'+
    (cs.length? '<div class="scroll">'+tbl('<th>编号</th><th>名称</th><th class="n">金额</th><th>履约</th>',
      cs.map(function(c){return '<tr onclick="openContractView(\''+c.id+'\')"><td class="mono">'+c.code+'</td>'+
        '<td class="nm">'+esc(c.name)+'</td><td class="n">'+fmt(c.amount)+'</td><td class="mono">'+c.perf+'%</td></tr>'}).join(''))+'</div>'
      : '<div class="note">暂无关联合同。可在「合同管理」中新增并选择该相对方。</div>')+
    '<div class="dsec">编辑档案</div>'+orgForm(o)+
    '<div class="dsec">快捷动作</div><div class="chips">'+
    '<span class="chip" onclick="openContractAdd()">＋ 与该公司签合同</span>'+
    (isAdmin()?'<span class="chip" onclick="delOrg('+i+')">删除</span>':'')+'</div>',
    function(){
      if(!canEditProj(projById(curProject))){ toast('仅项目创建人或管理者可编辑本项目'); return; }
      o.name=_v('ofName')||o.name; o.type=_v('ofType'); o.role=_v('ofRole'); o.contact=_v('ofContact');
      o.phone=_v('ofPhone'); o.amount=_num('ofAmt'); o.credit=_v('ofCredit'); o.status=_chip('1'); o.note=_v('ofNote');
      saveDB(); closeDrawer(); toast('公司档案已更新'); renderDetail();
    },{priText:'保存修改'});
}
function delOrg(i){
  if(!canDeleteBiz()){ toast('删除公司仅管理员可操作'); return; }
  if(!confirm('确定删除该公司档案？')) return;
  orgList().splice(i,1); saveDB(); closeDrawer(); toast('已删除'); renderDetail();
}

/* ---------- 机会 / 商机（CRM） ---------- */
var OPP_FILTER='all';
function oppFilterSet(f){ OPP_FILTER=f; document.querySelectorAll('#oppFilter button').forEach(function(b){b.classList.toggle('on',b.dataset.f===f);}); renderOpp(); }
function oppStageCls(s){ return s==='中标'?'t-grn':s==='丢单'?'t-red':s==='商务谈判'?'t-cy':s==='商机'?'t-yel':s==='线索'?'t-blu':'t-gry'; }
function oppLineShort(l){ return ({'新能源项目':'新能源','大交通机电':'大交通','网约车平台':'网约车','新能源车销售':'车辆销售'})[l]||l; }
function renderOpp(){
  if(!document.getElementById('oppList')) return;
  var all=visibleOpps();
  var list=all.filter(function(o){
    if(OPP_FILTER==='open') return (o.stage!=='中标'&&o.stage!=='丢单');
    if(OPP_FILTER==='win') return o.stage==='中标';
    if(OPP_FILTER==='lost') return o.stage==='丢单';
    return true;
  });
  var openv=all.filter(function(o){return o.stage!=='中标'&&o.stage!=='丢单';});
  var amtOpen=openv.reduce(function(a,o){return a+(o.amount||0)*(o.winRate||0)/100;},0);
  var won=all.filter(function(o){return o.stage==='中标';}).reduce(function(a,o){return a+o.amount;},0);
  var avgW=all.length?Math.round(all.reduce(function(a,o){return a+(o.winRate||0);},0)/all.length):0;
  document.getElementById('oppKpi').innerHTML=
    kpi('商机总数',all.length,'个','进行中 '+openv.length+' 个')+
    kpi('加权预期金额',fmt(Math.round(amtOpen)),'万元','金额×赢单率','ok')+
    kpi('已中标金额',fmt(won),'万元','转化合同后可回款','ok')+
    kpi('平均赢单率',avgW,'%','商机质量',avgW>=50?'ok':'warn');
  var stages=['线索','商机','商务谈判','中标','丢单'];
  document.getElementById('oppBoard').innerHTML='<div class="oppboard">'+stages.map(function(s){
    var items=all.filter(function(o){return o.stage===s;});
    var sum=items.reduce(function(a,o){return a+(o.amount||0);},0);
    return '<div class="oppcol oc-'+s+'"><div class="oh">'+s+' <span class="kc">'+items.length+'</span><span class="os">'+fmt(sum)+'万</span></div>'+
      items.map(function(o){ return '<div class="oppcard" onclick="openOppView(\''+o.id+'\')"><div class="onm">'+esc(o.title)+'</div>'+
        '<div class="ometa">'+esc(o.customer)+'</div>'+
        '<div class="ometa mono">'+fmt(o.amount)+' 万 · 赢单 '+(o.winRate||0)+'%</div>'+
        '<div class="ktags">'+tag(oppLineShort(o.line),'t-blu')+tag(o.owner,'t-gry')+'</div></div>';
      }).join('')+'</div>';
  }).join('')+'</div>';
  document.getElementById('oppList').innerHTML = list.length? tbl('<th>商机名称</th><th>业务线</th><th>客户</th><th class="n">金额(万)</th><th>阶段</th><th>负责人</th><th>预计成交</th><th>赢单率</th><th></th>',
    list.map(function(o){
      var conv = o.projectId ? '<span class="tag t-grn">已转化</span>'
        : (CUR_USER? '<button class="btn sm pri" onclick="event.stopPropagation();convertOpp(\''+o.id+'\')">转项目</button>' : '');
      return '<tr onclick="openOppView(\''+o.id+'\')"><td class="nm">'+esc(o.title)+'</td>'+
        '<td>'+esc(o.line)+'</td><td>'+esc(o.customer)+'</td><td class="n">'+fmt(o.amount)+'</td>'+
        '<td>'+tag(o.stage,oppStageCls(o.stage))+'</td><td>'+esc(o.owner)+'</td><td class="mono">'+(o.expectClose||'—')+'</td>'+
        '<td>'+(o.winRate||0)+'%</td><td>'+conv+'</td></tr>';
    }).join('')) : '<div class="note">暂无商机。点击右上角新增。</div>';
}
function openOppAdd(){
  if(!CUR_USER){ toast('请先登录'); return; }
  var html=
    '<div class="f2">'+fldSel('业务线','opLine',['新能源项目','大交通机电','网约车平台','新能源车销售'],'新能源项目')+fld('客户/单位','opCust','甘肃临港新能源开发有限公司')+'</div>'+
    fld('商机名称','opTitle','如：临港二期 200MW 光伏')+
    '<div class="f2">'+fld('预计金额(万元)','opAmt',0)+fld('负责人','opOwner','王磊')+'</div>'+
    '<div class="f2">'+fldSel('阶段','opStage',['线索','商机','商务谈判','中标','丢单'],'商机')+fld('赢单率 %','opWin',50)+'</div>'+
    '<div class="f2">'+fld('预计成交日','opClose',todayStr())+fld('来源/标签','opSrc','自主拓展')+'</div>'+
    fldArea('备注','opNote','关键决策人 / 竞争态势 / 推进计划');
  openDrawer('新增机会 / 商机',html,function(){
    var t=_v('opTitle'); if(!t){toast('请填写商机名称');return;}
    DB.opportunities=DB.opportunities||[];
    DB.opportunities.unshift({id:uid('op'),title:t,line:_v('opLine'),customer:_v('opCust'),amount:Number(_v('opAmt'))||0,
      stage:_v('opStage'),owner:_v('opOwner'),expectClose:_v('opClose'),winRate:Number(_v('opWin'))||0,
      projectId:'',created:todayStr(),source:_v('opSrc'),note:_v('opNote')});
    saveDB(); closeDrawer(); toast('商机已录入'); renderOpp();
  },{priText:'保存商机'});
}
function openOppView(id){
  var o=(DB.opportunities||[]).filter(function(x){return x.id===id})[0]; if(!o) return;
  var proj=o.projectId?projById(o.projectId):null;
  openDrawer('商机 · '+o.title,
    '<div class="dsec">商机信息</div><div class="kv">'+
    '<div class="k">业务线</div><div class="v">'+esc(o.line)+'</div>'+
    '<div class="k">客户</div><div class="v">'+esc(o.customer)+'</div>'+
    '<div class="k">金额</div><div class="v mono">'+fmt(o.amount)+' 万元</div>'+
    '<div class="k">阶段</div><div class="v">'+tag(o.stage,oppStageCls(o.stage))+'</div>'+
    '<div class="k">负责人</div><div class="v">'+esc(o.owner)+'</div>'+
    '<div class="k">预计成交</div><div class="v mono">'+(o.expectClose||'—')+'</div>'+
    '<div class="k">赢单率</div><div class="v">'+(o.winRate||0)+'%</div>'+
    '<div class="k">转化项目</div><div class="v">'+(proj?esc(proj.name):'—')+'</div>'+
    '<div class="k">备注</div><div class="v">'+esc(o.note||'—')+'</div></div>'+
    '<div class="dsec">编辑</div>'+
    '<div class="f2">'+fld('名称','opTitle',o.title)+fld('客户','opCust',o.customer)+'</div>'+
    '<div class="f2">'+fldSel('业务线','opLine',['新能源项目','大交通机电','网约车平台','新能源车销售'],o.line)+fld('金额(万)','opAmt',o.amount)+'</div>'+
    '<div class="f2">'+fldSel('阶段','opStage',['线索','商机','商务谈判','中标','丢单'],o.stage)+fld('赢单率 %','opWin',o.winRate||0)+'</div>'+
    fldArea('备注','opNote','推进计划 / 竞争态势',o.note)+
    '<div class="dsec">快捷动作</div><div class="chips">'+
    (o.projectId?'<span class="chip" onclick="goDetail(\''+o.projectId+'\')">查看转化项目</span>':
      (CUR_USER?'<span class="chip" onclick="convertOpp(\''+o.id+'\')">转为项目</span>':'<span class="chip" style="opacity:.5">登录后可转化</span>'))+
    '</div>',
    function(){
      if(!CUR_USER){ toast('请先登录'); return; }
      o.title=_v('opTitle')||o.title; o.customer=_v('opCust'); o.line=_v('opLine');
      o.amount=Number(_v('opAmt'))||0; o.stage=_v('opStage'); o.winRate=Number(_v('opWin'))||0; o.note=_v('opNote');
      saveDB(); closeDrawer(); toast('商机已更新'); renderOpp();
    },{priText:'保存修改'});
}
function convertOpp(id){
  var o=(DB.opportunities||[]).filter(function(x){return x.id===id})[0]; if(!o) return;
  if(o.projectId){ toast('该商机已转化为项目'); goDetail(o.projectId); return; }
  if(!canAddProject()){ toast('请先登录后再转化'); return; }
  if(!confirm('将商机「'+o.title+'」转化为正式项目？转化后可在项目详情中继续推进节点与合同。')) return;
  var typeMap={'新能源项目':'光伏','大交通机电':'机电工程','网约车平台':'网约车','新能源车销售':'车辆销售'};
  var pid=uid('prj');
  DB.projects.push({id:pid,name:o.title,line:oppLineShort(o.line),type:typeMap[o.line]||o.line,
    city:'',owner:o.owner,stage:o.stage==='中标'?'签约启动':'洽谈推进',addr:'',invTotal:o.amount,invDone:0,progress:0,status:'推进中',
    risk:[],note:'由商机【'+o.title+'】转化',geo:{lng:103.8,lat:36.0},updated:todayStr(),createdBy:CUR_USER.id});
  DB.nodes[pid]=[]; DB.people[pid]=[]; DB.orgs[pid]=[{id:uid('o'),name:o.customer,type:'业主/项目公司',role:'商机客户',contact:o.owner,phone:'—',amount:o.amount,credit:'—',status:'合作中',note:'由商机转化'}];
  o.projectId=pid; if(o.stage!=='中标') o.stage='商务谈判';
  saveDB(); closeDrawer(); toast('已转化为项目：'+o.title); renderOpp(); renderProjNav(); goDetail(pid);
}

/* ---------- 项目合同 ---------- */
function dtContracts(){
  var cs=DB.contracts.filter(function(c){return c.project===curProject});
  var ins=cs.filter(function(c){return c.dir==='收'}), outs=cs.filter(function(c){return c.dir==='付'});
  var plans=[];
  cs.forEach(function(c){ (c.plans||[]).forEach(function(p){ if(!p.actual) plans.push({c:c,p:p,dd:days(todayStr(),p.planDate)}) }) });
  plans.sort(function(a,b){return a.dd-b.dd});
  return '<div class="grid kpis" style="margin-bottom:12px">'+
    kpi('项目合同数',cs.length,'份','收入 '+ins.length+' / 支出 '+outs.length)+
    kpi('收入类合同额',fmt(ins.reduce(function(a,c){return a+c.amount},0)),'万元','已收 '+fmt(ins.reduce(function(a,c){return a+c.settled},0))+' 万','ok')+
    kpi('支出类合同额',fmt(outs.reduce(function(a,c){return a+c.amount},0)),'万元','已付 '+fmt(outs.reduce(function(a,c){return a+c.settled},0))+' 万')+
    kpi('待收付节点',plans.length,'笔',(plans.filter(function(x){return x.dd<0}).length?'<b class="up">含 '+plans.filter(function(x){return x.dd<0}).length+' 笔逾期</b>':'无逾期'),
      (plans.filter(function(x){return x.dd<0}).length?'danger':'ok'))+
    '</div>'+
    '<div class="sect">项目合同台账 <span class="tip" style="margin-left:auto"><button class="btn pri" onclick="openContractAdd()">＋ 新增合同</button></span></div>'+
    '<div class="card scroll">'+
    (cs.length? tbl('<th>编号</th><th>合同名称</th><th>相对方</th><th>方向</th><th class="n">金额</th><th>履约</th><th class="n">已收付</th><th>风险</th>',
      cs.map(function(c){
        var r=ctRisk(c);
        return '<tr onclick="openContractView(\''+c.id+'\')"><td class="mono">'+esc(c.code)+'</td>'+
          '<td class="nm">'+esc(c.name)+'</td><td>'+esc(c.party)+'</td>'+
          '<td>'+tag(c.dir==='收'?'收入':'支出',c.dir==='收'?'t-grn':'t-pu')+'</td>'+
          '<td class="n">'+fmt(c.amount)+'</td><td style="min-width:88px">'+bar(c.perf)+'</td>'+
          '<td class="n">'+fmt(c.settled)+'</td>'+
          '<td>'+tag(r.txt,r.lv==='r'?'t-red':r.lv==='y'?'t-yel':'t-grn')+'</td></tr>';
      }).join('')) : '<div class="note">该项目暂无合同，点击右上角新增。</div>')+'</div>'+
    (plans.length? '<div class="sect">待收付款节点</div><div class="card scroll">'+
      tbl('<th>计划日期</th><th>事项</th><th>合同</th><th class="n">金额</th><th>状态</th>',
      plans.slice(0,10).map(function(x){
        return '<tr onclick="openContractView(\''+x.c.id+'\')"><td class="mono">'+x.p.planDate+'</td>'+
          '<td class="nm">'+esc(x.p.name)+'</td><td>'+esc(x.c.code)+'</td>'+
          '<td class="n '+(x.c.dir==='收'?'dn':'up')+'">'+(x.c.dir==='收'?'+':'-')+fmt(x.p.amount)+'</td>'+
          '<td>'+tag(x.dd<0?'逾期 '+(-x.dd)+' 天':x.dd+' 天后',x.dd<0?'t-red':x.dd<=30?'t-yel':'t-gry')+'</td></tr>';
      }).join(''))+'</div>' : '');
}

/* ---------- 图纸 · 预算 · 概算 ---------- */
var docTab='draw';
function docStore(){
  if(!DB.docs[curProject]) DB.docs[curProject]={drawings:[],budgets:[],estimates:[],estcmp:[]};
  return DB.docs[curProject];
}
function dtDoc(){
  return '<div class="grid kpis" id="docKpi" style="margin-bottom:12px"></div>'+
    '<div class="card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">'+
    '<div class="seg" id="doctabs"><button class="'+(docTab==='draw'?'on':'')+'" data-t="draw">图纸</button>'+
    '<button class="'+(docTab==='budget'?'on':'')+'" data-t="budget">预算</button>'+
    '<button class="'+(docTab==='est'?'on':'')+'" data-t="est">概算</button></div>'+
    '<div class="spacer"></div>'+
    '<button class="btn pri" onclick="openDocAdd()">＋ 新增<span id="doctabname">'+(docTab==='draw'?'图纸':docTab==='budget'?'预算':'概算')+'</span></button></div>'+
    '<div id="doclist"></div></div>';
}
function renderDocKpi(){
  var d=docStore();
  var est=(d.estimates||[]).filter(function(x){return x[1]==='全册'})[0];
  var bud=(d.budgets||[]).filter(function(x){return x[1]==='全册'})[0];
  var e=est?Number(String(est[2]).replace(/[^0-9.]/g,'')):0;
  var b=bud?Number(String(bud[2]).replace(/[^0-9.]/g,'')):0;
  var el=document.getElementById('docKpi'); if(!el) return;
  el.innerHTML=
    kpi('设计概算总额',fmt(e),'万元','批准版本 '+(est?est[3]:'—'),'','docJump(\'est\')')+
    kpi('施工图预算总额',fmt(b),'万元','版本 '+(bud?bud[3]:'—'),'','docJump(\'budget\')')+
    kpi('预算 / 概算',(e?(b/e*100).toFixed(1):0),'%',(b<=e?'<b class="dn">未超概</b> 结余 '+fmt(e-b)+' 万':'<b class="up">已超概</b> '+fmt(b-e)+' 万'),(b<=e?'ok':'danger'))+
    kpi('图纸版本',(d.drawings||[]).length,'套','已审定 '+(d.drawings||[]).filter(function(x){return x[6]==='已审定'}).length+' 套','','docJump(\'draw\')');
}
function docJump(t){
  docTab=t;
  document.querySelectorAll('#doctabs button').forEach(function(b){b.classList.toggle('on',b.dataset.t===t)});
  var n=document.getElementById('doctabname'); if(n) n.textContent=t==='draw'?'图纸':t==='budget'?'预算':'概算';
  renderDoc();
}
function renderDoc(){
  var d=docStore(), box=document.getElementById('doclist'); if(!box) return;
  var h='';
  if(docTab==='draw'){
    h=(d.drawings||[]).length? tbl('<th>图纸名称</th><th>专业</th><th>版本</th><th>阶段</th><th>编制单位</th><th>日期</th><th>状态</th><th>编制人</th><th></th>',
      d.drawings.map(function(x,i){
        return '<tr><td class="nm">'+esc(x[0])+'</td><td>'+esc(x[1])+'</td><td class="mono">'+esc(x[2])+'</td>'+
          '<td>'+tag(x[3],'t-blu')+'</td><td>'+esc(x[4])+'</td><td class="mono">'+esc(x[5])+'</td>'+
          '<td>'+tag(x[6],x[6]==='已审定'?'t-grn':x[6]==='评审中'?'t-yel':'t-gry')+'</td><td>'+esc(x[7])+'</td>'+
          '<td><button class="btn sm" onclick="openDocView(\'draw\','+i+')">查看</button></td></tr>';
      }).join('')) : '<div class="note">暂无图纸，点击右上角新增。</div>';
  } else if(docTab==='budget'){
    h=(d.budgets||[]).length? tbl('<th>预算文件</th><th>费用科目</th><th class="n">金额(万元)</th><th>版本</th><th>日期</th><th>状态</th><th>编制单位</th><th></th>',
      d.budgets.map(function(x,i){
        return '<tr><td class="nm">'+esc(x[0])+'</td><td>'+esc(x[1])+'</td><td class="n">'+fmt(Number(String(x[2]).replace(/[^0-9.]/g,'')))+'</td>'+
          '<td class="mono">'+esc(x[3])+'</td><td class="mono">'+esc(x[4])+'</td>'+
          '<td>'+tag(x[5],x[5]==='已批准'?'t-grn':'t-yel')+'</td><td>'+esc(x[6])+'</td>'+
          '<td><button class="btn sm" onclick="openDocView(\'budget\','+i+')">查看</button></td></tr>';
      }).join('')) : '<div class="note">暂无预算，点击右上角新增。</div>';
  } else {
    h=(d.estimates||[]).length? tbl('<th>概算文件</th><th>费用科目</th><th class="n">金额(万元)</th><th>版本</th><th>日期</th><th>状态</th><th>编制单位</th><th></th>',
      d.estimates.map(function(x,i){
        return '<tr><td class="nm">'+esc(x[0])+'</td><td>'+esc(x[1])+'</td><td class="n">'+fmt(Number(String(x[2]).replace(/[^0-9.]/g,'')))+'</td>'+
          '<td class="mono">'+esc(x[3])+'</td><td class="mono">'+esc(x[4])+'</td>'+
          '<td>'+tag(x[5],x[5]==='已批准'?'t-grn':'t-yel')+'</td><td>'+esc(x[6])+'</td>'+
          '<td><button class="btn sm" onclick="openDocView(\'est\','+i+')">查看</button></td></tr>';
      }).join('')) : '<div class="note">暂无概算，点击右上角新增。</div>';
    h+=estCmpHtml(d);
  }
  box.innerHTML=h;
}
function estCmpHtml(d){
  var C=d.estcmp||[]; if(!C.length) return '';
  var te=0,tb=0;
  var rows=C.map(function(x){
    te+=x[1]; tb+=x[2];
    var diff=x[2]-x[1], rate=x[1]?diff/x[1]*100:0;
    return '<tr><td class="nm">'+esc(x[0])+'</td><td class="n">'+fmt(x[1])+'</td><td class="n">'+fmt(x[2])+'</td>'+
      '<td class="n '+(diff>0?'up':'dn')+'">'+(diff>0?'+':'')+fmt(diff)+'</td>'+
      '<td class="n '+(diff>0?'up':'dn')+'">'+(rate>0?'+':'')+rate.toFixed(1)+'%</td>'+
      '<td>'+tag(diff>0?'超概':'受控',diff>0?'t-red':'t-grn')+'</td></tr>';
  }).join('');
  var td=tb-te;
  return '<div class="sect" style="margin-top:18px">概预算对比 <span class="tip">预算不得突破概算 · 超概自动锁定需董事长审批</span></div>'+
    '<div class="scroll">'+tbl('<th>费用科目</th><th class="n">设计概算</th><th class="n">施工图预算</th><th class="n">偏差(万元)</th><th class="n">偏差率</th><th>结论</th>',
      rows+'<tr style="background:rgba(255,140,26,.05)"><td class="nm">合计</td><td class="n">'+fmt(te)+'</td><td class="n">'+fmt(tb)+'</td>'+
      '<td class="n '+(td>0?'up':'dn')+'">'+(td>0?'+':'')+fmt(td)+'</td>'+
      '<td class="n '+(td>0?'up':'dn')+'">'+(td/te*100).toFixed(1)+'%</td>'+
      '<td>'+tag(td>0?'超概·需审批':'整体受控',td>0?'t-red':'t-grn')+'</td></tr>')+'</div>'+
    '<div class="note" style="margin-top:10px"><b>控制红线：</b>① 预算不得突破概算，任一科目超概自动飘红并锁定，需董事长审批（概预算调整专题）后方可执行；'+
    '② 图纸以"已审定"的最新版本为唯一有效版本，防止错版施工与错版采购。</div>';
}
function docForm(t){
  if(t==='draw'){
    return fld('图纸名称','dcName','如：电气一次接线图')+
      '<div class="f2">'+fldSel('专业','dcType',['总图','电气','结构/土建','线路','接入系统','机电安装','通信','其他'])+
      fld('版本号','dcVer','V1.0')+'</div>'+
      '<div class="f2">'+fldSel('设计阶段','dcStage',['可研','初设','施工图','竣工图'])+fld('编制日期','dcDate',todayStr())+'</div>'+
      '<div class="f2">'+fld('编制单位','dcOrg','甘肃省电力设计院')+fld('编制/校核人','dcBy','王工')+'</div>'+
      '<div class="field"><label>状态</label>'+chips('1',['编制中','评审中','已审定','作废'],'编制中')+'</div>'+
      '<div class="note">图纸受控要求：同一图号仅"已审定"的最新版本可用于施工与采购，旧版本自动标记为历史版本。</div>';
  }
  var isB=t==='budget';
  return fld((isB?'预算':'概算')+'文件名称','dcName',isB?'施工图预算（全费用）':'设计概算（报批稿）')+
    '<div class="f2">'+fldSel('费用科目','dcType',['全册','设备购置','建安工程','其他费用','预备费','建设期利息'])+
    fld('金额（万元）','dcAmt','0')+'</div>'+
    '<div class="f2">'+fld('版本号','dcVer','V1.0')+fld('编制日期','dcDate',todayStr())+'</div>'+
    fld('编制单位','dcOrg',isB?'预算部':'甘肃省电力设计院')+
    '<div class="field"><label>状态</label>'+chips('1',['编制中','审核中','已批准','已作废'],'编制中')+'</div>'+
    (isB?'<div class="note"><b>控制红线：</b>预算金额不得突破对应科目的设计概算，超出将自动飘红并需董事长审批。</div>'
        :'<div class="note">概算为投资控制的最高限额，调整需履行原审批程序。</div>');
}
function openDocAdd(){
  var t=docTab, title=t==='draw'?'新增图纸':t==='budget'?'新增预算':'新增概算';
  openDrawer(title,docForm(t),function(){
    var d=docStore(), n=_v('dcName'); if(!n){toast('请填写名称');return}
    if(t==='draw'){
      d.drawings=d.drawings||[];
      d.drawings.unshift([n,_v('dcType'),_v('dcVer')||'V1.0',_v('dcStage'),_v('dcOrg'),_v('dcDate'),_chip('1'),_v('dcBy')]);
    } else {
      var arr=t==='budget'?(d.budgets=d.budgets||[]):(d.estimates=d.estimates||[]);
      arr.unshift([n,_v('dcType'),String(_num('dcAmt')),_v('dcVer')||'V1.0',_v('dcDate'),_chip('1'),_v('dcOrg')]);
    }
    saveDB(); closeDrawer(); toast('已保存：'+n); renderDtBody();
  },{priText:'保存'});
}
function openDocView(t,i){
  var d=docStore();
  var x=t==='draw'?d.drawings[i]:t==='budget'?d.budgets[i]:d.estimates[i];
  if(!x) return;
  var body;
  if(t==='draw'){
    body='<div class="dsec">图纸信息</div><div class="kv">'+
      '<div class="k">名称</div><div class="v">'+esc(x[0])+'</div>'+
      '<div class="k">专业</div><div class="v">'+esc(x[1])+'</div>'+
      '<div class="k">版本</div><div class="v mono">'+esc(x[2])+'</div>'+
      '<div class="k">阶段</div><div class="v">'+esc(x[3])+'</div>'+
      '<div class="k">编制单位</div><div class="v">'+esc(x[4])+'</div>'+
      '<div class="k">日期</div><div class="v mono">'+esc(x[5])+'</div>'+
      '<div class="k">状态</div><div class="v">'+tag(x[6],x[6]==='已审定'?'t-grn':'t-yel')+'</div>'+
      '<div class="k">编制人</div><div class="v">'+esc(x[7])+'</div></div>'+
      '<div class="dsec">版本历史</div>'+
      '<div class="li"><div class="t">'+esc(x[2])+' · 当前版本<div class="s">'+esc(x[5])+' · '+esc(x[6])+'</div></div>'+tag('有效','t-grn')+'</div>'+
      '<div class="li"><div class="t">历史版本<div class="s">仅供追溯，不得用于施工与采购</div></div>'+tag('已归档','t-gry')+'</div>';
  } else {
    body='<div class="dsec">'+(t==='budget'?'预算':'概算')+'信息</div><div class="kv">'+
      '<div class="k">名称</div><div class="v">'+esc(x[0])+'</div>'+
      '<div class="k">费用科目</div><div class="v">'+esc(x[1])+'</div>'+
      '<div class="k">金额</div><div class="v mono" style="font-size:15px;font-weight:700">'+fmt(Number(String(x[2]).replace(/[^0-9.]/g,'')))+' 万元</div>'+
      '<div class="k">版本</div><div class="v mono">'+esc(x[3])+'</div>'+
      '<div class="k">日期</div><div class="v mono">'+esc(x[4])+'</div>'+
      '<div class="k">状态</div><div class="v">'+tag(x[5],x[5]==='已批准'?'t-grn':'t-yel')+'</div>'+
      '<div class="k">编制单位</div><div class="v">'+esc(x[6])+'</div></div>'+
      '<div class="dsec">关联审批</div><div class="note">该文件的审定记录与调整历史可在「待我审批」中追溯。任何调整须留痕并说明原因。</div>';
  }
  openDrawer((t==='draw'?'图纸 · ':t==='budget'?'预算 · ':'概算 · ')+x[0],body,function(){closeDrawer()},{priText:'关闭'});
}

/* ==================================================================
   三、业务人员管理 + 业务费用（与 项目 / 进度 / 关键人 / 合同执行 整合）
   ================================================================== */
var stLine='all', stExpF='all';

/* 多选 chips */
function chipsMulti(g,arr,def){
  def=def||[];
  return '<div class="chips" data-g="'+g+'">'+arr.map(function(x){
    return '<span class="chip'+(def.indexOf(x)>=0?' on':'')+'" onclick="toggleChip(this)">'+esc(x)+'</span>';
  }).join('')+'</div>';
}
function toggleChip(el){ el.classList.toggle('on'); }
function _chipsSel(g){
  var cs=document.querySelectorAll('#dbody .chips[data-g="'+(g||'1')+'"] .chip.on');
  return Array.prototype.map.call(cs,function(c){return c.textContent});
}
function expSum(arr){ return (arr||[]).reduce(function(a,e){return a+(e.amount||0)},0); }
function yuan(n){ return '¥'+fmt(n); }

/* CSV 下载（带 BOM，Excel 中文不乱码） */
function csvDownload(name,matrix){
  var csv='\ufeff'+matrix.map(function(r){
    return r.map(function(x){return '"'+String(x==null?'':x).replace(/"/g,'""')+'"'}).join(',');
  }).join('\n');
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download=name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast('已导出：'+name);
}

/* ---------- 业务人员卡片（列表/项目内复用） ---------- */
function staffCardHtml(s){
  var ps=staffProjects(s);
  var exps=staffExpenses(s.id);
  var cs=staffContracts(s.id);
  var inv=ps.reduce(function(a,p){return a+(p.invTotal||0)},0);
  var recv=cs.filter(function(c){return c.dir==='收'}).reduce(function(a,c){return a+c.amount},0);
  var expSumAll=expSum(exps);
  return '<div class="scard" onclick="openStaffView(\''+s.id+'\')">'+
    '<span class="sdot '+(s.status==='在职'?'g':s.status==='试用'?'y':'r')+'"></span>'+
    '<div class="top"><div class="av">'+esc((s.name||'?').slice(0,1))+'</div>'+
      '<div><div class="nm">'+esc(s.name)+'</div><div class="ti">'+esc(s.role||'业务人员')+'</div></div></div>'+
    '<div class="tags">'+tag(s.line,'t-cy')+tag(s.status,s.status==='在职'?'t-grn':s.status==='试用'?'t-yel':'t-red')+'</div>'+
    '<div class="rows">'+
      '<div>负责项目：<b>'+ps.length+'</b> 个 · 投资额 '+fmt(inv)+' 万</div>'+
      '<div>关联合同（收）：<b>'+fmt(recv)+'</b> 万</div>'+
      '<div>业务费用：<b style="color:var(--wn)">'+yuan(expSumAll)+'</b></div>'+
      (s.region?'<div>负责区域：'+esc(s.region)+'</div>':'')+
    '</div></div>';
}

/* ---------- 业务费用表格（列表/项目内/人员详情复用） ---------- */
function expTableHtml(arr){
  if(!arr.length) return '<div class="note">暂无业务费用记录。</div>';
  return tbl('<th>日期</th><th>类型</th><th>说明</th><th>业务人员</th><th>项目</th><th class="n">金额(元)</th><th>状态</th>',
    arr.map(function(e){
      var i=DB.expenses.indexOf(e);
      return '<tr onclick="openExpenseAdd({edit:DB.expenses['+i+']})"><td class="mono">'+esc(e.date)+'</td>'+
        '<td>'+tag(e.type,'t-blu')+'</td>'+
        '<td class="nm">'+esc(e.note||'—')+'</td>'+
        '<td>'+esc(staffName(e.staffId))+'</td>'+
        '<td>'+esc(e.projectId?projName(e.projectId):'—')+'</td>'+
        '<td class="n mono">'+yuan(e.amount)+'</td>'+
        '<td>'+tag(e.status,e.status==='已报销'?'t-grn':e.status==='待审批'?'t-yel':'t-red')+'</td></tr>';
    }).join(''));
}

/* ---------- 业务人员管理页 ---------- */
function stLineSet(f){ stLine=f;
  document.querySelectorAll('#stFilter button').forEach(function(b){b.classList.toggle('on',b.dataset.f===f)});
  renderStaff();
}
function stExpSet(f){ stExpF=f;
  document.querySelectorAll('#stExpFilter button').forEach(function(b){b.classList.toggle('on',b.dataset.f===f)});
  renderStaff();
}
function renderStaff(){
  var staff=DB.staff||[];
  /* 业务员数据隔离：除自身外不可查看其余人员 —— 仅显示本人（按 userId 或姓名匹配） */
  if(isMember()){
    var me=CUR_USER;
    staff=staff.filter(function(s){ return (s.userId&&s.userId===me.id) || s.name===me.name; });
  }
  var fstaff = stLine==='all'? staff : staff.filter(function(s){return s.line===stLine});
  var fpids={}; fstaff.forEach(function(s){(s.projects||[]).forEach(function(p){fpids[p]=1})});
  var fprojs = DB.projects.filter(function(p){return fpids[p.id]});
  var fconts = DB.contracts.filter(function(c){return c.project && fpids[c.project]});
  var recv=fconts.filter(function(c){return c.dir==='收'}).reduce(function(a,c){return a+c.amount},0);
  var pay=fconts.filter(function(c){return c.dir==='付'}).reduce(function(a,c){return a+c.amount},0);

  /* 业务费用范围 = 当前业务线筛选下的费用（业务员仅本人费用） */
  var fexp = (DB.expenses||[]).filter(function(e){
    if(isMember()){ var s=staffById(e.staffId)||{}; return (s.userId&&s.userId===(CUR_USER&&CUR_USER.id))||s.name===(CUR_USER&&CUR_USER.name); }
    return stLine==='all' || (staffById(e.staffId)||{}).line===stLine;
  });
  var eList = expFilter(stExpF).filter(function(e){
    if(isMember()){ var s=staffById(e.staffId)||{}; return (s.userId&&s.userId===(CUR_USER&&CUR_USER.id))||s.name===(CUR_USER&&CUR_USER.name); }
    return stLine==='all' || (staffById(e.staffId)||{}).line===stLine;
  });
  var sumAll=expSum(fexp);
  var sumPending=expSum(fexp.filter(function(e){return e.status==='待审批'}));
  var sumDone=expSum(fexp.filter(function(e){return e.status==='已报销'}));

  document.getElementById('stKpi').innerHTML=
    kpi('业务人员',fstaff.length,'人',stLine==='all'?'全公司':stLine)+
    kpi('负责项目（去重）',fprojs.length,'个','覆盖 '+fprojs.length+' 个在建/开发项目')+
    kpi('业务费用合计',yuan(sumAll),'', '待报销 <b class="wn">'+yuan(sumPending)+'</b> · 已报销 '+yuan(sumDone),'')+
    kpi('关联合同额',fmt(recv+pay),'万元','收 '+fmt(recv)+' / 付 '+fmt(pay),'');

  document.getElementById('stGrid').innerHTML = fstaff.length? fstaff.map(staffCardHtml).join('')
    : '<div class="note">该业务线下暂无业务人员。</div>';

  document.getElementById('stExpKpi').innerHTML=
    kpi('费用笔数',eList.length,'笔',stExpF==='all'?'全部状态':stExpF==='pending'?'待审批':stExpF==='done'?'已报销':'已驳回')+
    kpi('费用金额',yuan(expSum(eList)),'', stExpF==='all'?'含全部状态':'按筛选')+
    kpi('待审批',yuan(sumPending),'','需财务处理','warn')+
    kpi('已报销',yuan(sumDone),'','已入账','ok');

  /* 按类型 */
  var byType={};
  eList.forEach(function(e){ byType[e.type]=(byType[e.type]||0)+e.amount; });
  var typeArr=Object.keys(byType).map(function(k){return [k,byType[k]]});
  document.getElementById('stExpChart').innerHTML = typeArr.length? hbars(typeArr,C_PU)
    : '<div class="note" style="padding:14px">暂无费用数据。</div>';
  /* 按业务人员 */
  var byStaff={};
  eList.forEach(function(e){ var n=staffName(e.staffId); byStaff[n]=(byStaff[n]||0)+e.amount; });
  var staffArr=Object.keys(byStaff).map(function(k){return [k,byStaff[k]]});
  document.getElementById('stExpStaff').innerHTML = staffArr.length? hbars(staffArr,C_CY)
    : '<div class="note" style="padding:14px">暂无费用数据。</div>';

  document.getElementById('stExpTable').innerHTML = expTableHtml(eList);
  renderStaffPerf();
}

/* ---------- 业务人员详情抽屉 ---------- */
function openStaffView(id){
  var s=staffById(id); if(!s) return;
  var ps=staffProjects(s);
  var exps=staffExpenses(id);
  var cs=staffContracts(id);
  var kpMap={};
  ps.forEach(function(p){ (DB.people[p.id]||[]).forEach(function(x){ kpMap[x.name]=x; }); });
  var kp=Object.keys(kpMap).map(function(k){return kpMap[k]});
  var recv=cs.filter(function(c){return c.dir==='收'}).reduce(function(a,c){return a+c.amount},0);
  var pay=cs.filter(function(c){return c.dir==='付'}).reduce(function(a,c){return a+c.amount},0);

  var projHtml = ps.length? ps.map(function(p){
    return '<div class="li" onclick="goDetail(\''+p.id+'\')" style="cursor:pointer">'+
      '<div class="t">'+esc(p.name)+'<div class="s">'+p.type+' · '+p.stage+' · 负责人 '+p.owner+'</div></div>'+
      '<div style="width:120px">'+bar(p.progress)+'</div>'+
      '<div class="mono" style="width:56px;text-align:right;color:var(--txt)">'+p.progress+'%</div></div>';
  }).join('') : '<div class="note">尚未关联项目。</div>';

  var kpHtml = kp.length? kp.map(function(x){
    return '<div class="li"><div class="t">'+esc(x.name)+' · '+esc(x.title)+'<div class="s">'+esc(x.org)+' · 关系温度 '+x.heat+'/5</div></div>'+
      tag(x.level,x.level==='决策'?'t-red':x.level==='影响'?'t-yel':'t-blu')+'</div>';
  }).join('') : '<div class="note">这些项目暂无登记外部关键人。</div>';

  var cHtml = cs.length? tbl('<th>合同</th><th>相对方</th><th>方向</th><th class="n">金额</th><th>履约</th><th>风险</th>',
    cs.map(function(c){ var r=ctRisk(c); return '<tr onclick="openContractView(\''+c.id+'\')"><td class="mono">'+esc(c.code)+'</td>'+
      '<td class="nm">'+esc(c.name)+'</td><td>'+tag(c.dir==='收'?'收入':'支出',c.dir==='收'?'t-grn':'t-pu')+'</td>'+
      '<td class="n">'+fmt(c.amount)+'</td><td style="min-width:80px">'+bar(c.perf)+'</td>'+
      '<td>'+tag(r.txt,r.lv==='r'?'t-red':r.lv==='y'?'t-yel':'t-grn')+'</td></tr>'; }).join(''))
    : '<div class="note">暂无关联合同。</div>';

  openDrawer(s.name+' · 业务人员',
    '<div class="dsec">档案</div><div class="kv">'+
    '<div class="k">角色</div><div class="v">'+esc(s.role||'—')+'</div>'+
    '<div class="k">业务线</div><div class="v">'+tag(s.line,'t-cy')+'</div>'+
    '<div class="k">状态</div><div class="v">'+tag(s.status,s.status==='在职'?'t-grn':s.status==='试用'?'t-yel':'t-red')+'</div>'+
    '<div class="k">电话</div><div class="v mono">'+esc(s.phone||'—')+'</div>'+
    '<div class="k">负责区域</div><div class="v">'+esc(s.region||'—')+'</div>'+
    '<div class="k">入职</div><div class="v mono">'+esc(s.joined||'—')+'</div>'+
    '<div class="k">备注</div><div class="v">'+esc(s.note||'—')+'</div></div>'+
    '<div class="dsec">负责项目与进度（'+ps.length+'）</div>'+projHtml+
    '<div class="dsec">项目关键人（外部 · '+kp.length+'）</div>'+kpHtml+
    '<div class="dsec">业务费用（'+exps.length+' 笔 · 合计 '+yuan(expSum(exps))+'）</div>'+
    (exps.length? '<div class="scroll">'+expTableHtml(exps)+'</div>'
      : '<div class="note">暂无业务费用记录。</div>')+
    '<div class="dsec">关联合同执行（收 '+fmt(recv)+' / 付 '+fmt(pay)+' 万）</div>'+cHtml+
    '<div class="dsec">快捷动作</div><div class="chips">'+
      '<span class="chip" onclick="openTaskAdd({title:\'督办：'+esc(s.name)+'\',owner:\''+esc(s.name)+'\'})">派单督办</span>'+
      '<span class="chip" onclick="openExpenseAdd({staffId:\''+s.id+'\'})">＋ 登记业务费用</span>'+
      '<span class="chip" onclick="openStaffAdd()">编辑档案</span></div>',
    function(){ closeDrawer(); },{priText:'关闭'});
}

/* ---------- 新增/编辑业务人员 ---------- */
function staffForm(s){
  s=s||{};
  return '<div class="f2">'+fld('姓名','stName','王磊',s.name)+fld('角色/职务','stRole','新能源业务经理',s.role)+'</div>'+
    '<div class="f2">'+fldSel('业务线','stLine',['新能源','大交通','网约车','车辆销售','综合'],s.line)+
      fld('电话','stPhone','139****3381',s.phone)+'</div>'+
    '<div class="f2">'+fld('负责区域','stRegion','张掖/酒泉',s.region)+
      '<div class="field"><label>状态</label>'+chips('1',['在职','试用','停职'],s.status||'在职')+'</div></div>'+
    fld('入职日期','stJoined',todayStr(),s.joined)+
    '<div class="field"><label>负责项目（可多选）</label>'+chipsMulti('2',visibleProjects().map(function(p){return p.name}),(s.projects||[]).map(projName))+'</div>'+
    fldArea('备注','stNote','擅长的业务、对接资源、考核重点',s.note);
}
function openStaffAdd(){
  if(!requireManager('新增业务人员')) return;
  openDrawer('新增业务人员',staffForm(),function(){
    var n=_v('stName'); if(!n){toast('请填写姓名');return}
    var pns=_chipsSel('2');
    var pids=pns.map(function(nm){return (DB.projects.filter(function(p){return p.name===nm})[0]||{}).id}).filter(Boolean);
    DB.staff.unshift({id:uid('s'),name:n,role:_v('stRole')||'业务人员',line:_v('stLine'),
      phone:_v('stPhone')||'—',region:_v('stRegion')||'—',status:_chip('1')||'在职',
      joined:_v('stJoined')||todayStr(),projects:pids,note:_v('stNote')});
    saveDB(); closeDrawer(); toast('已建档：'+n); renderStaff();
  },{priText:'保存并建档'});
}

/* ---------- 业务费用登记/编辑 ---------- */
function openExpenseAdd(opts){
  opts=opts||{}; var e=opts.edit||null; var i=e?DB.expenses.indexOf(e):-1;
  var preP=opts.projectId||(e?e.projectId:'');
  var preS=opts.staffId||(e?e.staffId:(DB.staff[0]?DB.staff[0].id:''));
  var pname=preP?projName(preP):'（不关联）';
  var sname=staffName(preS)||(DB.staff[0]?DB.staff[0].name:'—');
  openDrawer(e?'编辑业务费用':'登记业务费用',
    '<div class="f2">'+fldSel('业务人员','exStaff',DB.staff.map(function(s){return s.name}),sname)+
      fldSel('关联项目','exProj',['（不关联）'].concat(visibleProjects().map(function(p){return p.name})),pname)+'</div>'+
    '<div class="f2">'+fldSel('费用类型','exType',['招待费','差旅费','佣金提成','通讯交通费','其他'],e?e.type:'招待费')+
      fld('金额（元）','exAmt',e?String(e.amount):'')+'</div>'+
    '<div class="f2">'+fld('发生日期','exDate',e?e.date:todayStr())+fld('发票/单据号','exNo',e?(''):'')+'</div>'+
    '<div class="field"><label>报销状态</label>'+chips('1',['待审批','已报销','驳回'],e?e.status:'待审批')+'</div>'+
    fldArea('说明','exNote','接待对象 / 行程 / 事由',e?e.note:''),
    function(){
      var amt=_num('exAmt'); if(!amt){toast('请填写金额');return}
      var sName=_v('exStaff'); var sid=(DB.staff.filter(function(s){return s.name===sName})[0]||{}).id||(DB.staff[0]?DB.staff[0].id:'');
      var pn=_v('exProj'); var pid=(DB.projects.filter(function(p){return p.name===pn})[0]||{}).id||'';
      var rec={staffId:sid,projectId:pid,type:_v('exType'),amount:amt,date:_v('exDate')||todayStr(),status:_chip('1'),note:_v('exNote')};
      if(i>=0){ rec.id=e.id; DB.expenses[i]=rec; } else { rec.id=uid('e'); DB.expenses.unshift(rec); }
      saveDB(); closeDrawer(); toast('业务费用已'+(i>=0?'更新':'登记')); renderStaff(); if(curProject===pid) renderDetail();
    },{priText:'保存'});
}

/* ---------- 项目内指派/调整业务人员 ---------- */
function openStaffAssign(pid){
  var cur=projStaff(pid).map(function(s){return s.name});
  openDrawer('指派业务人员 · '+projName(pid),
    '<div class="note" style="margin-bottom:10px">勾选负责/参与本项目的业务人员（可多选）。</div>'+
    '<div class="field"><label>业务人员</label>'+chipsMulti('1',DB.staff.map(function(s){return s.name}),cur)+'</div>',
    function(){
      var sel=_chipsSel('1');
      DB.staff.forEach(function(s){
        var on=sel.indexOf(s.name)>=0, has=s.projects.indexOf(pid)>=0;
        if(on&&!has) s.projects.push(pid);
        if(!on&&has) s.projects=s.projects.filter(function(x){return x!==pid});
      });
      saveDB(); closeDrawer(); toast('已更新本项目业务人员'); renderDetail();
    },{priText:'保存指派'});
}

/* ---------- 项目详情：业务人员 · 费用 ---------- */
function dtStaff(){
  var p=projById(curProject);
  var ss=projStaff(curProject);
  var es=projExpenses(curProject);
  var cs=DB.contracts.filter(function(c){return c.project===curProject});
  var expSumAll=expSum(es);
  var pendingSum=expSum(es.filter(function(e){return e.status==='待审批'}));
  return '<div class="grid kpis" style="margin-bottom:12px">'+
    kpi('项目业务人员',ss.length,'人','负责/参与本项目')+
    kpi('本项目业务费用',yuan(expSumAll),'', '待审批 '+yuan(pendingSum),'warn')+
    kpi('项目合同额',fmt(cs.reduce(function(a,c){return a+c.amount},0)),'万元','收入 '+fmt(cs.filter(function(c){return c.dir==='收'}).reduce(function(a,c){return a+c.amount},0))+' 万')+
    kpi('项目关键人',(DB.people[curProject]||[]).length,'位','外部关键决策人','')+
    '</div>'+
    '<div class="sect">业务人员 <span class="tip" style="margin-left:auto"><button class="btn pri" onclick="openStaffAssign(\''+curProject+'\')">＋ 指派/调整业务人员</button></span></div>'+
    '<div class="sgrid" id="dtStaffGrid">'+(ss.length? ss.map(staffCardHtml).join('')
      : '<div class="note">尚未指派业务人员，点击右上角指派。</div>')+'</div>'+
    '<div class="sect" style="margin-top:14px">本项目业务费用 <span class="tip" style="margin-left:auto"><button class="btn pri" onclick="openExpenseAdd({projectId:\''+curProject+'\'})">＋ 登记业务费用</button></span></div>'+
    '<div class="card scroll">'+expTableHtml(es)+'</div>';
}

/* ---------- 导出 ---------- */
function exportStaff(){
  var head=['姓名','角色','业务线','电话','区域','状态','入职','负责项目','业务费用(元)','关联合同额(收·万)'];
  var rows=DB.staff.map(function(s){
    var exps=staffExpenses(s.id).reduce(function(a,e){return a+e.amount},0);
    var recv=staffContracts(s.id).filter(function(c){return c.dir==='收'}).reduce(function(a,c){return a+c.amount},0);
    return [s.name,s.role,s.line,s.phone,s.region,s.status,s.joined,(s.projects||[]).map(projName).join('/'),exps,recv];
  });
  csvDownload('甘肃新煜科技_业务人员_'+todayStr()+'.csv',[head].concat(rows));
}
function exportExpenses(){
  var head=['日期','类型','业务人员','项目','金额(元)','状态','说明'];
  var rows=DB.expenses.map(function(e){
    return [e.date,e.type,staffName(e.staffId),e.projectId?projName(e.projectId):'',e.amount,e.status,e.note];
  });
  csvDownload('甘肃新煜科技_业务费用_'+todayStr()+'.csv',[head].concat(rows));
}

/* ==================================================================
   四、项目地图（合规中国地图 · 标注 · 数字孪生）
   ================================================================== */
function renderMap(){
  if(!document.getElementById('mapSvg')) return;
  var mapProjs=visibleProjects();
  document.getElementById('mapSvg').innerHTML = renderChinaMap(mapProjs);
  document.getElementById('mapList').innerHTML = mapProjs.map(function(p){
    return '<div class="li mapitem" onclick="openTwin(\''+p.id+'\')" style="cursor:pointer">'+
      '<div class="t">'+esc(p.name)+'<div class="s">'+p.type+' · '+p.stage+' · '+esc(p.addr)+'</div></div>'+
      '<div style="width:120px">'+bar(p.progress)+'</div>'+
      '<div class="mono" style="width:52px;text-align:right;color:var(--txt)">'+p.progress+'%</div>'+
      (isAdmin()?'<span class="chip" onclick="event.stopPropagation();if(confirm(\'删除项目「'+esc(p.name)+'」？\'))deleteProject(\''+p.id+'\')">删除</span>':'')+
      '<span class="chip" onclick="event.stopPropagation();openTwin(\''+p.id+'\')">孪生 ▸</span></div>';
  }).join('');
}
function twinDesc(p){
  if(p.type==='光伏') return '光伏阵列实时发电态势：组件温度、逆变器出力、并网功率与消纳进度联动呈现';
  if(p.type==='风电') return '风电机组运行态势：风速、单机出力、升压站带电与全容量并网进度';
  if(p.type==='机电工程') return '高速公路机电标段态势：设备到场、安装、联调与交工验收节点';
  if(p.type==='充电') return '充电场站群运营态势：充电桩在线率、充电量、扩容报装进度';
  return '项目实时态势孪生展示';
}
function digitalTwinSvg(p){
  var head='<svg viewBox="0 0 680 300" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block">';
  if(p.type==='光伏'){
    var s='<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0e0d0c"/><stop offset="100%" stop-color="#050403"/></linearGradient></defs>';
    s+='<rect width="680" height="300" fill="url(#sky)"/>';
    s+='<circle cx="600" cy="60" r="30" fill="#ffb020" class="twin-pulse"/>'+
       '<g stroke="#ffb020" stroke-width="2" stroke-linecap="round" class="twin-pulse">'+
       '<line x1="600" y1="14" x2="600" y2="24"/><line x1="640" y1="60" x2="650" y2="60"/><line x1="630" y1="34" x2="638" y2="26"/><line x1="630" y1="86" x2="638" y2="94"/></g>';
    var gy=210;
    for(var r=0;r<3;r++){
      var y=gy-r*46;
      for(var c=0;c<6;c++){
        var x=40+c*100;
        s+='<polygon points="'+(x)+','+(y)+' '+(x+70)+','+(y-14)+' '+(x+70)+','+(y+18)+' '+(x)+','+(y+32)+'" fill="rgba(255,140,26,.5)" stroke="#ff8c1a" stroke-width="1.5"/>';
        s+='<line x1="'+(x+35)+'" y1="'+(y-7)+'" x2="'+(x+35)+'" y2="'+(y+25)+'" stroke="rgba(255,140,26,.6)" stroke-width="1"/>';
      }
    }
    s+='<line x1="0" y1="232" x2="680" y2="232" stroke="rgba(255,160,60,.3)" stroke-width="1"/>';
    return head+s+'</svg>';
  }
  if(p.type==='风电'){
    var s='<rect width="680" height="300" fill="#050403"/>';
    var xs=[140,350,540];
    xs.forEach(function(x,idx){
      var by=250, hY=120;
      s+='<line x1="'+x+'" y1="'+by+'" x2="'+x+'" y2="'+hY+'" stroke="#c4b6a6" stroke-width="4"/>';
      s+='<g class="twin-spin" style="transform-origin:'+x+'px '+hY+'px">'+
         '<line x1="'+x+'" y1="'+hY+'" x2="'+x+'" y2="'+(hY-44)+'" stroke="#ff8c1a" stroke-width="5" stroke-linecap="round"/>'+
         '<line x1="'+x+'" y1="'+hY+'" x2="'+(x+42)+'" y2="'+(hY+16)+'" stroke="#ff8c1a" stroke-width="5" stroke-linecap="round"/>'+
         '<line x1="'+x+'" y1="'+hY+'" x2="'+(x-42)+'" y2="'+(hY+16)+'" stroke="#ff8c1a" stroke-width="5" stroke-linecap="round"/></g>';
      s+='<circle cx="'+x+'" cy="'+hY+'" r="5" fill="#fff"/>';
    });
    return head+s+'</svg>';
  }
  if(p.type==='充电'){
    var s='<rect width="680" height="300" fill="#050403"/>';
    s+='<rect x="40" y="60" width="600" height="14" rx="4" fill="rgba(255,140,26,.5)"/>';
    for(var i=0;i<4;i++){
      var x=90+i*140;
      s+='<rect x="'+x+'" y="74" width="36" height="90" rx="6" fill="rgba(255,107,53,.5)" stroke="#ff6b35" stroke-width="1.5"/>';
      s+='<rect x="'+(x+10)+'" y="120" width="16" height="10" rx="2" fill="#ff8c1a" class="twin-pulse"/>';
      s+='<rect x="'+(x+8)+'" y="170" width="20" height="40" rx="5" fill="rgba(0,214,143,.5)" stroke="#00d68f" stroke-width="1.2"/>';
    }
    s+='<line x1="0" y1="220" x2="680" y2="220" stroke="rgba(255,160,60,.3)" stroke-width="1"/>';
    return head+s+'</svg>';
  }
  /* 机电工程：高速 + 行驶车辆 */
  var s='<rect width="680" height="300" fill="#050403"/>';
  s+='<polygon points="120,300 560,300 470,150 210,150" fill="rgba(30,50,85,.7)" stroke="rgba(255,140,26,.5)" stroke-width="2"/>';
  s+='<line x1="340" y1="300" x2="340" y2="150" stroke="#ffb020" stroke-width="3" stroke-dasharray="14 12"/>';
  for(var k=0;k<3;k++){
    var y=180+k*36;
    s+='<g class="twin-drive"><rect x="240" y="'+(y-12)+'" width="46" height="20" rx="5" fill="#ff8c1a" fill-opacity=".7" stroke="#ff8c1a"/>'+
       '<rect x="250" y="'+(y-9)+'" width="10" height="8" rx="2" fill="#050403"/>'+
       '<rect x="266" y="'+(y-9)+'" width="10" height="8" rx="2" fill="#050403"/></g>';
  }
  return head+s+'</svg>';
}
function openTwin(pid){
  var p=projById(pid); if(!p) return;
  var cs=DB.contracts.filter(function(c){return c.project===pid});
  var recv=cs.filter(function(c){return c.dir==='收'}).reduce(function(a,c){return a+c.amount},0);
  var pay=cs.filter(function(c){return c.dir==='付'}).reduce(function(a,c){return a+c.amount},0);
  var nodes=DB.nodes[pid]||[];
  var late=nodes.filter(function(n){return n.status==='延期'}).length;
  var body='<div class="twin">'+digitalTwinSvg(p)+'</div>'+
    '<div class="twin-kpi">'+
      kpi('总体进度',p.progress+'%','',p.stage)+
      kpi('累计投资',fmt(p.invDone),'万','/ '+fmt(p.invTotal))+
      kpi('收入类合同',fmt(recv),'万','关联 '+cs.filter(function(c){return c.dir==='收'}).length+' 份')+
      kpi('关键节点延期',late,'个',late?'<b class="up">需关注</b>':'受控',late?'danger':'ok')+
    '</div>'+
    '<div class="dsec">数字孪生说明</div>'+
    '<div class="note">上图为「'+esc(p.name)+'」实时态势数字孪生（示意）：'+twinDesc(p)+'。点击下方按钮进入项目完整信息目录。</div>'+
    '<div class="chips">'+
      '<span class="chip" onclick="goDetailTab(\''+pid+'\',\'overview\')">进入项目信息目录 ▸</span>'+
      '<span class="chip" onclick="goDetailTab(\''+pid+'\',\'nodes\')">关键节点</span>'+
      '<span class="chip" onclick="goDetailTab(\''+pid+'\',\'contract\')">合同执行</span>'+
      '<span class="chip" onclick="goDetailTab(\''+pid+'\',\'staff\')">业务人员 · 费用</span>'+
    '</div>';
  openDrawer('数字孪生 · '+p.name, body, function(){closeDrawer();},{priText:'关闭'});
}
function goDetailTab(pid,tab){ curProject=pid; dtT=tab||'overview'; go('detail'); }

/* ==================================================================
   五、人员绩效排名（合同额 / 业务费用 效率比）
   ================================================================== */
function renderStaffPerf(){
  var el=document.getElementById('stPerf'); if(!el) return;
  var d=perfData();
  var maxEff=Math.max.apply(0,d.map(function(x){return x.eff;}))||1;
  el.innerHTML = d.map(function(x,i){
    var p=x.s;
    var e = x.eff>=9999 ? '—' : x.eff.toFixed(1);
    var bw = Math.min(x.eff/maxEff*100,100);
    var rc = i===0?'var(--cy)':i===1?'var(--bl)':i===2?'var(--pu)':'var(--txt3)';
    return '<div class="li"><div class="t"><span class="rank" style="color:'+rc+'">R'+(i+1)+'</span> '+esc(p.name)+' · '+esc(p.role)+
      '<div class="s">关联合同(收) '+fmt(x.recv)+' 万 · 业务费用 '+yuan(x.exp)+' · 效率比 '+(x.eff>=9999?'极高（费用极低）':e+' 万/万')+'</div></div>'+
      '<div style="width:170px"><div class="bar"><i style="width:'+bw.toFixed(0)+'%"></i></div></div>'+
      '<div class="mono" style="width:60px;text-align:right;color:'+rc+'">'+(i===0?'冠军':e)+'</div></div>';
  }).join('');
}
