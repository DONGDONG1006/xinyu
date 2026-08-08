/* ============================================================
   甘肃新煜科技工作台 · 数据层（localStorage 持久化）
   金额单位统一：万元
   ============================================================ */
var DB_KEY = 'xy_workbench_v4';

/* 同步密码哈希（纯前端，离线可用；非高安全场景，生产建议服务端加盐） */
function hashPwd(s){
  s = 'xy@' + (s||'') + '#wb';
  var h = 0x811c9dc5;
  for (var i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  var out = '', x = h>>>0;
  for (var r=0;r<8;r++){ x = (Math.imul(x,2654435761) + 0x9e3779b9)>>>0; x = (x ^ (x>>>15))>>>0; out += ('0000000' + x.toString(16)).slice(-8); }
  return out;
}

function seed(){
  return {
    meta:{ company:'甘肃新煜科技', ver:'5.0', updated:'2026-08-08' },

    /* ---------------- 项目主数据 ---------------- */
    projects:[
      {id:'lin-gang',name:'临港 100MW 渔光互补',type:'光伏',line:'新能源',stage:'前期手续',progress:46,
       invTotal:42000,invDone:19800,owner:'张总',client:'甘肃临港新能源开发有限公司',
       addr:'甘肃省张掖市临泽县',geo:{lng:100.17,lat:38.93},start:'2025-06-01',plan:'2027-03-31',risk:['消纳指标','接入评审']},
      {id:'xi-ping',name:'西坪 50MW 风电',type:'风电',line:'新能源',stage:'开工建设',progress:62,
       invTotal:31000,invDone:19200,owner:'李总',client:'甘肃西坪风能有限公司',
       addr:'甘肃省酒泉市玉门市',geo:{lng:97.5,lat:40.0},start:'2025-03-15',plan:'2026-12-31',risk:['林地手续']},
      {id:'g30',name:'G30 高速机电标段',type:'机电工程',line:'大交通',stage:'在建',progress:74,
       invTotal:8800,invDone:6500,owner:'王工',client:'甘肃省交通建设集团有限公司',
       addr:'G30 连霍高速 K1820-K1896',geo:{lng:104.0,lat:35.5},start:'2025-09-01',plan:'2026-11-30',risk:['进度款申报']},
      {id:'charge',name:'市区充电场站群',type:'充电',line:'新能源',stage:'运营',progress:100,
       invTotal:5400,invDone:5400,owner:'赵经理',client:'自持运营',
       addr:'兰州市城关区等 8 站点',geo:{lng:103.8,lat:36.06},start:'2024-11-01',plan:'2025-09-30',risk:[]}
    ],

    /* ---------------- 关键节点（项目里程碑） ---------------- */
    nodes:{
      'lin-gang':[
        {id:'n1',name:'项目备案（省发改委）',plan:'2025-07-20',actual:'2025-07-18',status:'已完成',owner:'张总',dep:'甘肃省发展改革委',impact:'一切手续前置',note:'备案号 甘发改备〔2025〕118 号'},
        {id:'n2',name:'用地预审与选址意见书',plan:'2025-11-30',actual:'2025-12-06',status:'已完成',owner:'陈工',dep:'市自然资源局',impact:'影响土地征转',note:'延期 6 天，因水域范围复核'},
        {id:'n3',name:'环评批复',plan:'2026-03-15',actual:'2026-03-10',status:'已完成',owner:'陈工',dep:'市生态环境局',impact:'开工前置',note:''},
        {id:'n4',name:'消纳指标落实',plan:'2026-07-31',actual:'',status:'延期',owner:'张总',dep:'甘肃省发展改革委 / 国网甘肃',impact:'决定项目能否继续投入',note:'已逾期 8 天，属最高优先级卡点'},
        {id:'n5',name:'接入系统评审通过',plan:'2026-08-20',actual:'',status:'进行中',owner:'李工',dep:'国网甘肃省电力公司',impact:'决定送出方案与造价',note:'评审会待排期'},
        {id:'n6',name:'施工许可证取得',plan:'2026-09-01',actual:'',status:'未开始',owner:'陈工',dep:'市住建局',impact:'开工合法性',note:'依赖 n4/n5'},
        {id:'n7',name:'主体工程开工',plan:'2026-09-15',actual:'',status:'未开始',owner:'王工',dep:'—',impact:'节点考核',note:''},
        {id:'n8',name:'首批并网发电',plan:'2027-03-31',actual:'',status:'未开始',owner:'张总',dep:'国网甘肃',impact:'收入起算点',note:'需赶 2027 年电价政策窗口'}
      ],
      'xi-ping':[
        {id:'n1',name:'核准批复',plan:'2025-04-20',actual:'2025-04-15',status:'已完成',owner:'李总',dep:'甘肃省发展改革委',impact:'开发合法性',note:''},
        {id:'n2',name:'林地使用手续',plan:'2026-08-25',actual:'',status:'进行中',owner:'李总',dep:'省林草局',impact:'影响 3 台机位',note:'需省级批复'},
        {id:'n3',name:'风机基础全部浇筑完成',plan:'2026-09-30',actual:'',status:'进行中',owner:'王工',dep:'—',impact:'吊装前置',note:'已完成 18/25'},
        {id:'n4',name:'升压站带电',plan:'2026-11-15',actual:'',status:'未开始',owner:'李工',dep:'国网甘肃',impact:'并网前置',note:''},
        {id:'n5',name:'全容量并网',plan:'2026-12-31',actual:'',status:'未开始',owner:'李总',dep:'国网甘肃',impact:'年度考核硬指标',note:''}
      ],
      'g30':[
        {id:'n1',name:'中标通知书',plan:'2025-08-10',actual:'2025-08-08',status:'已完成',owner:'王工',dep:'甘肃交建集团',impact:'合同签订前置',note:''},
        {id:'n2',name:'合同签订',plan:'2025-08-30',actual:'2025-08-28',status:'已完成',owner:'王工',dep:'甘肃交建集团',impact:'—',note:'HT-2025-G30-01'},
        {id:'n3',name:'第三期进度款申报',plan:'2026-08-15',actual:'',status:'进行中',owner:'王工',dep:'业主计量中心',impact:'现金流',note:'具备条件未申报 620 万'},
        {id:'n4',name:'机电设备到场验收',plan:'2026-09-20',actual:'',status:'未开始',owner:'赵经理',dep:'监理 / 业主',impact:'安装前置',note:''},
        {id:'n5',name:'系统联调与交工验收',plan:'2026-11-30',actual:'',status:'未开始',owner:'王工',dep:'省交通质监局',impact:'尾款 + 质保金起算',note:''}
      ],
      'charge':[
        {id:'n1',name:'8 站点全部投运',plan:'2025-09-30',actual:'2025-09-26',status:'已完成',owner:'赵经理',dep:'—',impact:'—',note:''},
        {id:'n2',name:'年度充电量达 1200 万度',plan:'2026-12-31',actual:'',status:'进行中',owner:'赵经理',dep:'—',impact:'运营考核',note:'当前进度 61%'}
      ]
    },

    /* ---------------- 关键人 / 联系人 ---------------- */
    people:{
      'lin-gang':[
        {id:'p1',name:'马建国',title:'副主任',org:'甘肃省发展改革委 能源处',level:'决策',phone:'139****2210',wechat:'—',heat:3,last:'2026-07-28',next:'2026-08-11',pref:'重数据、要正式函件',note:'消纳指标关键决策人，需董事长层级对接'},
        {id:'p2',name:'周慧敏',title:'处长',org:'国网甘肃省电力公司 发展策划部',level:'决策',phone:'138****6677',wechat:'zhm_grid',heat:4,last:'2026-08-02',next:'2026-08-14',pref:'流程严谨，偏好书面汇报',note:'接入系统评审排期由其签批'},
        {id:'p3',name:'李振华',title:'副总工',org:'甘肃省电力设计院',level:'影响',phone:'137****8899',wechat:'lzh_design',heat:5,last:'2026-08-05',next:'2026-08-12',pref:'技术控，认专业',note:'接入方案编制负责人，配合度高'},
        {id:'p4',name:'王海涛',title:'科长',org:'临泽县自然资源局',level:'执行',phone:'135****1123',wechat:'—',heat:4,last:'2026-07-30',next:'2026-08-18',pref:'讲流程、按件办',note:'土地征转具体经办'},
        {id:'p5',name:'孙立',title:'副县长',org:'临泽县人民政府',level:'决策',phone:'136****4455',wechat:'—',heat:3,last:'2026-06-20',next:'2026-08-20',pref:'关注税收与就业',note:'可协调县内多部门，需带投资落地方案'},
        {id:'p6',name:'陈明',title:'项目经理',org:'中电建甘肃分公司',level:'执行',phone:'134****7788',wechat:'cm_pc',heat:4,last:'2026-08-04',next:'2026-08-16',pref:'直接、要结论',note:'拟施工总包对接人'}
      ],
      'xi-ping':[
        {id:'p1',name:'张宏',title:'副局长',org:'甘肃省林草局 资源处',level:'决策',phone:'139****3344',wechat:'—',heat:2,last:'2026-07-15',next:'2026-08-13',pref:'看合规材料',note:'林地手续批复关键人，关系需加温'},
        {id:'p2',name:'刘晓峰',title:'总监',org:'玉门风电监理公司',level:'执行',phone:'135****9900',wechat:'lxf_jl',heat:4,last:'2026-08-06',next:'2026-08-15',pref:'现场派，重安全',note:'现场签证配合方'}
      ],
      'g30':[
        {id:'p1',name:'赵鹏',title:'项目总监',org:'甘肃省交通建设集团 G30 项目部',level:'决策',phone:'138****2255',wechat:'zp_jt',heat:4,last:'2026-08-03',next:'2026-08-13',pref:'守时、认进度',note:'进度款审批第一关'},
        {id:'p2',name:'钱伟',title:'计量工程师',org:'业主计量中心',level:'执行',phone:'137****5566',wechat:'—',heat:3,last:'2026-07-29',next:'2026-08-12',pref:'凭资料说话',note:'计量单据把关人，需提前对量'},
        {id:'p3',name:'胡军',title:'副总经理',org:'甘肃省交通建设集团',level:'影响',phone:'139****7712',wechat:'—',heat:2,last:'2026-05-18',next:'2026-09-01',pref:'注重长期合作',note:'后续标段商机关键人'}
      ],
      'charge':[
        {id:'p1',name:'吴敏',title:'客户经理',org:'国网兰州供电公司',level:'执行',phone:'136****3321',wechat:'wm_dl',heat:4,last:'2026-08-01',next:'2026-08-20',pref:'配合度高',note:'扩容报装对接'}
      ]
    },

    /* ---------------- 相关公司 ---------------- */
    orgs:{
      'lin-gang':[
        {id:'o1',name:'甘肃临港新能源开发有限公司',type:'业主/项目公司',role:'投资主体（我方控股 70%）',contact:'张总',phone:'139****0001',status:'合作中',amount:42000,credit:'A',note:'与临泽城投合资'},
        {id:'o2',name:'甘肃省电力设计院',type:'设计院',role:'初设 + 接入系统设计',contact:'李振华',phone:'137****8899',status:'合作中',amount:860,credit:'A',note:'长期合作，已签框架'},
        {id:'o3',name:'中电建甘肃分公司',type:'施工总包',role:'EPC 总承包（拟）',contact:'陈明',phone:'134****7788',status:'洽谈中',amount:28000,credit:'A',note:'待消纳指标落实后定标'},
        {id:'o4',name:'华东勘测设计研究院',type:'设计院',role:'施工图设计',contact:'陈工',phone:'—',status:'合作中',amount:420,credit:'A',note:'施工图阶段'},
        {id:'o5',name:'隆基绿能科技',type:'设备供应商',role:'组件供应（拟）',contact:'销售总监 高翔',phone:'138****1199',status:'询价中',amount:12800,credit:'A',note:'比价中，另有晶科'},
        {id:'o6',name:'国家开发银行甘肃分行',type:'金融机构',role:'项目贷款（拟 25 年期）',contact:'客户经理 于敏',phone:'135****2266',status:'洽谈中',amount:29400,credit:'—',note:'授信需项目手续齐全'},
        {id:'o7',name:'甘肃诚信工程咨询',type:'监理/咨询',role:'造价咨询',contact:'—',phone:'—',status:'合作中',amount:96,credit:'B',note:'概预算审核'}
      ],
      'xi-ping':[
        {id:'o1',name:'甘肃西坪风能有限公司',type:'业主/项目公司',role:'投资主体（我方全资）',contact:'李总',phone:'139****0002',status:'合作中',amount:31000,credit:'A',note:''},
        {id:'o2',name:'金风科技',type:'设备供应商',role:'风机及塔筒供应',contact:'区域经理 邓强',phone:'137****3388',status:'合作中',amount:15600,credit:'A',note:'已交付 18 台'},
        {id:'o3',name:'玉门风电监理公司',type:'监理/咨询',role:'工程监理',contact:'刘晓峰',phone:'135****9900',status:'合作中',amount:180,credit:'B',note:''}
      ],
      'g30':[
        {id:'o1',name:'甘肃省交通建设集团有限公司',type:'业主',role:'发包方',contact:'赵鹏',phone:'138****2255',status:'合作中',amount:8800,credit:'A',note:'集团级客户，后续 3 个标段商机'},
        {id:'o2',name:'浙江大华技术股份',type:'设备供应商',role:'监控设备供应',contact:'代理商 周辉',phone:'136****4477',status:'合作中',amount:1860,credit:'A',note:'账期 90 天'},
        {id:'o3',name:'甘肃路桥监理',type:'监理/咨询',role:'施工监理',contact:'—',phone:'—',status:'合作中',amount:0,credit:'B',note:''}
      ],
      'charge':[
        {id:'o1',name:'国网兰州供电公司',type:'政府/公用',role:'供电报装',contact:'吴敏',phone:'136****3321',status:'合作中',amount:0,credit:'A',note:''},
        {id:'o2',name:'特来电新能源',type:'设备供应商',role:'充电桩供应与运维',contact:'—',phone:'—',status:'合作中',amount:2300,credit:'A',note:''}
      ]
    },

    /* ---------------- 合同 ---------------- */
    contracts:[
      {id:'c1',code:'HT-2025-G30-01',name:'G30 高速公路机电工程施工合同',party:'甘肃省交通建设集团有限公司',dir:'收',cat:'工程施工',
       project:'g30',amount:8800,signed:'2025-08-28',start:'2025-09-01',end:'2026-11-30',owner:'王工',status:'履约中',perf:74,
       invoiced:5900,settled:5280,retention:440,warranty:'2028-11-30',risk:'进度款申报滞后',
       plans:[
         {no:1,name:'预付款 20%',ratio:20,amount:1760,planDate:'2025-09-15',actual:'2025-09-18',status:'已收'},
         {no:2,name:'第一期进度款',ratio:20,amount:1760,planDate:'2026-01-31',actual:'2026-02-10',status:'已收'},
         {no:3,name:'第二期进度款',ratio:20,amount:1760,planDate:'2026-05-31',actual:'2026-06-14',status:'已收'},
         {no:4,name:'第三期进度款',ratio:20,amount:1760,planDate:'2026-08-15',actual:'',status:'逾期'},
         {no:5,name:'交工结算款',ratio:15,amount:1320,planDate:'2026-12-31',actual:'',status:'未到期'},
         {no:6,name:'质保金退还',ratio:5,amount:440,planDate:'2028-11-30',actual:'',status:'未到期'}
       ],
       changes:[{no:'BG-01',name:'监控点位增加 12 处',amount:186,date:'2026-04-12',status:'已批准'},
                {no:'BG-02',name:'隧道光纤路由调整',amount:64,date:'2026-06-25',status:'审批中'}]},

      {id:'c2',code:'HT-2026-LG-D01',name:'临港项目初步设计及接入系统设计合同',party:'甘肃省电力设计院',dir:'付',cat:'设计咨询',
       project:'lin-gang',amount:860,signed:'2025-09-05',start:'2025-09-10',end:'2026-10-31',owner:'陈工',status:'履约中',perf:68,
       invoiced:580,settled:520,retention:86,warranty:'—',risk:'',
       plans:[
         {no:1,name:'合同签订后付 30%',ratio:30,amount:258,planDate:'2025-09-20',actual:'2025-09-22',status:'已付'},
         {no:2,name:'初设批复后付 30%',ratio:30,amount:258,planDate:'2026-04-30',actual:'2026-05-08',status:'已付'},
         {no:3,name:'接入方案通过后付 30%',ratio:30,amount:258,planDate:'2026-09-30',actual:'',status:'未到期'},
         {no:4,name:'质保金',ratio:10,amount:86,planDate:'2027-10-31',actual:'',status:'未到期'}
       ],changes:[]},

      {id:'c3',code:'HT-2026-XP-E01',name:'西坪风电风机及塔筒采购合同',party:'金风科技股份有限公司',dir:'付',cat:'设备采购',
       project:'xi-ping',amount:15600,signed:'2025-11-12',start:'2025-12-01',end:'2026-10-31',owner:'李总',status:'履约中',perf:72,
       invoiced:11200,settled:9800,retention:780,warranty:'2031-12-31',risk:'剩余 7 台交付节点偏紧',
       plans:[
         {no:1,name:'预付款 20%',ratio:20,amount:3120,planDate:'2025-12-10',actual:'2025-12-11',status:'已付'},
         {no:2,name:'到货款 50%',ratio:50,amount:7800,planDate:'2026-06-30',actual:'2026-07-06',status:'已付'},
         {no:3,name:'吊装完成款 25%',ratio:25,amount:3900,planDate:'2026-10-31',actual:'',status:'未到期'},
         {no:4,name:'质保金 5%',ratio:5,amount:780,planDate:'2031-12-31',actual:'',status:'未到期'}
       ],changes:[{no:'BG-01',name:'3 台机位调整运输方案',amount:42,date:'2026-03-08',status:'已批准'}]},

      {id:'c4',code:'HT-2026-G30-S02',name:'G30 监控设备采购合同',party:'浙江大华技术股份有限公司',dir:'付',cat:'设备采购',
       project:'g30',amount:1860,signed:'2026-02-20',start:'2026-03-01',end:'2026-09-30',owner:'赵经理',status:'履约中',perf:80,
       invoiced:1480,settled:1120,retention:93,warranty:'2029-09-30',risk:'账期 90 天，付款集中在 9 月',
       plans:[
         {no:1,name:'预付 30%',ratio:30,amount:558,planDate:'2026-03-10',actual:'2026-03-12',status:'已付'},
         {no:2,name:'到货 40%',ratio:40,amount:744,planDate:'2026-07-31',actual:'2026-08-04',status:'已付'},
         {no:3,name:'验收 25%',ratio:25,amount:465,planDate:'2026-09-30',actual:'',status:'未到期'},
         {no:4,name:'质保 5%',ratio:5,amount:93,planDate:'2029-09-30',actual:'',status:'未到期'}
       ],changes:[]},

      {id:'c5',code:'HT-2026-CD-01',name:'城关区充电场站运营服务合同',party:'兰州公交集团',dir:'收',cat:'运营服务',
       project:'charge',amount:1260,signed:'2026-01-08',start:'2026-01-15',end:'2028-01-14',owner:'赵经理',status:'履约中',perf:38,
       invoiced:460,settled:410,retention:0,warranty:'—',risk:'',
       plans:[
         {no:1,name:'2026 上半年服务费',ratio:25,amount:315,planDate:'2026-07-15',actual:'2026-07-20',status:'已收'},
         {no:2,name:'2026 下半年服务费',ratio:25,amount:315,planDate:'2027-01-15',actual:'',status:'未到期'},
         {no:3,name:'2027 上半年服务费',ratio:25,amount:315,planDate:'2027-07-15',actual:'',status:'未到期'},
         {no:4,name:'2027 下半年服务费',ratio:25,amount:315,planDate:'2028-01-15',actual:'',status:'未到期'}
       ],changes:[]},

      {id:'c6',code:'HT-2026-CS-08',name:'新能源车批量销售合同（网约车公司）',party:'甘肃畅行出行服务有限公司',dir:'收',cat:'车辆销售',
       project:'',amount:2160,signed:'2026-06-18',start:'2026-06-20',end:'2026-12-31',owner:'赵经理',status:'履约中',perf:55,
       invoiced:1180,settled:960,retention:0,warranty:'2029-06-30',risk:'尾款依赖司机按揭放款',
       plans:[
         {no:1,name:'首批 60 台车款',ratio:50,amount:1080,planDate:'2026-07-10',actual:'2026-07-15',status:'已收'},
         {no:2,name:'第二批 60 台车款',ratio:50,amount:1080,planDate:'2026-10-10',actual:'',status:'未到期'}
       ],changes:[]},

      {id:'c7',code:'HT-2026-LG-M01',name:'临港项目造价咨询服务合同',party:'甘肃诚信工程咨询有限公司',dir:'付',cat:'设计咨询',
       project:'lin-gang',amount:96,signed:'2026-05-06',start:'2026-05-10',end:'2027-03-31',owner:'预算部',status:'履约中',perf:45,
       invoiced:44,settled:44,retention:9.6,warranty:'—',risk:'',
       plans:[
         {no:1,name:'概预算审核完成付 50%',ratio:50,amount:48,planDate:'2026-08-31',actual:'',status:'待付'},
         {no:2,name:'结算审核完成付 40%',ratio:40,amount:38.4,planDate:'2027-03-31',actual:'',status:'未到期'},
         {no:3,name:'质保金 10%',ratio:10,amount:9.6,planDate:'2027-09-30',actual:'',status:'未到期'}
       ],changes:[]},

      {id:'c8',code:'HT-2025-XP-J01',name:'西坪风电项目贷款合同',party:'国家开发银行甘肃分行',dir:'付',cat:'融资',
       project:'xi-ping',amount:21700,signed:'2025-05-20',start:'2025-06-01',end:'2043-05-31',owner:'财务部',status:'履约中',perf:22,
       invoiced:0,settled:4774,retention:0,warranty:'—',risk:'利率浮动，需关注 LPR',
       plans:[
         {no:1,name:'2026 年度还本付息',ratio:6,amount:1302,planDate:'2026-12-20',actual:'',status:'未到期'},
         {no:2,name:'2027 年度还本付息',ratio:6,amount:1302,planDate:'2027-12-20',actual:'',status:'未到期'}
       ],changes:[]}
    ],

    /* ---------------- 财务 ---------------- */
    finance:{
      /* 分业务线损益（本年累计，万元） */
      pl:[
        {line:'新能源项目',rev:6820,cost:5180,exp:640,yoy:18.4},
        {line:'大交通机电',rev:5240,cost:4210,exp:430,yoy:9.2},
        {line:'网约车平台',rev:3160,cost:2740,exp:310,yoy:26.5},
        {line:'新能源车销售',rev:4380,cost:3980,exp:280,yoy:-4.1}
      ],
      /* 应收 */
      ar:[
        {party:'甘肃省交通建设集团',project:'G30 高速机电标段',amount:1760,age:0,due:'2026-08-15',owner:'王工',status:'具备申报条件未申报'},
        {party:'甘肃省交建 第二标段',project:'G30 高速机电标段',amount:620,age:46,due:'2026-06-23',owner:'王工',status:'已申报待审'},
        {party:'兰州公交集团',project:'市区充电场站群',amount:180,age:22,due:'2026-07-17',owner:'赵经理',status:'对账中'},
        {party:'甘肃畅行出行',project:'车辆销售',amount:220,age:68,due:'2026-06-01',owner:'赵经理',status:'按揭放款延迟'},
        {party:'定西国道机电项目部',project:'国省干线机电',amount:412,age:124,due:'2026-04-06',owner:'王工',status:'争议·计量分歧'},
        {party:'白银交投',project:'国省干线机电',amount:268,age:186,due:'2026-02-03',owner:'王工',status:'催收中·拟法务介入'}
      ],
      /* 应付 */
      ap:[
        {party:'金风科技',type:'设备采购',amount:3900,due:'2026-10-31',status:'未到期'},
        {party:'浙江大华技术',type:'设备采购',amount:465,due:'2026-09-30',status:'未到期'},
        {party:'甘肃省电力设计院',type:'设计咨询',amount:258,due:'2026-09-30',status:'未到期'},
        {party:'甘肃诚信工程咨询',type:'设计咨询',amount:48,due:'2026-08-31',status:'临期'},
        {party:'国开行甘肃分行',type:'融资还本付息',amount:1302,due:'2026-12-20',status:'未到期'},
        {party:'临泽劳务班组',type:'劳务分包',amount:186,due:'2026-08-20',status:'临期'}
      ],
      /* 开票与回款（近 12 月） */
      inv:[
        {m:'2025-09',iv:820,rc:610},{m:'2025-10',iv:960,rc:740},{m:'2025-11',iv:1140,rc:880},
        {m:'2025-12',iv:1620,rc:1380},{m:'2026-01',iv:740,rc:920},{m:'2026-02',iv:520,rc:610},
        {m:'2026-03',iv:1180,rc:840},{m:'2026-04',iv:1360,rc:1020},{m:'2026-05',iv:1240,rc:1160},
        {m:'2026-06',iv:1580,rc:1240},{m:'2026-07',iv:1420,rc:1080},{m:'2026-08',iv:640,rc:390}
      ],
      /* 未来 13 周资金 */
      cash13:[4820,4610,4380,4120,3760,3420,3180,2860,3240,3620,3980,4260,4520],
      cashSafe:3000,
      /* 预算执行 */
      budgetExec:[
        {item:'管理费用',bud:1200,act:940},
        {item:'销售费用',bud:860,act:790},
        {item:'财务费用',bud:1480,act:1120},
        {item:'研发投入',bud:320,act:180},
        {item:'工程成本',bud:14200,act:13580}
      ],
      /* 税务 */
      tax:[
        {name:'增值税（进项留抵）',amount:386,note:'可抵扣，建议加快认证'},
        {name:'本年已缴增值税',amount:642,note:''},
        {name:'企业所得税预缴',amount:218,note:''},
        {name:'留抵退税可申请',amount:210,note:'符合条件，尚未申请'}
      ]
    },

    /* ---------------- 图纸/预算/概算 ---------------- */
    docs:{
      'lin-gang':{
        drawings:[['临港项目总平面布置图','总图','V1.0','初设','甘肃省电力设计院','2025-09-12','已审定','王工'],
          ['光伏阵列布置图','电气','V2.1','初设','甘肃省电力设计院','2025-10-08','已审定','王工'],
          ['电气一次接线图','电气','V1.3','初设','甘肃省电力设计院','2026-01-15','评审中','李工'],
          ['接入系统方案图','接入系统','V3.0','初设','甘肃省电力设计院','2026-06-20','评审中','李工'],
          ['光伏区土建施工图','结构/土建','V1.0','施工图','华东院','2026-07-02','编制中','陈工'],
          ['送出线路路径图','线路','V1.1','施工图','华东院','2026-07-10','编制中','陈工']],
        budgets:[['施工图预算（全费用）','全册','40000','V2.0','2026-06-30','已批准','预算部'],
          ['设备购置预算明细','设备购置','17900','V1.2','2026-05-18','已批准','造价咨询'],
          ['建筑安装工程预算','建安工程','13600','V1.5','2026-06-10','已批准','预算部'],
          ['其他及预备费预算','其他费用','8500','V1.0','2026-06-22','审核中','预算部']],
        estimates:[['设计概算（报批稿）','全册','41800','V3.0','2025-08-20','已批准','甘肃省电力设计院'],
          ['设备购置概算','设备购置','18600','V3.0','2025-08-20','已批准','甘肃省电力设计院'],
          ['建安工程概算','建安工程','14200','V3.0','2025-08-20','已批准','甘肃省电力设计院'],
          ['其他及预备费概算','其他费用','9000','V3.0','2025-08-20','已批准','甘肃省电力设计院']],
        estcmp:[['设备购置费',18600,17900],['建安工程费',14200,13600],['其他费用',6400,6100],['预备费',2600,2400]]
      }
    },

    /* ---------------- 跑动 / 待办 / 审批 ---------------- */
    run:[
      {id:'r1',project:'lin-gang',matter:'接入系统评审',where:'国网甘肃省电力公司',owner:'李工',due:'2026-08-20',status:'进行中',level:2,created:'2026-07-10'},
      {id:'r2',project:'lin-gang',matter:'消纳指标协调',where:'甘肃省发展改革委',owner:'张总',due:'2026-08-12',status:'卡点',level:3,created:'2026-06-28'},
      {id:'r3',project:'xi-ping',matter:'林地使用手续',where:'省林草局',owner:'李总',due:'2026-08-25',status:'进行中',level:1,created:'2026-07-20'},
      {id:'r4',project:'g30',matter:'第三期进度款申报',where:'业主计量中心',owner:'王工',due:'2026-08-15',status:'待办',level:2,created:'2026-08-01'},
      {id:'r5',project:'lin-gang',matter:'施工许可办理',where:'市住建局',owner:'陈工',due:'2026-09-01',status:'待办',level:1,created:'2026-08-02'}
    ],
    tasks:[
      {id:'t1',title:'对接省发改委推动消纳指标',project:'临港 100MW 渔光互补',owner:'张总',due:'2026-08-12',status:'待办'},
      {id:'t2',title:'催办接入系统评审会',project:'临港 100MW 渔光互补',owner:'李工',due:'2026-08-20',status:'进行中'},
      {id:'t3',title:'提交 G30 第三期进度款申报',project:'G30 高速机电标段',owner:'王工',due:'2026-08-15',status:'进行中'}
    ],
    approvals:[
      {id:'a1',title:'临港项目施工图预算审定',type:'预算',amount:'40000',applicant:'预算部',due:'2026-08-14'},
      {id:'a2',title:'西坪风电林地手续用印',type:'用印',amount:'—',applicant:'李总',due:'2026-08-16'},
      {id:'a3',title:'G30 设备采购付款',type:'付款',amount:'1280',applicant:'王工',due:'2026-08-13'},
      {id:'a4',title:'临港造价咨询合同付款（50%）',type:'付款',amount:'48',applicant:'预算部',due:'2026-08-31'}
    ],

    /* ---------------- 费用申请 / 审批流（出差 · 招待 · 报销） ---------------- */
    /* type: trip(出差) / ent(招待) / reimb(报销)
       status: pending(待审批) / approved(已通过) / rejected(已驳回)
       金额单位：元。trip/ent 用 amount(预估)，reimb 用 total(报销合计) */
    applications:[
      {id:'ap_t1',type:'trip',title:'临港光伏前期手续对接出差',applicant:'member',applicantName:'业务成员',line:'新能源',projectId:'lin-gang',
        status:'pending',createdAt:'2026-08-09',submitAt:'2026-08-09',
        dest:'张掖',reason:'临港 100MW 光伏治沙项目接入评审与消纳指标对接',startDate:'2026-08-20',endDate:'2026-08-22',days:3,
        transport:'高铁',estTransport:1200,estHotel:900,estAllowance:600,amount:2700},
      {id:'ap_e1',type:'ent',title:'西坪风电林地手续对接招待',applicant:'member',applicantName:'业务成员',line:'新能源',projectId:'xi-ping',
        status:'approved',createdAt:'2026-08-06',submitAt:'2026-08-06',auditAt:'2026-08-09',auditor:'manager',auditorName:'经营管理者',auditNote:'同意，控制在业务拓展预算内',
        guest:'省林草局相关处室',reason:'林地使用手续协调推进',headcount:4,estAmount:3200,amount:3200},
      {id:'ap_r1',type:'reimb',title:'临港出差费用报销',applicant:'member',applicantName:'业务成员',line:'新能源',projectId:'lin-gang',
        status:'pending',createdAt:'2026-08-09',submitAt:'2026-08-09',relatedId:'ap_t1',advance:0,
        items:[{category:'交通费',amount:1200,note:'兰州-张掖往返高铁',invoiceNo:'INV001'},{category:'住宿费',amount:900,note:'张掖 2 晚',invoiceNo:'INV002'},{category:'餐饮招待费',amount:600,note:'工作餐',invoiceNo:''},{category:'办公及其他',amount:200,note:'打印快递',invoiceNo:''}],
        total:2900,amount:2900},
      {id:'ap_t2',type:'trip',title:'G30 机电标段业主对接出差',applicant:'manager',applicantName:'经营管理者',line:'大交通',projectId:'g30',
        status:'approved',createdAt:'2026-08-05',submitAt:'2026-08-05',auditAt:'2026-08-07',auditor:'admin',auditorName:'系统管理员',auditNote:'同意，注意费用标准',
        dest:'天水',reason:'G30 第三期进度款申报与业主对接',startDate:'2026-08-12',endDate:'2026-08-13',days:2,
        transport:'自驾',estTransport:600,estHotel:500,estAllowance:400,amount:1500},
      {id:'ap_e2',type:'ent',title:'大客户客情维护招待',applicant:'member',applicantName:'业务成员',line:'车辆销售',projectId:'',
        status:'rejected',createdAt:'2026-08-08',submitAt:'2026-08-08',auditAt:'2026-08-09',auditor:'manager',auditorName:'经营管理者',auditNote:'单次金额超标准，请拆分明细并附说明后重报',
        guest:'网约车公司采购负责人',reason:'车辆销售客情维护',headcount:6,estAmount:8000,amount:8000}
    ],

    /* ---------------- 机会 / 商机（CRM 线索→中标漏斗） ---------------- */
    /* stage 管道：线索 → 商机 → 商务谈判 → 中标 → 丢单
       line：新能源项目 / 大交通机电 / 网约车平台 / 新能源车销售
       amount 单位：万元；winRate 赢单率(%)；projectId 转化后回填项目 id */
    opportunities:[
      {id:'op1',title:'临港二期 200MW 光伏治沙',line:'新能源项目',customer:'甘肃临港新能源开发有限公司',amount:68000,stage:'商机',owner:'王磊',expectClose:'2026-12-31',winRate:55,projectId:'',created:'2026-08-01',note:'消纳指标落实后启动二期指标竞配'},
      {id:'op2',title:'G30 第二标段机电工程',line:'大交通机电',customer:'甘肃省交通建设集团有限公司',amount:9600,stage:'商务谈判',owner:'刘洋',expectClose:'2026-10-31',winRate:70,projectId:'',created:'2026-07-20',note:'先推动第三期进度款申报，再谈二标段'},
      {id:'op3',title:'白银国省干线机电',line:'大交通机电',customer:'白银市交通投资集团',amount:3200,stage:'线索',owner:'周强',expectClose:'2027-03-31',winRate:30,projectId:'',created:'2026-08-05',note:'商机拓展中，跟岗培养'},
      {id:'op4',title:'网约车公司第二批 200 台车',line:'新能源车销售',customer:'甘肃畅行出行服务有限公司',amount:7200,stage:'中标',owner:'孙浩',expectClose:'2026-11-30',winRate:85,projectId:'',created:'2026-07-10',note:'已口头中标，待签销售合同'},
      {id:'op5',title:'市区充电场站二期扩容',line:'新能源项目',customer:'国网兰州供电公司',amount:2600,stage:'商机',owner:'赵敏',expectClose:'2026-11-15',winRate:60,projectId:'',created:'2026-08-03',note:'结合司机购车协同，运营方有扩容意愿'}
    ],

    /* ---------------- 开票（关联合同，与财务回款联动） ---------------- */
    /* amount / tax 单位：万元；type：增值税专用发票 / 普通发票
       status：待开 / 已开 / 已寄 / 已红冲 */
    invoices:[
      {id:'iv1',no:'INV-2026-08-001',contractId:'c1',contractCode:'HT-2025-G30-01',party:'甘肃省交通建设集团有限公司',amount:1760,tax:158.4,type:'增值税专用发票',status:'已开',issueDate:'2026-08-14',dueDate:'2026-08-20',note:'第四期进度款发票'},
      {id:'iv2',no:'INV-2026-08-002',contractId:'c6',contractCode:'HT-2026-CS-08',party:'甘肃畅行出行服务有限公司',amount:1080,tax:124.2,type:'增值税专用发票',status:'已寄',issueDate:'2026-07-15',dueDate:'2026-07-20',note:'首批 60 台车款'},
      {id:'iv3',no:'INV-2026-08-003',contractId:'c2',contractCode:'HT-2026-LG-D01',party:'甘肃省电力设计院',amount:258,tax:14.6,type:'增值税专用发票',status:'待开',issueDate:'',dueDate:'2026-09-30',note:'接入方案通过后开具'}
    ],

    /* ---------------- 业务人员（公司内部业务/跑动人员） ---------------- */
    /* line: 新能源 / 大交通 / 网约车 / 车辆销售 / 综合 ; status: 在职 / 试用 / 停职
       projects: 负责/参与的项目 id 列表（与 projects 表关联） */
    staff:[
      {id:'s1',name:'王磊',role:'新能源业务经理',line:'新能源',phone:'139****3381',region:'张掖/酒泉',status:'在职',joined:'2023-03-01',projects:['lin-gang','xi-ping','charge'],note:'光伏/风电前期手续与接入协调主力，临港消纳指标对接人'},
      {id:'s2',name:'刘洋',role:'大交通客户经理',line:'大交通',phone:'138****5520',region:'兰州/天水',status:'在职',joined:'2022-07-15',projects:['g30'],note:'G30 标段业主对接与进度款申报负责人'},
      {id:'s3',name:'陈静',role:'新能源业务专员',line:'新能源',phone:'137****8842',region:'张掖',status:'在职',joined:'2024-09-01',projects:['lin-gang'],note:'临港项目手续跑动支撑，文档与对接记录'},
      {id:'s4',name:'孙浩',role:'车辆销售经理',line:'车辆销售',phone:'136****2290',region:'兰州',status:'在职',joined:'2021-11-20',projects:[],note:'网约车公司批量销售及以租代购业务，对接甘肃畅行出行'},
      {id:'s5',name:'周强',role:'大交通客户经理',line:'大交通',phone:'135****7701',region:'兰州',status:'试用',joined:'2026-06-01',projects:['g30'],note:'国省干线机电商机拓展，跟岗培养中'},
      {id:'s6',name:'赵敏',role:'网约车/销售业务经理',line:'网约车',phone:'136****3345',region:'兰州',status:'在职',joined:'2023-05-10',projects:['charge'],note:'充电场站运营对接 + 平台司机购车转化'}
    ],

    /* ---------------- 业务费用（报销/业务拓展费用，单位：元） ---------------- */
    /* type: 招待费 / 差旅费 / 佣金提成 / 通讯交通费 / 其他
       status: 待审批 / 已报销 / 驳回 ; projectId 可空 */
    expenses:[
      {id:'e1',staffId:'s1',projectId:'lin-gang',type:'招待费',amount:6800,date:'2026-07-28',status:'已报销',note:'省发改委能源处对接餐叙'},
      {id:'e2',staffId:'s1',projectId:'lin-gang',type:'差旅费',amount:3200,date:'2026-07-30',status:'已报销',note:'张掖-兰州往返高铁及住宿'},
      {id:'e3',staffId:'s1',projectId:'xi-ping',type:'差旅费',amount:2150,date:'2026-08-02',status:'待审批',note:'玉门风电现场踏勘'},
      {id:'e4',staffId:'s1',projectId:'charge',type:'通讯交通费',amount:980,date:'2026-08-05',status:'已报销',note:'场站巡检用车'},
      {id:'e5',staffId:'s2',projectId:'g30',type:'招待费',amount:5400,date:'2026-08-03',status:'已报销',note:'业主计量中心对量工作餐'},
      {id:'e6',staffId:'s2',projectId:'g30',type:'差旅费',amount:1860,date:'2026-08-06',status:'待审批',note:'兰州-天水现场协调'},
      {id:'e7',staffId:'s2',projectId:'g30',type:'其他',amount:1200,date:'2026-08-08',status:'待审批',note:'标书打印与快递'},
      {id:'e8',staffId:'s3',projectId:'lin-gang',type:'招待费',amount:2600,date:'2026-08-04',status:'已报销',note:'县自然资源局对接'},
      {id:'e9',staffId:'s3',projectId:'lin-gang',type:'通讯交通费',amount:720,date:'2026-08-09',status:'待审批',note:'临泽现场通勤'},
      {id:'e10',staffId:'s4',projectId:'',type:'佣金提成',amount:42000,date:'2026-07-15',status:'已报销',note:'畅行出行首批 60 台车销售提成'},
      {id:'e11',staffId:'s4',projectId:'',type:'招待费',amount:3800,date:'2026-08-07',status:'待审批',note:'网约车公司客情维护'},
      {id:'e12',staffId:'s6',projectId:'charge',type:'招待费',amount:2200,date:'2026-08-05',status:'已报销',note:'国网兰州供电公司扩容对接'},
      {id:'e13',staffId:'s6',projectId:'charge',type:'佣金提成',amount:9600,date:'2026-08-01',status:'待审批',note:'本月司机购车转化佣金'},
      {id:'e14',staffId:'s5',projectId:'g30',type:'差旅费',amount:1480,date:'2026-08-08',status:'待审批',note:'国省干线机电商机踏勘'}
    ],

    /* ---------------- 业务线运营口径（各业务线页 与 驾驶舱模块矩阵 共用同一份） ---------------- */
    bizStats:{
      ne:{pipelineMW:218,approvedMW:150,buildMW:50,gridMW:0,stuck:2},
      tr:{engIn:8800,equipIn:1860,claimable:620,ar120:268,perf:74,bidWin:3,bidTotal:18},
      rd:{cars:1286,netAdd:42,dailyRev:38.6,perCarRev:300,compliance:91.4,churn:7.8,unitGross:-12.7,poolIn:186,poolDeal:58},
      sl:{unitsYTD:412,yoy:-4.1,rev:4380,avgPrice:10.6,unitGross:0.97,grossRate:9.1,stockCapital:1860,stockOld:36}
    },

    /* ---------------- 年度经营目标（用于驾驶舱达成仪表） ---------------- */
    targets:{ rev:24000, recv:12000, net:1200, mw:200 },

    /* ---------------- 平台账号（账号/密码登录 + 角色权限） ---------------- */
    users:[
      {id:'u_admin', username:'admin',   name:'系统管理员', role:'admin',   pwd:hashPwd('admin888'),   disabled:false, createdAt:'2026-08-08'},
      {id:'u_mgr',   username:'manager', name:'经营管理者', role:'manager', pwd:hashPwd('manager888'), disabled:false, createdAt:'2026-08-08'},
      {id:'u_mem',   username:'member',  name:'业务成员',   role:'member',  pwd:hashPwd('member888'),  disabled:false, createdAt:'2026-08-08'}
    ],

    /* ---------------- 登录审计 ---------------- */
    auditLog:[]
  };
}

/* v5.0 结构补丁：老版本本地库缺字段时补齐，避免升级丢数据 */
function ensureV5(db){
  if(!db) return db;
  if(!db.bizStats) db.bizStats=seed().bizStats;
  if(!db.targets) db.targets=seed().targets;
  if(!db.users || !db.users.length) db.users=seed().users;
  if(!db.auditLog) db.auditLog=[];
  if(!db.applications) db.applications=[];
  if(!db.opportunities) db.opportunities=[];
  if(!db.invoices) db.invoices=[];
  (db.users||[]).forEach(function(u){ if(u.mustSetPwd===undefined) u.mustSetPwd=false; if(u.pwd===undefined) u.pwd=null; });
  backfillContractLines(db);
  if(db.meta) db.meta.ver='5.0';
}
/* 合同业务线回填：新建库（seed）与老库（localStorage）统一补 line，避免首次运行缺字段 */
function backfillContractLines(db){
  if(!db||!db.contracts) return;
  db.contracts.forEach(function(c){
    if(!c.line){
      var p=(db.projects||[]).filter(function(x){return x.id===c.project})[0];
      if(p&&p.line==='大交通') c.line='大交通机电';
      else if(c.cat==='车辆销售') c.line='新能源车销售';
      else c.line='新能源项目';
    }
    if(!c.code) c.code='—';
  });
  return db;
}
function BZ(){ return (DB&&DB.bizStats)||seed().bizStats; }
function TGT(){ return (DB&&DB.targets)||seed().targets; }

function loadDB(){ try{ return JSON.parse(localStorage.getItem(DB_KEY))||null }catch(e){ return null } }
function saveDB(){ try{ localStorage.setItem(DB_KEY,JSON.stringify(DB)) }catch(e){}
  if(typeof afterSave==='function') afterSave(); }
var DB = ensureV5(loadDB()) || seed();
backfillContractLines(DB); /* 首次运行（无本地库）时 seed 合同也补 line */
saveDB();
function resetDB(){ if(confirm('确定恢复为初始示例数据？本机新增的数据将被清除。')){ DB=seed(); saveDB(); location.reload(); } }
function projById(id){ return DB.projects.filter(function(p){return p.id===id})[0] || DB.projects[0]; }
function projName(id){ var p=DB.projects.filter(function(x){return x.id===id})[0]; return p?p.name:'—'; }

/* ---------------- 业务人员 / 业务费用 查询 ---------------- */
function staffById(id){ return (DB.staff||[]).filter(function(s){return s.id===id})[0]; }
function staffName(id){ var s=staffById(id); return s?s.name:'—'; }
function staffProjects(s){ return (s.projects||[]).map(projById); }
function projStaff(pid){ return (DB.staff||[]).filter(function(s){return (s.projects||[]).indexOf(pid)>=0;}); }
function staffExpenses(sid){ return (DB.expenses||[]).filter(function(e){return e.staffId===sid;}); }
function projExpenses(pid){ return (DB.expenses||[]).filter(function(e){return e.projectId===pid;}); }
function staffContracts(sid){ var ps=(staffById(sid)||{}).projects||[]; return DB.contracts.filter(function(c){return ps.indexOf(c.project)>=0;}); }
function expFilter(f){ // f: all / pending / done / reject
  var arr=DB.expenses||[];
  if(f==='pending') return arr.filter(function(e){return e.status==='待审批'});
  if(f==='done') return arr.filter(function(e){return e.status==='已报销'});
  if(f==='reject') return arr.filter(function(e){return e.status==='驳回'});
  return arr;
}

/* ---------------- 损益 / 绩效 计算 ---------------- */
/* 业务费用并入损益口径：按业务线归集业务人员报销/拓展费用（元→万元） */
/* 财务口径线名 → 人员口径线名（修复业务费用分摊为 0 的问题） */
var LINE_ALIAS={'新能源项目':'新能源','大交通机电':'大交通','网约车平台':'网约车','新能源车销售':'车辆销售'};
function lineKey(line){ return LINE_ALIAS[line]||line; }
function ctLinePrefix(line){ var m={'新能源项目':'NY','大交通机电':'JT','网约车平台':'YC','新能源车销售':'XS'}; return m[line]||'QT'; }
/* 自动生成合同编号：XY-{业务线前缀}-{YYYYMM}-{当年序号}
   - 业务线前缀按四条业务线区分（新能源/大交通/网约车/车销）
   - 序号按「同业务线 + 同签订年份」自增，体现年份与时间
   - line / signed 缺省时回退当前年月 */
function makeContractNo(line, signed){
  line=line||'新能源项目'; signed=signed||todayStr();
  var y=(signed||'').slice(0,4)|| String(new Date().getFullYear());
  var mm=(signed||'').slice(5,7)|| ('0'+(new Date().getMonth()+1)).slice(-2);
  var pre=ctLinePrefix(line);
  var n=DB.contracts.filter(function(c){ return c.line===line && (c.signed||'').slice(0,4)===y; }).length;
  return 'XY-'+pre+'-'+y+mm+'-'+('00'+(n+1)).slice(-3);
}
function bizExpByLine(line){ line=lineKey(line);
  return (DB.expenses||[]).reduce(function(a,e){
    var s=staffById(e.staffId); return a+((s&&s.line===line)?e.amount:0);
  },0)/10000;
}
function bizExpTotal(){
  return (DB.expenses||[]).reduce(function(a,e){return a+e.amount},0)/10000;
}
function staffRecv(sid){ return staffContracts(sid).filter(function(c){return c.dir==='收'}).reduce(function(a,c){return a+c.amount},0); }
function staffPay(sid){ return staffContracts(sid).filter(function(c){return c.dir==='付'}).reduce(function(a,c){return a+c.amount},0); }
/* 人员绩效：合同额(收) / 业务费用 → 效率比（万元/万元，越高越优） */
function perfData(){
  return (DB.staff||[]).map(function(s){
    var exp=(DB.expenses||[]).filter(function(e){return e.staffId===s.id})
              .reduce(function(a,e){return a+e.amount},0);
    var recv=staffRecv(s.id), expWan=exp/10000;
    var eff = expWan>0 ? (recv/expWan) : (recv>0?99999:0);
    return {s:s, exp:exp, recv:recv, expWan:expWan, eff:eff};
  }).sort(function(a,b){return b.eff-a.eff});
}
