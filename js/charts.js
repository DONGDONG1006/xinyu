/* ============================================================
   甘肃新煜科技工作台 · 轻量 SVG 图表引擎（无外部依赖）
   科技风：渐变填充 + 辉光 + 虚线网格
   ============================================================ */
var C_CY='#ff8c1a', C_BL='#ffb347', C_PU='#ff6b35', C_UP='#ff3b30', C_DN='#ff6b35', C_WN='#ffd98a', C_OK='#19c37d';
var _gid=0;

function svgWrap(inner,h,defs){
  h=h||150;
  return '<svg viewBox="0 0 680 '+h+'" preserveAspectRatio="none" style="height:'+h+'px">'+(defs||'')+inner+'</svg>';
}
function gradDef(id,c1,c2,vertical){
  return '<linearGradient id="'+id+'" x1="0" y1="0" x2="'+(vertical?0:1)+'" y2="'+(vertical?1:0)+'">'+
    '<stop offset="0%" stop-color="'+c1+'"/><stop offset="100%" stop-color="'+c2+'"/></linearGradient>';
}
function glowDef(id,c){
  return '<filter id="'+id+'" x="-50%" y="-50%" width="200%" height="200%">'+
    '<feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
}
function gridLines(h,rows,w,pad){
  w=w||680;pad=pad||10;var s='';
  for(var i=0;i<=rows;i++){
    var y=pad+(h-pad-22)*i/rows;
    s+='<line x1="'+pad+'" y1="'+y.toFixed(1)+'" x2="'+(w-pad)+'" y2="'+y.toFixed(1)+'" stroke="rgba(255,160,60,.10)" stroke-dasharray="3 5" stroke-width="1"/>';
  }
  return s;
}
function txt(x,y,s,col,size,anchor){
  return '<text x="'+x+'" y="'+y+'" font-size="'+(size||10.5)+'" fill="'+(col||'var(--ct3)')+'" text-anchor="'+(anchor||'middle')+'" font-family="ui-monospace,Menlo,monospace">'+s+'</text>';
}

/* 迷你折线 */
function spark(arr,col){
  col=col||C_CY;var id='sp'+(++_gid);
  var mx=Math.max.apply(0,arr),mn=Math.min.apply(0,arr),n=arr.length,w=680,h=56,p=6;
  var pts=arr.map(function(v,i){var x=p+i*(w-2*p)/(n-1);var y=h-p-(v-mn)/(mx-mn||1)*(h-2*p);return x.toFixed(1)+','+y.toFixed(1)}).join(' ');
  var defs='<defs>'+gradDef(id,col,'transparent',true)+'</defs>';
  return svgWrap('<polygon points="'+p+','+(h-p)+' '+pts+' '+(w-p)+','+(h-p)+'" fill="url(#'+id+')" opacity=".22"/>'+
    '<polyline points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linejoin="round"/>',56,defs);
}

/* 柱状图 */
function bars(arr,labels,col,unit){
  col=col||C_CY;var id='bg'+(++_gid);
  var n=arr.length,w=680,h=160,p=12,gap=(w-2*p)/n,bw=Math.min(gap*0.56,46);
  var mx=Math.max.apply(0,arr)||1;
  var defs='<defs>'+gradDef(id,col,col+'22',true)+'</defs>';
  var s=gridLines(h,4);
  for(var i=0;i<n;i++){
    var bh=Math.max(arr[i]/mx*(h-46),2);var x=p+i*gap+(gap-bw)/2;var y=h-24-bh;
    s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="4" fill="url(#'+id+')" stroke="'+col+'" stroke-opacity=".5"><title>'+labels[i]+': '+arr[i]+(unit||'')+'</title></rect>';
    s+=txt(x+bw/2,y-5,arr[i],'var(--ct2)',10);
    s+=txt(x+bw/2,h-7,labels[i],'var(--ct3)',10.5);
  }
  return svgWrap(s,160,defs);
}

/* 横向条（排行） */
function hbars(items,col){
  col=col||C_CY;var n=items.length,w=680,h=Math.max(n*30+16,80),p=8,lw=150;
  var mx=Math.max.apply(0,items.map(function(x){return x[1]}))||1;var s='';
  for(var i=0;i<n;i++){
    var y=p+i*30, bw=(items[i][1]/mx)*(w-lw-90);
    var c=items[i][2]||col;
    s+=txt(lw-8,y+16,items[i][0],'var(--ct2)',11.5,'end');
    s+='<rect x="'+lw+'" y="'+(y+5)+'" width="'+Math.max(bw,2).toFixed(1)+'" height="15" rx="4" fill="'+c+'" fill-opacity=".55" stroke="'+c+'" stroke-opacity=".7"/>';
    s+=txt(lw+bw+8,y+16,items[i][1],'var(--ct)',11,'start');
  }
  return svgWrap(s,h);
}

/* 面积图 */
function area(arr,labels,col,mx){
  col=col||C_CY;var id='ar'+(++_gid),gl='gl'+_gid;
  var w=680,h=160,p=12,n=arr.length;mx=mx||Math.max.apply(0,arr)*1.15;
  var pts=arr.map(function(v,i){return (p+i*(w-2*p)/(n-1)).toFixed(1)+','+(h-24-(v/mx)*(h-46)).toFixed(1)}).join(' ');
  var defs='<defs>'+gradDef(id,col,'rgba(0,0,0,0)',true)+glowDef(gl,col)+'</defs>';
  var s=gridLines(h,4);
  s+='<polygon points="'+p+','+(h-24)+' '+pts+' '+(w-p)+','+(h-24)+'" fill="url(#'+id+')" opacity=".3"/>';
  s+='<polyline points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="2.2" filter="url(#'+gl+')"/>';
  arr.forEach(function(v,i){
    var x=p+i*(w-2*p)/(n-1), y=h-24-(v/mx)*(h-46);
    s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.6" fill="#000000" stroke="'+col+'" stroke-width="1.6"><title>'+(labels?labels[i]:'')+': '+v+'</title></circle>';
    if(labels&&(i%2===0||n<=8)) s+=txt(x,h-7,labels[i],'var(--ct3)',9.5);
  });
  return svgWrap(s,160,defs);
}

/* 双系列柱 + 折线（开票 vs 回款） */
function dualBars(a,b,labels,c1,c2){
  c1=c1||C_BL;c2=c2||C_CY;var id1='d1'+(++_gid),id2='d2'+_gid;
  var n=a.length,w=680,h=170,p=12,gap=(w-2*p)/n,bw=Math.min(gap*0.30,15);
  var mx=Math.max(Math.max.apply(0,a),Math.max.apply(0,b))*1.15||1;
  var defs='<defs>'+gradDef(id1,c1,c1+'22',true)+gradDef(id2,c2,c2+'22',true)+'</defs>';
  var s=gridLines(h,4);
  for(var i=0;i<n;i++){
    var x=p+i*gap+gap/2;
    var h1=a[i]/mx*(h-48),h2=b[i]/mx*(h-48);
    s+='<rect x="'+(x-bw-1.5).toFixed(1)+'" y="'+(h-26-h1).toFixed(1)+'" width="'+bw+'" height="'+h1.toFixed(1)+'" rx="3" fill="url(#'+id1+')" stroke="'+c1+'" stroke-opacity=".45"><title>开票 '+a[i]+'</title></rect>';
    s+='<rect x="'+(x+1.5).toFixed(1)+'" y="'+(h-26-h2).toFixed(1)+'" width="'+bw+'" height="'+h2.toFixed(1)+'" rx="3" fill="url(#'+id2+')" stroke="'+c2+'" stroke-opacity=".45"><title>回款 '+b[i]+'</title></rect>';
    if(i%2===0) s+=txt(x,h-8,labels[i],'var(--ct3)',9.5);
  }
  return svgWrap(s,170,defs);
}

/* 资金曲线 + 安全线 */
function cashLine(arr,target,labels){
  var id='cl'+(++_gid),gl='clg'+_gid;
  var w=680,h=170,p=12,n=arr.length,mx=Math.max(Math.max.apply(0,arr),target)*1.28;
  var pts=arr.map(function(v,i){return (p+i*(w-2*p)/(n-1)).toFixed(1)+','+(h-26-(v/mx)*(h-50)).toFixed(1)}).join(' ');
  var ty=h-26-(target/mx)*(h-50);
  var defs='<defs>'+gradDef(id,C_CY,'rgba(0,0,0,0)',true)+glowDef(gl,C_CY)+'</defs>';
  var s=gridLines(h,4);
  s+='<polygon points="'+p+','+(h-26)+' '+pts+' '+(w-p)+','+(h-26)+'" fill="url(#'+id+')" opacity=".26"/>';
  s+='<line x1="'+p+'" y1="'+ty.toFixed(1)+'" x2="'+(w-p)+'" y2="'+ty.toFixed(1)+'" stroke="'+C_UP+'" stroke-dasharray="6 5" stroke-width="1.4"/>';
  s+=txt(w-p-4,ty-6,'安全线 '+target+' 万',C_UP,10,'end');
  s+='<polyline points="'+pts+'" fill="none" stroke="'+C_CY+'" stroke-width="2.2" filter="url(#'+gl+')"/>';
  arr.forEach(function(v,i){
    var x=p+i*(w-2*p)/(n-1),y=h-26-(v/mx)*(h-50);
    var low=v<target;
    s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(low?4:2.6)+'" fill="'+(low?C_UP:'#000000')+'" stroke="'+(low?C_UP:C_CY)+'" stroke-width="1.6"><title>'+(labels?labels[i]:'W'+(i+1))+': '+v+' 万</title></circle>';
    if(i%2===0) s+=txt(x,h-8,labels?labels[i]:'W'+(i+1),'var(--ct3)',9.5);
  });
  return svgWrap(s,170,defs);
}

/* 漏斗 */
function funnel(items){
  var w=680,n=items.length,h=n*40+14,p=10;
  var mx=items[0][1]||1;var s='';
  for(var i=0;i<n;i++){
    var bw=(items[i][1]/mx)*(w-260);var y=p+i*40;
    var op=(0.85-i*0.11).toFixed(2);
    s+=txt(150,y+22,items[i][0],'var(--ct2)',12,'end');
    s+='<rect x="162" y="'+(y+7)+'" width="'+Math.max(bw,3).toFixed(1)+'" height="24" rx="5" fill="'+C_CY+'" fill-opacity="'+op+'" stroke="'+C_CY+'" stroke-opacity=".6"/>';
    s+=txt(162+bw+10,y+23,items[i][1]+(items[i][2]?' · '+items[i][2]:''),'var(--ct)',11.5,'start');
  }
  return svgWrap(s,h);
}

/* 环形进度 */
function donut(pct,label,col,sub){
  col=col||C_CY;var id='dn'+(++_gid);
  var w=680,h=170,cx=340,cy=82,r=54,C=2*Math.PI*r;
  var off=C*(1-pct/100);
  var defs='<defs>'+gradDef(id,col,C_PU)+'</defs>';
  var s='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="rgba(255,160,60,.13)" stroke-width="13"/>';
  s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="url(#'+id+')" stroke-width="13" stroke-linecap="round" '+
     'stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" transform="rotate(-90 '+cx+' '+cy+')"/>';
  s+='<text x="'+cx+'" y="'+(cy+6)+'" font-size="28" fill="var(--ct)" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700">'+pct+'%</text>';
  s+=txt(cx,cy+26,label||'','var(--ct2)',11.5);
  if(sub) s+=txt(cx,h-14,sub,'var(--ct3)',11);
  return svgWrap(s,170,defs);
}

/* 堆叠条（损益结构） */
function stackRow(items){
  /* items: [name, 收入, 成本, 费用] */
  var w=680,n=items.length,h=n*38+16;var mx=0;
  items.forEach(function(x){ mx=Math.max(mx,x[1]) });
  var s='';
  for(var i=0;i<n;i++){
    var y=12+i*38, base=150, tw=w-base-92;
    var rev=items[i][1],cost=items[i][2],exp=items[i][3];
    var wc=cost/mx*tw, we=exp/mx*tw, wg=Math.max((rev-cost-exp),0)/mx*tw;
    s+=txt(base-10,y+18,items[i][0],'var(--ct2)',12,'end');
    s+='<rect x="'+base+'" y="'+(y+4)+'" width="'+wc.toFixed(1)+'" height="18" rx="3" fill="'+C_BL+'" fill-opacity=".55"><title>成本 '+cost+'</title></rect>';
    s+='<rect x="'+(base+wc).toFixed(1)+'" y="'+(y+4)+'" width="'+we.toFixed(1)+'" height="18" fill="'+C_PU+'" fill-opacity=".55"><title>费用 '+exp+'</title></rect>';
    s+='<rect x="'+(base+wc+we).toFixed(1)+'" y="'+(y+4)+'" width="'+wg.toFixed(1)+'" height="18" rx="3" fill="'+C_OK+'" fill-opacity=".6"><title>净利 '+(rev-cost-exp).toFixed(0)+'</title></rect>';
    s+=txt(base+tw+10,y+18,rev+' 万','var(--ct)',11,'start');
  }
  return svgWrap(s,h);
}

/* 甘特（关键节点时间条） */
function gantt(items){
  /* items:[name, startPct, widthPct, status] */
  var w=680,n=items.length,h=n*32+30,base=170,tw=w-base-22;
  var s='';
  for(var g=0;g<=4;g++){
    var x=base+tw*g/4;
    s+='<line x1="'+x.toFixed(1)+'" y1="14" x2="'+x.toFixed(1)+'" y2="'+(h-18)+'" stroke="rgba(255,160,60,.10)" stroke-dasharray="3 5"/>';
  }
  for(var i=0;i<n;i++){
    var y=16+i*32;
    var col=items[i][3]==='已完成'?C_OK:items[i][3]==='延期'?C_UP:items[i][3]==='进行中'?C_CY:'#6b6258';
    var x=base+tw*items[i][1]/100, bw=Math.max(tw*items[i][2]/100,8);
    s+=txt(base-10,y+16,items[i][0].length>13?items[i][0].slice(0,13)+'…':items[i][0],'var(--ct2)',11.5,'end');
    s+='<rect x="'+x.toFixed(1)+'" y="'+(y+5)+'" width="'+bw.toFixed(1)+'" height="15" rx="4" fill="'+col+'" fill-opacity=".5" stroke="'+col+'" stroke-opacity=".8"><title>'+items[i][0]+' · '+items[i][3]+'</title></rect>';
  }
  return svgWrap(s,h);
}

/* ============================================================
   合规中国地图（自绘 SVG · 含台湾/海南/南海诸岛九段线 · 无外部瓦片/密钥）
   ============================================================ */
function chinaXY(lng,lat){
  var W=1000,H=760,lon0=73,lon1=135,lat0=16,lat1=54;
  return [ (lng-lon0)/(lon1-lon0)*W, (lat1-lat)/(lat1-lat0)*H ];
}
/* 中国陆地边界（顺时针，lon/lat 近似，用于示意性科技地图） */
var CHINA_BORDER=[
  [122.5,53.5],[125,53.3],[127,50.5],[130,48.5],[134,48],[131,45.2],[130.5,42.8],[128,42],[126,41.5],
  [124,40.2],[122.5,40.8],[121.5,39],[122.2,37.4],[121,36.8],[120.3,34.5],[121.8,31.2],[121.5,28.5],
  [120.2,26.5],[119.5,25],[117.5,23.8],[115.5,22.5],[113.5,22],[112,21.5],[110,21.2],[108.5,21.5],
  [106.7,22],[105.3,22.8],[103.3,22.5],[101.7,22.4],[99.8,22.5],[98,23.5],[97.5,25],[98.7,27.5],
  [98.3,28.5],[97.5,29],[96,29.8],[92.5,28.3],[88,28],[85,28.3],[81,30],[79,32],[78.5,34],[75.5,35],
  [74,37],[73.5,39],[75,40],[80,42],[82,45],[85,47],[87,49],[90,48],[91,45.5],[96,43.5],[100,42.6],
  [105,42],[110,41.5],[113,42.5],[115,43.5],[119,45],[121,47],[122.5,50],[124,52],[126,53]
];
var TAIWAN=[[121.0,25.3],[121.9,25.0],[121.7,24.0],[120.9,22.6],[120.2,23.0],[120.6,24.0],[120.8,25.0]];
var HAINAN=[[109.0,20.1],[110.6,20.0],[111.0,19.2],[110.2,18.3],[108.8,19.0],[108.6,19.8]];
function polyPath(arr){
  return 'M'+arr.map(function(p){var xy=chinaXY(p[0],p[1]); return xy[0].toFixed(1)+' '+xy[1].toFixed(1);}).join(' L ')+' Z';
}
function scsInset(){
  var x0=802,y0=600,w=176,h=150;
  var s='<rect x="'+x0+'" y="'+y0+'" width="'+w+'" height="'+h+'" rx="6" fill="rgba(10,20,40,.5)" stroke="rgba(255,160,60,.3)" stroke-dasharray="4 3"/>';
  s+=txt(x0+w/2,y0+16,'南海诸岛','rgba(159,176,207,.85)',11);
  var dashes=[[x0+20,y0+42],[x0+45,y0+57],[x0+62,y0+77],[x0+82,y0+94],[x0+104,y0+72],[x0+120,y0+97],[x0+138,y0+114],[x0+152,y0+97],[x0+160,y0+122]];
  dashes.forEach(function(d){ s+='<line x1="'+(d[0]-5)+'" y1="'+d[1]+'" x2="'+(d[0]+5)+'" y2="'+(d[1]-4)+'" stroke="#ffb020" stroke-width="2" stroke-linecap="round"/>'; });
  [[x0+70,y0+120],[x0+110,y0+130],[x0+150,y0+134]].forEach(function(d){ s+='<circle cx="'+d[0]+'" cy="'+d[1]+'" r="2" fill="#ff8c1a"/>'; });
  return s;
}
function renderChinaMap(projects){
  var defs='<defs>'+gradDef('mapg','#ff8c1a','#ff6b35')+'</defs>';
  var s='';
  for(var gx=0;gx<=1000;gx+=50) s+='<line x1="'+gx+'" y1="0" x2="'+gx+'" y2="760" stroke="rgba(255,160,60,.05)" stroke-width="1"/>';
  for(var gy=0;gy<=760;gy+=50) s+='<line x1="0" y1="'+gy+'" x2="1000" y2="'+gy+'" stroke="rgba(255,160,60,.05)" stroke-width="1"/>';
  /* 甘肃聚焦区 */
  var gz=[[92.5,43],[109,43],[109,32.5],[103,32.5],[96,34],[92.5,36]];
  s+='<path d="'+polyPath(gz)+'" fill="rgba(255,140,26,.07)" stroke="rgba(255,140,26,.4)" stroke-width="1.5" stroke-dasharray="6 4"/>';
  s+=txt(470,238,'甘肃 · 项目聚焦区','rgba(255,140,26,.78)',12.5);
  /* 陆地 + 海南 + 台湾（同属中国领土，同色同描边） */
  s+='<path d="'+polyPath(CHINA_BORDER)+'" fill="rgba(18,38,72,.62)" stroke="url(#mapg)" stroke-width="2.2" stroke-linejoin="round"/>';
  s+='<path d="'+polyPath(HAINAN)+'" fill="rgba(18,38,72,.62)" stroke="rgba(255,160,60,.45)" stroke-width="1.2"/>';
  s+='<path d="'+polyPath(TAIWAN)+'" fill="rgba(18,38,72,.62)" stroke="rgba(255,160,60,.45)" stroke-width="1.2"/>';
  s+=txt(chinaXY(121,23.7)[0],chinaXY(121,23.7)[1]+24,'台湾','rgba(159,176,207,.9)',10);
  s+=scsInset();
  /* 项目标注（点击 → 数字孪生） */
  (projects||[]).forEach(function(p){
    if(!p.geo) return;
    var xy=chinaXY(p.geo.lng,p.geo.lat);
    s+='<g style="cursor:pointer" onclick="openTwin(\''+p.id+'\')">'+
       '<circle cx="'+xy[0].toFixed(1)+'" cy="'+xy[1].toFixed(1)+'" r="15" fill="none" stroke="#ff8c1a" stroke-width="2" class="mkring"/>'+
       '<circle cx="'+xy[0].toFixed(1)+'" cy="'+xy[1].toFixed(1)+'" r="6" fill="#ff8c1a"/>'+
       '<circle cx="'+xy[0].toFixed(1)+'" cy="'+xy[1].toFixed(1)+'" r="2.6" fill="#fff"/>'+
       '<text x="'+(xy[0]+16).toFixed(1)+'" y="'+(xy[1]+4).toFixed(1)+'" fill="var(--ct)" font-size="12" font-family="ui-monospace,Menlo,monospace">'+esc(p.name)+'</text></g>';
  });
  return '<svg viewBox="0 0 1000 760" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block">'+defs+s+'</svg>';
}

/* ============================================================
   v5.0 科技化可视组件：等比 SVG / 雷达 / HUD 仪表 / 微走势 / 收入流向 / 热力条
   ============================================================ */
function svgFit(inner,w,h,defs){
  return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet" style="width:100%;height:'+h+'px;display:block">'+(defs||'')+inner+'</svg>';
}

/* 多维雷达（四业务线综合体检） */
function radar(axes,series){
  var w=680,h=300,cx=340,cy=148,R=100,n=axes.length;
  function pt(i,r){ var a=-Math.PI/2+i*2*Math.PI/n; return [cx+Math.cos(a)*r,cy+Math.sin(a)*r]; }
  var s='',i;
  [0.25,0.5,0.75,1].forEach(function(k){
    var d='';
    for(var j=0;j<n;j++){ var p=pt(j,R*k); d+=(j?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1); }
    s+='<path d="'+d+'Z" fill="'+(k===1?'rgba(255,140,26,.035)':'none')+'" stroke="rgba(255,140,26,'+(k===1?0.3:0.13)+')" stroke-width="1"/>';
  });
  for(i=0;i<n;i++){
    var p=pt(i,R);
    s+='<line x1="'+cx+'" y1="'+cy+'" x2="'+p[0].toFixed(1)+'" y2="'+p[1].toFixed(1)+'" stroke="rgba(255,140,26,.16)"/>';
    var lp=pt(i,R+24);
    s+=txt(lp[0],lp[1]+4,axes[i],'var(--ct2)',11.5,lp[0]>cx+8?'start':(lp[0]<cx-8?'end':'middle'));
  }
  series.forEach(function(se){
    var d='';
    se.vals.forEach(function(v,k){ var p=pt(k,R*Math.max(0,Math.min(100,v))/100); d+=(k?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1); });
    s+='<path d="'+d+'Z" fill="'+se.color+'" fill-opacity=".11" stroke="'+se.color+'" stroke-width="1.8" stroke-linejoin="round"/>';
    se.vals.forEach(function(v,k){ var p=pt(k,R*Math.max(0,Math.min(100,v))/100);
      s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.6" fill="'+se.color+'"><title>'+se.name+' · '+axes[k]+' '+v+'</title></circle>'; });
  });
  var lx=16;
  series.forEach(function(se){
    s+='<rect x="'+lx+'" y="'+(h-17)+'" width="9" height="9" rx="2" fill="'+se.color+'"/>';
    s+=txt(lx+14,h-9,se.name,'var(--ct2)',11,'start');
    lx+=se.name.length*13+34;
  });
  return svgFit(s,w,h);
}

/* HUD 半环仪表（目标达成） */
function gauge(pct,label,val,col){
  col=col||C_CY; pct=Math.max(0,Math.min(150,Number(pct)||0));
  var shown=Math.min(pct,100), id='gg'+(++_gid);
  var w=182,h=128,cx=91,cy=96,r=64;
  function arc(p){ var a=Math.PI*(1-p/100); return [cx+Math.cos(a)*r, cy-Math.sin(a)*r]; }
  var st=arc(0), en=arc(shown), full=arc(100);
  var defs='<defs>'+gradDef(id,col,C_PU)+glowDef(id+'g',col)+'</defs>';
  var s='<path d="M'+st[0].toFixed(1)+' '+st[1].toFixed(1)+' A'+r+' '+r+' 0 0 1 '+full[0].toFixed(1)+' '+full[1].toFixed(1)+'" fill="none" stroke="rgba(255,160,60,.13)" stroke-width="11" stroke-linecap="round"/>';
  if(shown>0.6) s+='<path d="M'+st[0].toFixed(1)+' '+st[1].toFixed(1)+' A'+r+' '+r+' 0 0 1 '+en[0].toFixed(1)+' '+en[1].toFixed(1)+'" fill="none" stroke="url(#'+id+')" stroke-width="11" stroke-linecap="round" filter="url(#'+id+'g)"/>';
  for(var t=0;t<=10;t++){
    var a=Math.PI*(1-t/10), r1=r-9, r2=r-(t%5===0?16:12);
    s+='<line x1="'+(cx+Math.cos(a)*r1).toFixed(1)+'" y1="'+(cy-Math.sin(a)*r1).toFixed(1)+'" x2="'+(cx+Math.cos(a)*r2).toFixed(1)+'" y2="'+(cy-Math.sin(a)*r2).toFixed(1)+'" stroke="rgba(255,160,60,'+(t%5===0?0.36:0.16)+')" stroke-width="1.2"/>';
  }
  s+='<text x="'+cx+'" y="'+(cy-10)+'" font-size="25" font-weight="700" fill="var(--ct)" text-anchor="middle" font-family="ui-monospace,Menlo,monospace">'+pct.toFixed(0)+'<tspan font-size="12" fill="var(--ct2)">%</tspan></text>';
  s+=txt(cx,cy+9,val||'',pct>=100?C_OK:(pct>=70?C_CY:C_WN),12);
  s+=txt(cx,h-4,label||'','var(--ct2)',11.5);
  return svgFit(s,w,h,defs);
}

/* 微型走势（模块矩阵卡内嵌） */
function microSpark(arr,col,w,h){
  col=col||C_CY; w=w||132; h=h||34; var id='ms'+(++_gid), p=3;
  var mx=Math.max.apply(0,arr), mn=Math.min.apply(0,arr), n=arr.length;
  var pts=arr.map(function(v,i){ var x=p+i*(w-2*p)/((n-1)||1); var y=h-p-(v-mn)/((mx-mn)||1)*(h-2*p); return x.toFixed(1)+','+y.toFixed(1); }).join(' ');
  var lastP=pts.split(' ').pop().split(',');
  var defs='<defs>'+gradDef(id,col,'transparent',true)+'</defs>';
  return svgFit('<polygon points="'+p+','+(h-p)+' '+pts+' '+(w-p)+','+(h-p)+'" fill="url(#'+id+')" opacity=".28"/>'+
    '<polyline points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="1.6" stroke-linejoin="round"/>'+
    '<circle cx="'+lastP[0]+'" cy="'+lastP[1]+'" r="2.4" fill="'+col+'"/>',w,h,defs);
}

/* 收入流向（简化桑基：四业务线 → 集团合并收入） */
function sankey(items){
  var w=680,h=214,bw=13,lx=112,rx=w-176,ry=18,rh=h-42;
  var sum=items.reduce(function(a,x){return a+x[1]},0)||1;
  var gap=13, avail=rh-gap*(items.length-1);
  var s='<defs>'+gradDef('skg',C_CY,C_PU,true)+'</defs>';
  s+='<rect x="'+rx+'" y="'+ry+'" width="'+bw+'" height="'+rh+'" rx="4" fill="url(#skg)"/>';
  s+=txt(rx+bw+12, ry+rh/2-3, '集团合并收入', 'var(--ct)', 12.5, 'start');
  s+=txt(rx+bw+12, ry+rh/2+16, (typeof fmt==='function'?fmt(sum):sum)+' 万元', '#ff8c1a', 12.5, 'start');
  var y=ry, ryc=ry;
  items.forEach(function(it){
    var hh=avail*it[1]/sum, rhh=rh*it[1]/sum, x1=lx+bw, x2=rx, mid=(x1+x2)/2;
    var d='M'+x1+' '+y.toFixed(1)+' C'+mid+' '+y.toFixed(1)+','+mid+' '+ryc.toFixed(1)+','+x2+' '+ryc.toFixed(1)+
          ' L'+x2+' '+(ryc+rhh).toFixed(1)+' C'+mid+' '+(ryc+rhh).toFixed(1)+','+mid+' '+(y+hh).toFixed(1)+','+x1+' '+(y+hh).toFixed(1)+'Z';
    s+='<path d="'+d+'" fill="'+it[2]+'" fill-opacity=".14"><title>'+it[0]+' '+it[1]+' 万元</title></path>';
    s+='<rect x="'+lx+'" y="'+y.toFixed(1)+'" width="'+bw+'" height="'+Math.max(hh,3).toFixed(1)+'" rx="4" fill="'+it[2]+'" fill-opacity=".9"/>';
    s+=txt(lx-10, y+hh/2+4, it[0], 'var(--ct2)', 11.5, 'end');
    y+=hh+gap; ryc+=rhh;
  });
  return svgFit(s,w,h);
}

/* 热力条（12 个月经营强度） */
function heatStrip(arr,labels,col){
  col=col||C_CY; var n=arr.length,w=680,h=54,pad=6,cw=(w-2*pad)/n;
  var mx=Math.max.apply(0,arr)||1, mn=Math.min.apply(0,arr);
  var s='';
  for(var i=0;i<n;i++){
    var t=(arr[i]-mn)/((mx-mn)||1);
    s+='<rect x="'+(pad+i*cw+1.5).toFixed(1)+'" y="8" width="'+(cw-3).toFixed(1)+'" height="24" rx="3" fill="'+col+'" fill-opacity="'+(0.14+t*0.76).toFixed(2)+'"><title>'+(labels?labels[i]:i)+' · '+arr[i]+'</title></rect>';
    if(labels && (i%2===0||n<=6)) s+=txt(pad+i*cw+cw/2,46,labels[i],'var(--ct3)',9.5);
  }
  return svgFit(s,w,h);
}
