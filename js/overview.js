/* ============================================================
   甘肃新煜科技工作台 · v5.0 全域态势展示层
   HUD 指挥条 / 模块矩阵 / 目标仪表 / 五维雷达 / 收入流向 /
   实时动态流 / 强度热力 / 各功能页关键信息摘要条
   ============================================================ */

/* ---------------- 全域快照：所有模块关键信息的唯一取数口径 ---------------- */
function SNAP(){
  var pl = plSum();
  var od = overduePlans(), ln = lateNodes(), sk = stuckRuns();
  var cash = DB.finance.cash13, minCash = Math.min.apply(0, cash), safe = DB.finance.cashSafe;
  var ctRecv = DB.contracts.filter(function(c){ return c.dir==='收' });
  var ctPay  = DB.contracts.filter(function(c){ return c.dir==='付' });
  var invTotal = DB.projects.reduce(function(a,p){ return a+p.invTotal }, 0);
  var invDone  = DB.projects.reduce(function(a,p){ return a+p.invDone }, 0);
  var yRecv = DB.finance.inv.filter(function(x){ return x.m.indexOf('2026')===0 })
                            .reduce(function(a,x){ return a+x.rc }, 0);
  var yInv  = DB.finance.inv.filter(function(x){ return x.m.indexOf('2026')===0 })
                            .reduce(function(a,x){ return a+x.iv }, 0);
  var expPend = (DB.expenses||[]).filter(function(e){ return e.status==='待审批' });
  var odAmt = od.reduce(function(a,x){ return a+x.p.amount }, 0);
  var runOpen = (DB.run||[]).filter(function(r){ return r.status!=='已办结' });
  var risk = Math.min(100, Math.round(odAmt/60 + ln.length*6 + sk.length*7 + arOverdue()/90 + (minCash<safe?18:0)));
  return {
    pl:pl, od:od, odAmt:odAmt, ln:ln, sk:sk,
    ctIn:ctInAmount(), ctOut:ctPay.reduce(function(a,c){return a+c.amount},0),
    ctRecvN:ctRecv.length, ctPayN:ctPay.length, ctAll:DB.contracts.length,
    invoiced:DB.contracts.reduce(function(a,c){return a+(c.invoiced||0)},0),
    settled:DB.contracts.reduce(function(a,c){return a+(c.settled||0)},0),
    retention:DB.contracts.reduce(function(a,c){return a+(c.retention||0)},0),
    invTotal:invTotal, invDone:invDone,
    minCash:minCash, safe:safe, cashGap:minCash-safe,
    yRecv:yRecv, yInv:yInv,
    ar:arTotal(), arOd:arOverdue(),
    bizExp:bizExpTotal(), expPend:expPend.length,
    expPendAmt:expPend.reduce(function(a,e){return a+e.amount},0),
    staffN:(DB.staff||[]).length,
    runOpen:runOpen.length, due45:duePlans(45).length,
    approvals:(DB.approvals||[]).length,
    risk:risk, health:100-risk
  };
}

/* 按业务线收入占比分摊的月度回款趋势（用于模块卡微走势） */
function lineTrend(line, field){
  var pl = DB.finance.pl, tot = pl.reduce(function(a,x){ return a+x.rev }, 0) || 1;
  var row = pl.filter(function(x){ return x.line===line })[0];
  var sh = row ? row.rev/tot : 0.25;
  return DB.finance.inv.map(function(x){ return Math.round((field==='iv'?x.iv:x.rc)*sh) });
}
/* 应收明细 → 财务口径业务线 */
function arLineOf(name){
  if(/G30|国省干线|机电/.test(name)) return '大交通机电';
  if(/充电|光伏|风电|场站/.test(name)) return '新能源项目';
  if(/车辆销售|购车|销售/.test(name)) return '新能源车销售';
  return '网约车平台';
}

/* ---------------- 数字滚动动画 ---------------- */
function animateCounts(root){
  if(typeof requestAnimationFrame!=='function') return;
  var els = (root||document).querySelectorAll('.cnt');
  Array.prototype.forEach.call(els, function(el){
    var raw = String(el.textContent||'').replace(/,/g,'');
    var to = parseFloat(raw);
    if(!isFinite(to) || Math.abs(to)<1) return;
    var dec = (raw.split('.')[1]||'').length;
    var final = to.toLocaleString('zh-CN',{minimumFractionDigits:dec,maximumFractionDigits:dec});
    var st = null, dur = 720;
    function step(ts){
      if(!st) st = ts;
      var k = Math.min(1,(ts-st)/dur), e = 1-Math.pow(1-k,3);
      el.textContent = (to*e).toLocaleString('zh-CN',{minimumFractionDigits:dec,maximumFractionDigits:dec});
      if(k<1) requestAnimationFrame(step); else el.textContent = final;
    }
    requestAnimationFrame(step);
  });
}

/* ---------------- HUD 指挥条 ---------------- */
function hudCell(k,v,unit,d,cls,onclick){
  return '<div class="hudcell '+(cls||'')+'"'+(onclick?' style="cursor:pointer" onclick="'+onclick+'"':'')+'>'+
    '<div class="k">'+esc(k)+'</div>'+
    '<div class="v"><span class="cnt">'+v+'</span>'+(unit?'<small>'+unit+'</small>':'')+'</div>'+
    '<div class="d">'+(d||'')+'</div></div>';
}
function renderHud(){
  var el = document.getElementById('dashHud'); if(!el) return;
  var S = SNAP();
  el.innerHTML =
    hudCell('在手合同额（收入类）', fmt(S.ctIn), '万元',
      '收 '+S.ctRecvN+' 份 / 付 '+S.ctPayN+' 份 · 已开票 '+fmt(S.invoiced)+' 万', 'c', "go('contract')") +
    hudCell('本年营业收入', fmt(S.pl.rev), '万元',
      '毛利率 <b class="'+(S.pl.gm>=20?'dn':'wn')+'">'+S.pl.gm.toFixed(1)+'%</b> · 净利 '+fmt(S.pl.net)+' 万', '', "go('fin')") +
    hudCell('累计完成投资', fmt(S.invDone), '万元',
      '总投资 '+fmt(S.invTotal)+' 万 · 完成 '+(S.invDone/S.invTotal*100).toFixed(1)+'%', 'c', "go('map')") +
    hudCell('应收账款余额', fmt(S.ar), '万元',
      '逾期 <b class="up">'+fmt(S.arOd)+'</b> 万元 · 占比 '+(S.arOd/S.ar*100).toFixed(0)+'%', 'r', "finTab('ar')") +
    hudCell('13 周最低资金', fmt(S.minCash), '万元',
      (S.cashGap<0 ? '<b class="up">跌破安全线 '+fmt(-S.cashGap)+' 万</b>' : '安全边际 <b class="dn">+'+fmt(S.cashGap)+'</b> 万'),
      (S.cashGap<0?'r':'g'), "finTab('cash')") +
    hudCell('综合经营风险指数', S.risk, '/ 100',
      '健康度 '+S.health+' · 卡点 '+S.sk.length+' · 延期 '+S.ln.length, (S.risk>=60?'r':S.risk>=30?'y':'g'), "go('run')");
  var stamp = document.getElementById('hudStamp');
  if(stamp) stamp.textContent = 'DATA @ '+(DB.meta&&DB.meta.updated||todayStr())+' · 4 业务线 / '+DB.projects.length+' 项目 / '+S.ctAll+' 合同 / '+S.staffN+' 业务人员';
  animateCounts(el);
}

/* ---------------- 全域模块矩阵 ---------------- */
function modCard(o){
  return '<div class="modcard" onclick="'+o.go+'">'+
    '<div class="mh"><div class="mi">'+o.icon+'</div><div class="mn">'+esc(o.name)+'</div>'+
      '<div class="sp"></div><span class="lt '+(o.lv||'')+'"></span></div>'+
    '<div class="mv">'+o.v+(o.u?'<small>'+o.u+'</small>':'')+'</div>'+
    '<div class="ms">'+(o.s||'')+'</div>'+
    '<div class="mchips">'+(o.chips||[]).map(function(c){
        return '<span class="mchip '+(c[2]||'')+'">'+esc(c[0])+' <b>'+c[1]+'</b></span>'; }).join('')+'</div>'+
    (o.viz?'<div class="msp">'+o.viz+'</div>':'')+
  '</div>';
}
function renderModMatrix(){
  var el = document.getElementById('dashMatrix'); if(!el) return;
  var S = SNAP(), B = BZ(), P = perfData();
  var ne = DB.projects.filter(function(p){ return p.line==='新能源' });
  var neTot = ne.reduce(function(a,p){ return a+p.invTotal },0);
  var neDone = ne.reduce(function(a,p){ return a+p.invDone },0);
  var avgProg = Math.round(DB.projects.reduce(function(a,p){ return a+p.progress },0)/DB.projects.length);
  var onTime = (DB.run||[]).filter(function(r){ return r.status!=='卡点' && days(r.due)<=0 }).length;
  var runRate = DB.run.length ? Math.round(onTime/DB.run.length*100) : 100;
  var top = P[0];

  el.innerHTML = [
    modCard({ icon:'☀', name:'新能源项目', lv:B.ne.stuck?'y':'g', go:"go('newenergy')",
      v:ne.length, u:'个在建 / 开发',
      s:'总投资 '+fmt(neTot)+' 万 · 完成 '+(neDone/neTot*100).toFixed(1)+'%',
      chips:[['开发管道',B.ne.pipelineMW+' MW'],['已核准',B.ne.approvedMW+' MW','g'],['手续卡点',B.ne.stuck+' 项','y']],
      viz:microSpark(lineTrend('新能源项目'),C_CY) }),

    modCard({ icon:'⛟', name:'大交通机电', lv:'r', go:"go('transport')",
      v:fmt(B.tr.engIn), u:'万元在手工程',
      s:'设备供应 '+fmt(B.tr.equipIn)+' 万 · 履约 '+B.tr.perf+'%',
      chips:[['可申报未申报',fmt(B.tr.claimable)+' 万','r'],['>120天应收',fmt(B.tr.ar120)+' 万','r'],['中标',B.tr.bidWin+'/'+B.tr.bidTotal]],
      viz:microSpark(lineTrend('大交通机电'),C_BL) }),

    modCard({ icon:'◈', name:'网约车平台', lv:B.rd.compliance>=90?(B.rd.unitGross<0?'y':'g'):'r', go:"go('ride')",
      v:fmt(B.rd.cars), u:'台在营',
      s:'日均流水 '+B.rd.dailyRev+' 万 · 单车日毛利 '+B.rd.unitGross+' 元',
      chips:[['双证合规',B.rd.compliance+'%','g'],['月流失',B.rd.churn+'%','y'],['本月净增','+'+B.rd.netAdd,'g']],
      viz:microSpark(lineTrend('网约车平台'),C_DN) }),

    modCard({ icon:'▤', name:'新能源车销售', lv:'y', go:"go('sales')",
      v:fmt(B.sl.unitsYTD), u:'台本年销量',
      s:'销售收入 '+fmt(B.sl.rev)+' 万 · 单车毛利 '+B.sl.unitGross+' 万',
      chips:[['同比',B.sl.yoy+'%','r'],['毛利率',B.sl.grossRate+'%','y'],['司机池成交',B.rd.poolDeal+' 台','g']],
      viz:microSpark(lineTrend('新能源车销售'),C_WN) }),

    modCard({ icon:'✎', name:'合同管理', lv:S.od.length?'r':'g', go:"go('contract')",
      v:fmt(S.ctIn), u:'万元在手（收）',
      s:'共 '+S.ctAll+' 份 · 已结算 '+fmt(S.settled)+' 万',
      chips:[['逾期收付款',S.od.length+' 笔','r'],['45 天内到期',S.due45+' 笔','y'],['质保金',fmt(S.retention)+' 万']],
      viz:microSpark(DB.finance.inv.map(function(x){return x.iv}),C_PU) }),

    modCard({ icon:'¥', name:'业务财务', lv:S.cashGap<0?'r':'y', go:"go('fin')",
      v:fmt(S.pl.rev), u:'万元本年营收',
      s:'净利 '+fmt(S.pl.net)+' 万 · 毛利率 '+S.pl.gm.toFixed(1)+'%',
      chips:[['应收',fmt(S.ar)+' 万'],['逾期应收',fmt(S.arOd)+' 万','r'],['业务费用',S.bizExp.toFixed(1)+' 万','y']],
      viz:microSpark(DB.finance.inv.map(function(x){return x.rc}),C_DN) }),

    modCard({ icon:'➤', name:'跑动作战台', lv:S.sk.length?'r':'y', go:"go('run')",
      v:S.runOpen, u:'项在办事项',
      s:'卡点 '+S.sk.length+' 项 · 关键节点延期 '+S.ln.length+' 个',
      chips:[['需升级',S.sk.length+' 项','r'],['按期率',runRate+'%',runRate>=70?'g':'y'],['涉及项目',DB.projects.length+' 个']],
      viz:'<div style="margin-top:9px">'+bar(runRate,runRate>=70?'g':runRate>=40?'y':'r')+'</div>' }),

    modCard({ icon:'⚑', name:'业务人员', lv:S.expPend?'y':'g', go:"go('staff')",
      v:S.staffN, u:'名业务人员',
      s:'业务费用 '+S.bizExp.toFixed(2)+' 万 · 待审批 '+S.expPend+' 笔',
      chips:[['效能榜首',top?esc(top.s.name):'—','g'],['待审批金额',fmt(S.expPendAmt)+' 元','y'],
             ['人均合同额',fmt(Math.round(S.ctIn/Math.max(S.staffN,1)))+' 万']],
      viz:'<div style="margin-top:9px">'+bar(Math.min(100,Math.round((1-S.expPend/Math.max((DB.expenses||[]).length,1))*100)),'g')+'</div>' }),

    modCard({ icon:'⊕', name:'项目地图 · 数字孪生', lv:'g', go:"go('map')",
      v:DB.projects.filter(function(p){return p.geo}).length, u:'个项目点位',
      s:'覆盖 张掖 / 酒泉 / 兰州 / G30 沿线',
      chips:[['光伏','1 个'],['风电','1 个'],['充电','1 个'],['机电','1 个']],
      viz:'<div style="margin-top:9px">'+bar(100,'g')+'</div>' }),

    modCard({ icon:'◎', name:'项目中心', lv:avgProg>=60?'g':'y', go:"goDetail('"+DB.projects[0].id+"')",
      v:DB.projects.length, u:'个在管项目',
      s:'平均进度 '+avgProg+'% · 总投资 '+fmt(S.invTotal)+' 万',
      chips:DB.projects.slice(0,3).map(function(p){ return [p.name.slice(0,6), p.progress+'%', p.progress>=70?'g':p.progress>=40?'y':'r']; }),
      viz:'<div style="margin-top:9px">'+bar(avgProg,avgProg>=60?'g':'y')+'</div>' })
  ].join('');
}

/* ---------------- 年度目标达成仪表 ---------------- */
function renderGauges(){
  var el = document.getElementById('dashGauge'); if(!el) return;
  var T = TGT(), S = SNAP(), B = BZ();
  var g = [
    [S.pl.rev/T.rev*100,   '营业收入达成', fmt(S.pl.rev)+' / '+fmt(T.rev)+' 万',  C_CY],
    [S.yRecv/T.recv*100,   '本年回款达成', fmt(S.yRecv)+' / '+fmt(T.recv)+' 万',  C_BL],
    [S.pl.net/T.net*100,   '净利润达成',   fmt(S.pl.net)+' / '+fmt(T.net)+' 万',  S.pl.net>=T.net?C_DN:C_WN],
    [B.ne.pipelineMW/T.mw*100,'开发管道达成', B.ne.pipelineMW+' / '+T.mw+' MW',   C_PU]
  ];
  el.innerHTML = g.map(function(x){ return '<div class="gaugecell">'+gauge(x[0],x[1],x[2],x[3])+'</div>'; }).join('');
}

/* ---------------- 五维雷达：业务线综合体检 ---------------- */
function renderRadarCard(){
  var el = document.getElementById('dashRadar'); if(!el) return;
  var pl = DB.finance.pl;
  var maxRev = Math.max.apply(0, pl.map(function(x){ return x.rev }));
  var arBy = {};
  DB.finance.ar.forEach(function(x){ var L=arLineOf(x.project); arBy[L]=(arBy[L]||0)+x.amount; });
  var riskBy = {};
  DB.projects.forEach(function(p){
    var L = p.line==='新能源'?'新能源项目':(p.line==='大交通'?'大交通机电':p.line);
    riskBy[L] = (riskBy[L]||0) + (p.risk||[]).length;
  });
  var COL = [C_CY, C_BL, C_DN, C_WN];
  var B = BZ();
  var series = pl.map(function(r,i){
    var net  = r.rev - r.cost - r.exp - bizExpByLine(r.line);
    var scale  = Math.round(r.rev/maxRev*100);
    var profit = Math.max(4, Math.min(100, Math.round(net/r.rev*100*5)));
    var recv   = Math.max(4, Math.min(100, Math.round(100 - (arBy[r.line]||0)/r.rev*100*3)));
    var comp   = r.line==='网约车平台' ? Math.round(B.rd.compliance)
               : Math.max(30, 100 - (riskBy[r.line]||0)*14);
    var grow   = Math.max(4, Math.min(100, Math.round((r.yoy+10)*2.5)));
    return { name:r.line, color:COL[i%4], vals:[scale,profit,recv,comp,grow] };
  });
  el.innerHTML = radar(['经营规模','盈利能力','回款质量','合规健康','成长动能'], series);
}

/* ---------------- 收入结构流向 ---------------- */
function renderSankeyCard(){
  var el = document.getElementById('dashSankey'); if(!el) return;
  var COL = [C_CY, C_BL, C_DN, C_WN];
  el.innerHTML = sankey(DB.finance.pl.map(function(r,i){ return [r.line, r.rev, COL[i%4]]; }));
}

/* ---------------- 全域实时动态流 ---------------- */
function buildStream(){
  var out = [];
  (DB.run||[]).forEach(function(r){
    var od = days(r.due);
    out.push({ d:r.created, lv:(r.status==='卡点'?'r':(od>0?'y':'c')),
      a:'【跑动】'+r.matter, b:projName(r.project)+' · '+r.where+' · '+r.owner,
      r:r.status, act:"go('run')" });
  });
  (DB.approvals||[]).forEach(function(a){
    var dd = days(todayStr(), a.due);
    out.push({ d:a.due, lv:(dd<0?'r':(dd<=2?'y':'c')),
      a:'【审批】'+a.title, b:a.type+' · '+a.applicant+' · 限办 '+a.due,
      r:(a.amount==='—'?'—':fmt(a.amount)+' 万'), act:"openApproval('"+a.id+"')" });
  });
  DB.contracts.forEach(function(c){
    (c.plans||[]).forEach(function(p){
      if(p.actual){
        out.push({ d:p.actual, lv:'g', a:'【'+(c.dir==='收'?'回款到账':'付款完成')+'】'+p.name,
          b:c.name+' · '+c.party, r:(c.dir==='收'?'+':'-')+fmt(p.amount)+' 万',
          act:"openContractView('"+c.id+"')" });
      } else if(p.status==='逾期'){
        out.push({ d:p.planDate, lv:'r', a:'【逾期】'+p.name, b:c.name+' · 计划 '+p.planDate,
          r:fmt(p.amount)+' 万', act:"openContractView('"+c.id+"')" });
      }
    });
  });
  (DB.expenses||[]).forEach(function(e){
    out.push({ d:e.date, lv:(e.status==='待审批'?'y':'c'),
      a:'【费用】'+e.type+' · '+staffName(e.staffId),
      b:(e.projectId?projName(e.projectId):'非项目')+' · '+e.note,
      r:fmt(e.amount)+' 元', act:"go('staff')" });
  });
  out.sort(function(a,b){ return a.d<b.d?1:(a.d>b.d?-1:0) });
  return out;
}
function renderStream(){
  var el = document.getElementById('dashStream'); if(!el) return;
  var L = buildStream().slice(0,18);
  el.innerHTML = L.length ? L.map(function(x,i){
    return '<div class="stm '+x.lv+'" style="animation-delay:'+(i*26)+'ms" onclick="'+x.act+'">'+
      '<div class="tm">'+esc(String(x.d).slice(5))+'</div>'+
      '<div class="bd"><div class="a">'+esc(x.a)+'</div><div class="b">'+esc(x.b)+'</div></div>'+
      '<div class="rt">'+x.r+'</div></div>';
  }).join('') : '<div class="note">暂无动态。</div>';
}

/* ---------------- 开票 / 回款 强度热力 ---------------- */
function renderHeat(){
  var a = document.getElementById('dashHeat'), b = document.getElementById('dashHeat2');
  var lb = DB.finance.inv.map(function(x){ return x.m.slice(2) });
  if(a) a.innerHTML = heatStrip(DB.finance.inv.map(function(x){ return x.iv }), lb, C_CY);
  if(b) b.innerHTML = heatStrip(DB.finance.inv.map(function(x){ return x.rc }), lb, C_DN);
}

/* ---------------- 各功能页关键信息摘要条 ---------------- */
function dgHTML(items){
  return items.map(function(it){
    return '<div class="dg '+(it[3]||'')+'"><div class="k">'+esc(it[0])+'</div>'+
      '<div class="v"><span class="cnt">'+it[1]+'</span>'+(it[2]?'<small>'+it[2]+'</small>':'')+'</div></div>';
  }).join('');
}
function renderDigest(page){
  var el = document.getElementById('dg-'+page); if(!el) return;
  var S = SNAP(), B = BZ(), items = [];
  if(page==='newenergy'){
    var ne = DB.projects.filter(function(p){ return p.line==='新能源' });
    var t = ne.reduce(function(a,p){return a+p.invTotal},0), d = ne.reduce(function(a,p){return a+p.invDone},0);
    items = [['在建 / 开发项目',ne.length,'个','c'],['总投资',fmt(t),'万元'],
      ['累计完成',fmt(d),'万元','g'],['投资完成率',(d/t*100).toFixed(1),'%','c'],
      ['开发管道',B.ne.pipelineMW,'MW'],['前期手续卡点',B.ne.stuck,'项','r']];
  } else if(page==='transport'){
    items = [['在手工程合同',fmt(B.tr.engIn),'万元','c'],['设备供应在手',fmt(B.tr.equipIn),'万元'],
      ['可申报未申报',fmt(B.tr.claimable),'万元','r'],['>120 天应收',fmt(B.tr.ar120),'万元','r'],
      ['履约进度',B.tr.perf,'%','y'],['中标率',(B.tr.bidWin/B.tr.bidTotal*100).toFixed(0),'%']];
  } else if(page==='ride'){
    items = [['在营车辆',fmt(B.rd.cars),'台','c'],['日均流水',B.rd.dailyRev,'万元','g'],
      ['双证合规率',B.rd.compliance,'%','g'],['司机月流失',B.rd.churn,'%','y'],
      ['单车日毛利',B.rd.unitGross,'元','r'],['购车协同池',B.rd.poolIn,'人']];
  } else if(page==='sales'){
    items = [['本年销量',fmt(B.sl.unitsYTD),'台','c'],['销售收入',fmt(B.sl.rev),'万元'],
      ['单车毛利',B.sl.unitGross,'万元','y'],['毛利率',B.sl.grossRate,'%','y'],
      ['库存资金占用',fmt(B.sl.stockCapital),'万元','r'],['司机池成交',B.rd.poolDeal,'台','g']];
  } else if(page==='contract'){
    items = [['合同总数',S.ctAll,'份','c'],['在手（收入类）',fmt(S.ctIn),'万元','c'],
      ['已开票',fmt(S.invoiced),'万元'],['已结算',fmt(S.settled),'万元','g'],
      ['逾期收付款',S.od.length,'笔','r'],['45 天内到期',S.due45,'笔','y']];
  } else if(page==='fin'){
    items = [['本年营收',fmt(S.pl.rev),'万元','c'],['净利润',fmt(S.pl.net),'万元',S.pl.net>0?'g':'r'],
      ['毛利率',S.pl.gm.toFixed(1),'%','y'],['应收余额',fmt(S.ar),'万元'],
      ['逾期应收',fmt(S.arOd),'万元','r'],['13 周最低资金',fmt(S.minCash),'万元',S.cashGap<0?'r':'g']];
  } else if(page==='run'){
    var wk = (DB.run||[]).filter(function(r){ var dd=days(todayStr(),r.due); return dd>=0&&dd<=7 }).length;
    var avgStay = DB.run.length ? Math.round(DB.run.reduce(function(a,r){return a+days(r.created)},0)/DB.run.length) : 0;
    items = [['在办事项',S.runOpen,'项','c'],['卡点',S.sk.length,'项','r'],
      ['节点延期',S.ln.length,'个','r'],['7 天内到期',wk,'项','y'],
      ['平均滞留',avgStay,'天','y'],['待我审批',S.approvals,'项']];
  } else if(page==='staff'){
    var P = perfData(), top = P[0];
    items = [['业务人员',S.staffN,'人','c'],['在职',(DB.staff||[]).filter(function(s){return s.status==='在职'}).length,'人','g'],
      ['业务费用累计',fmt(S.bizExp,2),'万元','y'],['待审批费用',S.expPend,'笔','y'],
      ['人均在手合同',fmt(Math.round(S.ctIn/Math.max(S.staffN,1))),'万元'],
      ['效能榜首',top?esc(top.s.name):'—','','g']];
  } else if(page==='map'){
    items = [['项目点位',DB.projects.filter(function(p){return p.geo}).length,'个','c'],
      ['覆盖地市','4','个'],['总投资',fmt(S.invTotal),'万元'],
      ['在建',DB.projects.filter(function(p){return p.progress<100}).length,'个','y'],
      ['已运营',DB.projects.filter(function(p){return p.progress>=100}).length,'个','g'],
      ['孪生场景','4','类','c']];
  } else if(page==='detail'){
    var p = projById(curProject);
    var cts = DB.contracts.filter(function(c){ return c.project===p.id });
    var lateN = S.ln.filter(function(x){ return x.pid===p.id }).length;
    var ex = projExpenses(p.id).reduce(function(a,e){ return a+e.amount },0);
    items = [['项目进度',p.progress,'%',p.progress>=70?'g':p.progress>=40?'y':'r'],
      ['总投资',fmt(p.invTotal),'万元'],['已完成投资',fmt(p.invDone),'万元','g'],
      ['关联合同',cts.length,'份','c'],['节点延期',lateN,'个',lateN?'r':'g'],
      ['业务费用',fmt(ex),'元','y']];
  }
  el.innerHTML = dgHTML(items);
  animateCounts(el);
}

/* ---------------- 驾驶舱 v5 增强渲染入口 ---------------- */
function renderDashV5(){
  renderHud();
  renderModMatrix();
  renderGauges();
  renderRadarCard();
  renderSankeyCard();
  renderStream();
  renderHeat();
}
