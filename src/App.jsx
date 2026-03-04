import { useState, useEffect, useRef } from "react";
import { loadData, saveData, onDataChange } from "./firebase.js";
import * as XLSX from "xlsx";

const B="#1D60A4",Y="#F5DB2F",O="#F4C42D",D="#333",G="#22C55E",R="#EF4444",BG="#F8FAFC",W="#FFF";
const fmt=n=>(n||0).toLocaleString("vi-VN")+"đ";
const fmtT=d=>{if(!d)return"--:--";const t=new Date(d);return t.getHours().toString().padStart(2,"0")+":"+t.getMinutes().toString().padStart(2,"0");};
const td=()=>new Date().toISOString().split("T")[0];
const mk=d=>d?d.substring(0,7):new Date().toISOString().substring(0,7);
const uid=()=>"id_"+Date.now()+"_"+Math.random().toString(36).substr(2,5);
const DAYS=["CN","T2","T3","T4","T5","T6","T7"];
const DAYS_FULL=["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];
const SK="wowart_v8";
const ADMIN_PW="wowart@789";
const LEVELS=["Level 1","Level 2","Level 3","Level 4","Level 5","Level 6"];
const CA_OPTIONS=[{n:1,label:"Ca 1"},{n:2,label:"Ca 2"},{n:3,label:"Ca 3"},{n:4,label:"Ca 4"}];
const TIME_OPTIONS=[];
for(let h=7;h<=20;h++)for(let m=0;m<60;m+=30)TIME_OPTIONS.push(`${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`);
const STATUS_OPTIONS=["Đang học","Trial","Không tái ĐK","Bảo lưu"];

// ===== OBSERVATION CRITERIA =====
const OBS_CORE=[
  "Khơi gợi ý tưởng sáng tạo riêng của từng trẻ",
  "Phản hồi cá nhân phù hợp cho từng trẻ trong quá trình làm",
  "Cho trẻ thuyết trình / chia sẻ về tác phẩm",
  "Khích lệ trẻ tự tin, không áp đặt — sử dụng bảng Wow",
  "Tạo hứng thú mạnh cho chủ đề / buổi học",
  "Để trẻ khám phá với Sketchbook trước khi hướng dẫn",
  "Tương tác đều với TẤT CẢ trẻ (không bỏ sót)",
  "Quan tâm đến cảm xúc và tính cách riêng từng trẻ",
];
const OBS_PEDA=[
  "Nhớ và gọi tên tất cả trẻ trong lớp",
  "Giọng nói rõ ràng, truyền cảm, ngôn ngữ phù hợp lứa tuổi",
  "Sử dụng ngôn ngữ hình thể sinh động, giáo cụ trực quan",
  "Hướng dẫn kỹ thuật rõ ràng, các bước dễ hiểu",
  "Quan sát bao quát lớp, giữ kỷ luật và tập trung tốt",
  "Bố trí thời gian hợp lý cho từng phần",
  "Hướng dẫn trẻ sử dụng dụng cụ an toàn",
];
const OBS_PROC=[
  "Chuẩn bị lớp/bàn/dụng cụ gọn gàng trước 10 phút",
  "Chào đón trẻ thân mật, sáng tạo",
  "Tổng kết buổi học + cho trẻ dọn dẹp",
  "Trang phục WOW ART, đúng giờ, niềm nở",
  "Không làm việc cá nhân / nghe ĐT khi dạy",
];
const OBS_GROUPS=[
  {name:"CỐT LÕI Y3K",color:"#7C3AED",items:OBS_CORE,weight:3,icon:"💜"},
  {name:"SƯ PHẠM",color:G,items:OBS_PEDA,weight:2,icon:"📗"},
  {name:"THỦ TỤC & TÁC PHONG",color:O,items:OBS_PROC,weight:1,icon:"📋"},
];
const OBS_LIETS=[
  "Vẽ hoặc tô màu giùm trẻ",
  "Chê tranh hoặc hành vi của trẻ",
  "Dạy bài theo hướng khác giáo án (không xin phép)",
  "Không kiểm soát được cảm xúc bản thân",
  "Cháy giáo án hơn 20 phút",
  "Có hành vi xúc phạm, tổn thương, xâm hại trẻ",
];
const OBS_OUTCOMES=[
  "Trẻ thể hiện hứng thú rõ ràng",
  "Trẻ dám chia sẻ ý tưởng riêng",
  "Trẻ thuyết trình / giải thích tác phẩm",
  "Tác phẩm phản ánh cá tính riêng",
  "Trẻ chủ động hỏi / tương tác",
];
const OBS_SCORE_LABELS=["","Chưa đạt","Cần cải thiện","Tốt","Xuất sắc"];
const calcObs=(scores,liets)=>{
  let raw=0,max=0;
  OBS_GROUPS.forEach(g=>{g.items.forEach((_,i)=>{const k=`${g.name}_${i}`;const v=scores[k]||0;raw+=v*g.weight;max+=4*g.weight;});});
  const lietCount=OBS_LIETS.filter((_,i)=>liets[`l${i}`]).length;
  const penalty=lietCount*20;
  const final=Math.max(0,raw-penalty);
  const pct=max>0?Math.round(final/max*1000)/10:0;
  let rank="";
  if(lietCount>=2)rank="C";
  else if(lietCount===1&&pct>=80)rank="B";
  else if(lietCount===1)rank="C";
  else if(pct>=90)rank="A+";
  else if(pct>=80)rank="A";
  else if(pct>=65)rank="B";
  else rank="C";
  return {raw,max,penalty,lietCount,final,pct,rank};
};

const initData=()=>({
  users:[
    {id:"u_ceo",name:"CEO / Group Manager",role:"ceo",password:"wowart@789"},
    {id:"u_admin",name:"Admin Tổng",role:"admin_all",password:"wowart@789"},
    {id:"u_am",name:"Academic Manager",role:"academic",password:"wowart@789",centerIds:[]},
    {id:"u_adm_q7",name:"Admin Q7",role:"admin_center",password:"wowart@789",centerIds:["c1"]},
    {id:"u_adm_tp",name:"Admin Tân Phú",role:"admin_center",password:"wowart@789",centerIds:["c2"]},
    {id:"u_kt",name:"Kế toán",role:"accountant",password:"wowart@789"},
  ],
  centers:[
    {id:"c1",name:"Q7",type:"b2c"},
    {id:"c2",name:"Tân Phú",type:"b2c"},
    {id:"b1",name:"Trường Nguyễn Bỉnh Khiêm",type:"b2b"},
  ],
  teachers:[
    {id:"t1",name:"Nguyễn Thị Hạnh",phone:"0901234567",dob:"1995-03-15",education:"ĐH Mỹ Thuật TPHCM",certificate:"Y3K Level 2",joinDate:"2024-01-10",employType:"full",status:"active",fixedSalary:9000000,baselineSessions:32,otRateB2C:165000,otRateB2B:140000,salaryB2C:165000,salaryB2B:140000,level:"standard",centerIds:["c1"],bankName:"",bankAccount:"",bankHolder:""},
    {id:"t2",name:"Trần Minh Khoa",phone:"0912345678",dob:"1998-07-22",education:"CĐ Sư phạm MT",certificate:"Y3K Level 1",joinDate:"2025-06-01",employType:"part",status:"active",fixedSalary:0,baselineSessions:32,otRateB2C:130000,otRateB2B:110000,salaryB2C:130000,salaryB2B:110000,level:"junior",centerIds:["c2","b1"],bankName:"",bankAccount:"",bankHolder:""},
    {id:"t3",name:"Lê Thị Mai",phone:"0923456789",dob:"1996-12-05",education:"ĐH Sư phạm TPHCM",certificate:"Y3K Level 3",joinDate:"2023-05-15",employType:"full",status:"active",fixedSalary:11000000,baselineSessions:32,otRateB2C:200000,otRateB2B:170000,salaryB2C:200000,salaryB2B:170000,level:"senior",centerIds:["c1","b1"],bankName:"",bankAccount:"",bankHolder:""},
  ],
  students:[
    {id:"s1",name:"Nguyễn Văn An",gender:"Nam",dob:"2018-05-10",parentName:"Nguyễn Thị Lan",parentPhone:"0987654321",enrollDate:"2025-09-01",expiryDate:"2026-04-30",status:"Đang học",centerId:"c1",studentLevel:"Level 2",notes:"Bé thích vẽ động vật, PH muốn bé tự tin hơn",isTrial:false},
    {id:"s2",name:"Trần Thị Bảo",gender:"Nữ",dob:"2017-11-20",parentName:"Trần Văn Tuấn",parentPhone:"0976543210",enrollDate:"2025-10-15",expiryDate:"2026-06-15",status:"Đang học",centerId:"c1",studentLevel:"Level 3",notes:"",isTrial:false},
    {id:"s3",name:"Lê Hoàng Minh",gender:"Nam",dob:"2019-02-14",parentName:"Lê Thị Hoa",parentPhone:"0965432109",enrollDate:"2025-11-01",expiryDate:"2026-03-15",status:"Đang học",centerId:"c1",studentLevel:"Level 1",notes:"Bé mới bắt đầu, cần kiên nhẫn",isTrial:false},
    {id:"s4",name:"Phạm Mai Chi",gender:"Nữ",dob:"2018-08-05",parentName:"Phạm Thị Nga",parentPhone:"0954321098",enrollDate:"2026-01-10",expiryDate:"2026-09-10",status:"Đang học",centerId:"c2",studentLevel:"Level 2",notes:"",isTrial:false},
    {id:"s5",name:"Võ Đức Tín",gender:"Nam",dob:"2017-04-18",parentName:"Võ Văn Đức",parentPhone:"0943210987",enrollDate:"2025-08-01",expiryDate:"2026-02-01",status:"Đang học",centerId:"c2",studentLevel:"Level 4",notes:"Bé có năng khiếu, PH muốn phát triển chuyên sâu",isTrial:false},
  ],
  classes:[
    {id:"cl1",centerId:"c1",teacherId:"t1",day:6,caNumber:1,startTime:"09:00",endTime:"10:30",classLevel:"Level 2",studentIds:["s1","s2","s3"]},
    {id:"cl2",centerId:"c2",teacherId:"t2",day:6,caNumber:1,startTime:"09:00",endTime:"10:30",classLevel:"Level 2",studentIds:["s4","s5"]},
  ],
  sessions:[],
  referrals:[],
  renewals:[],
  observations:[],
  bonusPolicy:{
    renewalBonus:200000,// HV TĐK: 200k/bé
    kpiAttThreshold:95,kpiAttBonus:100000,// Chuyên cần HV ≥95%: 100k/tháng
    trialBringBonus:100000,// Dẫn 1 HV học thử: 100k/bé
    trialConvertBonus:500000,// HV học thử → ĐK chính thức: 500k/bé
    trialTeachBonus:100000,// Dạy HT thành công (bé đóng tiền): 100k/bé
    referralBonus:100000,referralQBonus:500000,// legacy compat
    obsBonus:500000,// Dự giờ đạt ≥80%: 500k/quý
    latePenalty2:50000,// Đi trễ lần 2: trừ 50k/ca
    latePenalty3:100000,// Đi trễ lần 3+: trừ 100k/ca
  },
  confirmations:{},
});

function Btn({children,onClick,bg=B,color:c=W,full,disabled,small,...p}){
  return <button onClick={onClick} disabled={disabled} style={{padding:small?"7px 12px":"13px 18px",borderRadius:11,border:"none",background:disabled?"#CBD5E1":bg,color:c,fontSize:small?12:14,fontWeight:700,cursor:disabled?"default":"pointer",width:full?"100%":"auto",transition:"all .15s",...(p.style||{})}}>{children}</button>;
}
function Card({children,style,...p}){return <div style={{background:W,borderRadius:13,padding:14,marginBottom:10,boxShadow:"0 1px 6px rgba(0,0,0,.05)",...style}} {...p}>{children}</div>;}
function Inp({label,...p}){return <div style={{marginBottom:8}}>{label&&<label style={{fontSize:11,fontWeight:600,color:"#666",display:"block",marginBottom:3}}>{label}</label>}<input style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,boxSizing:"border-box",outline:"none",...(p.style||{})}} {...p}/></div>;}
function Sel({label,options,value,onChange}){return <div style={{marginBottom:8}}>{label&&<label style={{fontSize:11,fontWeight:600,color:"#666",display:"block",marginBottom:3}}>{label}</label>}<select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,boxSizing:"border-box",background:W}}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;}
function Badge({children,bg=B+"15",color:c=B}){return <span style={{fontSize:10,padding:"2px 8px",borderRadius:16,background:bg,color:c,fontWeight:600,whiteSpace:"nowrap"}}>{children}</span>;}
function Sec({title,children,action}){return <div style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:14,fontWeight:700,color:D}}>{title}</div>{action}</div>{children}</div>;}
function StatC({label,value,hi,warn}){return <div style={{background:W,borderRadius:11,padding:"12px 14px",boxShadow:"0 1px 4px rgba(0,0,0,.04)",borderLeft:`4px solid ${warn?O:hi?G:"#E2E8F0"}`}}><div style={{fontSize:18,fontWeight:800,color:warn?O:hi?G:D}}>{value}</div><div style={{fontSize:10,color:"#888",marginTop:1}}>{label}</div></div>;}
function Row({l,v,border=true,color}){return <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:12,borderBottom:border?"1px solid #F8F8F8":"none"}}><span style={{color:color||"#666"}}>{l}</span><span style={{fontWeight:600,color:color||(v&&v!=="0đ"?D:"#CBD5E1")}}>{v}</span></div>;}

const getQuarter=(dateStr)=>{const d=new Date(dateStr);return`Q${Math.floor(d.getMonth()/3)+1}-${d.getFullYear()}`;};
const currentQuarter=()=>getQuarter(td());

const parseTime=(t)=>{if(!t)return 0;const[h,m]=t.split(":").map(Number);return h*60+m;};
const isOnTime=(checkInISO,classStartTime)=>{
  if(!checkInISO||!classStartTime)return false;
  const ci=new Date(checkInISO);const ciMin=ci.getHours()*60+ci.getMinutes();
  const csMin=parseTime(classStartTime);
  return ciMin<=csMin;// check-in trước hoặc đúng giờ bắt đầu ca = đúng giờ
};

export default function App(){
  const[data,setData]=useState(null);
  const[loading,setLoading]=useState(true);
  const[role,setRole]=useState(null);// "ceo","admin_center","academic","accountant","teacher"
  const[user,setUser]=useState(null);// {id,name,role,centerIds?}
  const[tab,setTab]=useState("");

  useEffect(()=>{
    const unsub=onDataChange((val)=>{
      const parsed={...val};
      parsed.centers=(parsed.centers||[]).map(c=>({...c,type:c.type||"b2c"}));
      parsed.teachers=(parsed.teachers||[]).map(t=>({...t,employType:t.employType||"part",status:t.status||"active",fixedSalary:t.fixedSalary||0,baselineSessions:t.baselineSessions||32,otRateB2C:t.otRateB2C||t.salaryB2C,otRateB2B:t.otRateB2B||t.salaryB2B,bankName:t.bankName||"",bankAccount:t.bankAccount||"",bankHolder:t.bankHolder||""}));
      parsed.users=parsed.users||initData().users;
      // Migration: ensure admin_all role exists
      if(!parsed.users.find(u=>u.role==="admin_all")){
        parsed.users.push({id:"u_admin",name:"Admin Tổng",role:"admin_all",password:"wowart@789"});
      }
      parsed.students=parsed.students||[];
      parsed.classes=parsed.classes||[];
      parsed.sessions=parsed.sessions||[];
      parsed.renewals=parsed.renewals||[];
      parsed.referrals=parsed.referrals||[];
      parsed.observations=parsed.observations||[];
      parsed.confirmations=parsed.confirmations||{};
      parsed.bonusPolicy=parsed.bonusPolicy||initData().bonusPolicy;
      setData(parsed);setLoading(false);
    });
    loadData().then(val=>{if(!val){const d=initData();saveData(d);}}).catch(()=>{setData(initData());setLoading(false);});
    return ()=>{if(unsub)unsub();};
  },[]);
  const save=async nd=>{setData(nd);try{await saveData(nd);}catch(e){console.error("Firebase save error:",e);}};

  if(loading)return <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:BG}}><div style={{textAlign:"center"}}><div style={{fontSize:36,fontWeight:900,color:B}}>WOW ART</div><div style={{color:"#888",marginTop:8}}>Đang tải...</div></div></div>;
  if(!role)return <RoleSelect onSelect={(r,u)=>{setRole(r);setUser(u);setTab(r==="teacher"?"attendance":"dashboard");}}/>;
  if(role&&!user)return <StaffLogin data={data} roleType={role} onLogin={u=>{setUser(u);setTab(role==="teacher"?"attendance":"dashboard");}} onBack={()=>setRole(null)}/>;

  const logout=()=>{setRole(null);setUser(null);setTab("");};
  const[showChgPw,setShowChgPw]=useState(false);
  const[cpOld,setCpOld]=useState("");const[cpNew,setCpNew]=useState("");const[cpCfm,setCpCfm]=useState("");const[cpMsg,setCpMsg]=useState("");
  const changeStaffPw=()=>{
    if(!R_TCH){// staff user
      const u=(data.users||[]).find(x=>x.id===user.id);
      if(!u||cpOld!==u.password){setCpMsg("❌ Mật khẩu cũ không đúng");return;}
      if(cpNew.length<4){setCpMsg("❌ Tối thiểu 4 ký tự");return;}
      if(cpNew!==cpCfm){setCpMsg("❌ Xác nhận không khớp");return;}
      save({...data,users:data.users.map(x=>x.id===user.id?{...x,password:cpNew}:x)});
      setCpMsg("✅ Đã đổi thành công!");setCpOld("");setCpNew("");setCpCfm("");setTimeout(()=>setShowChgPw(false),1500);
    }
  };
  const R_CEO=role==="ceo";
  const R_ALL=role==="admin_all";
  const R_ADM=role==="admin_center";
  const R_ACA=role==="academic";
  const R_ACC=role==="accountant";
  const R_TCH=role==="teacher";

  // Tab configs per role
  const ceoTabs=[{key:"dashboard",label:"Tổng quan",icon:"📊"},{key:"ai",label:"AI Agent",icon:"🤖"}];
  const allTabs=[{key:"dashboard",label:"Tổng quan",icon:"📊"},{key:"ai",label:"AI Agent",icon:"🤖"},{key:"teachers",label:"Giáo viên",icon:"👩‍🏫"},{key:"classes",label:"Lớp & HV",icon:"📚"},{key:"renewals",label:"Tái ĐK",icon:"🔄"},{key:"referrals",label:"Referral",icon:"🎯"},{key:"policy",label:"Chính sách",icon:"⚙️"},{key:"payroll",label:"Bảng lương",icon:"💰"},{key:"users",label:"Users",icon:"👥"}];
  const admTabs=[{key:"dashboard",label:"Tổng quan",icon:"📊"},{key:"teachers",label:"Giáo viên",icon:"👩‍🏫"},{key:"classes",label:"Lớp & HV",icon:"📚"},{key:"renewals",label:"Tái ĐK",icon:"🔄"},{key:"referrals",label:"Referral",icon:"🎯"},{key:"payroll",label:"Bảng lương",icon:"💰"}];
  const acaTabs=[{key:"dashboard",label:"Tổng quan",icon:"📊"},{key:"ai",label:"AI Agent",icon:"🤖"},{key:"teachers",label:"Giáo viên",icon:"👩‍🏫"},{key:"classes",label:"Lớp & HV",icon:"📚"},{key:"renewals",label:"Tái ĐK",icon:"🔄"},{key:"referrals",label:"Referral",icon:"🎯"},{key:"obs",label:"Dự giờ",icon:"👁"},{key:"payroll",label:"Xem lương",icon:"💰"}];
  const accTabs=[{key:"payroll",label:"Bảng lương",icon:"💰"}];
  const teacherTabs=[{key:"attendance",label:"Điểm danh",icon:"📋"},{key:"schedule",label:"Lịch dạy",icon:"📅"},{key:"history",label:"Lịch sử",icon:"🕐"},{key:"salary",label:"Lương",icon:"💰"},{key:"policy",label:"Quy định",icon:"📜"},{key:"profile",label:"Hồ sơ",icon:"👤"}];
  const tabs=R_CEO?ceoTabs:R_ALL?allTabs:R_ADM?admTabs:R_ACA?acaTabs:R_ACC?accTabs:teacherTabs;

  const roleLabel=R_CEO?"👑 CEO":R_ALL?"🔑 Admin Tổng":R_ADM?`📋 ${user.name}`:R_ACA?"🎓 Academic":R_ACC?"💰 Kế toán":user?.name;
  const headerBg=R_CEO?"#1a1a2e":R_ALL?"#7C3AED":R_ADM?B:R_ACA?"#059669":R_ACC?"#D97706":B;

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:headerBg,color:W,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div><span style={{fontWeight:800,fontSize:17}}>WOW ART</span><span style={{fontSize:10,opacity:.8,marginLeft:6}}>Portal</span></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Badge bg="rgba(255,255,255,.2)" color={W}>{roleLabel}</Badge>
          {!R_TCH&&<button onClick={()=>setShowChgPw(!showChgPw)} style={{background:"rgba(255,255,255,.2)",border:"none",color:W,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11}}>🔐</button>}
          <button onClick={logout} style={{background:"rgba(255,255,255,.2)",border:"none",color:W,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11}}>Thoát</button>
        </div>
      </div>
      {/* Staff password change popup */}
      {showChgPw&&!R_TCH&&<div style={{padding:14,background:"#FEF3C7",borderBottom:"2px solid #F4C42D"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#92400E",marginBottom:8}}>🔐 Đổi mật khẩu — {user.name}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          <Inp label="Mật khẩu cũ" type="password" value={cpOld} onChange={e=>setCpOld(e.target.value)} placeholder="Hiện tại"/>
          <Inp label="Mật khẩu mới" type="password" value={cpNew} onChange={e=>setCpNew(e.target.value)} placeholder="≥4 ký tự"/>
          <Inp label="Xác nhận" type="password" value={cpCfm} onChange={e=>setCpCfm(e.target.value)} placeholder="Nhập lại"/>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <Btn small onClick={changeStaffPw} bg={G}>Đổi</Btn>
          <Btn small onClick={()=>{setShowChgPw(false);setCpMsg("");}} bg="#E2E8F0" color="#666">Đóng</Btn>
          {cpMsg&&<span style={{fontSize:11,fontWeight:600,color:cpMsg.includes("✅")?G:R}}>{cpMsg}</span>}
        </div>
      </div>}
      <div style={{padding:"0 0 85px 0"}}>
        {/* CEO — Dashboard + AI only (read-only overview) */}
        {R_CEO&&<>
          {tab==="dashboard"&&<ADash data={data} save={save} canEdit={false}/>}
          {tab==="ai"&&<AAIAgent data={data}/>}
        </>}
        {/* Admin Tổng — toàn quyền tất cả center kể cả B2B */}
        {R_ALL&&<>
          {tab==="dashboard"&&<ADash data={data} save={save} canEdit={true}/>}
          {tab==="ai"&&<AAIAgent data={data}/>}
          {tab==="teachers"&&<ATeachers data={data} save={save} canEdit={true}/>}
          {tab==="classes"&&<AClasses data={data} save={save} canEdit={true}/>}
          {tab==="renewals"&&<ARenewals data={data} save={save} canEdit={true}/>}
          {tab==="referrals"&&<ARefr data={data} save={save} canEdit={true}/>}
          {tab==="policy"&&<APolicy data={data} save={save}/>}
          {tab==="payroll"&&<APayroll data={data} save={save} canEdit={true} showBank={true}/>}
          {tab==="users"&&<AUsers data={data} save={save}/>}
        </>}
        {/* Admin Center — scoped to assigned centers */}
        {R_ADM&&<>
          {tab==="dashboard"&&<ADash data={data} save={save} canEdit={true} scopeCenterIds={user.centerIds}/>}
          {tab==="teachers"&&<ATeachers data={data} save={save} canEdit={true} scopeCenterIds={user.centerIds}/>}
          {tab==="classes"&&<AClasses data={data} save={save} canEdit={true} scopeCenterIds={user.centerIds}/>}
          {tab==="renewals"&&<ARenewals data={data} save={save} canEdit={true} scopeCenterIds={user.centerIds}/>}
          {tab==="referrals"&&<ARefr data={data} save={save} canEdit={true} scopeCenterIds={user.centerIds}/>}
          {tab==="payroll"&&<APayroll data={data} save={save} canEdit={true} scopeCenterIds={user.centerIds}/>}
        </>}
        {/* Academic — read only + obs edit */}
        {R_ACA&&<>
          {tab==="dashboard"&&<ADash data={data} save={save} canEdit={false}/>}
          {tab==="ai"&&<AAIAgent data={data}/>}
          {tab==="teachers"&&<ATeachers data={data} save={save} canEdit={false}/>}
          {tab==="classes"&&<AClasses data={data} save={save} canEdit={false}/>}
          {tab==="renewals"&&<ARenewals data={data} save={save} canEdit={false}/>}
          {tab==="referrals"&&<ARefr data={data} save={save} canEdit={false}/>}
          {tab==="obs"&&<AObs data={data} save={save}/>}
          {tab==="payroll"&&<APayroll data={data} save={save} canEdit={false}/>}
        </>}
        {/* Accountant — payroll only */}
        {R_ACC&&<>
          {tab==="payroll"&&<APayroll data={data} save={save} canEdit={false} showBank={true}/>}
        </>}
        {/* Teacher */}
        {R_TCH&&<>
          {tab==="attendance"&&<TAtt data={data} save={save} user={user}/>}
          {tab==="schedule"&&<TSchedule data={data} user={user}/>}
          {tab==="history"&&<THist data={data} user={user}/>}
          {tab==="salary"&&<TSalary data={data} save={save} user={user}/>}
          {tab==="policy"&&<TPolicyView data={data}/>}
          {tab==="profile"&&<TProf data={data} save={save} user={user}/>}
        </>}
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:W,borderTop:"1px solid #E2E8F0",display:"flex",overflowX:"auto",padding:"3px 0 6px",zIndex:100}}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{flex:"1 0 auto",minWidth:50,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:0,padding:"3px 4px",color:tab===t.key?headerBg:"#94A3B8",fontWeight:tab===t.key?700:400,fontSize:9}}>
            <span style={{fontSize:16}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* LOGIN */
function RoleSelect({onSelect}){
  const roles=[
    {key:"ceo",label:"CEO / Group Manager",icon:"👑",desc:"Dashboard tổng thể + AI phân tích",color:"#1a1a2e"},
    {key:"admin_all",label:"Admin Tổng",icon:"🔑",desc:"Toàn quyền vận hành, kể cả B2B",color:"#7C3AED"},
    {key:"admin_center",label:"Admin Center",icon:"📋",desc:"Quản lý center được gán",color:B},
    {key:"academic",label:"Academic Manager",icon:"🎓",desc:"Dự giờ, báo cáo, phân tích",color:"#059669"},
    {key:"accountant",label:"Kế toán",icon:"💰",desc:"Xem bảng lương & chuyển khoản",color:"#D97706"},
    {key:"teacher",label:"Giáo viên",icon:"👩‍🏫",desc:"Điểm danh, lịch dạy, lương",color:B},
  ];
  return <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${B},#2980B9)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{marginBottom:24,textAlign:"center"}}><div style={{fontSize:42,fontWeight:900,color:W}}>WOW ART</div><div style={{color:"rgba(255,255,255,.7)",fontSize:13}}>Portal v4.0 — Chọn vai trò</div></div>
    <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:380}}>
      {roles.map(r=>(
        <button key={r.key} onClick={()=>onSelect(r.key,null)} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 18px",borderRadius:14,border:"none",background:"rgba(255,255,255,.95)",cursor:"pointer",textAlign:"left",boxShadow:"0 4px 15px rgba(0,0,0,.15)",transition:"transform .15s"}}>
          <span style={{fontSize:28,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:12,background:r.color+"15"}}>{r.icon}</span>
          <div><div style={{fontWeight:700,fontSize:15,color:r.color}}>{r.label}</div><div style={{fontSize:11,color:"#888"}}>{r.desc}</div></div>
        </button>
      ))}
    </div>
  </div>;
}

function StaffLogin({data,roleType,onLogin,onBack}){
  const[selected,setSelected]=useState("");const[pass,setPass]=useState("");const[err,setErr]=useState("");const[showPass,setShowPass]=useState(false);
  
  if(roleType==="teacher"){
    const activeTeachers=data.teachers.filter(t=>(t.status||"active")==="active");
    const go=()=>{const t=activeTeachers.find(x=>x.id===selected);if(!t){setErr("Chọn giáo viên");return;}if(pass!==(t.password||t.phone)){setErr("Sai mật khẩu");return;}onLogin({...t,role:"teacher"});};
    return <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${B},#2980B9)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{maxWidth:360,width:"100%",padding:"32px 24px",boxShadow:"0 20px 60px rgba(0,0,0,.3)",borderRadius:20}}>
        <div style={{textAlign:"center",marginBottom:20}}><span style={{fontSize:36}}>👩‍🏫</span><div style={{fontSize:17,fontWeight:700,marginTop:6}}>Đăng nhập Giáo viên</div></div>
        <Sel label="Chọn tên" value={selected} onChange={v=>{setSelected(v);setErr("");}} options={[{value:"",label:"-- Chọn giáo viên --"},...activeTeachers.map(t=>({value:t.id,label:`${t.name}`}))]}/>
        <div style={{position:"relative"}}><Inp label="Mật khẩu" type={showPass?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Nhập mật khẩu..."/>
          <button onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:8,top:26,background:"none",border:"none",cursor:"pointer",fontSize:14}}>{showPass?"🙈":"👁"}</button>
        </div>
        {err&&<div style={{color:R,fontSize:11,marginBottom:6}}>{err}</div>}
        <Btn full onClick={go}>Đăng nhập</Btn>
        <button onClick={onBack} style={{width:"100%",background:"none",border:"none",color:"#888",marginTop:10,cursor:"pointer",fontSize:12}}>← Quay lại</button>
      </Card>
    </div>;
  }

  const roleConfig={ceo:{icon:"👑",label:"CEO / Group Manager",color:"#1a1a2e"},admin_all:{icon:"🔑",label:"Admin Tổng",color:"#7C3AED"},admin_center:{icon:"📋",label:"Admin Center",color:B},academic:{icon:"🎓",label:"Academic Manager",color:"#059669"},accountant:{icon:"💰",label:"Kế toán",color:"#D97706"}};
  const cfg=roleConfig[roleType]||roleConfig.ceo;
  const availUsers=(data.users||[]).filter(u=>u.role===roleType);
  
  const go=()=>{
    if(availUsers.length===1){
      const u=availUsers[0];if(pass!==u.password){setErr("Sai mật khẩu");return;}onLogin({...u});
    }else{
      const u=availUsers.find(x=>x.id===selected);if(!u){setErr("Chọn tài khoản");return;}if(pass!==u.password){setErr("Sai mật khẩu");return;}onLogin({...u});
    }
  };

  return <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${cfg.color},${cfg.color}CC)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
    <Card style={{maxWidth:360,width:"100%",padding:"32px 24px",boxShadow:"0 20px 60px rgba(0,0,0,.3)",borderRadius:20}}>
      <div style={{textAlign:"center",marginBottom:20}}><span style={{fontSize:36}}>{cfg.icon}</span><div style={{fontSize:17,fontWeight:700,marginTop:6}}>{cfg.label}</div></div>
      {availUsers.length>1&&<Sel label="Chọn tài khoản" value={selected} onChange={v=>{setSelected(v);setErr("");}} options={[{value:"",label:"-- Chọn --"},...availUsers.map(u=>({value:u.id,label:u.name+(u.centerIds?.length?` (${u.centerIds.join(",")})`:"")}))]}/>}
      {availUsers.length===1&&<div style={{textAlign:"center",marginBottom:12,padding:8,background:cfg.color+"10",borderRadius:8}}><div style={{fontWeight:700,color:cfg.color}}>{availUsers[0].name}</div></div>}
      {availUsers.length===0&&<div style={{textAlign:"center",color:R,marginBottom:12}}>Chưa có tài khoản. Liên hệ CEO để tạo.</div>}
      <div style={{position:"relative"}}><Inp label="Mật khẩu" type={showPass?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Nhập mật khẩu..."/>
        <button onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:8,top:26,background:"none",border:"none",cursor:"pointer",fontSize:14}}>{showPass?"🙈":"👁"}</button>
      </div>
      {err&&<div style={{color:R,fontSize:11,marginBottom:6}}>{err}</div>}
      <Btn full onClick={go} bg={cfg.color}>Đăng nhập</Btn>
      <button onClick={onBack} style={{width:"100%",background:"none",border:"none",color:"#888",marginTop:10,cursor:"pointer",fontSize:12}}>← Quay lại</button>
    </Card>
  </div>;
}

/* ADMIN DASHBOARD */
function ADash({data,save,canEdit=true,scopeCenterIds}){
  const[fMo,setFMo]=useState(mk());
  const scopedCenters=scopeCenterIds?data.centers.filter(c=>scopeCenterIds.includes(c.id)):data.centers;
  const[fCenter,setFCenter]=useState(scopeCenterIds?scopeCenterIds[0]||"all":"all");
  const[fTeacher,setFTeacher]=useState("all");
  const[fType,setFType]=useState("all");// full|part|all
  const[editSes,setEditSes]=useState(null);
  const[report,setReport]=useState("overview");// overview|expiry|noCheckout|lowAtt|unconfirmed
  const q=currentQuarter();

  // Filtered sessions
  const fSessions=data.sessions.filter(s=>{
    if(mk(s.date)!==fMo)return false;
    if(fCenter!=="all"&&s.centerId!==fCenter)return false;
    if(fTeacher!=="all"&&s.teacherId!==fTeacher)return false;
    return true;
  });
  const ts=data.sessions.filter(s=>s.date===td());
  const active=ts.filter(s=>s.checkIn&&!s.checkOut);
  const hvToday=ts.reduce((a,s)=>a+(s.attendance||[]).filter(x=>x.present).length,0);
  const trialConv=fSessions.reduce((a,s)=>a+(s.attendance||[]).filter(x=>x.isTrial&&x.converted).length,0);
  const refMonth=(data.referrals||[]).filter(r=>mk(r.date)===fMo);

  // Filtered teachers
  let filteredTs=data.teachers;
  if(fCenter!=="all")filteredTs=filteredTs.filter(t=>(t.centerIds||[]).includes(fCenter));
  if(fTeacher!=="all")filteredTs=filteredTs.filter(t=>t.id===fTeacher);
  if(fType!=="all")filteredTs=filteredTs.filter(t=>(t.employType||"part")===fType);
  const fullTs=filteredTs.filter(t=>(t.employType||"part")==="full");
  const partTs=filteredTs.filter(t=>(t.employType||"part")==="part");

  const calcT=t=>{const ss=data.sessions.filter(s=>s.teacherId===t.id&&mk(s.date)===fMo&&(fCenter==="all"||s.centerId===fCenter));return calcSalary(t,ss,data,fMo);};
  const qSessions=data.sessions.filter(s=>getQuarter(s.date)===q);

  // ===== HV EXPIRY ALERTS =====
  const now=new Date();const in30=new Date(now.getTime()+30*24*3600000);const in7=new Date(now.getTime()+7*24*3600000);
  const activeHV=data.students.filter(s=>s.status==="Đang học"&&s.expiryDate);
  // Enrich each HV with class + teacher info
  const enrichHV=s=>{
    const cn=data.centers.find(c=>c.id===s.centerId);
    const cls=data.classes.filter(c=>c.studentIds.includes(s.id));
    const classInfo=cls.map(cl=>{
      const t=data.teachers.find(x=>x.id===cl.teacherId);
      return {className:`${DAYS_FULL[cl.day]} Ca${cl.caNumber} (${cl.startTime}-${cl.endTime})`,teacherName:t?.name||"?",classLevel:cl.classLevel};
    });
    return {...s,centerName:cn?.name||"?",classInfo};
  };
  const expired=activeHV.filter(s=>new Date(s.expiryDate)<now).map(enrichHV);
  const expiring7=activeHV.filter(s=>{const d=new Date(s.expiryDate);return d>=now&&d<=in7;}).map(enrichHV);
  const expiring30=activeHV.filter(s=>{const d=new Date(s.expiryDate);return d>in7&&d<=in30;}).map(enrichHV);

  // ===== EDIT SESSION =====
  const saveEditSes=(sesId,updates)=>{
    save({...data,sessions:data.sessions.map(s=>s.id===sesId?{...s,...updates}:s)});
    setEditSes(null);
  };
  const deleteSes=sesId=>{if(confirm("Xóa session này?"))save({...data,sessions:data.sessions.filter(s=>s.id!==sesId)});setEditSes(null);};

  // Helper for teacher card
  const renderTeacherCard=(t)=>{
    const c=calcT(t);const isFull=(t.employType||"part")==="full";
    const accent=isFull?"#7C3AED":B;
    const tClasses=data.classes.filter(cl=>cl.teacherId===t.id);
    const completionRate=isFull&&c.baselineSessions>0?Math.min(100,Math.round(c.sessionCount/c.baselineSessions*100)):0;
    const qss=qSessions.filter(s=>s.teacherId===t.id&&s.checkIn&&s.checkOut);
    const qTrials=qss.reduce((a,s)=>a+(s.attendance||[]).filter(x=>x.isTrial&&x.converted).length,0);
    const qRefs=(data.referrals||[]).filter(r=>r.teacherId===t.id&&getQuarter(r.date)===q).length;
    const qRenewals=(data.renewals||[]).filter(r=>r.teacherId===t.id&&getQuarter(r.date)===q).length;
    const allSS=data.sessions.filter(s=>s.teacherId===t.id&&s.checkOut&&mk(s.date)===fMo);
    let onTime=0,totCI=0;
    allSS.forEach(s=>{if(s.checkIn&&s.classStartTime){totCI++;const ci=new Date(s.checkIn),ciM=ci.getHours()*60+ci.getMinutes(),csM=parseTime(s.classStartTime);if(ciM<=csM)onTime++;}});
    const onTimeRate=totCI?Math.round(onTime/totCI*100):0;
    const prepCount=allSS.filter(s=>s.lessonPrepped).length;
    const prepRate=allSS.length?Math.round(prepCount/allSS.length*100):0;
    const tStudentIds=[...new Set(tClasses.flatMap(cl=>cl.studentIds))];
    const qEnd=new Date(now.getFullYear(),Math.ceil((now.getMonth()+1)/3)*3,0);
    const expiring=tStudentIds.filter(sid=>{const st=data.students.find(s=>s.id===sid);return st?.expiryDate&&new Date(st.expiryDate)<=qEnd;}).length;
    const estRevenue=c.totalHV*1500000;
    const roi=c.total>0?Math.round(estRevenue/c.total*100)/100:0;

    return <Card key={t.id} style={{borderLeft:`3px solid ${accent}`,overflow:"hidden"}}>
      <div style={{padding:"8px 12px",background:accent+"08"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><span style={{fontWeight:700,fontSize:14}}>{t.name}</span> <Badge bg={accent+"12"} color={accent}>{isFull?"Full":"Part"} • {t.level}</Badge></div>
          <span style={{fontSize:11,color:accent,fontWeight:700}}>{isFull?`${fmt(t.fixedSalary||0)}/th`:`${c.sessionCount} buổi`}</span>
        </div>
      </div>
      <div style={{padding:"10px 12px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:10}}>
          {isFull&&<div style={{textAlign:"center",padding:6,background:completionRate>=100?G+"08":completionRate>=80?"#FFF7ED":"#FEF2F2",borderRadius:8}}>
            <div style={{fontSize:16,fontWeight:800,color:completionRate>=100?G:completionRate>=80?O:R}}>{completionRate}%</div>
            <div style={{fontSize:9,color:"#888"}}>Ca ({c.sessionCount}/{c.baselineSessions})</div>
          </div>}
          <div style={{textAlign:"center",padding:6,background:B+"06",borderRadius:8}}>
            <div style={{fontSize:16,fontWeight:800,color:B}}>{c.avgAtt}%</div>
            <div style={{fontSize:9,color:"#888"}}>TL đi học</div>
          </div>
          <div style={{textAlign:"center",padding:6,background:onTimeRate>=90?G+"08":O+"08",borderRadius:8}}>
            <div style={{fontSize:16,fontWeight:800,color:onTimeRate>=90?G:O}}>{onTimeRate}%</div>
            <div style={{fontSize:9,color:"#888"}}>Đúng giờ</div>
          </div>
          <div style={{textAlign:"center",padding:6,background:prepRate>=90?G+"08":prepRate>=70?"#FFF7ED":"#FEF2F2",borderRadius:8}}>
            <div style={{fontSize:16,fontWeight:800,color:prepRate>=90?G:prepRate>=70?O:R}}>{prepRate}%</div>
            <div style={{fontSize:9,color:"#888"}}>Soạn bài ({prepCount}/{allSS.length})</div>
          </div>
          {!isFull&&<div style={{textAlign:"center",padding:6,background:roi>=2?G+"08":roi>=1?"#FFF7ED":"#FEF2F2",borderRadius:8}}>
            <div style={{fontSize:16,fontWeight:800,color:roi>=2?G:roi>=1?O:R}}>{roi}x</div>
            <div style={{fontSize:9,color:"#888"}}>ROI</div>
          </div>}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
          <Badge bg={B+"12"} color={B}>📚 {tClasses.length} lớp</Badge>
          <Badge bg={G+"12"} color={G}>👥 {c.totalHV} HV</Badge>
          {isFull&&c.otSessions>0&&<Badge bg={O+"12"} color={O}>🔥 +{c.otSessions} OT</Badge>}
          <Badge>Trial: {c.trialConv}</Badge><Badge>Ref: {c.refCount}</Badge><Badge>TĐK: {c.renewalCount}</Badge>
          {expiring>0&&<Badge bg={R+"12"} color={R}>⚠️ {expiring} hết khóa</Badge>}
          {(()=>{const tqObs=data.observations.filter(o=>o.teacherId===t.id&&getQuarter(o.date)===q);const obsOk=tqObs.length>=2;
            return tqObs.length>0?<Badge bg={(obsOk?G:O)+"12"} color={obsOk?G:O}>👁 {tqObs.length}/2 dự giờ ({Math.round(tqObs.reduce((a,o)=>a+(o.pct||o.score||0),0)/tqObs.length)}%)</Badge>
              :<Badge bg={R+"12"} color={R}>👁 0/2 chưa dự giờ</Badge>;})()}
        </div>
        <div style={{fontSize:11,fontWeight:700,color:accent,marginBottom:4}}>📈 Quý {q}: <span style={{fontWeight:400,color:"#666"}}>Ca: {qss.length} | Trial: {qTrials} | Ref: {qRefs} | TĐK: {qRenewals}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,paddingTop:6,borderTop:"1px solid #F0F0F0"}}>
          <span style={{fontSize:11,color:"#888"}}>Tổng chi</span><span style={{fontWeight:800,color:accent,fontSize:13}}>{fmt(c.total)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#888"}}>Chi phí/HV</span><span style={{fontSize:10,fontWeight:600}}>{fmt(c.costPerHV)}</span></div>
      </div>
    </Card>;
  };

  return <div style={{padding:14}}>
    {/* LIVE header */}
    <div style={{background:`linear-gradient(135deg,${B},#2980B9)`,borderRadius:14,padding:16,marginBottom:14,color:W}}>
      <div style={{fontSize:13,fontWeight:600,opacity:.8,marginBottom:10}}>🔴 LIVE — {new Date().toLocaleDateString("vi-VN")}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
        {[{v:active.length,l:"Đang dạy"},{v:ts.length,l:"Buổi h.nay"},{v:hvToday,l:"HV có mặt"},{v:data.teachers.length,l:"Tổng GV"}].map((x,i)=>
          <div key={i} style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:800}}>{x.v}</div><div style={{fontSize:9,opacity:.7}}>{x.l}</div></div>
        )}
      </div>
    </div>

    {/* ===== QUICK REPORT FILTERS ===== */}
    {(()=>{
      const hvExpiry7=activeHV.filter(s=>new Date(s.expiryDate)<=in7).length;
      const hvExpiry30=activeHV.filter(s=>{const d=new Date(s.expiryDate);return d>in7&&d<=in30;}).length;
      const noCheckout=ts.filter(s=>s.checkIn&&!s.checkOut).length;
      const unconfirmed=data.teachers.filter(t=>!data.confirmations[`${t.id}_${fMo}`]).length;
      const lowAtt=filteredTs.filter(t=>{const c=calcT(t);return c.avgAtt>0&&c.avgAtt<80;}).length;
      const lowPrep=filteredTs.filter(t=>{const ss=data.sessions.filter(s=>s.teacherId===t.id&&s.checkOut&&mk(s.date)===fMo);const pr=ss.length?Math.round(ss.filter(s=>s.lessonPrepped).length/ss.length*100):0;return ss.length>0&&pr<90;}).length;
      const chips=[
        {k:"overview",l:"📊 Tổng quan",count:null,color:B},
        {k:"expiry",l:"⏰ Hết hạn",count:hvExpiry7+hvExpiry30,color:hvExpiry7>0?R:O},
        {k:"noCheckout",l:"🔴 Chưa checkout",count:noCheckout,color:noCheckout>0?R:"#888"},
        {k:"lowAtt",l:"📉 Chuyên cần thấp",count:lowAtt,color:lowAtt>0?O:"#888"},
        {k:"lowPrep",l:"📝 Soạn bài thấp",count:lowPrep,color:lowPrep>0?O:"#888"},
        {k:"unconfirmed",l:"⏳ Chưa XN lương",count:unconfirmed,color:unconfirmed>0?O:"#888"},
      ];
      return <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:14,paddingBottom:4}}>
        {chips.map(c=>(
          <button key={c.k} onClick={()=>setReport(c.k)} style={{display:"flex",alignItems:"center",gap:4,padding:"7px 12px",borderRadius:20,border:`2px solid ${report===c.k?c.color:"#E2E8F0"}`,background:report===c.k?c.color+"12":W,color:report===c.k?c.color:"#888",fontWeight:report===c.k?700:500,cursor:"pointer",fontSize:11,whiteSpace:"nowrap",transition:"all .15s"}}>
            {c.l}{c.count!==null&&<span style={{background:c.count>0?c.color+"20":"#F1F5F9",color:c.count>0?c.color:"#888",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:800}}>{c.count}</span>}
          </button>
        ))}
      </div>;
    })()}

    {/* ===== REPORT: EXPIRY ===== */}
    {report==="expiry"&&<Card style={{marginBottom:14,border:`2px solid ${O}`}}>
      <div style={{fontSize:13,fontWeight:700,color:R,marginBottom:8}}>⏰ Học viên sắp hết hạn</div>
      {expired.length>0&&<div style={{marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:700,color:R,marginBottom:4}}>🔴 ĐÃ HẾT HẠN ({expired.length})</div>
        {expired.slice(0,10).map(s=><div key={s.id} style={{fontSize:11,padding:"4px 0",borderBottom:"1px solid #FEE2E2",display:"flex",justifyContent:"space-between"}}>
          <span>{s.name} <span style={{color:"#888"}}>({data.centers.find(c=>c.id===s.centerId)?.name})</span></span>
          <span style={{color:R,fontWeight:600}}>{s.expiryDate}</span>
        </div>)}
      </div>}
      {expiring7.length>0&&<div style={{marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:700,color:O,marginBottom:4}}>🟠 HẾT HẠN TRONG 7 NGÀY ({expiring7.length})</div>
        {expiring7.map(s=><div key={s.id} style={{fontSize:11,padding:"4px 0",borderBottom:"1px solid #FDE68A",display:"flex",justifyContent:"space-between"}}>
          <span>{s.name} — GV: {s.classInfo?.[0]?.teacherName||"?"} <span style={{color:"#888"}}>({data.centers.find(c=>c.id===s.centerId)?.name})</span></span>
          <span style={{color:O,fontWeight:600}}>{s.expiryDate}</span>
        </div>)}
      </div>}
      {expiring30.length>0&&<div>
        <div style={{fontSize:11,fontWeight:700,color:B,marginBottom:4}}>🔵 HẾT HẠN TRONG 30 NGÀY ({expiring30.length})</div>
        {expiring30.slice(0,10).map(s=><div key={s.id} style={{fontSize:11,padding:"4px 0",borderBottom:"1px solid #E2E8F0",display:"flex",justifyContent:"space-between"}}>
          <span>{s.name} — GV: {s.classInfo?.[0]?.teacherName||"?"} <span style={{color:"#888"}}>({data.centers.find(c=>c.id===s.centerId)?.name})</span></span>
          <span style={{color:B,fontWeight:600}}>{s.expiryDate}</span>
        </div>)}
      </div>}
      {expired.length===0&&expiring7.length===0&&expiring30.length===0&&<div style={{color:"#888",textAlign:"center",fontSize:12}}>Không có HV nào sắp hết hạn</div>}
    </Card>}

    {/* ===== REPORT: NO CHECKOUT ===== */}
    {report==="noCheckout"&&<Card style={{marginBottom:14,border:`2px solid ${R}`}}>
      <div style={{fontSize:13,fontWeight:700,color:R,marginBottom:8}}>🔴 Buổi dạy chưa checkout hôm nay</div>
      {ts.filter(s=>s.checkIn&&!s.checkOut).map(s=>{
        const t=data.teachers.find(x=>x.id===s.teacherId);const cn=data.centers.find(c=>c.id===s.centerId);
        return <div key={s.id} style={{fontSize:12,padding:"6px 0",borderBottom:"1px solid #FEE2E2",display:"flex",justifyContent:"space-between"}}>
          <span>{t?.name} • {cn?.name}</span>
          <span style={{color:"#888"}}>Check-in: {fmtT(s.checkIn)}</span>
        </div>;
      })}
      {ts.filter(s=>s.checkIn&&!s.checkOut).length===0&&<div style={{color:G,textAlign:"center",fontSize:12}}>✅ Tất cả đã checkout</div>}
    </Card>}

    {/* ===== REPORT: LOW ATTENDANCE ===== */}
    {report==="lowAtt"&&<Card style={{marginBottom:14,border:`2px solid ${O}`}}>
      <div style={{fontSize:13,fontWeight:700,color:O,marginBottom:8}}>📉 GV có tỷ lệ chuyên cần dưới 80%</div>
      {filteredTs.filter(t=>{const c=calcT(t);return c.avgAtt>0&&c.avgAtt<80;}).map(t=>{
        const c=calcT(t);
        return <div key={t.id} style={{fontSize:12,padding:"6px 0",borderBottom:"1px solid #FDE68A",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><span style={{fontWeight:600}}>{t.name}</span> <span style={{color:"#888",fontSize:10}}>({c.sessionCount} buổi)</span></div>
          <Badge bg={R+"12"} color={R}>{c.avgAtt}% chuyên cần</Badge>
        </div>;
      })}
      {filteredTs.filter(t=>{const c=calcT(t);return c.avgAtt>0&&c.avgAtt<80;}).length===0&&<div style={{color:G,textAlign:"center",fontSize:12}}>✅ Tất cả GV trên 80%</div>}
    </Card>}

    {/* ===== REPORT: LOW PREP RATE ===== */}
    {report==="lowPrep"&&<Card style={{marginBottom:14,border:`2px solid ${O}`}}>
      <div style={{fontSize:13,fontWeight:700,color:O,marginBottom:8}}>📝 GV có tỷ lệ soạn bài dưới 90% — Tháng {fMo}</div>
      {filteredTs.map(t=>{
        const ss=data.sessions.filter(s=>s.teacherId===t.id&&s.checkOut&&mk(s.date)===fMo);
        const prepped=ss.filter(s=>s.lessonPrepped).length;
        const pr=ss.length?Math.round(prepped/ss.length*100):0;
        if(ss.length===0||pr>=90)return null;
        return <div key={t.id} style={{fontSize:12,padding:"6px 0",borderBottom:"1px solid #FDE68A",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><span style={{fontWeight:600}}>{t.name}</span> <span style={{color:"#888",fontSize:10}}>({ss.length} buổi)</span></div>
          <Badge bg={pr<70?R+"12":O+"12"} color={pr<70?R:O}>{prepped}/{ss.length} soạn bài ({pr}%)</Badge>
        </div>;
      }).filter(Boolean)}
      {filteredTs.filter(t=>{const ss=data.sessions.filter(s=>s.teacherId===t.id&&s.checkOut&&mk(s.date)===fMo);const pr=ss.length?Math.round(ss.filter(s=>s.lessonPrepped).length/ss.length*100):0;return ss.length>0&&pr<90;}).length===0&&<div style={{color:G,textAlign:"center",fontSize:12}}>✅ Tất cả GV soạn bài trên 90%</div>}
    </Card>}

    {/* ===== REPORT: UNCONFIRMED SALARY ===== */}
    {report==="unconfirmed"&&<Card style={{marginBottom:14,border:`2px solid ${O}`}}>
      <div style={{fontSize:13,fontWeight:700,color:O,marginBottom:8}}>⏳ GV chưa xác nhận lương tháng {fMo}</div>
      {data.teachers.filter(t=>!data.confirmations[`${t.id}_${fMo}`]).map(t=>{
        const c=calcT(t);
        return <div key={t.id} style={{fontSize:12,padding:"6px 0",borderBottom:"1px solid #FDE68A",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><span style={{fontWeight:600}}>{t.name}</span> <Badge>{(t.employType||"part")==="full"?"Full":"Part"}</Badge></div>
          <span style={{fontWeight:700,color:B}}>{fmt(c.total)}</span>
        </div>;
      })}
      {data.teachers.filter(t=>!data.confirmations[`${t.id}_${fMo}`]).length===0&&<div style={{color:G,textAlign:"center",fontSize:12}}>✅ Tất cả đã xác nhận</div>}
    </Card>}

    {/* ===== FILTERS (show in overview mode) ===== */}
    {report==="overview"&&<>
      <div style={{fontSize:12,fontWeight:700,color:B,marginBottom:8}}>🔍 Bộ lọc</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
        <div><label style={{fontSize:10,fontWeight:600,color:"#888"}}>Tháng</label><input type="month" value={fMo} onChange={e=>setFMo(e.target.value)} style={{width:"100%",padding:"6px 8px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:12,boxSizing:"border-box"}}/></div>
        <div><label style={{fontSize:10,fontWeight:600,color:"#888"}}>Trung tâm / Điểm dạy</label><select value={fCenter} onChange={e=>setFCenter(e.target.value)} style={{width:"100%",padding:"6px 8px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:12,boxSizing:"border-box",background:W}}>
          {!scopeCenterIds&&<option value="all">Tất cả</option>}
          {scopedCenters.map(c=><option key={c.id} value={c.id}>{c.type==="b2b"?"🏫":"🏠"} {c.name}</option>)}
        </select></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        <div><label style={{fontSize:10,fontWeight:600,color:"#888"}}>Giáo viên</label><select value={fTeacher} onChange={e=>setFTeacher(e.target.value)} style={{width:"100%",padding:"6px 8px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:12,boxSizing:"border-box",background:W}}>
          <option value="all">Tất cả GV</option>
          {data.teachers.map(t=><option key={t.id} value={t.id}>{t.name} ({(t.employType||"part")==="full"?"F":"P"})</option>)}
        </select></div>
        <div><label style={{fontSize:10,fontWeight:600,color:"#888"}}>Loại hình</label><select value={fType} onChange={e=>setFType(e.target.value)} style={{width:"100%",padding:"6px 8px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:12,boxSizing:"border-box",background:W}}>
          <option value="all">Full + Part</option>
          <option value="full">👔 Full-time</option>
          <option value="part">⏰ Part-time</option>
        </select></div>
      </div>
    </Card>

    {/* Quick stats */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
      <StatC label={`Buổi ${fMo}`} value={fSessions.length}/>
      <StatC label="Trial chốt" value={trialConv} hi={trialConv>0}/>
      <StatC label="Referral" value={refMonth.length} hi={refMonth.length>0}/>
      <StatC label="👔 Full" value={fullTs.length}/>
      <StatC label="⏰ Part" value={partTs.length}/>
      <StatC label="Tổng HV active" value={activeHV.length}/>
    </div>

    {/* ===== HV EXPIRY ALERTS ===== */}
    {(expired.length>0||expiring7.length>0||expiring30.length>0)&&<Card style={{marginBottom:14,border:`2px solid ${R}`,padding:"12px 14px"}}>
      <div style={{fontSize:13,fontWeight:700,color:R,marginBottom:8}}>🚨 Cảnh báo HV hết khóa</div>
      {[{list:expired,title:"❌ ĐÃ HẾT KHÓA",color:R,showPhone:true},{list:expiring7,title:"⚠️ HẾT TRONG 7 NGÀY",color:O,showPhone:true},{list:expiring30,title:"📅 HẾT TRONG 30 NGÀY",color:B,showPhone:false}].map(({list,title,color,showPhone})=>
        list.length>0&&<div key={title} style={{marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,color,marginBottom:4}}>{title} ({list.length})</div>
          {list.slice(0,8).map(s=>(
            <div key={s.id} style={{padding:"6px 8px",marginBottom:4,background:color+"06",borderRadius:8,borderLeft:`3px solid ${color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:700,fontSize:12}}>{s.name}</span>
                <span style={{color,fontWeight:600,fontSize:11}}>{s.expiryDate}</span>
              </div>
              <div style={{fontSize:10,color:"#666",marginTop:2}}>
                📍 {s.centerName} • {s.studentLevel||""}
                {showPhone&&<span> • 📞 {s.parentName}: <strong style={{color:B}}>{s.parentPhone}</strong></span>}
              </div>
              {s.classInfo.map((ci,i)=>(
                <div key={i} style={{fontSize:10,color:"#888",marginTop:1}}>
                  📚 {ci.className} • 👩‍🏫 <strong>{ci.teacherName}</strong> • {ci.classLevel}
                </div>
              ))}
              {s.classInfo.length===0&&<div style={{fontSize:10,color:"#CBD5E1",marginTop:1}}>⚠️ Chưa xếp lớp</div>}
            </div>
          ))}
          {list.length>8&&<div style={{fontSize:10,color:"#888",textAlign:"center"}}>...và {list.length-8} HV nữa</div>}
        </div>
      )}
    </Card>}

    {/* ===== TEACHER CARDS ===== */}
    {fullTs.length>0&&<Sec title={`👔 Full-time (${fullTs.length})`}>{fullTs.map(renderTeacherCard)}</Sec>}
    {partTs.length>0&&<Sec title={`⏰ Part-time (${partTs.length})`}>{partTs.map(renderTeacherCard)}</Sec>}
    {filteredTs.length===0&&<div style={{textAlign:"center",color:"#888",padding:20,fontSize:12}}>Không có GV phù hợp bộ lọc</div>}

    {/* ===== EDIT SESSION (Recent) ===== */}
    <Sec title={`📝 Sessions gần đây — ${fMo}`} action={<Badge>{fSessions.length} buổi</Badge>}>
      {fSessions.sort((a,b)=>(b.checkIn||"").localeCompare(a.checkIn||"")).slice(0,10).map(s=>{
        const t=data.teachers.find(x=>x.id===s.teacherId);
        const cn=data.centers.find(c=>c.id===s.centerId);
        const present=(s.attendance||[]).filter(a=>a.present).length;
        const isEditing=editSes===s.id;
        return <Card key={s.id} style={{padding:"8px 12px",borderLeft:s.checkOut?`3px solid ${G}`:`3px solid ${O}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontWeight:600,fontSize:12}}>{t?.name} • {cn?.name} <Badge>{s.type?.toUpperCase()}</Badge></div>
              <div style={{fontSize:10,color:"#888"}}>{s.date} | {fmtT(s.checkIn)}→{fmtT(s.checkOut)} | {present}/{(s.attendance||[]).length} HV</div>
              {s.reportNote&&<div style={{fontSize:10,color:B,fontStyle:"italic"}}>📝 {s.reportNote}</div>}
            </div>
            <button onClick={()=>setEditSes(isEditing?null:s.id)} style={{background:isEditing?R+"10":B+"10",border:"none",borderRadius:7,padding:"4px 8px",color:isEditing?R:B,cursor:"pointer",fontSize:10,fontWeight:600}}>{isEditing?"✕":"✏️"}</button>
          </div>
          {isEditing&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed #E2E8F0"}}>
            <div style={{fontSize:11,fontWeight:700,color:B,marginBottom:6}}>Chỉnh sửa điểm danh:</div>
            {/* Substitute teacher */}
            <div style={{marginBottom:8,padding:8,background:"#FFFBEB",borderRadius:8,border:"1px solid #FDE68A"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#92400E",marginBottom:4}}>🔄 GV dạy thế (đổi người nhận lương buổi này)</div>
              <select value={s.teacherId} onChange={e=>{save({...data,sessions:data.sessions.map(ss=>ss.id===s.id?{...ss,teacherId:e.target.value,substituteNote:`Dạy thế cho ${t?.name}`}:ss)});}} style={{width:"100%",padding:"6px 10px",borderRadius:7,border:"1.5px solid #FDE68A",fontSize:12,background:W}}>
                {data.teachers.filter(x=>(x.status||"active")==="active").map(x=><option key={x.id} value={x.id}>{x.name}{x.id===s.teacherId?" (hiện tại)":""}</option>)}
              </select>
              {s.substituteNote&&<div style={{fontSize:9,color:"#92400E",marginTop:2}}>📝 {s.substituteNote}</div>}
            </div>
            {(s.attendance||[]).map(a=>(
              <div key={a.studentId} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",fontSize:12}}>
                <span>{a.name} {a.isTrial&&"🌟"}</span>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>save({...data,sessions:data.sessions.map(ss=>ss.id===s.id?{...ss,attendance:ss.attendance.map(x=>x.studentId===a.studentId?{...x,present:!x.present}:x)}:ss)})} style={{padding:"2px 8px",borderRadius:5,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,background:a.present?G+"15":"#FEE2E2",color:a.present?G:R}}>{a.present?"✓ Có":"✗ Vắng"}</button>
                  {a.isTrial&&<button onClick={()=>save({...data,sessions:data.sessions.map(ss=>ss.id===s.id?{...ss,attendance:ss.attendance.map(x=>x.studentId===a.studentId?{...x,converted:!x.converted}:x)}:ss)})} style={{padding:"2px 8px",borderRadius:5,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,background:a.converted?G+"15":"#F1F5F9",color:a.converted?G:"#888"}}>{a.converted?"✓ Chốt":"Chốt"}</button>}
                </div>
              </div>
            ))}
            <div style={{display:"flex",gap:4,marginTop:6}}>
              <button onClick={()=>deleteSes(s.id)} style={{flex:1,padding:"6px",borderRadius:7,border:`1px solid ${R}`,background:R+"08",color:R,cursor:"pointer",fontSize:11,fontWeight:600}}>🗑 Xóa session</button>
              <button onClick={()=>setEditSes(null)} style={{flex:1,padding:"6px",borderRadius:7,border:"1px solid #E2E8F0",background:W,color:"#888",cursor:"pointer",fontSize:11}}>Đóng</button>
            </div>
          </div>}
        </Card>;
      })}
      {fSessions.length>10&&<div style={{fontSize:10,color:"#888",textAlign:"center"}}>Hiện 10/{fSessions.length} sessions</div>}
    </Sec>

    <Btn full bg={R} onClick={async()=>{if(confirm("Reset toàn bộ dữ liệu demo?")){await save(initData());}}}>🔄 Reset demo</Btn>
    </>}
  </div>;
}

/* ADMIN TEACHERS */
function ATeachers({data,save,canEdit=true,fullData,scopeCenterIds}){
  const scopedTeachers=scopeCenterIds?data.teachers.filter(t=>(t.centerIds||[]).some(cid=>scopeCenterIds.includes(cid))):data.teachers;
  const scopedCenters=scopeCenterIds?data.centers.filter(c=>scopeCenterIds.includes(c.id)):data.centers;
  const[show,setShow]=useState(false);const[edit,setEdit]=useState(null);
  const empty={name:"",phone:"",dob:"",education:"",certificate:"",joinDate:td(),employType:"part",fixedSalary:0,baselineSessions:32,otRateB2C:150000,otRateB2B:130000,salaryB2C:150000,salaryB2B:130000,level:"standard",centerIds:[scopedCenters[0]?.id||data.centers[0]?.id],bankName:"",bankAccount:"",bankHolder:""};
  const[form,setForm]=useState(empty);const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const isFull=form.employType==="full";
  const doSave=()=>{
    if(!form.name||!form.phone)return alert("Nhập đủ tên và SĐT");
    if(edit)save({...data,teachers:data.teachers.map(t=>t.id===edit?{...t,...form}:t)});
    else save({...data,teachers:[...data.teachers,{...form,id:uid(),status:"active"}]});
    setShow(false);setEdit(null);setForm(empty);
  };
  const startEdit=t=>{setForm({name:t.name,phone:t.phone,dob:t.dob||"",education:t.education||"",certificate:t.certificate||"",joinDate:t.joinDate||"",employType:t.employType||"part",fixedSalary:t.fixedSalary||0,baselineSessions:t.baselineSessions||32,otRateB2C:t.otRateB2C||t.salaryB2C,otRateB2B:t.otRateB2B||t.salaryB2B,salaryB2C:t.salaryB2C,salaryB2B:t.salaryB2B,level:t.level,centerIds:t.centerIds||[],bankName:t.bankName||"",bankAccount:t.bankAccount||"",bankHolder:t.bankHolder||""});setEdit(t.id);setShow(true);};
  const toggleStatus=(tid)=>{
    const t=data.teachers.find(x=>x.id===tid);if(!t)return;
    const newStatus=(t.status||"active")==="active"?"inactive":"active";
    const label=newStatus==="inactive"?"🔒 KHÓA":"🔓 MỞ KHÓA";
    if(!confirm(`${label} giáo viên ${t.name}?\n\n${newStatus==="inactive"?"GV sẽ KHÔNG thể đăng nhập Portal.":"GV sẽ có thể đăng nhập lại."}`))return;
    save({...data,teachers:data.teachers.map(x=>x.id===tid?{...x,status:newStatus}:x)});
  };

  const activeTeachers=scopedTeachers.filter(t=>(t.status||"active")==="active");
  const inactiveTeachers=scopedTeachers.filter(t=>t.status==="inactive");
  const fullTeachers=activeTeachers.filter(t=>(t.employType||"part")==="full");
  const partTeachers=activeTeachers.filter(t=>(t.employType||"part")==="part");

  return <div style={{padding:14}}>
    <Sec title={`Giáo viên (${scopedTeachers.length})`} action={canEdit&&<Btn small onClick={()=>{setForm(empty);setEdit(null);setShow(!show);}}>{show?"Đóng":"+ Thêm"}</Btn>}>
      {show&&<Card style={{border:`2px solid ${B}`,marginBottom:14}}>
        <Inp label="Họ và tên *" value={form.name} onChange={e=>f("name",e.target.value)}/>
        <Inp label="Số di động (mật khẩu) *" type="tel" value={form.phone} onChange={e=>f("phone",e.target.value)}/>
        {/* Loại hình */}
        <div style={{marginBottom:8}}><label style={{fontSize:11,fontWeight:600,color:"#666",display:"block",marginBottom:3}}>Loại hình</label>
          <div style={{display:"flex",gap:6}}>
            {[{k:"full",l:"👔 Full-time",c:"#7C3AED"},{k:"part",l:"⏰ Part-time",c:B}].map(o=>(
              <button key={o.k} onClick={()=>f("employType",o.k)} style={{flex:1,padding:"9px 6px",borderRadius:9,border:`2px solid ${form.employType===o.k?o.c:"#E2E8F0"}`,background:form.employType===o.k?o.c+"12":W,color:form.employType===o.k?o.c:"#888",fontWeight:700,cursor:"pointer",fontSize:12}}>{o.l}</button>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <Inp label="Ngày sinh" type="date" value={form.dob} onChange={e=>f("dob",e.target.value)}/>
          <Inp label="Gia nhập WA" type="date" value={form.joinDate} onChange={e=>f("joinDate",e.target.value)}/>
        </div>
        <Inp label="Học vấn" value={form.education} onChange={e=>f("education",e.target.value)}/>
        <Inp label="Chứng chỉ" value={form.certificate} onChange={e=>f("certificate",e.target.value)}/>
        <Sel label="Cấp bậc" value={form.level} onChange={v=>f("level",v)} options={[{value:"junior",label:"Junior"},{value:"standard",label:"Standard"},{value:"senior",label:"Senior"}]}/>
        {/* Lương theo loại */}
        {isFull ? <>
          <div style={{background:"#7C3AED08",borderRadius:8,padding:10,marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,color:"#7C3AED",marginBottom:6}}>👔 Lương Full-time</div>
            <Inp label="Lương cố định/tháng" type="number" value={form.fixedSalary} onChange={e=>f("fixedSalary",+e.target.value)}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
              <Inp label="Baseline ca/tháng" type="number" value={form.baselineSessions} onChange={e=>f("baselineSessions",+e.target.value)}/>
              <Inp label="OT B2C/buổi" type="number" value={form.otRateB2C} onChange={e=>f("otRateB2C",+e.target.value)}/>
              <Inp label="OT B2B/buổi" type="number" value={form.otRateB2B} onChange={e=>f("otRateB2B",+e.target.value)}/>
            </div>
            <div style={{fontSize:10,color:"#888",marginTop:2}}>32 ca đầu = lương cố định. Từ ca 33 trở đi tính thêm theo OT rate.</div>
          </div>
        </> : <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <Inp label="Lương B2C/buổi" type="number" value={form.salaryB2C} onChange={e=>f("salaryB2C",+e.target.value)}/>
            <Inp label="Lương B2B/buổi" type="number" value={form.salaryB2B} onChange={e=>f("salaryB2B",+e.target.value)}/>
          </div>
        </>}
        <div style={{marginBottom:8}}><label style={{fontSize:11,fontWeight:600,color:"#666",display:"block",marginBottom:3}}>Điểm dạy</label>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{(scopeCenterIds?scopedCenters:data.centers).map(c=>(
            <button key={c.id} onClick={()=>f("centerIds",form.centerIds.includes(c.id)?form.centerIds.filter(x=>x!==c.id):[...form.centerIds,c.id])} style={{padding:"5px 10px",borderRadius:7,border:`1.5px solid ${form.centerIds.includes(c.id)?B:"#E2E8F0"}`,background:form.centerIds.includes(c.id)?B+"10":W,fontWeight:600,fontSize:11,cursor:"pointer",color:form.centerIds.includes(c.id)?B:"#888"}}>
              {c.type==="b2b"?"🏫":"🏠"} {c.name}
            </button>
          ))}</div>
        </div>
        {/* Bank info */}
        <div style={{background:"#F0FDF4",borderRadius:8,padding:10,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:"#059669",marginBottom:6}}>🏦 Tài khoản ngân hàng</div>
          <Inp label="Ngân hàng" value={form.bankName} onChange={e=>f("bankName",e.target.value)} placeholder="VD: Vietcombank, MB Bank..."/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <Inp label="Số tài khoản" value={form.bankAccount} onChange={e=>f("bankAccount",e.target.value)} placeholder="0123456789"/>
            <Inp label="Tên chủ TK" value={form.bankHolder} onChange={e=>f("bankHolder",e.target.value)} placeholder="NGUYEN THI LAN"/>
          </div>
        </div>
        <div style={{display:"flex",gap:6}}><Btn full onClick={doSave} bg={G}>{edit?"Lưu":"Thêm"}</Btn><Btn full onClick={()=>{setShow(false);setEdit(null);}} bg="#E2E8F0" color="#666">Hủy</Btn></div>
      </Card>}

      {/* FULL-TIME */}
      {fullTeachers.length>0&&<div style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#7C3AED",marginBottom:6,display:"flex",alignItems:"center",gap:4}}>👔 Full-time ({fullTeachers.length})</div>
        {fullTeachers.map(t=>(
          <Card key={t.id} style={{padding:"10px 12px",borderLeft:"3px solid #7C3AED"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14}}>{t.name}</div>
                <div style={{fontSize:11,color:"#888"}}>Mã: {t.id.toUpperCase()} • SĐT: {t.phone}</div>
                <div style={{fontSize:11,color:"#888"}}>Học vấn: {t.education||"—"} • CC: {t.certificate||"—"}</div>
                <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
                  <Badge bg="#7C3AED12" color="#7C3AED">Full-time</Badge>
                  <Badge>{t.level}</Badge>
                  <Badge bg={G+"12"} color={G}>Lương: {fmt(t.fixedSalary||0)}/th</Badge>
                  <Badge bg={O+"12"} color="#B45309">OT: {fmt(t.otRateB2C||0)}/buổi</Badge>
                </div>
              </div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>toggleStatus(t.id)} title="Khóa/Mở GV" style={{background:O+"10",border:"none",borderRadius:7,padding:"5px 10px",color:"#B45309",cursor:"pointer",fontSize:11}}>🔒</button>
                <button onClick={()=>startEdit(t)} style={{background:B+"10",border:"none",borderRadius:7,padding:"5px 10px",color:B,cursor:"pointer",fontSize:11}}>✏️</button>
                <button onClick={()=>{if(confirm(`Xóa ${t.name}?`))save({...data,teachers:data.teachers.filter(x=>x.id!==t.id)});}} style={{background:R+"10",border:"none",borderRadius:7,padding:"5px 10px",color:R,cursor:"pointer",fontSize:11}}>🗑</button>
              </div>
            </div>
          </Card>
        ))}
      </div>}

      {/* PART-TIME */}
      {partTeachers.length>0&&<div>
        <div style={{fontSize:12,fontWeight:700,color:B,marginBottom:6,display:"flex",alignItems:"center",gap:4}}>⏰ Part-time ({partTeachers.length})</div>
        {partTeachers.map(t=>(
          <Card key={t.id} style={{padding:"10px 12px",borderLeft:`3px solid ${B}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14}}>{t.name}</div>
                <div style={{fontSize:11,color:"#888"}}>Mã: {t.id.toUpperCase()} • SĐT: {t.phone}</div>
                <div style={{fontSize:11,color:"#888"}}>Học vấn: {t.education||"—"} • CC: {t.certificate||"—"}</div>
                <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
                  <Badge bg={B+"12"} color={B}>Part-time</Badge>
                  <Badge>{t.level}</Badge>
                  <Badge bg={G+"12"} color={G}>B2C:{fmt(t.salaryB2C)}</Badge>
                  <Badge bg={O+"12"} color="#B45309">B2B:{fmt(t.salaryB2B)}</Badge>
                </div>
              </div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>toggleStatus(t.id)} title="Khóa/Mở GV" style={{background:O+"10",border:"none",borderRadius:7,padding:"5px 10px",color:"#B45309",cursor:"pointer",fontSize:11}}>🔒</button>
                <button onClick={()=>startEdit(t)} style={{background:B+"10",border:"none",borderRadius:7,padding:"5px 10px",color:B,cursor:"pointer",fontSize:11}}>✏️</button>
                <button onClick={()=>{if(confirm(`Xóa ${t.name}?`))save({...data,teachers:data.teachers.filter(x=>x.id!==t.id)});}} style={{background:R+"10",border:"none",borderRadius:7,padding:"5px 10px",color:R,cursor:"pointer",fontSize:11}}>🗑</button>
              </div>
            </div>
          </Card>
        ))}
      </div>}

      {/* INACTIVE TEACHERS */}
      {inactiveTeachers.length>0&&<div style={{marginTop:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#94A3B8",marginBottom:6,display:"flex",alignItems:"center",gap:4}}>🔒 Đã khóa ({inactiveTeachers.length})</div>
        {inactiveTeachers.map(t=>(
          <Card key={t.id} style={{padding:"10px 12px",borderLeft:"3px solid #CBD5E1",opacity:.7}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:"#94A3B8",textDecoration:"line-through"}}>{t.name}</div>
                <div style={{fontSize:10,color:"#CBD5E1"}}>{(t.employType||"part")==="full"?"Full":"Part"} • {t.phone} • Không thể đăng nhập</div>
              </div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>toggleStatus(t.id)} title="Mở khóa GV" style={{background:G+"10",border:"none",borderRadius:7,padding:"5px 10px",color:G,cursor:"pointer",fontSize:11,fontWeight:700}}>🔓 Mở</button>
                <button onClick={()=>{if(confirm(`Xóa vĩnh viễn ${t.name}?`))save({...data,teachers:data.teachers.filter(x=>x.id!==t.id)});}} style={{background:R+"10",border:"none",borderRadius:7,padding:"5px 10px",color:R,cursor:"pointer",fontSize:11}}>🗑</button>
              </div>
            </div>
          </Card>
        ))}
      </div>}
    </Sec>
  </div>;
}

/* ADMIN CLASSES & STUDENTS */
function AClasses({data,save,canEdit=true,fullData,scopeCenterIds}){
  const allCenters=scopeCenterIds?data.centers.filter(c=>scopeCenterIds.includes(c.id)):data.centers;
  const[show,setShow]=useState(false);
  const[showAddLoc,setShowAddLoc]=useState(false);
  const[newLoc,setNewLoc]=useState({name:"",type:"b2b"});
  const b2cCenters=allCenters.filter(c=>c.type==="b2c");
  const b2bCenters=allCenters.filter(c=>c.type==="b2b");
  const[viewType,setViewType]=useState("b2c");
  const locs=viewType==="b2c"?b2cCenters:b2bCenters;
  const[cid,setCid]=useState(locs[0]?.id||"");
  const curCenter=data.centers.find(c=>c.id===cid);
  const curType=curCenter?.type||"b2c";

  const[form,setForm]=useState({teacherId:data.teachers[0]?.id||"",day:6,caNumber:1,startTime:"09:00",endTime:"10:30",classLevel:"Level 1",studentIds:[]});
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const classes=data.classes.filter(c=>c.centerId===cid);
  const cStudents=data.students.filter(s=>s.centerId===cid&&s.status!=="Trial");

  const doSave=()=>{
    if(!form.teacherId)return;
    save({...data,classes:[...data.classes,{...form,id:uid(),centerId:cid}]});
    setShow(false);setForm(p=>({...p,studentIds:[]}));
  };
  const toggleSt=sid=>setForm(p=>({...p,studentIds:p.studentIds.includes(sid)?p.studentIds.filter(x=>x!==sid):[...p.studentIds,sid]}));
  const rmClass=id=>save({...data,classes:data.classes.filter(c=>c.id!==id)});

  const addLocation=()=>{
    if(!newLoc.name)return;
    save({...data,centers:[...data.centers,{...newLoc,id:uid()}]});
    setNewLoc({name:"",type:viewType});setShowAddLoc(false);
  };
  const rmLocation=lid=>{
    if(!confirm("Xóa điểm dạy này? Tất cả lớp và HV tại đây sẽ bị ảnh hưởng."))return;
    save({...data,centers:data.centers.filter(c=>c.id!==lid),classes:data.classes.filter(c=>c.centerId!==lid),students:data.students.filter(s=>s.centerId!==lid)});
    if(cid===lid)setCid(locs.filter(l=>l.id!==lid)[0]?.id||"");
  };

  // Khi switch viewType, chọn location đầu tiên
  const switchType=(t)=>{
    setViewType(t);
    const ls=data.centers.filter(c=>c.type===t);
    setCid(ls[0]?.id||"");
    setShow(false);
  };

  return <div style={{padding:14}}>
    {/* B2C / B2B toggle */}
    <div style={{display:"flex",gap:6,marginBottom:10}}>
      {[{k:"b2c",l:"🏠 B2C — Trung tâm",bg:B},{k:"b2b",l:"🏫 B2B — Trường học",bg:"#7C3AED"}].map(o=>(
        <button key={o.k} onClick={()=>switchType(o.k)} style={{
          flex:1,padding:"10px 6px",borderRadius:10,
          border:`2px solid ${viewType===o.k?o.bg:"#E2E8F0"}`,
          background:viewType===o.k?o.bg:W,
          color:viewType===o.k?W:D,fontWeight:700,cursor:"pointer",fontSize:12
        }}>{o.l}</button>
      ))}
    </div>

    {/* Location tabs */}
    <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
      {locs.map(c=>(
        <div key={c.id} style={{display:"flex",alignItems:"center",gap:0}}>
          <button onClick={()=>{setCid(c.id);setShow(false);}} style={{
            padding:"7px 12px",borderRadius:"8px 0 0 8px",
            border:`1.5px solid ${cid===c.id?(viewType==="b2b"?"#7C3AED":B):"#E2E8F0"}`,borderRight:"none",
            background:cid===c.id?(viewType==="b2b"?"#7C3AED":B):W,
            color:cid===c.id?W:D,fontWeight:600,cursor:"pointer",fontSize:11
          }}>{c.name}</button>
          {/* Cho phép xóa B2B, B2C giữ nguyên */}
          {viewType==="b2b"&&<button onClick={()=>rmLocation(c.id)} style={{
            padding:"7px 6px",borderRadius:"0 8px 8px 0",
            border:`1.5px solid ${cid===c.id?"#7C3AED":"#E2E8F0"}`,
            background:cid===c.id?"#5B21B6":"#FEE2E2",
            color:cid===c.id?W:R,cursor:"pointer",fontSize:10,fontWeight:600
          }}>✕</button>}
          {viewType==="b2c"&&<div style={{
            padding:"7px 8px",borderRadius:"0 8px 8px 0",
            border:`1.5px solid ${cid===c.id?B:"#E2E8F0"}`,
            background:cid===c.id?B+"CC":"#F8F8F8",
            color:cid===c.id?W:"#999",fontSize:10
          }}>B2C</div>}
        </div>
      ))}
      <button onClick={()=>{setShowAddLoc(!showAddLoc);setNewLoc({name:"",type:viewType});}} style={{
        padding:"7px 12px",borderRadius:8,border:"2px dashed #CBD5E1",
        background:W,color:"#888",fontWeight:600,cursor:"pointer",fontSize:11
      }}>+ Thêm</button>
    </div>

    {/* Add new location */}
    {showAddLoc&&<Card style={{border:`2px solid ${viewType==="b2b"?"#7C3AED":B}`,marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:700,color:viewType==="b2b"?"#7C3AED":B,marginBottom:6}}>
        {viewType==="b2b"?"🏫 Thêm trường B2B":"🏠 Thêm trung tâm B2C"}
      </div>
      <Inp label={viewType==="b2b"?"Tên trường":"Tên trung tâm"} value={newLoc.name} onChange={e=>setNewLoc(p=>({...p,name:e.target.value}))} placeholder={viewType==="b2b"?"VD: Trường Nguyễn Bỉnh Khiêm":"VD: Quận 3"}/>
      <div style={{display:"flex",gap:6}}>
        <Btn full onClick={addLocation} bg={G}>Thêm</Btn>
        <Btn full onClick={()=>setShowAddLoc(false)} bg="#E2E8F0" color="#666">Hủy</Btn>
      </div>
    </Card>}

    {/* No location selected */}
    {!cid&&<div style={{textAlign:"center",color:"#888",padding:30,fontSize:13}}>
      {viewType==="b2b"?"Chưa có trường B2B. Bấm + Thêm để tạo.":"Chưa có trung tâm."}
    </div>}

    {/* Classes section */}
    {cid&&<>
      <Sec title={`Lớp học — ${curCenter?.name||""} (${classes.length})`} action={<Btn small onClick={()=>setShow(!show)}>{show?"Đóng":"+ Thêm lớp"}</Btn>}>
        {show&&<Card style={{border:`2px solid ${curType==="b2b"?"#7C3AED":B}`}}>
          <Sel label="Giáo viên" value={form.teacherId} onChange={v=>f("teacherId",v)} options={data.teachers.filter(t=>(t.centerIds||[]).includes(cid)).map(t=>({value:t.id,label:`${t.name} (${(t.employType||"part")==="full"?"Full":"Part"})`}))}/>
          <Sel label="Thứ" value={form.day} onChange={v=>f("day",+v)} options={DAYS_FULL.map((d,i)=>({value:i,label:d}))}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            <Sel label="Ca" value={form.caNumber} onChange={v=>f("caNumber",+v)} options={CA_OPTIONS.map(c=>({value:c.n,label:c.label}))}/>
            <Sel label="Bắt đầu" value={form.startTime} onChange={v=>f("startTime",v)} options={TIME_OPTIONS.map(t=>({value:t,label:t}))}/>
            <Sel label="Kết thúc" value={form.endTime} onChange={v=>f("endTime",v)} options={TIME_OPTIONS.map(t=>({value:t,label:t}))}/>
          </div>
          <Sel label="Level lớp" value={form.classLevel} onChange={v=>f("classLevel",v)} options={LEVELS.map(l=>({value:l,label:l}))}/>
          <div style={{fontSize:11,fontWeight:600,color:"#666",marginBottom:4}}>Học viên đang học ({form.studentIds.length})</div>
          <div style={{maxHeight:180,overflowY:"auto",border:"1px solid #E2E8F0",borderRadius:8,padding:6,marginBottom:8}}>
            {cStudents.length===0?<div style={{color:"#888",fontSize:12,padding:6}}>Chưa có HV tại {curCenter?.name}</div>:
            cStudents.map(s=>(
              <label key={s.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 2px",cursor:"pointer",fontSize:12}}>
                <input type="checkbox" checked={form.studentIds.includes(s.id)} onChange={()=>toggleSt(s.id)} style={{accentColor:B,width:15,height:15}}/>
                {s.name} <span style={{color:"#888",fontSize:10}}>{s.gender}•{s.studentLevel||""}</span>
              </label>
            ))}
          </div>
          <Btn full onClick={doSave} bg={G}>Tạo lớp</Btn>
        </Card>}

        {classes.map(cl=>{
          const teacher=data.teachers.find(t=>t.id===cl.teacherId);
          const sts=cl.studentIds.map(sid=>data.students.find(s=>s.id===sid)).filter(Boolean);
          const activeCount=sts.filter(s=>s.status==="Đang học").length;
          return <Card key={cl.id} style={{padding:"10px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div>
                <span style={{fontWeight:700,fontSize:13}}>{DAYS_FULL[cl.day]} — Ca {cl.caNumber} ({cl.startTime}-{cl.endTime})</span>
                <div style={{fontSize:11,color:"#888",marginTop:1}}>GV: {teacher?.name} • {cl.classLevel} • Sĩ số: <strong>{activeCount}</strong>/{sts.length}</div>
              </div>
              <div style={{display:"flex",gap:3}}>
                <select title="Chuyển GV" value={cl.teacherId} onChange={e=>{if(confirm(`Chuyển lớp ${DAYS_FULL[cl.day]} Ca${cl.caNumber} cho ${data.teachers.find(x=>x.id===e.target.value)?.name}?\n\n(Lương các buổi sau sẽ tính cho GV mới)`)){save({...data,classes:data.classes.map(c=>c.id===cl.id?{...c,teacherId:e.target.value}:c)});}}} style={{padding:"3px 4px",borderRadius:6,border:"1.5px solid #E2E8F0",fontSize:10,background:W,cursor:"pointer",maxWidth:100}}>
                  {data.teachers.filter(x=>(x.status||"active")==="active").map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                <button onClick={()=>rmClass(cl.id)} style={{background:R+"10",border:"none",borderRadius:7,padding:"3px 8px",color:R,cursor:"pointer",fontSize:10}}>🗑</button>
              </div>
            </div>
            {sts.map((s,i)=>(
              <div key={s.id} style={{fontSize:11,padding:"3px 0",borderTop:i?"1px solid #F5F5F5":"none",display:"flex",justifyContent:"space-between"}}>
                <span>{s.name} <span style={{color:"#999"}}>({s.gender}•{s.studentLevel||""})</span></span>
                <span style={{color:s.status==="Đang học"?G:s.status==="Bảo lưu"?O:s.status==="Trial"?B:R,fontWeight:600,fontSize:10}}>{s.status}</span>
              </div>
            ))}
          </Card>;
        })}
      </Sec>

      <AStudents data={data} save={save} centerId={cid}/>
    </>}
  </div>;
}

function AStudents({data,save,centerId}){
  const[show,setShow]=useState(false);
  const empty={name:"",gender:"Nam",dob:"",parentName:"",parentPhone:"",enrollDate:td(),expiryDate:"",status:"Đang học",centerId,studentLevel:"Level 1",notes:"",isTrial:false};
  const[form,setForm]=useState(empty);const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const sts=data.students.filter(s=>s.centerId===centerId);

  const doSave=()=>{
    if(!form.name)return;
    const status=form.isTrial?"Trial":form.status;
    save({...data,students:[...data.students,{...form,status,id:uid(),centerId}]});
    setForm({...empty,centerId});
  };
  const rm=id=>save({...data,students:data.students.filter(s=>s.id!==id),classes:data.classes.map(c=>({...c,studentIds:c.studentIds.filter(x=>x!==id)}))});
  const upSt=(id,st)=>{
    const old=data.students.find(s=>s.id===id);
    let newSessions=data.sessions;
    // FIX #2: If Trial → Đang học, only mark LAST session (most recent) with converted=true
    if(old&&old.status==="Trial"&&st==="Đang học"){
      const cls=data.classes.find(c=>c.studentIds.includes(id));
      if(cls){
        // Find the LAST session for this class that has this student
        const relevantSessions=data.sessions
          .filter(s=>s.teacherId===cls.teacherId&&(s.attendance||[]).some(a=>a.studentId===id&&a.isTrial))
          .sort((a,b)=>b.date.localeCompare(a.date));
        const lastSession=relevantSessions[0];
        if(lastSession){
          newSessions=data.sessions.map(s=>{
            if(s.id===lastSession.id){
              return {...s,attendance:(s.attendance||[]).map(a=>a.studentId===id?{...a,converted:true}:a)};
            }
            return s;
          });
        }
      }
    }
    save({...data,students:data.students.map(s=>s.id===id?{...s,status:st}:s),sessions:newSessions});
  };

  return <Sec title={`Học viên — ${sts.length}`} action={<Btn small onClick={()=>setShow(!show)}>{show?"Đóng":"+ Thêm HV"}</Btn>}>
    {show&&<Card style={{border:`2px solid ${O}`}}>
      <Inp label="Họ tên bé *" value={form.name} onChange={e=>f("name",e.target.value)}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
        <Sel label="Giới tính" value={form.gender} onChange={v=>f("gender",v)} options={[{value:"Nam",label:"Nam"},{value:"Nữ",label:"Nữ"}]}/>
        <Inp label="Ngày sinh" type="date" value={form.dob} onChange={e=>f("dob",e.target.value)}/>
        <Sel label="Trình độ" value={form.studentLevel} onChange={v=>f("studentLevel",v)} options={LEVELS.map(l=>({value:l,label:l}))}/>
      </div>
      <Inp label="Họ và tên phụ huynh" value={form.parentName} onChange={e=>f("parentName",e.target.value)}/>
      <Inp label="SĐT phụ huynh" type="tel" value={form.parentPhone} onChange={e=>f("parentPhone",e.target.value)}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        <Inp label="Ngày nhập học" type="date" value={form.enrollDate} onChange={e=>f("enrollDate",e.target.value)}/>
        <Inp label="Ngày hết khóa" type="date" value={form.expiryDate} onChange={e=>f("expiryDate",e.target.value)}/>
      </div>
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,marginBottom:8,cursor:"pointer"}}>
        <input type="checkbox" checked={form.isTrial} onChange={e=>f("isTrial",e.target.checked)} style={{accentColor:O,width:16,height:16}}/>
        🌟 Học viên học thử (Trial)
      </label>
      <div style={{marginBottom:8}}><label style={{fontSize:11,fontWeight:600,color:"#666",display:"block",marginBottom:3}}>Ghi chú (mong đợi của PH, tình hình bé...)</label>
        <textarea value={form.notes} onChange={e=>f("notes",e.target.value)} placeholder="VD: Bé nhút nhát, PH muốn bé tự tin thuyết trình..." style={{width:"100%",padding:8,borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:12,minHeight:50,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
      </div>
      <Btn full onClick={doSave} bg={G}>Thêm học viên</Btn>
    </Card>}
    {sts.map(s=>(
      <Card key={s.id} style={{padding:"8px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontWeight:700,fontSize:13}}>{s.name}</span><Badge>{s.studentLevel||"—"}</Badge>{s.isTrial&&<Badge bg={O+"15"} color={O}>Trial</Badge>}</div>
            <div style={{fontSize:11,color:"#888",marginTop:1}}>{s.gender} • {s.dob} • PH: {s.parentName} • {s.parentPhone}</div>
            <div style={{fontSize:10,color:"#888"}}>Nhập: {s.enrollDate} → Hết: {s.expiryDate||"—"}</div>
            {s.notes&&<div style={{fontSize:10,color:B,marginTop:2,fontStyle:"italic"}}>📝 {s.notes}</div>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end"}}>
            <select value={s.status} onChange={e=>upSt(s.id,e.target.value)} style={{fontSize:10,padding:"2px 6px",borderRadius:5,border:`1px solid ${s.status==="Đang học"?G:s.status==="Trial"?B:s.status==="Bảo lưu"?O:R}`,color:s.status==="Đang học"?G:s.status==="Trial"?B:s.status==="Bảo lưu"?O:R,fontWeight:600,background:W}}>
              {STATUS_OPTIONS.map(st=><option key={st}>{st}</option>)}
            </select>
            <button onClick={()=>{if(confirm(`Xóa ${s.name}?`))rm(s.id);}} style={{background:"none",border:"none",color:R,cursor:"pointer",fontSize:10}}>Xóa</button>
          </div>
        </div>
      </Card>
    ))}
  </Sec>;
}

/* ADMIN RENEWALS — LTV Tracking + Retention Rate */
function ARenewals({data,save,canEdit=true,scopeCenterIds}){
  const[mo,setMo]=useState(mk());
  const[view,setView]=useState(canEdit?"add":"ltv");// add|ltv|rate
  const scopedStudents=scopeCenterIds?data.students.filter(s=>scopeCenterIds.includes(s.centerId)):data.students;
  const scopedTeachers=scopeCenterIds?data.teachers.filter(t=>(t.centerIds||[]).some(cid=>scopeCenterIds.includes(cid))):data.teachers;
  const[form,setForm]=useState({teacherId:scopedTeachers[0]?.id||data.teachers[0]?.id||"",studentId:"",packageMonths:4,date:td(),amount:0,note:""});
  const allRenewals=data.renewals||[];
  const scopedRenewals=scopeCenterIds?allRenewals.filter(r=>scopedStudents.some(s=>s.id===r.studentId)):allRenewals;
  const moRenewals=scopedRenewals.filter(r=>mk(r.date)===mo);
  const eligibleStudents=scopedStudents.filter(s=>s.status==="Đang học");

  const addR=()=>{
    if(!form.studentId)return alert("Chọn học viên");
    save({...data,renewals:[...allRenewals,{...form,id:uid(),renewalNumber:allRenewals.filter(r=>r.studentId===form.studentId).length+1}]});
    setForm(p=>({...p,studentId:"",note:"",amount:0}));
  };
  const rmR=id=>save({...data,renewals:allRenewals.filter(r=>r.id!==id)});

  // ===== LTV PER STUDENT =====
  const studentLTV=()=>{
    const map={};
    scopedRenewals.forEach(r=>{
      if(!map[r.studentId])map[r.studentId]={renewals:[],totalMonths:0,totalAmount:0};
      map[r.studentId].renewals.push(r);
      map[r.studentId].totalMonths+=r.packageMonths||0;
      map[r.studentId].totalAmount+=(r.amount||0);
    });
    return Object.entries(map).map(([sid,info])=>{
      const s=data.students.find(x=>x.id===sid);
      const cn=data.centers.find(c=>c.id===s?.centerId);
      const cls=data.classes.filter(c=>c.studentIds.includes(sid));
      const gvNames=[...new Set(cls.map(c=>{const t=data.teachers.find(x=>x.id===c.teacherId);return t?.name||"?";}))]
      const enrollDate=s?.enrollDate||"";
      const lastR=info.renewals.sort((a,b)=>b.date.localeCompare(a.date))[0];
      const totalLifeMonths=enrollDate?(Math.round((new Date(lastR?.date||td())-new Date(enrollDate))/(30.44*86400000))):0;
      return {sid,student:s,center:cn,classCount:cls.length,gvNames,...info,totalLifeMonths,enrollDate};
    }).sort((a,b)=>b.renewals.length-a.renewals.length);
  };

  // ===== RETENTION RATE PER TEACHER =====
  const teacherRetention=()=>{
    return scopedTeachers.map(t=>{
      const tClasses=data.classes.filter(c=>c.teacherId===t.id);
      const tStudentIds=[...new Set(tClasses.flatMap(c=>c.studentIds))];
      const tStudents=tStudentIds.map(sid=>data.students.find(s=>s.id===sid)).filter(Boolean);
      const tActive=tStudents.filter(s=>s.status==="Đang học").length;
      const tTotal=tStudents.length;

      // Renewals by this teacher
      const tRenewals=allRenewals.filter(r=>r.teacherId===t.id);
      const byMonth={},byQuarter={},byYear={};
      tRenewals.forEach(r=>{
        const m=mk(r.date);const q=getQuarter(r.date);const y=r.date?.substring(0,4)||"";
        if(!byMonth[m])byMonth[m]=0;byMonth[m]++;
        if(!byQuarter[q])byQuarter[q]=0;byQuarter[q]++;
        if(!byYear[y])byYear[y]=0;byYear[y]++;
      });

      // Current month/quarter/year rate
      const curMo=mk();const curQ=currentQuarter();const curY=td().substring(0,4);
      const moEligible=tStudents.filter(s=>s.status==="Đang học"&&s.expiryDate&&mk(s.expiryDate)<=curMo).length;
      const moRenewed=byMonth[curMo]||0;
      const moRate=moEligible>0?Math.round(moRenewed/moEligible*100):0;

      // Total retention rate (all time)
      const totalRenewed=tRenewals.length;
      const totalDropped=tStudents.filter(s=>s.status==="Không tái ĐK").length;
      const totalDecisions=totalRenewed+totalDropped;
      const overallRate=totalDecisions>0?Math.round(totalRenewed/totalDecisions*100):0;

      return {
        teacher:t,tActive,tTotal,totalRenewed,totalDropped,overallRate,
        moRenewed,moEligible,moRate,
        qRenewed:byQuarter[curQ]||0,
        yRenewed:byYear[curY]||0,
        byMonth,byQuarter
      };
    }).sort((a,b)=>b.totalRenewed-a.totalRenewed);
  };

  // Package amounts
  const pkgAmounts={4:1600000,6:2200000,12:4000000};

  return <div style={{padding:14}}>
    {/* View toggle */}
    <div style={{display:"flex",gap:4,marginBottom:12}}>
      {[{k:"add",l:"+ Ghi nhận",icon:"📝",edit:true},{k:"ltv",l:"LTV HV",icon:"💎"},{k:"rate",l:"Tỷ lệ GV",icon:"📊"}].filter(o=>canEdit||!o.edit).map(o=>(
        <button key={o.k} onClick={()=>setView(o.k)} style={{flex:1,padding:"10px 6px",borderRadius:10,border:`2px solid ${view===o.k?G:"#E2E8F0"}`,background:view===o.k?G:W,color:view===o.k?W:D,fontWeight:700,cursor:"pointer",fontSize:12}}>{o.icon} {o.l}</button>
      ))}
    </div>

    {/* ===== ADD RENEWAL ===== */}
    {view==="add"&&<>
      <input type="month" value={mo} onChange={e=>setMo(e.target.value)} style={{width:"100%",padding:"7px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,fontWeight:600,marginBottom:12,boxSizing:"border-box"}}/>
      <Card style={{border:`2px solid ${G}`}}>
        <div style={{fontSize:13,fontWeight:700,color:G,marginBottom:8}}>🔄 Ghi nhận Tái đăng ký</div>
        <Sel label="GV phụ trách" value={form.teacherId} onChange={v=>setForm(p=>({...p,teacherId:v}))} options={scopedTeachers.map(t=>({value:t.id,label:t.name}))}/>
        <Sel label="Học viên" value={form.studentId} onChange={v=>setForm(p=>({...p,studentId:v}))} options={[{value:"",label:"-- Chọn HV --"},...eligibleStudents.map(s=>{
          const cn=data.centers.find(c=>c.id===s.centerId);
          const prevR=allRenewals.filter(r=>r.studentId===s.id).length;
          return {value:s.id,label:`${s.name} (${cn?.name||"?"}) ${prevR>0?`— TĐK lần ${prevR}`:""}`};
        })]}/>
        {form.studentId&&allRenewals.filter(r=>r.studentId===form.studentId).length>0&&<div style={{background:G+"08",borderRadius:8,padding:8,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:G}}>💎 Lịch sử TĐK của HV này:</div>
          {allRenewals.filter(r=>r.studentId===form.studentId).map((r,i)=>{
            const t=data.teachers.find(x=>x.id===r.teacherId);
            return <div key={r.id} style={{fontSize:10,color:"#666",marginTop:2}}>Lần {i+1}: Gói {r.packageMonths}T — {r.date} — GV: {t?.name}{r.amount?` — ${fmt(r.amount)}`:""}</div>;
          })}
        </div>}
        <Sel label="Gói" value={form.packageMonths} onChange={v=>{const pm=+v;setForm(p=>({...p,packageMonths:pm,amount:pkgAmounts[pm]||0}));}} options={[{value:4,label:"4 tháng"},{value:6,label:"6 tháng"},{value:12,label:"12 tháng"}]}/>
        <Inp label="Học phí (VNĐ)" type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:+e.target.value}))}/>
        <Inp label="Ghi chú" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="VD: PH rất hài lòng, bé tiến bộ rõ"/>
        <Btn full onClick={addR} bg={G}>+ Ghi nhận TĐK</Btn>
      </Card>
      <Sec title={`Tái đăng ký tháng ${mo} (${moRenewals.length})`}>
        {moRenewals.map(r=>{
          const t=data.teachers.find(x=>x.id===r.teacherId);const s=data.students.find(x=>x.id===r.studentId);
          const bp=data.bonusPolicy;const bonus=bp.renewalBonus||200000;
          const renewalNum=allRenewals.filter(x=>x.studentId===r.studentId&&x.date<=r.date).length;
          return <Card key={r.id} style={{padding:"8px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>HV: {s?.name||"?"} — Gói {r.packageMonths}T <Badge bg={G+"12"} color={G}>Lần {renewalNum}</Badge></div>
                <div style={{fontSize:11,color:"#888"}}>GV: {t?.name} • Thưởng: {fmt(bonus)}{r.amount?` • HP: ${fmt(r.amount)}`:""}</div>
                {r.note&&<div style={{fontSize:10,color:"#666",fontStyle:"italic"}}>{r.note}</div>}
              </div>
              <button onClick={()=>rmR(r.id)} style={{background:R+"10",border:"none",borderRadius:7,padding:"3px 8px",color:R,cursor:"pointer",fontSize:10}}>🗑</button>
            </div>
          </Card>;
        })}
        {moRenewals.length===0&&<div style={{color:"#888",textAlign:"center",padding:16,fontSize:12}}>Chưa có TĐK tháng này</div>}
      </Sec>
    </>}

    {/* ===== LTV PER STUDENT ===== */}
    {view==="ltv"&&<>
      <div style={{background:`linear-gradient(135deg,${G},#16A34A)`,borderRadius:14,padding:16,color:W,marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800}}>💎 LTV — Giá trị vòng đời HV</div>
        <div style={{fontSize:11,opacity:.8,marginTop:4}}>{allRenewals.length} lần TĐK từ {new Set(allRenewals.map(r=>r.studentId)).size} HV</div>
      </div>
      {studentLTV().length===0?<div style={{textAlign:"center",color:"#888",padding:30,fontSize:12}}>Chưa có dữ liệu tái đăng ký</div>:
      studentLTV().map(item=>(
        <Card key={item.sid} style={{padding:"10px 12px",borderLeft:`3px solid ${item.renewals.length>=3?"#7C3AED":item.renewals.length>=2?G:B}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div>
              <span style={{fontWeight:700,fontSize:14}}>{item.student?.name||"?"}</span>
              <Badge bg={item.renewals.length>=3?"#7C3AED12":G+"12"} color={item.renewals.length>=3?"#7C3AED":G}>
                {item.renewals.length>=3?"🏆 VIP":item.renewals.length>=2?"⭐ Loyal":"👤"} — {item.renewals.length}x TĐK
              </Badge>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:14,fontWeight:800,color:G}}>{fmt(item.totalAmount)}</div>
              <div style={{fontSize:9,color:"#888"}}>Tổng HP</div>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6,fontSize:10}}>
            <span style={{color:"#888"}}>📍 {item.center?.name}</span>
            <span style={{color:"#888"}}>📚 {item.classCount} lớp</span>
            <span style={{color:"#888"}}>👩‍🏫 {item.gvNames.join(", ")}</span>
            <span style={{color:"#888"}}>📅 {item.totalMonths}T tổng gói</span>
            <span style={{color:"#888"}}>⏱️ ~{item.totalLifeMonths}T life</span>
          </div>
          {/* Timeline */}
          <div style={{background:"#F8FAFC",borderRadius:8,padding:8}}>
            <div style={{fontSize:10,fontWeight:700,color:"#666",marginBottom:4}}>Lịch sử TĐK:</div>
            <div style={{display:"flex",alignItems:"center",gap:0,flexWrap:"wrap"}}>
              {item.enrollDate&&<div style={{fontSize:9,padding:"2px 6px",background:B+"12",color:B,borderRadius:4,fontWeight:600}}>Nhập học {item.enrollDate}</div>}
              {item.renewals.sort((a,b)=>a.date.localeCompare(b.date)).map((r,i)=>{
                const t=data.teachers.find(x=>x.id===r.teacherId);
                return <div key={r.id} style={{display:"flex",alignItems:"center"}}>
                  <div style={{width:16,height:1,background:"#CBD5E1"}}/>
                  <div style={{fontSize:9,padding:"2px 6px",background:G+"12",color:G,borderRadius:4,fontWeight:600}}>
                    Lần {i+1}: {r.packageMonths}T — {r.date}{r.amount?` (${fmt(r.amount)})`:""}{t?` — ${t.name}`:""}
                  </div>
                </div>;
              })}
            </div>
          </div>
        </Card>
      ))}
    </>}

    {/* ===== RETENTION RATE PER TEACHER ===== */}
    {view==="rate"&&<>
      <div style={{background:`linear-gradient(135deg,${B},#2980B9)`,borderRadius:14,padding:16,color:W,marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800}}>📊 Tỷ lệ tái đăng ký theo GV</div>
        <div style={{fontSize:11,opacity:.8,marginTop:4}}>Chỉ số quan trọng nhất: GV giữ được bao nhiêu % HV</div>
      </div>
      {teacherRetention().map(item=>{
        const rateColor=item.overallRate>=80?G:item.overallRate>=60?O:item.overallRate>0?R:"#CBD5E1";
        return <Card key={item.teacher.id} style={{padding:"10px 12px",borderLeft:`3px solid ${rateColor}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <span style={{fontWeight:700,fontSize:14}}>{item.teacher.name}</span>
              <Badge bg={(item.teacher.employType==="full"?"#7C3AED":B)+"12"} color={item.teacher.employType==="full"?"#7C3AED":B}>{item.teacher.employType==="full"?"Full":"Part"}</Badge>
            </div>
            <div style={{textAlign:"center",background:rateColor+"12",borderRadius:10,padding:"6px 14px"}}>
              <div style={{fontSize:22,fontWeight:800,color:rateColor}}>{item.overallRate}%</div>
              <div style={{fontSize:8,color:"#888"}}>TL giữ chân</div>
            </div>
          </div>

          {/* Overview stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,marginBottom:8}}>
            <div style={{textAlign:"center",padding:4,background:"#F8FAFC",borderRadius:6}}>
              <div style={{fontSize:14,fontWeight:800,color:B}}>{item.tActive}</div>
              <div style={{fontSize:8,color:"#888"}}>HV active</div>
            </div>
            <div style={{textAlign:"center",padding:4,background:G+"06",borderRadius:6}}>
              <div style={{fontSize:14,fontWeight:800,color:G}}>{item.totalRenewed}</div>
              <div style={{fontSize:8,color:"#888"}}>Tổng TĐK</div>
            </div>
            <div style={{textAlign:"center",padding:4,background:R+"06",borderRadius:6}}>
              <div style={{fontSize:14,fontWeight:800,color:R}}>{item.totalDropped}</div>
              <div style={{fontSize:8,color:"#888"}}>Mất</div>
            </div>
            <div style={{textAlign:"center",padding:4,background:"#F8FAFC",borderRadius:6}}>
              <div style={{fontSize:14,fontWeight:800,color:D}}>{item.tTotal}</div>
              <div style={{fontSize:8,color:"#888"}}>Tổng HV</div>
            </div>
          </div>

          {/* Monthly / Quarterly / Yearly */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            <div style={{padding:6,background:"#F0FDF4",borderRadius:8,textAlign:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:G}}>THÁNG NÀY</div>
              <div style={{fontSize:16,fontWeight:800,color:G}}>{item.moRenewed}</div>
              <div style={{fontSize:8,color:"#888"}}>{item.moEligible>0?`${item.moRate}% (${item.moRenewed}/${item.moEligible} eligible)`:"—"}</div>
            </div>
            <div style={{padding:6,background:B+"06",borderRadius:8,textAlign:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:B}}>QUÝ NÀY</div>
              <div style={{fontSize:16,fontWeight:800,color:B}}>{item.qRenewed}</div>
              <div style={{fontSize:8,color:"#888"}}>lần TĐK</div>
            </div>
            <div style={{padding:6,background:"#FAF5FF",borderRadius:8,textAlign:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#7C3AED"}}>NĂM NAY</div>
              <div style={{fontSize:16,fontWeight:800,color:"#7C3AED"}}>{item.yRenewed}</div>
              <div style={{fontSize:8,color:"#888"}}>lần TĐK</div>
            </div>
          </div>

          {/* Monthly trend */}
          {Object.keys(item.byMonth).length>0&&<div style={{marginTop:8,paddingTop:6,borderTop:"1px solid #F0F0F0"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#888",marginBottom:4}}>📈 Trend theo tháng:</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
              {Object.entries(item.byMonth).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([m,cnt])=>(
                <div key={m} style={{padding:"2px 6px",background:G+"12",borderRadius:4,fontSize:9,color:G,fontWeight:600}}>{m.substring(5)}: {cnt}</div>
              ))}
            </div>
          </div>}
        </Card>;
      })}
      {data.teachers.length===0&&<div style={{textAlign:"center",color:"#888",padding:20}}>Chưa có GV</div>}
    </>}
  </div>;
}

/* ADMIN REFERRALS */
function ARefr({data,save,canEdit=true,scopeCenterIds}){
  const[mo,setMo]=useState(mk());
  const scopedTeachers=scopeCenterIds?data.teachers.filter(t=>(t.centerIds||[]).some(cid=>scopeCenterIds.includes(cid))):data.teachers;
  const[form,setForm]=useState({teacherId:scopedTeachers[0]?.id||data.teachers[0]?.id||"",studentName:"",note:"",date:td()});
  const scopedRefs=scopeCenterIds?(data.referrals||[]).filter(r=>scopedTeachers.some(t=>t.id===r.teacherId)):(data.referrals||[]);
  const refs=scopedRefs.filter(r=>mk(r.date)===mo);
  const addR=()=>{if(!form.studentName)return;save({...data,referrals:[...(data.referrals||[]),{...form,id:uid()}]});setForm(p=>({...p,studentName:"",note:""}));};
  const rmR=id=>save({...data,referrals:(data.referrals||[]).filter(r=>r.id!==id)});
  return <div style={{padding:14}}>
    <input type="month" value={mo} onChange={e=>setMo(e.target.value)} style={{width:"100%",padding:"7px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,fontWeight:600,marginBottom:12,boxSizing:"border-box"}}/>
    {canEdit&&<Card style={{border:`2px solid ${B}`}}>
      <div style={{fontSize:13,fontWeight:700,color:B,marginBottom:8}}>🎯 Thêm Referral</div>
      <Sel label="GV giới thiệu" value={form.teacherId} onChange={v=>setForm(p=>({...p,teacherId:v}))} options={scopedTeachers.map(t=>({value:t.id,label:t.name}))}/>
      <Inp label="Tên HV mới" value={form.studentName} onChange={e=>setForm(p=>({...p,studentName:e.target.value}))}/>
      <Inp label="Ghi chú" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}/>
      <Btn full onClick={addR} bg={G}>+ Thêm referral</Btn>
    </Card>}
    <Sec title={`Referral tháng ${mo} (${refs.length})`}>
      {refs.map(r=>{const t=data.teachers.find(x=>x.id===r.teacherId);return <Card key={r.id} style={{padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:600,fontSize:12}}>HV: {r.studentName}</div><div style={{fontSize:11,color:"#888"}}>GV: {t?.name}{r.note&&` • ${r.note}`}</div></div>{canEdit&&<button onClick={()=>rmR(r.id)} style={{background:R+"10",border:"none",borderRadius:7,padding:"3px 8px",color:R,cursor:"pointer",fontSize:10}}>🗑</button>}</Card>;})}
      {refs.length===0&&<div style={{color:"#888",textAlign:"center",padding:16,fontSize:12}}>Chưa có</div>}
    </Sec>
  </div>;
}

/* ADMIN OBSERVATIONS — Full Form + Tracking */
function AObs({data,save}){
  const[view,setView]=useState("list");// list|form|track|detail
  const[selObs,setSelObs]=useState(null);
  const[form,setForm]=useState({
    teacherId:data.teachers[0]?.id||"",observerName:"",date:td(),
    centerId:data.centers[0]?.id||"",classId:"",caNumber:1,lesson:"",numStudents:"",
    scores:{},liets:{},outcomes:{},
    strengths:"",improvements:"",situation:"",goals:"",teacherFeedback:""
  });

  const resetForm=()=>setForm({teacherId:data.teachers[0]?.id||"",observerName:"",date:td(),centerId:data.centers[0]?.id||"",classId:"",caNumber:1,lesson:"",numStudents:"",scores:{},liets:{},outcomes:{},strengths:"",improvements:"",situation:"",goals:"",teacherFeedback:""});

  // Auto-select class when teacher+center chosen
  const tClasses=data.classes.filter(c=>c.teacherId===form.teacherId&&(form.centerId===""||c.centerId===form.centerId));

  const result=calcObs(form.scores,form.liets);
  const allScored=OBS_GROUPS.every(g=>g.items.every((_,i)=>form.scores[`${g.name}_${i}`]));

  const saveObs=()=>{
    if(!form.observerName)return alert("Nhập tên người dự giờ");
    if(!allScored)return alert("Vui lòng chấm đủ 20 tiêu chí");
    const obs={...form,id:uid(),...result,pct:result.pct,score:result.pct};
    save({...data,observations:[...data.observations,obs]});
    resetForm();setView("list");
  };

  const rmObs=id=>save({...data,observations:data.observations.filter(o=>o.id!==id)});
  const q=currentQuarter();

  // Rank color helper
  const rc=rank=>rank==="A+"||rank==="A"?G:rank==="B"?O:R;
  const rl=rank=>rank==="A+"?"Xuất sắc":rank==="A"?"Tốt":rank==="B"?"Đạt":"Chưa đạt";

  return <div style={{padding:14}}>
    {/* View toggle */}
    <div style={{display:"flex",gap:4,marginBottom:12}}>
      {[{k:"list",l:"Lịch sử",i:"📋"},{k:"form",l:"+ Dự giờ",i:"✍️"},{k:"track",l:"Tracking",i:"📊"}].map(o=>(
        <button key={o.k} onClick={()=>{setView(o.k);setSelObs(null);}} style={{flex:1,padding:"10px 6px",borderRadius:10,border:`2px solid ${view===o.k?B:"#E2E8F0"}`,background:view===o.k?B:W,color:view===o.k?W:D,fontWeight:700,cursor:"pointer",fontSize:12}}>{o.i} {o.l}</button>
      ))}
    </div>

    {/* ===== OBSERVATION FORM ===== */}
    {view==="form"&&<>
      <div style={{background:`linear-gradient(135deg,${B},#2980B9)`,borderRadius:14,padding:16,color:W,marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800}}>✍️ Form Dự Giờ Chất Lượng</div>
        <div style={{fontSize:11,opacity:.8,marginTop:4}}>20 tiêu chí • 3 nhóm trọng số • Thang 4 mức</div>
      </div>

      {/* Info section */}
      <Card style={{marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:700,color:B,marginBottom:8}}>📝 Thông tin buổi dự giờ</div>
        <Sel label="Giáo viên" value={form.teacherId} onChange={v=>setForm(p=>({...p,teacherId:v}))} options={data.teachers.map(t=>({value:t.id,label:t.name}))}/>
        <Inp label="Người dự giờ" value={form.observerName} onChange={e=>setForm(p=>({...p,observerName:e.target.value}))} placeholder="Họ tên người dự giờ"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <Inp label="Ngày" type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
          <Sel label="Trung tâm" value={form.centerId} onChange={v=>setForm(p=>({...p,centerId:v}))} options={data.centers.map(c=>({value:c.id,label:c.name}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <Sel label="Lớp" value={form.classId} onChange={v=>setForm(p=>({...p,classId:v}))} options={[{value:"",label:"-- Chọn --"},...tClasses.map(c=>({value:c.id,label:`${DAYS[c.day]} Ca${c.caNumber} ${c.classLevel}`}))]}/>
          <Inp label="Bài học" value={form.lesson} onChange={e=>setForm(p=>({...p,lesson:e.target.value}))} placeholder="Tên bài"/>
        </div>
        <Inp label="Số HV trong buổi" type="number" value={form.numStudents} onChange={e=>setForm(p=>({...p,numStudents:e.target.value}))}/>
      </Card>

      {/* Scoring sections */}
      {OBS_GROUPS.map(g=>(
        <Card key={g.name} style={{marginBottom:10,borderLeft:`3px solid ${g.color}`}}>
          <div style={{fontSize:12,fontWeight:700,color:g.color,marginBottom:8}}>{g.icon} {g.name} <span style={{fontWeight:400,fontSize:10}}>— Trọng số x{g.weight}</span></div>
          {g.items.map((item,i)=>{
            const k=`${g.name}_${i}`;const v=form.scores[k]||0;
            return <div key={k} style={{marginBottom:8,padding:"6px 0",borderBottom:"1px solid #F5F5F5"}}>
              <div style={{fontSize:11,color:D,marginBottom:4}}><strong>{i+1}.</strong> {item}</div>
              <div style={{display:"flex",gap:3}}>
                {[1,2,3,4].map(s=>(
                  <button key={s} onClick={()=>setForm(p=>({...p,scores:{...p.scores,[k]:s}}))} style={{
                    flex:1,padding:"6px 2px",borderRadius:8,fontSize:10,fontWeight:700,cursor:"pointer",
                    border:`2px solid ${v===s?g.color:"#E2E8F0"}`,
                    background:v===s?g.color+"15":W,
                    color:v===s?g.color:"#888"
                  }}>{s}<br/><span style={{fontSize:8,fontWeight:400}}>{OBS_SCORE_LABELS[s]}</span></button>
                ))}
              </div>
            </div>;
          })}
        </Card>
      ))}

      {/* Điểm liệt */}
      <Card style={{marginBottom:10,borderLeft:`3px solid ${R}`}}>
        <div style={{fontSize:12,fontWeight:700,color:R,marginBottom:8}}>🚫 ĐIỂM LIỆT <span style={{fontWeight:400,fontSize:10}}>— Mỗi vi phạm trừ 20đ</span></div>
        {OBS_LIETS.map((item,i)=>{
          const k=`l${i}`;const v=!!form.liets[k];
          return <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #F5F5F5"}}>
            <span style={{fontSize:11,flex:1}}>{item}</span>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setForm(p=>({...p,liets:{...p.liets,[k]:false}}))} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:700,border:`2px solid ${!v?G:"#E2E8F0"}`,background:!v?G+"15":W,color:!v?G:"#888",cursor:"pointer"}}>KHÔNG</button>
              <button onClick={()=>setForm(p=>({...p,liets:{...p.liets,[k]:true}}))} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:700,border:`2px solid ${v?R:"#E2E8F0"}`,background:v?R+"15":W,color:v?R:"#888",cursor:"pointer"}}>CÓ</button>
            </div>
          </div>;
        })}
      </Card>

      {/* Kết quả đầu ra từ trẻ */}
      <Card style={{marginBottom:10,borderLeft:`3px solid ${B}`}}>
        <div style={{fontSize:12,fontWeight:700,color:B,marginBottom:8}}>👶 Kết quả đầu ra từ trẻ <span style={{fontWeight:400,fontSize:10}}>— Quan sát, không tính điểm GV</span></div>
        {OBS_OUTCOMES.map((item,i)=>{
          const k=`o${i}`;const v=form.outcomes[k]||"";
          return <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid #F5F5F5"}}>
            <span style={{fontSize:11,flex:1}}>{item}</span>
            <div style={{display:"flex",gap:3}}>
              {["CÓ","1 PHẦN","KHÔNG"].map(opt=>(
                <button key={opt} onClick={()=>setForm(p=>({...p,outcomes:{...p.outcomes,[k]:opt}}))} style={{padding:"3px 6px",borderRadius:5,fontSize:9,fontWeight:600,border:`2px solid ${v===opt?(opt==="CÓ"?G:opt==="KHÔNG"?R:O):"#E2E8F0"}`,background:v===opt?(opt==="CÓ"?G:opt==="KHÔNG"?R:O)+"15":W,color:v===opt?(opt==="CÓ"?G:opt==="KHÔNG"?R:O):"#888",cursor:"pointer"}}>{opt}</button>
              ))}
            </div>
          </div>;
        })}
      </Card>

      {/* Ghi chú định tính */}
      <Card style={{marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:700,color:D,marginBottom:8}}>📝 Nhận xét & Phản hồi</div>
        <div style={{marginBottom:6}}><label style={{fontSize:10,fontWeight:600,color:G}}>🌟 3 ưu điểm nổi bật</label>
          <textarea value={form.strengths} onChange={e=>setForm(p=>({...p,strengths:e.target.value}))} style={{width:"100%",padding:8,borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:11,minHeight:45,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}} placeholder="1.  2.  3."/></div>
        <div style={{marginBottom:6}}><label style={{fontSize:10,fontWeight:600,color:R}}>📝 1-2 điểm cần cải thiện</label>
          <textarea value={form.improvements} onChange={e=>setForm(p=>({...p,improvements:e.target.value}))} style={{width:"100%",padding:8,borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:11,minHeight:35,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
        <div style={{marginBottom:6}}><label style={{fontSize:10,fontWeight:600,color:B}}>💬 Tình huống thử thách + ứng biến</label>
          <textarea value={form.situation} onChange={e=>setForm(p=>({...p,situation:e.target.value}))} style={{width:"100%",padding:8,borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:11,minHeight:35,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
        <div style={{marginBottom:6}}><label style={{fontSize:10,fontWeight:600,color:"#7C3AED"}}>🎯 Mục tiêu cải thiện lần sau</label>
          <textarea value={form.goals} onChange={e=>setForm(p=>({...p,goals:e.target.value}))} style={{width:"100%",padding:8,borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:11,minHeight:35,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
        <div><label style={{fontSize:10,fontWeight:600,color:O}}>✍️ Phản hồi & cam kết GV</label>
          <textarea value={form.teacherFeedback} onChange={e=>setForm(p=>({...p,teacherFeedback:e.target.value}))} style={{width:"100%",padding:8,borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:11,minHeight:35,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
      </Card>

      {/* Live scoring preview */}
      <Card style={{marginBottom:14,border:`2px solid ${rc(result.rank)}`,background:rc(result.rank)+"06"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
          <div><div style={{fontSize:22,fontWeight:800,color:B}}>{result.final}</div><div style={{fontSize:9,color:"#888"}}>/{result.max} điểm</div></div>
          <div><div style={{fontSize:22,fontWeight:800,color:rc(result.rank)}}>{result.pct}%</div><div style={{fontSize:9,color:"#888"}}>Phần trăm</div></div>
          <div><div style={{fontSize:22,fontWeight:800,color:rc(result.rank)}}>{result.rank}</div><div style={{fontSize:9,color:"#888"}}>{rl(result.rank)}</div></div>
        </div>
        {result.lietCount>0&&<div style={{textAlign:"center",marginTop:6,fontSize:11,color:R,fontWeight:700}}>🚫 {result.lietCount} điểm liệt (trừ {result.penalty}đ)</div>}
        {/* Group breakdown */}
        <div style={{display:"flex",gap:4,marginTop:8,justifyContent:"center"}}>
          {OBS_GROUPS.map(g=>{
            let gs=0,gm=0;g.items.forEach((_,i)=>{gs+=(form.scores[`${g.name}_${i}`]||0)*g.weight;gm+=4*g.weight;});
            return <div key={g.name} style={{padding:"4px 8px",borderRadius:6,background:g.color+"12",fontSize:9,color:g.color,fontWeight:700}}>{g.icon} {gs}/{gm}</div>;
          })}
        </div>
      </Card>
      <Btn full onClick={saveObs} bg={G} disabled={!allScored}>✓ Lưu kết quả dự giờ</Btn>
      <div style={{height:8}}/>
      <Btn full onClick={()=>{resetForm();setView("list");}} bg="#94A3B8">Hủy</Btn>
    </>}

    {/* ===== OBS DETAIL VIEW ===== */}
    {view==="detail"&&selObs&&(()=>{
      const o=selObs;const t=data.teachers.find(x=>x.id===o.teacherId);
      const cn=data.centers.find(x=>x.id===o.centerId);
      const cl=data.classes.find(x=>x.id===o.classId);
      return <>
        <Btn small onClick={()=>{setView("list");setSelObs(null);}} bg="#94A3B8">← Quay lại</Btn>
        <div style={{height:8}}/>
        <Card style={{border:`2px solid ${rc(o.rank)}`,marginBottom:10}}>
          <div style={{textAlign:"center",marginBottom:10}}>
            <div style={{fontSize:11,color:"#888"}}>{t?.name} — {o.date}</div>
            <div style={{fontSize:36,fontWeight:800,color:rc(o.rank)}}>{o.pct||o.score}%</div>
            <Badge bg={rc(o.rank)+"15"} color={rc(o.rank)}>{o.rank} — {rl(o.rank)}</Badge>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,textAlign:"center",fontSize:10}}>
            <div><strong>{o.final||"—"}</strong>/{o.max||"—"}<br/><span style={{color:"#888"}}>Điểm</span></div>
            <div style={{color:R}}><strong>-{o.penalty||0}</strong><br/><span style={{color:"#888"}}>Liệt</span></div>
            <div><strong>{o.numStudents||"—"}</strong><br/><span style={{color:"#888"}}>HV</span></div>
            <div><strong>{cn?.name||"—"}</strong><br/><span style={{color:"#888"}}>TT</span></div>
          </div>
          <div style={{marginTop:6,fontSize:10,color:"#888",textAlign:"center"}}>
            Người dự giờ: <strong>{o.observerName||"—"}</strong> • Ca: {cl?`${DAYS[cl.day]} Ca${cl.caNumber}`:"—"} • Bài: {o.lesson||"—"}
          </div>
        </Card>

        {/* Group scores breakdown */}
        {o.scores&&OBS_GROUPS.map(g=>{
          let gs=0,gm=0;
          return <Card key={g.name} style={{marginBottom:8,borderLeft:`3px solid ${g.color}`}}>
            <div style={{fontSize:11,fontWeight:700,color:g.color,marginBottom:6}}>{g.icon} {g.name} (x{g.weight})</div>
            {g.items.map((item,i)=>{
              const k=`${g.name}_${i}`;const v=o.scores[k]||0;gs+=v*g.weight;gm+=4*g.weight;
              const sc=v>=4?"#7C3AED":v>=3?G:v>=2?O:R;
              return <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",borderBottom:"1px solid #F8F8F8"}}>
                <span style={{fontSize:10,flex:1}}>{item}</span>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <Badge bg={sc+"15"} color={sc}>{v}/4</Badge>
                  <span style={{fontSize:9,color:"#888"}}>{OBS_SCORE_LABELS[v]}</span>
                </div>
              </div>;
            })}
            <div style={{textAlign:"right",fontSize:10,fontWeight:700,color:g.color,marginTop:4}}>Nhóm: {gs}/{gm}</div>
          </Card>;
        })}

        {/* Liệt */}
        {o.liets&&o.lietCount>0&&<Card style={{marginBottom:8,borderLeft:`3px solid ${R}`}}>
          <div style={{fontSize:11,fontWeight:700,color:R}}>🚫 Điểm liệt ({o.lietCount})</div>
          {OBS_LIETS.map((item,i)=>o.liets[`l${i}`]?<div key={i} style={{fontSize:10,color:R,padding:"2px 0"}}>❌ {item}</div>:null)}
        </Card>}

        {/* Outcomes */}
        {o.outcomes&&<Card style={{marginBottom:8,borderLeft:`3px solid ${B}`}}>
          <div style={{fontSize:11,fontWeight:700,color:B,marginBottom:4}}>👶 Kết quả đầu ra từ trẻ</div>
          {OBS_OUTCOMES.map((item,i)=>{const v=o.outcomes[`o${i}`]||"—";return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:10}}>
            <span>{item}</span><Badge bg={(v==="CÓ"?G:v==="KHÔNG"?R:O)+"15"} color={v==="CÓ"?G:v==="KHÔNG"?R:O}>{v}</Badge>
          </div>;})}
        </Card>}

        {/* Notes */}
        {(o.strengths||o.improvements||o.goals)&&<Card style={{marginBottom:8}}>
          {o.strengths&&<div style={{marginBottom:6}}><div style={{fontSize:10,fontWeight:700,color:G}}>🌟 Ưu điểm</div><div style={{fontSize:11,whiteSpace:"pre-wrap"}}>{o.strengths}</div></div>}
          {o.improvements&&<div style={{marginBottom:6}}><div style={{fontSize:10,fontWeight:700,color:R}}>📝 Cần cải thiện</div><div style={{fontSize:11,whiteSpace:"pre-wrap"}}>{o.improvements}</div></div>}
          {o.situation&&<div style={{marginBottom:6}}><div style={{fontSize:10,fontWeight:700,color:B}}>💬 Tình huống</div><div style={{fontSize:11,whiteSpace:"pre-wrap"}}>{o.situation}</div></div>}
          {o.goals&&<div style={{marginBottom:6}}><div style={{fontSize:10,fontWeight:700,color:"#7C3AED"}}>🎯 Mục tiêu lần sau</div><div style={{fontSize:11,whiteSpace:"pre-wrap"}}>{o.goals}</div></div>}
          {o.teacherFeedback&&<div><div style={{fontSize:10,fontWeight:700,color:O}}>✍️ GV phản hồi</div><div style={{fontSize:11,whiteSpace:"pre-wrap"}}>{o.teacherFeedback}</div></div>}
        </Card>}
      </>;
    })()}

    {/* ===== HISTORY LIST ===== */}
    {view==="list"&&<>
      <Sec title={`📋 Lịch sử dự giờ (${data.observations.length})`}>
        {data.observations.length===0&&<div style={{textAlign:"center",color:"#888",padding:20,fontSize:12}}>Chưa có dữ liệu dự giờ</div>}
        {[...data.observations].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(o=>{
          const t=data.teachers.find(x=>x.id===o.teacherId);
          const pct=o.pct||o.score||0;const rank=o.rank||(pct>=90?"A+":pct>=80?"A":pct>=65?"B":"C");
          return <Card key={o.id} style={{padding:"10px 12px",borderLeft:`3px solid ${rc(rank)}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:13}}>{t?.name||"?"}</div>
                <div style={{fontSize:10,color:"#888"}}>{o.date} • {o.observerName||"—"} • {data.centers.find(c=>c.id===o.centerId)?.name||""}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:800,color:rc(rank)}}>{pct}%</div>
                <Badge bg={rc(rank)+"15"} color={rc(rank)}>{rank}</Badge>
              </div>
            </div>
            {o.goals&&<div style={{fontSize:10,color:"#7C3AED",marginTop:4}}>🎯 {o.goals}</div>}
            <div style={{display:"flex",gap:4,marginTop:6}}>
              <button onClick={()=>{setSelObs(o);setView("detail");}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${B}`,background:B+"10",color:B,fontSize:10,fontWeight:600,cursor:"pointer"}}>Xem chi tiết</button>
              <button onClick={()=>rmObs(o.id)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${R}`,background:R+"10",color:R,fontSize:10,fontWeight:600,cursor:"pointer"}}>🗑</button>
            </div>
          </Card>;
        })}
      </Sec>
    </>}

    {/* ===== QUARTERLY TRACKING ===== */}
    {view==="track"&&<>
      <div style={{background:`linear-gradient(135deg,#7C3AED,#5B21B6)`,borderRadius:14,padding:16,color:W,marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800}}>📊 Tracking Dự Giờ Theo Quý</div>
        <div style={{fontSize:11,opacity:.8,marginTop:4}}>Mỗi GV cần ít nhất 2 lần dự giờ / quý</div>
      </div>

      {data.teachers.map(t=>{
        const tObs=data.observations.filter(o=>o.teacherId===t.id);
        const qObs=tObs.filter(o=>getQuarter(o.date)===q);
        const needed=2;const done=qObs.length;const ok=done>=needed;
        const avgPct=qObs.length>0?Math.round(qObs.reduce((a,o)=>a+(o.pct||o.score||0),0)/qObs.length*10)/10:0;
        const bestRank=qObs.length>0?qObs.reduce((best,o)=>{const r=o.rank||"C";return(r==="A+"||best==="C"||(r==="A"&&best!=="A+"))?r:best;},"C"):"—";
        const allAvg=tObs.length>0?Math.round(tObs.reduce((a,o)=>a+(o.pct||o.score||0),0)/tObs.length*10)/10:0;

        // Quarterly history
        const quarters=[...new Set(tObs.map(o=>getQuarter(o.date)))].sort();

        return <Card key={t.id} style={{marginBottom:10,borderLeft:`3px solid ${ok?G:R}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <span style={{fontWeight:700,fontSize:13}}>{t.name}</span>
              <Badge bg={(t.employType==="full"?"#7C3AED":B)+"12"} color={t.employType==="full"?"#7C3AED":B}>{t.employType==="full"?"Full":"Part"}</Badge>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:ok?G:R}}>{done}/{needed}</div>
              <div style={{fontSize:8,color:"#888"}}>{q}</div>
            </div>
          </div>

          {!ok&&<div style={{background:R+"08",borderRadius:8,padding:8,marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,color:R}}>⚠️ Cần dự giờ thêm {needed-done} lần trong {q}</div>
          </div>}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
            <div style={{textAlign:"center",padding:6,background:"#F8FAFC",borderRadius:8}}>
              <div style={{fontSize:16,fontWeight:800,color:avgPct>=80?G:avgPct>=65?O:avgPct>0?R:"#CBD5E1"}}>{avgPct||"—"}%</div>
              <div style={{fontSize:8,color:"#888"}}>TB quý này</div>
            </div>
            <div style={{textAlign:"center",padding:6,background:"#F8FAFC",borderRadius:8}}>
              <div style={{fontSize:16,fontWeight:800,color:allAvg>=80?G:allAvg>=65?O:allAvg>0?R:"#CBD5E1"}}>{allAvg||"—"}%</div>
              <div style={{fontSize:8,color:"#888"}}>TB tổng</div>
            </div>
            <div style={{textAlign:"center",padding:6,background:"#F8FAFC",borderRadius:8}}>
              <div style={{fontSize:16,fontWeight:800}}>{tObs.length}</div>
              <div style={{fontSize:8,color:"#888"}}>Tổng lần</div>
            </div>
          </div>

          {/* History by quarter */}
          {quarters.length>0&&<div style={{paddingTop:6,borderTop:"1px solid #F0F0F0"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#888",marginBottom:4}}>📈 Lịch sử theo quý:</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
              {quarters.map(qq=>{
                const qo=tObs.filter(o=>getQuarter(o.date)===qq);
                const avg=Math.round(qo.reduce((a,o)=>a+(o.pct||o.score||0),0)/qo.length*10)/10;
                return <div key={qq} style={{padding:"3px 8px",borderRadius:6,background:avg>=80?G+"12":avg>=65?O+"12":R+"12",fontSize:9,color:avg>=80?G:avg>=65?O:R,fontWeight:600}}>{qq}: {avg}% ({qo.length}x)</div>;
              })}
            </div>
          </div>}

          {/* Recent obs list */}
          {qObs.length>0&&<div style={{marginTop:6}}>
            {qObs.map(o=>(
              <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",fontSize:10}}>
                <span>{o.date} — {o.observerName||"?"}</span>
                <span style={{fontWeight:700,color:rc(o.rank||"C")}}>{o.pct||o.score}% ({o.rank||"?"})</span>
              </div>
            ))}
          </div>}
        </Card>;
      })}

      {/* Year summary */}
      <Card style={{border:`2px solid #7C3AED`,padding:"12px 14px"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#7C3AED",marginBottom:8}}>🏆 Bảng xếp hạng năm {td().substring(0,4)}</div>
        {data.teachers.map(t=>{
          const yr=td().substring(0,4);
          const yObs=data.observations.filter(o=>o.teacherId===t.id&&o.date?.startsWith(yr));
          const avg=yObs.length>0?Math.round(yObs.reduce((a,o)=>a+(o.pct||o.score||0),0)/yObs.length*10)/10:0;
          return <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #F5F5F5",fontSize:11}}>
            <span style={{fontWeight:600}}>{t.name}</span>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{color:"#888"}}>{yObs.length} lần</span>
              <span style={{fontWeight:700,color:avg>=80?G:avg>=65?O:avg>0?R:"#CBD5E1"}}>{avg||"—"}%</span>
            </div>
          </div>;
        }).sort((a,b)=>0)}
      </Card>
    </>}
  </div>;
}

/* ADMIN POLICY */
function APolicy({data,save}){
  const[p,setP]=useState({...data.bonusPolicy});const[saved,setSaved]=useState(false);
  const[showSetup,setShowSetup]=useState(false);const[importText,setImportText]=useState("");const[setupMsg,setSetupMsg]=useState("");
  // Sync when data changes externally
  useEffect(()=>{setP({...data.bonusPolicy});},[data.bonusPolicy]);
  const f=(k,v)=>{const num=v===""?0:Number(v);setP(prev=>({...prev,[k]:isNaN(num)?prev[k]:num}));setSaved(false);};
  const doSave=()=>{
    const nd={...data,bonusPolicy:{...p}};
    save(nd);
    setSaved(true);setTimeout(()=>setSaved(false),4000);
  };

  // === ADMIN SETUP TOOLS ===
  const resetClean=()=>{
    if(!window.confirm("⚠️ XÓA TOÀN BỘ DATA và bắt đầu sạch?\n\nHành động này không thể hoàn tác!"))return;
    const clean={centers:[],teachers:[],students:[],classes:[],sessions:[],referrals:[],renewals:[],observations:[],bonusPolicy:{...data.bonusPolicy},confirmations:{}};
    save(clean);setSetupMsg("✅ Đã reset! Bắt đầu nhập data mới.");setTimeout(()=>setSetupMsg(""),4000);
  };
  const resetDemo=()=>{
    if(!window.confirm("Khôi phục về data mẫu (demo)?"))return;
    save(initData());setSetupMsg("✅ Đã khôi phục data mẫu.");setTimeout(()=>setSetupMsg(""),4000);
  };
  const exportJSON=()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download=`wowart_backup_${td()}.json`;a.click();URL.revokeObjectURL(url);
    setSetupMsg("✅ Đã tải backup.");setTimeout(()=>setSetupMsg(""),3000);
  };
  const importJSON=()=>{
    try{
      const parsed=JSON.parse(importText);
      if(!parsed.teachers||!parsed.students){setSetupMsg("❌ File không hợp lệ (thiếu teachers/students).");return;}
      if(!window.confirm(`Import: ${parsed.teachers.length} GV, ${parsed.students.length} HV, ${(parsed.classes||[]).length} lớp.\n\n⚠️ SẼ GHI ĐÈ toàn bộ data hiện tại!`))return;
      const merged={...initData(),...parsed,bonusPolicy:{...initData().bonusPolicy,...(parsed.bonusPolicy||{})},confirmations:{...(parsed.confirmations||{})}};
      save(merged);setImportText("");setSetupMsg("✅ Import JSON thành công!");setTimeout(()=>setSetupMsg(""),4000);
    }catch(e){setSetupMsg("❌ JSON không hợp lệ: "+e.message);}
  };
  const handleFileUpload=(e)=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{setImportText(ev.target.result);};
    reader.readAsText(file);
  };
  // === EXCEL IMPORT ===
  const[xlsxPreview,setXlsxPreview]=useState(null);const[xlsxLoading,setXlsxLoading]=useState(false);
  const handleExcelUpload=(e)=>{
    const file=e.target.files[0];if(!file)return;
    setXlsxLoading(true);setSetupMsg("");
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        const wb=XLSX.read(ev.target.result,{type:"array"});
        const getSheet=(name)=>{const ws=wb.Sheets[name];return ws?XLSX.utils.sheet_to_json(ws,{defval:""}):[];};
        const raw={
          centers:getSheet("Trung tâm")||getSheet("Trung tam")||[],
          teachers:getSheet("Giáo viên")||getSheet("Giao vien")||[],
          students:getSheet("Học viên")||getSheet("Hoc vien")||[],
          classes:getSheet("Lớp học")||getSheet("Lop hoc")||[],
          policy:getSheet("Chính sách thưởng")||getSheet("Chinh sach thuong")||[],
        };
        // Map centers
        const centers=raw.centers.filter(r=>r["ID (tự tạo)"]||r["ID"]).map(r=>({
          id:String(r["ID (tự tạo)"]||r["ID"]||"").trim(),
          name:String(r["Tên trung tâm"]||r["Tên"]||"").trim(),
          type:String(r["Loại (b2c/b2b)"]||r["Loại"]||"b2c").trim().toLowerCase(),
          address:String(r["Địa chỉ"]||"").trim(),
          phone:String(r["SĐT"]||"").trim(),
          note:String(r["Ghi chú"]||"").trim(),
        }));
        // Map teachers
        const teachers=raw.teachers.filter(r=>r["ID"]||r["Họ tên"]).map(r=>{
          const et=String(r["Loại\n(full/part)"]||r["Loại"]||"part").trim().toLowerCase();
          return{
            id:String(r["ID"]||"t"+Date.now()).trim(),
            name:String(r["Họ tên"]||"").trim(),
            phone:String(r["SĐT"]||"").trim(),
            dob:String(r["Ngày sinh\n(YYYY-MM-DD)"]||r["Ngày sinh"]||"").trim(),
            education:String(r["Học vấn"]||"").trim(),
            cert:String(r["Chứng chỉ Y3K"]||"").trim(),
            joinDate:String(r["Ngày vào\n(YYYY-MM-DD)"]||r["Ngày vào"]||td()).trim(),
            employType:et==="full"?"full":"part",
            status:String(r["Trạng thái\n(active/inactive)"]||r["Trạng thái"]||"active").trim().toLowerCase()==="inactive"?"inactive":"active",
            fixedSalary:Number(r["Lương cố định\n(full only)"]||r["Lương cố định"]||0),
            baselineSessions:Number(r["Baseline ca/th\n(full only)"]||r["Baseline"]||32),
            salaryB2C:Number(r["Lương B2C/buổi"]||r["B2C"]||130000),
            salaryB2B:Number(r["Lương B2B/buổi"]||r["B2B"]||110000),
            otRateB2C:Number(r["OT B2C\n(full only)"]||r["OT B2C"]||0)||Number(r["Lương B2C/buổi"]||r["B2C"]||130000),
            otRateB2B:Number(r["OT B2B\n(full only)"]||r["OT B2B"]||0)||Number(r["Lương B2B/buổi"]||r["B2B"]||110000),
            level:String(r["Level\n(junior/standard/senior)"]||r["Level"]||"standard").trim(),
            centerIds:String(r["Center IDs\n(cách bởi dấu ,)"]||r["Center IDs"]||"").split(",").map(s=>s.trim()).filter(Boolean),
          };
        });
        // Map students
        const students=raw.students.filter(r=>r["ID"]||r["Họ tên"]).map(r=>({
          id:String(r["ID"]||"s"+Date.now()+Math.random().toString(36).slice(2,5)).trim(),
          name:String(r["Họ tên"]||"").trim(),
          gender:String(r["Giới tính"]||"").trim(),
          dob:String(r["Ngày sinh\n(YYYY-MM-DD)"]||r["Ngày sinh"]||"").trim(),
          parentName:String(r["Tên PH"]||"").trim(),
          parentPhone:String(r["SĐT PH"]||"").trim(),
          enrollDate:String(r["Ngày nhập học"]||td()).trim(),
          expiryDate:String(r["Ngày hết khóa"]||"").trim(),
          status:String(r["Trạng thái"]||"Đang học").trim(),
          centerId:String(r["Center ID"]||"").trim(),
          level:String(r["Level"]||"Level 1").trim(),
          note:String(r["Ghi chú"]||"").trim(),
          isTrial:String(r["Is Trial"]||"false").trim().toLowerCase()==="true",
        }));
        // Map classes
        const classes=raw.classes.filter(r=>r["ID"]||r["Teacher ID"]).map(r=>({
          id:String(r["ID"]||"cl"+Date.now()+Math.random().toString(36).slice(2,5)).trim(),
          centerId:String(r["Center ID"]||"").trim(),
          teacherId:String(r["Teacher ID"]||"").trim(),
          day:Number(r["Thứ\n(0=CN,1=T2...6=T7)"]||r["Thứ"]||0),
          caNumber:Number(r["Số ca"]||r["Ca"]||1),
          startTime:String(r["Giờ bắt đầu"]||"09:00").trim(),
          endTime:String(r["Giờ kết thúc"]||"10:30").trim(),
          level:String(r["Level"]||"").trim(),
          studentIds:String(r["HV IDs\n(cách bởi dấu ,)"]||r["HV IDs"]||"").split(",").map(s=>s.trim()).filter(Boolean),
        }));
        setXlsxPreview({centers,teachers,students,classes,policy:raw.policy});
      }catch(err){setSetupMsg("❌ Lỗi đọc file Excel: "+err.message);}
      setXlsxLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };
  const confirmExcelImport=()=>{
    if(!xlsxPreview)return;
    const{centers,teachers,students,classes}=xlsxPreview;
    if(!window.confirm(`Import từ Excel:\n• ${centers.length} Trung tâm\n• ${teachers.length} Giáo viên\n• ${students.length} Học viên\n• ${classes.length} Lớp học\n\n⚠️ SẼ GHI ĐÈ data hiện tại (giữ nguyên sessions, observations)?`))return;
    const nd={...data,centers,teachers,students,classes,sessions:data.sessions||[],referrals:data.referrals||[],renewals:data.renewals||[],observations:data.observations||[],confirmations:data.confirmations||{}};
    save(nd);setXlsxPreview(null);setSetupMsg("✅ Import Excel thành công! "+centers.length+" TT, "+teachers.length+" GV, "+students.length+" HV, "+classes.length+" lớp");setTimeout(()=>setSetupMsg(""),6000);
  };

  return <div style={{padding:14}}>
    <Sec title="⚙️ Chính sách thưởng / phạt">
      <Card style={{border:`2px solid ${G}`,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:800,color:G,marginBottom:10}}>🎁 A — THƯỞNG</div>
        <Inp label="HV tái đăng ký (đ/bé)" type="number" value={p.renewalBonus} onChange={e=>f("renewalBonus",e.target.value)}/>
        <div style={{fontSize:10,color:"#888",marginBottom:8}}>ĐK: Tiếp nhận HV ≥2 tháng, đầy đủ chăm sóc PH cuối khóa. Không áp dụng GV thử việc.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <Inp label="Ngưỡng chuyên cần HV (%)" type="number" value={p.kpiAttThreshold} onChange={e=>f("kpiAttThreshold",e.target.value)}/>
          <Inp label="Thưởng chuyên cần (đ/tháng)" type="number" value={p.kpiAttBonus} onChange={e=>f("kpiAttBonus",e.target.value)}/>
        </div>
        <div style={{fontSize:10,color:"#888",marginBottom:8}}>Chuyên cần HV ≥{p.kpiAttThreshold||95}% → {fmt(p.kpiAttBonus||0)}/tháng</div>
        <Inp label="Dẫn HV học thử (đ/bé)" type="number" value={p.trialBringBonus} onChange={e=>f("trialBringBonus",e.target.value)}/>
        <div style={{fontSize:10,color:"#888",marginBottom:8}}>Bé chưa từng học WOW ART.</div>
        <Inp label="HV học thử → ĐK chính thức (đ/bé)" type="number" value={p.trialConvertBonus} onChange={e=>f("trialConvertBonus",e.target.value)}/>
        <Inp label="Dạy học thử thành công (đ/bé)" type="number" value={p.trialTeachBonus} onChange={e=>f("trialTeachBonus",e.target.value)}/>
        <div style={{fontSize:10,color:"#888",marginBottom:8}}>Bé đóng tiền sau học thử.</div>
        <Inp label="Dự giờ đạt ≥80% (đ/quý)" type="number" value={p.obsBonus} onChange={e=>f("obsBonus",e.target.value)}/>
        <div style={{fontSize:10,color:"#888",marginBottom:8}}>Pro-rate: {fmt(Math.round((p.obsBonus||0)/3))}/tháng</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <Inp label="Referral/bé" type="number" value={p.referralBonus} onChange={e=>f("referralBonus",e.target.value)}/>
          <Inp label="Bonus 3 ref/quý" type="number" value={p.referralQBonus} onChange={e=>f("referralQBonus",e.target.value)}/>
        </div>
      </Card>
      <Card style={{border:`2px solid ${R}`,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:800,color:R,marginBottom:10}}>⚠️ B — PHẠT</div>
        <div style={{fontSize:11,color:"#666",marginBottom:8}}>Đi trễ / nghỉ báo gấp (không lý do chính đáng):</div>
        <div style={{fontSize:11,marginBottom:4}}>• Lần 1: <strong>Nhắc nhở</strong> (không trừ lương)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <Inp label="Lần 2: trừ (đ/ca)" type="number" value={p.latePenalty2} onChange={e=>f("latePenalty2",e.target.value)}/>
          <Inp label="Lần 3+: trừ (đ/ca)" type="number" value={p.latePenalty3} onChange={e=>f("latePenalty3",e.target.value)}/>
        </div>
      </Card>
      <Btn full onClick={doSave} bg={saved?G:B}>{saved?"✓ Đã lưu thành công":"💾 Lưu chính sách"}</Btn>
    </Sec>

    {/* ADMIN SETUP & TOOLS */}
    <Sec title="🔧 Admin Setup & Tools">
      <Card style={{border:"2px solid #7C3AED"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#7C3AED",marginBottom:10}}>📊 Thống kê hệ thống</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
          {[
            {v:data.centers.length,l:"Trung tâm",c:B},
            {v:data.teachers.length,l:"Giáo viên",c:"#7C3AED"},
            {v:data.students.length,l:"Học viên",c:G},
            {v:(data.classes||[]).length,l:"Lớp học",c:O},
            {v:(data.sessions||[]).length,l:"Buổi dạy",c:B},
            {v:(data.observations||[]).length,l:"Dự giờ",c:"#7C3AED"},
          ].map((x,i)=><div key={i} style={{textAlign:"center",padding:8,background:"#F8FAFC",borderRadius:8}}>
            <div style={{fontSize:18,fontWeight:800,color:x.c}}>{x.v}</div>
            <div style={{fontSize:9,color:"#888"}}>{x.l}</div>
          </div>)}
        </div>

        {setupMsg&&<div style={{padding:10,borderRadius:8,background:setupMsg.startsWith("✅")?G+"10":R+"10",color:setupMsg.startsWith("✅")?G:R,fontSize:12,fontWeight:600,marginBottom:10,textAlign:"center"}}>{setupMsg}</div>}

        <div style={{fontSize:12,fontWeight:700,color:B,marginBottom:8}}>💾 Backup & Restore</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
          <Btn full onClick={exportJSON} bg={B} small>📤 Tải backup (JSON)</Btn>
          <Btn full onClick={()=>setShowSetup(!showSetup)} bg={showSetup?"#94A3B8":"#7C3AED"} small>{showSetup?"Đóng":"📥 Import / Reset"}</Btn>
        </div>

        {showSetup&&<>
          {/* EXCEL IMPORT — PRIMARY */}
          <div style={{marginBottom:12,padding:14,background:"linear-gradient(135deg,#F0FDF4,#ECFDF5)",borderRadius:12,border:`2px solid ${G}`}}>
            <div style={{fontSize:13,fontWeight:800,color:G,marginBottom:6}}>📊 Import từ Excel (Khuyến nghị)</div>
            <div style={{fontSize:10,color:"#666",marginBottom:8}}>Dùng file <strong>WowArt_Data_Template.xlsx</strong> để nhập GV, HV, lớp 1 lần. Nhanh hơn nhập tay!</div>
            <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} style={{fontSize:11,marginBottom:6,width:"100%"}}/>
            {xlsxLoading&&<div style={{textAlign:"center",padding:10,color:B,fontSize:12}}>⏳ Đang đọc file...</div>}
            {xlsxPreview&&<div style={{marginTop:8}}>
              <div style={{fontSize:12,fontWeight:700,color:B,marginBottom:6}}>✅ Đã đọc file — Xem trước:</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                {[
                  {icon:"🏢",label:"Trung tâm",count:xlsxPreview.centers.length,items:xlsxPreview.centers.map(c=>c.name)},
                  {icon:"👩‍🏫",label:"Giáo viên",count:xlsxPreview.teachers.length,items:xlsxPreview.teachers.map(t=>t.name)},
                  {icon:"👶",label:"Học viên",count:xlsxPreview.students.length,items:xlsxPreview.students.slice(0,5).map(s=>s.name)},
                  {icon:"📚",label:"Lớp học",count:xlsxPreview.classes.length,items:xlsxPreview.classes.map(c=>c.id)},
                ].map((x,i)=><div key={i} style={{padding:8,background:"#fff",borderRadius:8,border:"1px solid #E2E8F0"}}>
                  <div style={{fontSize:12,fontWeight:700}}>{x.icon} {x.count} {x.label}</div>
                  <div style={{fontSize:9,color:"#888",marginTop:2}}>{x.items.join(", ")||(x.count===0?"(trống)":"...")}</div>
                </div>)}
              </div>
              {xlsxPreview.teachers.length>0&&<div style={{fontSize:10,color:"#666",marginBottom:6,background:"#fff",padding:8,borderRadius:8}}>
                <div style={{fontWeight:700,marginBottom:4}}>Chi tiết GV:</div>
                {xlsxPreview.teachers.map((t,i)=><div key={i} style={{padding:"2px 0",borderBottom:"1px solid #F0F0F0"}}>
                  {t.name} — {t.employType} — B2C: {(t.salaryB2C/1000).toFixed(0)}k — B2B: {(t.salaryB2B/1000).toFixed(0)}k — {t.phone}
                </div>)}
              </div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                <Btn full onClick={confirmExcelImport} bg={G} small>✅ Xác nhận Import</Btn>
                <Btn full onClick={()=>setXlsxPreview(null)} bg="#94A3B8" small>❌ Hủy</Btn>
              </div>
            </div>}
          </div>

          {/* JSON IMPORT — BACKUP RESTORE */}
          <div style={{marginBottom:12,padding:12,background:"#F8FAFC",borderRadius:10}}>
            <div style={{fontSize:11,fontWeight:700,color:B,marginBottom:6}}>📥 Khôi phục từ Backup (JSON)</div>
            <div style={{fontSize:10,color:"#888",marginBottom:6}}>Dùng file backup JSON đã tải trước đó:</div>
            <input type="file" accept=".json" onChange={handleFileUpload} style={{fontSize:11,marginBottom:6,width:"100%"}}/>
            {importText&&<>
              <div style={{fontSize:10,color:G,marginBottom:4}}>✅ File đã tải — bấm Import để khôi phục</div>
              <Btn full onClick={importJSON} bg={B} small>📥 Import Backup</Btn>
            </>}
          </div>

          {/* Reset options */}
          <div style={{padding:12,background:R+"05",borderRadius:10,border:`1px solid ${R}20`}}>
            <div style={{fontSize:11,fontWeight:700,color:R,marginBottom:8}}>⚠️ Reset Data</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              <Btn full onClick={resetClean} bg={R} small>🗑 Xóa sạch, bắt đầu mới</Btn>
              <Btn full onClick={resetDemo} bg={O} color={D} small>🔄 Khôi phục data mẫu</Btn>
            </div>
            <div style={{fontSize:9,color:"#888",marginTop:6}}>💡 Khuyến nghị: Tải backup trước khi reset!</div>
          </div>
        </>}
      </Card>
    </Sec>

    {/* SETUP GUIDE */}
    <Sec title="📋 Hướng dẫn Setup ban đầu">
      <Card>
        <div style={{fontSize:11,lineHeight:2}}>
          <div style={{fontWeight:700,color:B}}>Quy trình setup cho Admin:</div>
          <div>① Bấm "🗑 Xóa sạch" để xóa data mẫu</div>
          <div>② Tab <strong>Giáo viên</strong> → thêm từng GV (tên, SĐT, loại, mức lương)</div>
          <div>③ Tab <strong>Lớp & HV</strong> → thêm trung tâm → thêm HV → tạo lớp</div>
          <div>④ Tab <strong>Chính sách</strong> → kiểm tra mức thưởng, chỉnh nếu cần</div>
          <div>⑤ Bấm "📤 Tải backup" để lưu bản sao an toàn</div>
          <div>⑥ Gửi link Portal cho GV → GV đăng nhập bằng tên + SĐT</div>
          <div style={{marginTop:4,fontWeight:700,color:G}}>✅ Xong! Portal sẵn sàng sử dụng.</div>
        </div>
      </Card>
    </Sec>
  </div>;
}

/* AI AGENT — Phân tích & Đề xuất */
function AAIAgent({data}){
  const[query,setQuery]=useState("");
  const[response,setResponse]=useState("");
  const[loading,setLoading]=useState(false);
  const[history,setHistory]=useState([]);

  // Prepare data summary for AI context
  const buildContext=()=>{
    const mo=mk();const q=currentQuarter();
    const moSes=data.sessions.filter(s=>mk(s.date)===mo);
    const activeHV=data.students.filter(s=>s.status==="Đang học");
    const now=new Date();const in30=new Date(now.getTime()+30*86400000);
    const expiring=activeHV.filter(s=>s.expiryDate&&new Date(s.expiryDate)<=in30);
    const trialHV=data.students.filter(s=>s.status==="Trial");
    const refs=(data.referrals||[]).filter(r=>mk(r.date)===mo);
    const renewals=(data.renewals||[]).filter(r=>mk(r.date)===mo);

    const teacherStats=data.teachers.map(t=>{
      const ss=data.sessions.filter(s=>s.teacherId===t.id&&mk(s.date)===mo);
      const c=calcSalary(t,ss,data,mo);
      const cls=data.classes.filter(cl=>cl.teacherId===t.id);
      return `- ${t.name} (${(t.employType||"part")==="full"?"Full":"Part"}, ${t.level}): ${c.sessionCount} buổi, TL đi học ${c.avgAtt}%, ${c.totalHV} HV, trial chốt ${c.trialConv}, ref ${c.refCount}, TĐK ${c.renewalCount}, tổng chi ${(c.total/1000000).toFixed(1)}tr`;
    }).join("\n");

    const centerStats=data.centers.map(c=>{
      const sts=data.students.filter(s=>s.centerId===c.id&&s.status==="Đang học");
      const ses=moSes.filter(s=>s.centerId===c.id);
      return `- ${c.name} (${c.type.toUpperCase()}): ${sts.length} HV active, ${ses.length} buổi/tháng`;
    }).join("\n");

    return `BỐI CẢNH WOW ART — Tháng ${mo}, Quý ${q}:

TỔNG QUAN:
- ${data.teachers.length} GV (${data.teachers.filter(t=>t.employType==="full").length} Full + ${data.teachers.filter(t=>(t.employType||"part")==="part").length} Part)
- ${activeHV.length} HV đang học, ${trialHV.length} trial
- ${moSes.length} buổi dạy tháng này
- ${refs.length} referral, ${renewals.length} tái đăng ký
- ${expiring.length} HV sắp hết khóa trong 30 ngày

TRUNG TÂM:
${centerStats}

GIÁO VIÊN CHI TIẾT:
${teacherStats}

CHÍNH SÁCH THƯỞNG:
- Tái ĐK: ${(data.bonusPolicy.renewalBonus/1000)}k/bé
- Chuyên cần HV ≥${data.bonusPolicy.kpiAttThreshold}%: ${(data.bonusPolicy.kpiAttBonus/1000)}k/tháng
- Dẫn học thử: ${(data.bonusPolicy.trialBringBonus/1000)}k/bé
- Trial chốt ĐK: ${(data.bonusPolicy.trialConvertBonus/1000)}k/bé
- Dạy HT thành công: ${(data.bonusPolicy.trialTeachBonus/1000)}k/bé
- Referral: ${(data.bonusPolicy.referralBonus/1000)}k/bé
- Dự giờ đạt ≥80%: ${(data.bonusPolicy.obsBonus/1000)}k/quý
- Phạt trễ: Lần 1 nhắc nhở, Lần 2 trừ ${(data.bonusPolicy.latePenalty2/1000)}k/ca, Lần 3+ trừ ${(data.bonusPolicy.latePenalty3/1000)}k/ca

HV SẮP HẾT KHÓA (30 ngày):
${expiring.length>0?expiring.map(s=>`- ${s.name} (${data.centers.find(c=>c.id===s.centerId)?.name||"?"}) — hết ${s.expiryDate} — PH: ${s.parentName} ${s.parentPhone}`).join("\n"):"Không có"}`;
  };

  const presets=[
    {icon:"📊",label:"Phân tích hiệu suất GV",q:"Phân tích chi tiết hiệu suất từng giáo viên. So sánh và xếp hạng. Ai đang underperform? Ai cần coaching? Đề xuất action cụ thể."},
    {icon:"🚨",label:"Rủi ro retention",q:"Phân tích rủi ro mất HV. HV nào sắp hết khóa cần ưu tiên liên hệ? GV nào có HV nhiều risk nhất? Đề xuất kịch bản giữ chân cụ thể cho từng trường hợp."},
    {icon:"💰",label:"Tối ưu chi phí",q:"Phân tích cơ cấu chi phí nhân sự. ROI từng GV ra sao? Có GV nào chi phí/HV quá cao? Đề xuất tối ưu để giảm chi phí mà không ảnh hưởng chất lượng."},
    {icon:"📈",label:"Cơ hội tăng trưởng",q:"Dựa trên data, đâu là cơ hội tăng trưởng lớn nhất? Trung tâm nào cần đẩy mạnh? GV nào có tiềm năng mở thêm lớp? Đề xuất chiến lược 3 tháng tới."},
    {icon:"🎯",label:"KPI tháng tới",q:"Đề xuất KPI cụ thể cho tháng tới cho từng GV dựa trên hiệu suất hiện tại. Mục tiêu trial, referral, tái đăng ký cho toàn hệ thống."},
    {icon:"💡",label:"Hỏi tùy chỉnh",q:""},
  ];

  const askAI=async(prompt)=>{
    if(!prompt.trim())return;
    setLoading(true);setResponse("");
    const ctx=buildContext();
    try{
      const res=await fetch("/api/ai",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt,context:ctx})
      });
      const d=await res.json();
      if(d.error){setResponse("⚠️ "+d.error);setLoading(false);return;}
      const text=d.text||"Không nhận được phản hồi.";
      setResponse(text+(d.provider?`\n\n_— ${d.provider==="claude"?"Claude":"Gemini"}_`:""));
      setHistory(prev=>[{q:prompt,a:text,ts:new Date().toLocaleTimeString("vi-VN")},...prev].slice(0,10));
    }catch(e){setResponse("⚠️ Lỗi kết nối AI: "+e.message+"\n\nKiểm tra: Đã thêm GEMINI_API_KEY vào Vercel Environment Variables chưa?");}
    setLoading(false);
  };

  return <div style={{padding:14}}>
    <div style={{background:"linear-gradient(135deg,#7C3AED,#4C1D95)",borderRadius:14,padding:18,color:W,marginBottom:14}}>
      <div style={{fontSize:18,fontWeight:800,marginBottom:2}}>🤖 AI Agent</div>
      <div style={{fontSize:12,opacity:.8}}>Phân tích dữ liệu & đề xuất hành động cho WOW ART</div>
    </div>

    {/* Preset questions */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
      {presets.map((p,i)=>(
        <button key={i} onClick={()=>{if(p.q){askAI(p.q);}else{setQuery("");}}} style={{
          padding:"12px 10px",borderRadius:10,border:"1.5px solid #E2E8F0",background:W,
          cursor:"pointer",textAlign:"left",transition:"all .15s"
        }}>
          <div style={{fontSize:18,marginBottom:4}}>{p.icon}</div>
          <div style={{fontSize:11,fontWeight:700,color:D}}>{p.label}</div>
        </button>
      ))}
    </div>

    {/* Custom query */}
    <Card style={{marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:700,color:"#7C3AED",marginBottom:6}}>💡 Hỏi AI bất kỳ về dữ liệu WOW ART</div>
      <div style={{display:"flex",gap:4}}>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="VD: GV nào cần tăng lương? Nên mở thêm lớp ở đâu?..." style={{flex:1,padding:"9px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:12}} onKeyDown={e=>e.key==="Enter"&&askAI(query)}/>
        <Btn small onClick={()=>askAI(query)} disabled={loading} bg="#7C3AED">{loading?"...":"Gửi"}</Btn>
      </div>
    </Card>

    {/* Response */}
    {loading&&<Card style={{textAlign:"center",padding:30}}>
      <div style={{fontSize:28,marginBottom:8}}>🤖</div>
      <div style={{fontSize:13,fontWeight:600,color:"#7C3AED"}}>Đang phân tích dữ liệu...</div>
      <div style={{fontSize:11,color:"#888",marginTop:4}}>AI đang xem xét {data.sessions.length} sessions, {data.students.length} HV, {data.teachers.length} GV</div>
    </Card>}
    {response&&!loading&&<Card style={{border:"2px solid #7C3AED",marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:700,color:"#7C3AED",marginBottom:8}}>🤖 Phân tích & Đề xuất</div>
      <div style={{fontSize:12,lineHeight:1.7,color:D,whiteSpace:"pre-wrap"}}>{response}</div>
    </Card>}

    {/* History */}
    {history.length>0&&<Sec title={`📜 Lịch sử (${history.length})`}>
      {history.map((h,i)=>(
        <Card key={i} style={{padding:"8px 12px"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#7C3AED"}}>{h.ts} — {h.q.substring(0,60)}...</div>
          <div style={{fontSize:11,color:"#666",marginTop:4,maxHeight:60,overflow:"hidden"}}>{h.a.substring(0,200)}...</div>
          <button onClick={()=>setResponse(h.a)} style={{fontSize:10,color:B,background:"none",border:"none",cursor:"pointer",padding:"2px 0",fontWeight:600}}>Xem lại</button>
        </Card>
      ))}
    </Sec>}
  </div>;
}

/* CALC SALARY */
function calcSalary(t,sessions,data,mo){
  const bp=data.bonusPolicy;
  const isFull=(t.employType||"part")==="full";
  const q=currentQuarter();
  const ss=sessions.filter(s=>s.checkIn&&s.checkOut).sort((a,b)=>(a.checkIn||"").localeCompare(b.checkIn||""));
  const sessionCount=ss.length;

  // Session pay
  let sessionPay=0;let otSessions=0;const baselineSessions=t.baselineSessions||32;
  if(isFull){
    otSessions=Math.max(0,sessionCount-baselineSessions);
    ss.forEach((s,i)=>{if(i>=baselineSessions)sessionPay+=(s.type==="b2c"?(t.otRateB2C||t.salaryB2C):(t.otRateB2B||t.salaryB2B));});
  } else {
    sessionPay=ss.reduce((a,s)=>a+(s.type==="b2c"?t.salaryB2C:t.salaryB2B),0);
  }

  // Attendance — monthly
  let totSt=0,totPr=0;
  ss.forEach(s=>{const en=(s.attendance||[]).filter(a=>!a.isTrial);totSt+=en.length;totPr+=en.filter(a=>a.present).length;});
  const avgAtt=totSt?Math.round(totPr/totSt*100):0;

  // KPI chuyên cần HV ≥95% → 100k/tháng (monthly, not quarterly anymore)
  const kpiAtt=avgAtt>=(bp.kpiAttThreshold||95)?(bp.kpiAttBonus||100000):0;

  // Trial: dẫn HV học thử 100k/bé + dạy HT thành công (converted) 500k + 100k
  const trialBrought=ss.reduce((a,s)=>a+(s.attendance||[]).filter(x=>x.isTrial).length,0);
  const trialConv=ss.reduce((a,s)=>a+(s.attendance||[]).filter(x=>x.isTrial&&x.converted).length,0);
  const trialBringBonus=trialBrought*(bp.trialBringBonus||100000);
  const trialConvertBonus=trialConv*(bp.trialConvertBonus||500000);
  const trialTeachBonus=trialConv*(bp.trialTeachBonus||100000);
  const trialBonus=trialBringBonus+trialConvertBonus+trialTeachBonus;

  // Referrals (kept for backward compat)
  const refs=(data.referrals||[]).filter(r=>r.teacherId===t.id&&mk(r.date)===mo);
  const refBonus=refs.length*(bp.referralBonus||100000);
  const qRefs=(data.referrals||[]).filter(r=>r.teacherId===t.id&&getQuarter(r.date)===q);
  const refQBonus=qRefs.length>=3?Math.round((bp.referralQBonus||500000)/3):0;

  // Renewals: 200k/bé flat
  const renewals=(data.renewals||[]).filter(r=>r.teacherId===t.id&&mk(r.date)===mo);
  const renewalBonus=renewals.length*(bp.renewalBonus||200000);

  // Obs bonus (quarterly, pro-rate monthly)
  const qObs=data.observations.filter(o=>o.teacherId===t.id&&getQuarter(o.date)===q);
  const bestObs=qObs.length>0?Math.max(...qObs.map(o=>o.pct||o.score||0)):0;
  const obsBonus=qObs.length>0&&bestObs>=80?Math.round((bp.obsBonus||0)/3):0;

  // PENALTIES: đi trễ & nghỉ báo gấp
  const allMoSessions=data.sessions.filter(s=>s.teacherId===t.id&&mk(s.date)===mo&&s.checkIn&&s.checkOut);
  let lateCount=0;
  allMoSessions.forEach(s=>{
    if(s.checkIn&&s.classStartTime){
      if(!isOnTime(s.checkIn,s.classStartTime))lateCount++;
    }
  });
  let penalty=0;
  if(lateCount>=3)penalty=lateCount*(bp.latePenalty3||100000);
  else if(lateCount>=2)penalty=(bp.latePenalty2||50000);
  // lần 1: chỉ nhắc nhở, không trừ

  const totalBonus=kpiAtt+trialBonus+refBonus+refQBonus+renewalBonus+obsBonus;
  const fixedPay=isFull?(t.fixedSalary||0):0;
  const total=Math.max(0,fixedPay+sessionPay+totalBonus-penalty);
  const tClasses=data.classes.filter(c=>c.teacherId===t.id);
  const tStudentIds=[...new Set(tClasses.flatMap(c=>c.studentIds))];
  const totalHV=tStudentIds.length;
  const costPerHV=totalHV>0?Math.round(total/totalHV):0;
  const costPerSession=sessionCount>0?Math.round(total/sessionCount):0;

  return {
    isFull,fixedPay,sessionPay,sessionCount,otSessions,baselineSessions,
    avgAtt,kpiAtt,trialBrought,trialConv,trialBringBonus,trialConvertBonus,trialTeachBonus,trialBonus,
    refCount:refs.length,refBonus,refQBonus,
    renewalCount:renewals.length,renewalBonus,
    obsBonus,lateCount,penalty,totalBonus,total,
    totalHV,costPerHV,costPerSession
  };
}

/* ADMIN PAYROLL */
function APayroll({data,save,canEdit=true,showBank=false,scopeCenterIds}){
  const[mo,setMo]=useState(mk());
  const scopedTeachers=scopeCenterIds?data.teachers.filter(t=>(t.centerIds||[]).some(cid=>scopeCenterIds.includes(cid))):data.teachers;

  const calcT=t=>{
    const ss=data.sessions.filter(s=>s.teacherId===t.id&&mk(s.date)===mo);
    return calcSalary(t,ss,data,mo);
  };
  const fullTs=scopedTeachers.filter(t=>(t.employType||"part")==="full");
  const partTs=scopedTeachers.filter(t=>(t.employType||"part")==="part");
  const grandTotal=scopedTeachers.reduce((a,t)=>a+calcT(t).total,0);
  const fullTotal=fullTs.reduce((a,t)=>a+calcT(t).total,0);
  const partTotal=partTs.reduce((a,t)=>a+calcT(t).total,0);
  const confirmed=scopedTeachers.filter(t=>data.confirmations[`${t.id}_${mo}`]).length;

  const exportXLS=()=>{
    const rows=[
      ["BẢNG LƯƠNG GIÁO VIÊN — WOW ART"],
      ["Tháng:",mo],[],
      ["--- GV FULL-TIME ---"],
      ["Họ tên","Loại","Cấp bậc","Lương cố định","Số ca","Baseline","Ca OT","Lương OT","KPI(%)","Thưởng KPI","Trial","Thưởng trial","Ref","Thưởng ref","TĐK","Thưởng TĐK","Thưởng DG","TỔNG","XN"]
    ];
    fullTs.forEach(t=>{
      const c=calcT(t);const ck=`${t.id}_${mo}`;
      rows.push([t.name,"Full-time",t.level,c.fixedPay,c.sessionCount,c.baselineSessions,c.otSessions,c.sessionPay,c.avgAtt,c.kpiAtt,c.trialConv,c.trialBonus,c.refCount,c.refBonus,c.renewalCount,c.renewalBonus,c.obsBonus,c.total,data.confirmations[ck]?"Đã XN":"Chưa"]);
    });
    rows.push([]);
    rows.push(["--- GV PART-TIME ---"]);
    rows.push(["Họ tên","Loại","Cấp bậc","","Số buổi","","","Lương buổi","KPI(%)","Thưởng KPI","Trial","Thưởng trial","Ref","Thưởng ref","TĐK","Thưởng TĐK","Thưởng DG","TỔNG","XN"]);
    partTs.forEach(t=>{
      const c=calcT(t);const ck=`${t.id}_${mo}`;
      rows.push([t.name,"Part-time",t.level,"",c.sessionCount,"","",c.sessionPay,c.avgAtt,c.kpiAtt,c.trialConv,c.trialBonus,c.refCount,c.refBonus,c.renewalCount,c.renewalBonus,c.obsBonus,c.total,data.confirmations[ck]?"Đã XN":"Chưa"]);
    });
    rows.push([]);
    rows.push(["","","","","","","","","","","","","","","","","TỔNG FULL",fullTotal,""]);
    rows.push(["","","","","","","","","","","","","","","","","TỔNG PART",partTotal,""]);
    rows.push(["","","","","","","","","","","","","","","","","TỔNG CHI",grandTotal,""]);
    const bom="\uFEFF";
    const csv=rows.map(r=>r.map(c=>{const s=String(c==null?"":c);return s.includes(",")||s.includes('"')||s.includes('\n')?'"'+s.replace(/"/g,'""')+'"':s;}).join(",")).join("\n");
    const blob=new Blob([bom+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`BangLuong_WowArt_${mo}.csv`;a.click();URL.revokeObjectURL(url);
  };

  const renderCard=(t)=>{
    const c=calcT(t);const ck=`${t.id}_${mo}`;const isC=!!data.confirmations[ck];
    const isFull=(t.employType||"part")==="full";
    const accent=isFull?"#7C3AED":B;
    return <Card key={t.id} style={{overflow:"hidden",border:isC?`2px solid ${G}`:"none",borderLeft:`3px solid ${accent}`}}>
      <div style={{background:accent+"08",padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <span style={{fontWeight:700,fontSize:13}}>{t.name}</span>
          <span style={{fontSize:10,color:"#888",marginLeft:4}}>{t.level}</span>
          <Badge bg={accent+"12"} color={accent}>{isFull?"Full":"Part"}</Badge>
        </div>
        {isC&&<Badge bg={G+"12"} color={G}>✓ Đã XN</Badge>}
      </div>
      <div style={{padding:"8px 12px"}}>
        {isFull && <>
          <Row l="Lương cố định" v={fmt(c.fixedPay)}/>
          <Row l={`Số ca (${c.sessionCount}/${c.baselineSessions})`} v={c.otSessions>0?`+${c.otSessions} OT`:"Đủ baseline"}/>
          {c.otSessions>0&&<Row l={`Lương OT (${c.otSessions} ca)`} v={fmt(c.sessionPay)}/>}
        </>}
        {!isFull && <>
          <Row l={`Lương buổi (${c.sessionCount})`} v={fmt(c.sessionPay)}/>
        </>}
        <Row l={`Chuyên cần HV (${c.avgAtt}%)`} v={fmt(c.kpiAtt)}/>
        <Row l={`Dẫn HT (${c.trialBrought||0}) + Trial→ĐK (${c.trialConv})`} v={fmt(c.trialBonus)}/>
        <Row l={`Referral (${c.refCount})`} v={fmt(c.refBonus)}/>
        {c.refQBonus>0&&<Row l="Bonus 3 ref/quý" v={fmt(c.refQBonus)}/>}
        <Row l={`Tái ĐK (${c.renewalCount})`} v={fmt(c.renewalBonus)}/>
        <Row l="Thưởng dự giờ" v={fmt(c.obsBonus)}/>
        {(c.penalty||0)>0&&<Row l={`⚠️ Phạt trễ (${c.lateCount}x)`} v={`-${fmt(c.penalty)}`} color={R}/>}
        <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,borderTop:`2px solid ${accent}`,marginTop:4}}>
          <span style={{fontWeight:800,color:accent,fontSize:13}}>TỔNG</span>
          <span style={{fontWeight:800,color:accent,fontSize:15}}>{fmt(c.total)}</span>
        </div>
        {showBank&&<div style={{marginTop:6,padding:6,background:"#F0FDF4",borderRadius:6,fontSize:10,color:"#059669"}}>
          🏦 {t.bankName||"—"} • STK: {t.bankAccount||"—"} • {t.bankHolder||"—"}
        </div>}
        {canEdit&&<div style={{marginTop:6}}>
          <button onClick={()=>{const nd={...data,confirmations:{...data.confirmations,[ck]:isC?null:new Date().toISOString()}};save(nd);}} style={{width:"100%",padding:"6px 0",borderRadius:8,border:`1.5px solid ${isC?G:"#E2E8F0"}`,background:isC?G+"10":W,color:isC?G:"#888",fontSize:11,fontWeight:700,cursor:"pointer"}}>{isC?"✓ Đã XN — Bấm để hủy":"Xác nhận lương"}</button>
        </div>}
      </div>
    </Card>;
  };

  return <div style={{padding:14}}>
    <div style={{display:"flex",gap:6,marginBottom:12}}>
      <input type="month" value={mo} onChange={e=>setMo(e.target.value)} style={{flex:1,padding:"7px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,fontWeight:600,boxSizing:"border-box"}}/>
      <Btn small onClick={exportXLS} bg={G}>📥 Xuất CSV</Btn>
    </div>

    {/* Full-time */}
    {fullTs.length>0&&<Sec title={`👔 Full-time (${fullTs.length})`}>
      {fullTs.map(renderCard)}
      <div style={{background:"#7C3AED08",borderRadius:10,padding:"8px 14px",display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontWeight:700,color:"#7C3AED",fontSize:12}}>Tổng Full-time</span>
        <span style={{fontWeight:800,color:"#7C3AED",fontSize:14}}>{fmt(fullTotal)}</span>
      </div>
    </Sec>}

    {/* Part-time */}
    {partTs.length>0&&<Sec title={`⏰ Part-time (${partTs.length})`}>
      {partTs.map(renderCard)}
      <div style={{background:B+"08",borderRadius:10,padding:"8px 14px",display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontWeight:700,color:B,fontSize:12}}>Tổng Part-time</span>
        <span style={{fontWeight:800,color:B,fontSize:14}}>{fmt(partTotal)}</span>
      </div>
    </Sec>}

    {/* Grand total */}
    <div style={{background:`linear-gradient(135deg,${B},#2980B9)`,borderRadius:13,padding:18,textAlign:"center",color:W}}>
      <div style={{fontSize:12,opacity:.8}}>Tổng chi lương — {mo}</div>
      <div style={{fontSize:26,fontWeight:800,marginTop:3}}>{fmt(grandTotal)}</div>
      <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:6,fontSize:11,opacity:.8}}>
        <span>👔 Full: {fmt(fullTotal)}</span>
        <span>⏰ Part: {fmt(partTotal)}</span>
      </div>
      <div style={{fontSize:11,opacity:.7,marginTop:3}}>{confirmed}/{scopedTeachers.length} GV đã xác nhận</div>
    </div>
  </div>;
}

/* USER MANAGEMENT (CEO ONLY) */
function AUsers({data,save}){
  const[show,setShow]=useState(false);const[edit,setEdit]=useState(null);
  const roleOpts=[{value:"ceo",label:"👑 CEO"},{value:"admin_all",label:"🔑 Admin Tổng"},{value:"admin_center",label:"📋 Admin Center"},{value:"academic",label:"🎓 Academic Manager"},{value:"accountant",label:"💰 Kế toán"}];
  const empty={name:"",role:"admin_center",password:"",centerIds:[]};
  const[form,setForm]=useState(empty);const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const doSave=()=>{
    if(!form.name||!form.password)return alert("Nhập đủ tên và mật khẩu");
    const users=data.users||[];
    if(edit)save({...data,users:users.map(u=>u.id===edit?{...u,...form}:u)});
    else save({...data,users:[...users,{...form,id:"u_"+uid()}]});
    setShow(false);setEdit(null);setForm(empty);
  };
  const startEdit=u=>{setForm({name:u.name,role:u.role,password:u.password,centerIds:u.centerIds||[]});setEdit(u.id);setShow(true);};
  const users=data.users||[];

  return <div style={{padding:14}}>
    <Sec title={`👥 Quản lý Users (${users.length})`} action={<Btn small onClick={()=>{setForm(empty);setEdit(null);setShow(!show);}}>{show?"Đóng":"+ Thêm"}</Btn>}>
      {show&&<Card style={{border:`2px solid #7C3AED`,marginBottom:14}}>
        <Inp label="Tên hiển thị *" value={form.name} onChange={e=>f("name",e.target.value)} placeholder="VD: Admin Tân Phú"/>
        <Sel label="Vai trò" value={form.role} onChange={v=>f("role",v)} options={roleOpts}/>
        <Inp label="Mật khẩu *" value={form.password} onChange={e=>f("password",e.target.value)} placeholder="VD: tp@789"/>
        {form.role==="admin_center"&&<div style={{marginBottom:8}}>
          <label style={{fontSize:11,fontWeight:600,color:"#666",display:"block",marginBottom:3}}>Gán Center</label>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{data.centers.map(c=>(
            <button key={c.id} onClick={()=>f("centerIds",form.centerIds.includes(c.id)?form.centerIds.filter(x=>x!==c.id):[...form.centerIds,c.id])} style={{padding:"5px 10px",borderRadius:7,border:`1.5px solid ${form.centerIds.includes(c.id)?B:"#E2E8F0"}`,background:form.centerIds.includes(c.id)?B+"10":W,fontWeight:600,fontSize:11,cursor:"pointer",color:form.centerIds.includes(c.id)?B:"#888"}}>
              {c.type==="b2b"?"🏫":"🏠"} {c.name} ({c.id})
            </button>
          ))}</div>
        </div>}
        <div style={{display:"flex",gap:6}}><Btn full onClick={doSave} bg={G}>{edit?"Lưu":"Thêm"}</Btn><Btn full onClick={()=>{setShow(false);setEdit(null);}} bg="#E2E8F0" color="#666">Hủy</Btn></div>
      </Card>}

      {users.map(u=>{
        const rc={ceo:{icon:"👑",color:"#1a1a2e"},admin_all:{icon:"🔑",color:"#7C3AED"},admin_center:{icon:"📋",color:B},academic:{icon:"🎓",color:"#059669"},accountant:{icon:"💰",color:"#D97706"}}[u.role]||{icon:"👤",color:"#888"};
        return <Card key={u.id} style={{padding:"10px 12px",borderLeft:`3px solid ${rc.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>{rc.icon} {u.name}</div>
              <div style={{fontSize:10,color:"#888"}}>
                ID: {u.id} • Pass: {u.password}
                {u.centerIds?.length>0&&<span> • Centers: {u.centerIds.join(", ")}</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>startEdit(u)} style={{background:B+"10",border:"none",borderRadius:7,padding:"5px 10px",color:B,cursor:"pointer",fontSize:11}}>✏️</button>
              <button onClick={()=>{if(confirm(`Xóa user ${u.name}?`))save({...data,users:users.filter(x=>x.id!==u.id)});}} style={{background:R+"10",border:"none",borderRadius:7,padding:"5px 10px",color:R,cursor:"pointer",fontSize:11}}>🗑</button>
            </div>
          </div>
        </Card>;
      })}
    </Sec>

    {/* Password guide */}
    <Card style={{padding:12,background:"#FFFBEB",border:"1px solid #FDE68A"}}>
      <div style={{fontSize:12,fontWeight:700,color:"#92400E",marginBottom:4}}>📋 Danh sách đăng nhập</div>
      {users.map(u=><div key={u.id} style={{fontSize:11,padding:"3px 0",borderBottom:"1px solid #FDE68A"}}>{u.name}: <strong>{u.password}</strong>{u.centerIds?.length?` (${u.centerIds.join(",")})`:""}
      </div>)}
      <div style={{fontSize:10,color:"#92400E",marginTop:6}}>⚠️ Gửi mật khẩu riêng cho từng người. Không công khai!</div>
    </Card>
  </div>;
}

/* TEACHER ATTENDANCE */
function TAtt({data,save,user}){
  // Show all locations where teacher has classes assigned
  const myAllClasses=data.classes.filter(c=>c.teacherId===user.id);
  const myLocIds=[...new Set(myAllClasses.map(c=>c.centerId))];
  const myLocs=myLocIds.map(lid=>data.centers.find(c=>c.id===lid)).filter(Boolean);
  const[cid,setCid]=useState(myLocs[0]?.id||"");
  const curLoc=data.centers.find(c=>c.id===cid);
  const locType=curLoc?.type||"b2c";

  const myClasses=data.classes.filter(c=>c.teacherId===user.id&&c.centerId===cid);
  const todaySessions=data.sessions.filter(s=>s.teacherId===user.id&&s.date===td());
  const activeSession=todaySessions.find(s=>s.checkIn&&!s.checkOut);
  const[selClass,setSelClass]=useState(myClasses[0]?.id||"");
  const[extraName,setExtraName]=useState("");const[extraType,setExtraType]=useState("trial");
  const[report,setReport]=useState("");
  const[lessonPrepped,setLessonPrepped]=useState(false);
  const[lessonPrepImg,setLessonPrepImg]=useState("");// base64 thumbnail

  // FIX #11: Track session count for Full-time baseline display
  const isFull=(user.employType||"part")==="full";
  const moSessions=data.sessions.filter(s=>s.teacherId===user.id&&mk(s.date)===mk()&&s.checkIn&&s.checkOut);
  const moCount=moSessions.length;
  const baseline=user.baselineSessions||32;

  const handlePrepImg=(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>2*1024*1024)return alert("Ảnh tối đa 2MB");
    const reader=new FileReader();
    reader.onload=()=>{
      // Resize to thumbnail ~400px wide to save Firebase space
      const img=new Image();
      img.onload=()=>{
        const canvas=document.createElement("canvas");
        const maxW=400;const scale=Math.min(maxW/img.width,1);
        canvas.width=img.width*scale;canvas.height=img.height*scale;
        canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
        setLessonPrepImg(canvas.toDataURL("image/jpeg",0.7));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  };

  const checkIn=()=>{
    const cl=myClasses.find(c=>c.id===selClass);if(!cl)return alert("Chọn ca dạy");
    if(!lessonPrepped)return alert("Vui lòng xác nhận đã soạn bài trước khi check-in!");
    const duplicate=todaySessions.find(s=>s.classId===selClass&&s.checkOut);
    if(duplicate)return alert("Bạn đã check-in ca này hôm nay rồi! Không thể check-in trùng.");
    const today=new Date().getDay();
    if(cl.day!==today){
      if(!confirm(`Ca này lịch là ${DAYS_FULL[cl.day]} nhưng hôm nay là ${DAYS_FULL[today]}.\nBạn muốn check-in dạy bù?`))return;
    }
    const activeStudentIds=cl.studentIds.filter(sid=>{
      const st=data.students.find(s=>s.id===sid);
      return st&&(st.status==="Đang học"||st.status==="Trial");
    });
    const attendance=activeStudentIds.map(sid=>{
      const st=data.students.find(s=>s.id===sid);
      return {studentId:sid,name:st?.name||"?",present:true,isTrial:st?.status==="Trial",isMakeup:false,converted:false};
    });
    const session={id:uid(),teacherId:user.id,classId:selClass,centerId:cid,date:td(),type:locType,checkIn:new Date().toISOString(),checkOut:null,classStartTime:cl.startTime,attendance,reportSent:false,reportNote:"",lessonPrepped:true,lessonPrepImg:lessonPrepImg||""};
    save({...data,sessions:[...data.sessions,session]});
    setLessonPrepped(false);setLessonPrepImg("");
  };
  const checkOut=()=>{
    if(!activeSession)return;
    save({...data,sessions:data.sessions.map(s=>s.id===activeSession.id?{...s,checkOut:new Date().toISOString(),reportSent:!!report||!!activeSession.reportNote,reportNote:report||activeSession.reportNote}:s)});
    setReport("");
  };
  const toggleAtt=sid=>{if(!activeSession)return;save({...data,sessions:data.sessions.map(s=>s.id===activeSession.id?{...s,attendance:(s.attendance||[]).map(a=>a.studentId===sid?{...a,present:!a.present}:a)}:s)});};
  const toggleConv=sid=>{if(!activeSession)return;save({...data,sessions:data.sessions.map(s=>s.id===activeSession.id?{...s,attendance:(s.attendance||[]).map(a=>a.studentId===sid?{...a,converted:!a.converted}:a)}:s)});};
  const addExtra=()=>{
    if(!extraName||!activeSession)return;
    const na={studentId:uid(),name:extraName,present:true,isTrial:extraType==="trial",isMakeup:extraType==="makeup",converted:false};
    save({...data,sessions:data.sessions.map(s=>s.id===activeSession.id?{...s,attendance:[...(s.attendance||[]),na]}:s)});
    setExtraName("");
  };

  return <div style={{padding:14}}>
    {/* Location selector - show all assigned locations */}
    {myLocs.length>1&&<div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
      {myLocs.map(c=>(
        <button key={c.id} onClick={()=>{setCid(c.id);setSelClass("");}} style={{
          padding:"7px 10px",borderRadius:9,
          border:`2px solid ${cid===c.id?(c.type==="b2b"?"#7C3AED":B):"#E2E8F0"}`,
          background:cid===c.id?(c.type==="b2b"?"#7C3AED":B):W,
          color:cid===c.id?W:D,fontWeight:600,cursor:"pointer",fontSize:11
        }}>
          {c.type==="b2b"?"🏫":"🏠"} {c.name}
        </button>
      ))}
    </div>}

    {/* Single location indicator */}
    {myLocs.length===1&&curLoc&&<div style={{
      background:curLoc.type==="b2b"?"#7C3AED10":B+"08",
      borderRadius:8,padding:"6px 12px",marginBottom:10,fontSize:12,fontWeight:600,
      color:curLoc.type==="b2b"?"#7C3AED":B
    }}>
      {curLoc.type==="b2b"?"🏫":"🏠"} {curLoc.name} ({curLoc.type.toUpperCase()})
    </div>}

    {!activeSession?(
      <>
        <div style={{background:B+"08",borderRadius:14,padding:18,marginBottom:14,textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:6}}>⚪</div>
          <div style={{fontSize:16,fontWeight:700,color:D}}>Chưa check-in</div>
        </div>
        <Card>
          <Sel label="Ca dạy" value={selClass} onChange={v=>setSelClass(v)} options={[{value:"",label:"-- Chọn ca --"},...myClasses.map(c=>{
            const sts=c.studentIds.map(sid=>data.students.find(s=>s.id===sid)).filter(Boolean);
            const activeCount=sts.filter(s=>s.status==="Đang học"||s.status==="Trial").length;
            return {value:c.id,label:`${DAYS_FULL[c.day]} — Ca ${c.caNumber} (${c.startTime}-${c.endTime}) • ${c.classLevel} • ${activeCount} HV`};
          })]}/>
          <div style={{fontSize:11,color:locType==="b2b"?"#7C3AED":B,fontWeight:600,marginBottom:8,padding:"4px 10px",background:locType==="b2b"?"#7C3AED10":B+"08",borderRadius:6,display:"inline-block"}}>
            {locType==="b2b"?"🏫 B2B — Tại trường":"🏠 B2C — Tại trung tâm"}
            {isFull?` • Lương cố định: ${fmt(user.fixedSalary||0)}/th`:` • Lương: ${fmt(locType==="b2b"?user.salaryB2B:user.salaryB2C)}/buổi`}
          </div>
          {/* FIX #11: Show baseline counter for Full-time */}
          {isFull&&<div style={{fontSize:11,padding:"4px 10px",background:moCount>=baseline?"#22C55E10":"#F4C42D10",borderRadius:6,marginBottom:8,fontWeight:600,color:moCount>=baseline?"#22C55E":"#B45309"}}>
            📊 Ca tháng này: {moCount}/{baseline} {moCount>=baseline?`✓ Đủ baseline! Ca tiếp theo = OT (${fmt(locType==="b2b"?(user.otRateB2B||0):(user.otRateB2C||0))}/buổi)`:`— còn ${baseline-moCount} ca nữa`}
          </div>}
          {selClass&&<>
            <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:4}}>Danh sách lớp:</div>
            {myClasses.find(c=>c.id===selClass)?.studentIds.map(sid=>{
              const s=data.students.find(x=>x.id===sid);if(!s)return null;
              return <div key={sid} style={{fontSize:12,padding:"3px 0",color:"#555"}}>• {s.name} ({s.gender}•{s.studentLevel}) — PH: {s.parentName} — <span style={{color:s.status==="Đang học"?G:s.status==="Trial"?B:R,fontWeight:600,fontSize:10}}>{s.status}</span></div>;
            })}
          </>}
          {/* LESSON PREP CHECK */}
          <div style={{background:"#FFFBEB",border:"2px solid #F4C42D",borderRadius:10,padding:12,marginTop:10}}>
            <div style={{fontSize:12,fontWeight:700,color:"#92400E",marginBottom:8}}>📝 Xác nhận soạn bài</div>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:8}}>
              <input type="checkbox" checked={lessonPrepped} onChange={e=>setLessonPrepped(e.target.checked)} style={{width:20,height:20,accentColor:G}}/>
              <span style={{fontSize:13,fontWeight:600,color:lessonPrepped?G:"#92400E"}}>{lessonPrepped?"✅ Đã soạn bài":"Tôi đã soạn bài cho buổi dạy hôm nay"}</span>
            </label>
            <div style={{fontSize:11,color:"#888",marginBottom:6}}>Đính kèm ảnh bài soạn (không bắt buộc):</div>
            <input type="file" accept="image/*" capture="environment" onChange={handlePrepImg} style={{fontSize:11,marginBottom:4}}/>
            {lessonPrepImg&&<div style={{marginTop:6}}>
              <img src={lessonPrepImg} alt="Bài soạn" style={{maxWidth:"100%",maxHeight:200,borderRadius:8,border:"1px solid #E5E7EB"}}/>
              <button onClick={()=>setLessonPrepImg("")} style={{fontSize:10,color:R,background:"none",border:"none",cursor:"pointer",marginTop:2}}>🗑 Xóa ảnh</button>
            </div>}
          </div>
          <Btn full onClick={checkIn} style={{marginTop:10}}>⏰ CHECK-IN</Btn>
        </Card>
      </>
    ):(
      <>
        <div style={{background:`linear-gradient(135deg,${G},#16A34A)`,borderRadius:14,padding:16,marginBottom:14,textAlign:"center",color:W}}>
          <div style={{fontSize:32}}>🟢</div>
          <div style={{fontSize:16,fontWeight:700}}>Đang dạy</div>
          <div style={{fontSize:12,opacity:.9}}>Check-in lúc {fmtT(activeSession.checkIn)} • {activeSession.type.toUpperCase()}</div>
        </div>
        <Card>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>📋 Điểm danh ({(activeSession.attendance||[]).filter(a=>a.present).length}/{(activeSession.attendance||[]).length})</div>
          {(activeSession.attendance||[]).map(a=>(
            <div key={a.studentId} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F5F5F5"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>toggleAtt(a.studentId)} style={{width:28,height:28,borderRadius:7,border:"none",cursor:"pointer",background:a.present?G:"#F1F5F9",color:a.present?W:"#CBD5E1",fontSize:14,fontWeight:700}}>{a.present?"✓":"✗"}</button>
                <div>
                  <div style={{fontWeight:600,fontSize:12,color:a.present?D:"#CBD5E1"}}>{a.name}</div>
                  <div style={{display:"flex",gap:4}}>{a.isTrial&&<span style={{fontSize:9,color:O,fontWeight:600}}>🌟 Trial</span>}{a.isMakeup&&<span style={{fontSize:9,color:B,fontWeight:600}}>🔄 Học bù</span>}</div>
                </div>
              </div>
              {a.isTrial&&<button onClick={()=>toggleConv(a.studentId)} style={{padding:"3px 8px",borderRadius:7,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,background:a.converted?G+"12":"#F1F5F9",color:a.converted?G:"#888"}}>{a.converted?"✓ Chốt":"Chốt ĐK"}</button>}
            </div>
          ))}
          <div style={{marginTop:10,paddingTop:8,borderTop:"2px dashed #E2E8F0"}}>
            <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:4}}>Thêm bé</div>
            <div style={{display:"flex",gap:4,marginBottom:6}}>
              {[{k:"trial",l:"🌟 Trial"},{k:"makeup",l:"🔄 Học bù"}].map(o=><button key={o.k} onClick={()=>setExtraType(o.k)} style={{flex:1,padding:5,borderRadius:7,border:`1.5px solid ${extraType===o.k?O:"#E2E8F0"}`,background:extraType===o.k?O+"10":W,fontSize:10,fontWeight:600,cursor:"pointer",color:extraType===o.k?O:"#888"}}>{o.l}</button>)}
            </div>
            <div style={{display:"flex",gap:4}}>
              <input value={extraName} onChange={e=>setExtraName(e.target.value)} placeholder="Tên bé..." style={{flex:1,padding:"7px 10px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:12}} onKeyDown={e=>e.key==="Enter"&&addExtra()}/>
              <Btn small onClick={addExtra}>+</Btn>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>📝 Báo cáo lớp học</div>
          <textarea value={report||activeSession.reportNote||""} onChange={e=>setReport(e.target.value)} placeholder="Vấn đề cần lưu ý về HV / PH / trung tâm..." style={{width:"100%",padding:8,borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:12,minHeight:50,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
        </Card>
        <Btn full bg={R} onClick={checkOut}>🔴 CHECK-OUT & GỬI BÁO CÁO</Btn>
      </>
    )}
    {todaySessions.filter(s=>s.checkOut).length>0&&<Sec title="Đã hoàn thành">
      {todaySessions.filter(s=>s.checkOut).map(s=>(
        <Card key={s.id} style={{padding:"8px 12px"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,fontSize:12}}>{s.type.toUpperCase()} • {fmtT(s.checkIn)}→{fmtT(s.checkOut)}</span><span style={{fontSize:11,color:"#888"}}>{(s.attendance||[]).filter(a=>a.present).length}/{(s.attendance||[]).length} HV</span></div>
          {s.reportNote&&<div style={{fontSize:11,color:"#666",marginTop:2}}>📝 {s.reportNote}</div>}
        </Card>
      ))}
    </Sec>}
  </div>;
}

/* TEACHER SCHEDULE - Calendar View */
function TSchedule({data,user}){
  const myClasses=data.classes.filter(c=>c.teacherId===user.id);
  const isFull=(user.employType||"part")==="full";
  const mo=mk();
  const moSessions=data.sessions.filter(s=>s.teacherId===user.id&&mk(s.date)===mo&&s.checkOut);
  const baseline=user.baselineSessions||32;

  // Group by day
  const byDay={};
  myClasses.forEach(cl=>{
    if(!byDay[cl.day])byDay[cl.day]=[];
    byDay[cl.day].push(cl);
  });

  // This week's dates
  const now=new Date();const dow=now.getDay();
  const weekStart=new Date(now);weekStart.setDate(now.getDate()-dow);
  const weekDates=[];
  for(let i=0;i<7;i++){const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);weekDates.push(d);}

  return <div style={{padding:14}}>
    <div style={{background:`linear-gradient(135deg,${isFull?"#7C3AED":B},${isFull?"#5B21B6":"#2980B9"})`,borderRadius:14,padding:16,color:W,marginBottom:14}}>
      <div style={{fontSize:16,fontWeight:800}}>📅 Lịch dạy</div>
      <div style={{fontSize:12,opacity:.8,marginTop:2}}>{myClasses.length} ca / tuần • {[...new Set(myClasses.map(c=>c.centerId))].length} điểm dạy</div>
      {isFull&&<div style={{fontSize:11,marginTop:6,background:"rgba(255,255,255,.15)",borderRadius:8,padding:"6px 10px"}}>
        📊 Tháng này: {moSessions.length}/{baseline} ca {moSessions.length>=baseline?`✓ Đã đủ baseline!`:`— còn ${baseline-moSessions.length} ca`}
      </div>}
    </div>

    {/* Weekly view */}
    <Sec title="Tuần này">
      {weekDates.map((d,i)=>{
        const dayClasses=byDay[i]||[];
        const dateStr=d.toISOString().split("T")[0];
        const daySessions=data.sessions.filter(s=>s.teacherId===user.id&&s.date===dateStr);
        const isToday=dateStr===td();
        const isPast=d<new Date(td());
        return <div key={i} style={{marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <div style={{width:36,height:36,borderRadius:8,background:isToday?B:isPast?"#F1F5F9":"#FAFAFA",color:isToday?W:isPast?"#94A3B8":D,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:10}}>
              <span>{DAYS[i]}</span><span style={{fontSize:13}}>{d.getDate()}</span>
            </div>
            <div style={{flex:1}}>
              {dayClasses.length===0?<span style={{fontSize:11,color:"#CBD5E1"}}>— Nghỉ —</span>:
              dayClasses.map(cl=>{
                const cn=data.centers.find(c=>c.id===cl.centerId);
                const done=daySessions.find(s=>s.classId===cl.id&&s.checkOut);
                const sts=cl.studentIds.filter(sid=>{const st=data.students.find(s=>s.id===sid);return st&&(st.status==="Đang học"||st.status==="Trial");}).length;
                return <div key={cl.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:7,background:done?G+"08":isToday?B+"08":"#F8F8F8",marginBottom:2}}>
                  <span style={{fontSize:10,fontWeight:600,color:done?G:B}}>{cl.startTime}-{cl.endTime}</span>
                  <span style={{fontSize:11,fontWeight:600}}>{cn?.name}</span>
                  <Badge bg={cn?.type==="b2b"?"#7C3AED12":"#E2E8F0"} color={cn?.type==="b2b"?"#7C3AED":"#666"}>{cn?.type?.toUpperCase()}</Badge>
                  <span style={{fontSize:10,color:"#888"}}>{sts} HV</span>
                  {done&&<span style={{fontSize:10,color:G}}>✓</span>}
                </div>;
              })}
            </div>
          </div>
        </div>;
      })}
    </Sec>

    {/* All classes summary */}
    <Sec title="Tất cả ca dạy">
      {Object.entries(byDay).sort(([a],[b])=>a-b).map(([day,cls])=>(
        <Card key={day} style={{padding:"8px 12px"}}>
          <div style={{fontWeight:700,fontSize:13,color:B,marginBottom:4}}>{DAYS_FULL[day]}</div>
          {cls.map(cl=>{
            const cn=data.centers.find(c=>c.id===cl.centerId);
            const sts=cl.studentIds.filter(sid=>{const st=data.students.find(s=>s.id===sid);return st&&(st.status==="Đang học"||st.status==="Trial");}).length;
            return <div key={cl.id} style={{fontSize:12,padding:"4px 0",borderTop:"1px solid #F5F5F5",display:"flex",justifyContent:"space-between"}}>
              <span>Ca {cl.caNumber} ({cl.startTime}-{cl.endTime}) • {cn?.name} <Badge>{cn?.type?.toUpperCase()}</Badge></span>
              <span style={{fontSize:11,color:"#888"}}>{cl.classLevel} • {sts} HV</span>
            </div>;
          })}
        </Card>
      ))}
      {myClasses.length===0&&<div style={{textAlign:"center",color:"#888",padding:20,fontSize:12}}>Chưa có ca dạy nào</div>}
    </Sec>
  </div>;
}

/* TEACHER HISTORY */
function THist({data,user}){
  const[mo,setMo]=useState(mk());
  const ss=data.sessions.filter(s=>s.teacherId===user.id&&mk(s.date)===mo).sort((a,b)=>b.date.localeCompare(a.date));
  return <div style={{padding:14}}>
    <input type="month" value={mo} onChange={e=>setMo(e.target.value)} style={{width:"100%",padding:"7px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,fontWeight:600,marginBottom:12,boxSizing:"border-box"}}/>
    <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{ss.length} buổi trong tháng</div>
    {ss.map(s=>{const d=new Date(s.date);return <Card key={s.id} style={{padding:"8px 12px"}}>
      <div style={{display:"flex",justifyContent:"space-between"}}><div><span style={{fontWeight:700,fontSize:13}}>{d.getDate()}/{d.getMonth()+1}</span> <Badge>{s.type.toUpperCase()}</Badge></div><span style={{fontSize:11,color:"#888"}}>{fmtT(s.checkIn)}→{fmtT(s.checkOut)}</span></div>
      <div style={{display:"flex",gap:8,marginTop:3,fontSize:11,color:"#888"}}>
        <span>👥 {(s.attendance||[]).filter(a=>a.present).length}/{(s.attendance||[]).length}</span>
        {(s.attendance||[]).some(a=>a.isTrial)&&<span style={{color:O}}>🌟 Trial</span>}
        {s.reportNote&&<span style={{color:B}}>📝</span>}
      </div>
    </Card>;})}
    {ss.length===0&&<div style={{color:"#888",textAlign:"center",marginTop:30,fontSize:12}}>Không có dữ liệu</div>}
  </div>;
}

/* TEACHER SALARY */
function TSalary({data,save,user}){
  const[mo,setMo]=useState(mk());
  const t=data.teachers.find(x=>x.id===user.id)||{salaryB2C:0,salaryB2B:0,employType:"part"};
  const isFull=(t.employType||"part")==="full";
  const ss=data.sessions.filter(s=>s.teacherId===user.id&&mk(s.date)===mo);
  const c=calcSalary(t,ss,data,mo);
  const ck=`${user.id}_${mo}`;const isC=!!data.confirmations[ck];
  const confirm2=()=>{save({...data,confirmations:{...data.confirmations,[ck]:new Date().toISOString()}});};
  const obs=data.observations.filter(o=>o.teacherId===user.id).sort((a,b)=>b.date.localeCompare(a.date));
  const accent=isFull?"#7C3AED":B;
  const rc2=rank=>rank==="A+"||rank==="A"?G:rank==="B"?O:R;
  const rl2=rank=>rank==="A+"?"Xuất sắc":rank==="A"?"Tốt":rank==="B"?"Đạt":"Chưa đạt";

  return <div style={{padding:14}}>
    <input type="month" value={mo} onChange={e=>setMo(e.target.value)} style={{width:"100%",padding:"7px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,fontWeight:600,marginBottom:12,boxSizing:"border-box"}}/>
    <Card style={{overflow:"hidden"}}>
      <div style={{background:`linear-gradient(135deg,${accent},${isFull?"#5B21B6":"#2980B9"})`,padding:"16px 14px",color:W,textAlign:"center"}}>
        <div style={{fontSize:11,opacity:.8}}>{isFull?"👔 Full-time":"⏰ Part-time"} — Tổng thu nhập tháng</div>
        <div style={{fontSize:26,fontWeight:800,marginTop:3}}>{fmt(c.total)}</div>
      </div>
      <div style={{padding:12}}>
        {isFull ? <>
          <Row l="Lương cố định" v={fmt(c.fixedPay)}/>
          <Row l={`Số ca dạy (${c.sessionCount}/${c.baselineSessions})`} v={c.sessionCount>=c.baselineSessions?"✓ Đủ":"Chưa đủ"}/>
          {c.otSessions>0&&<Row l={`Ca OT (+${c.otSessions})`} v={fmt(c.sessionPay)}/>}
        </> : <>
          <Row l={`Lương buổi (${c.sessionCount})`} v={fmt(c.sessionPay)}/>
        </>}
        <Row l={`Chuyên cần HV (${c.avgAtt}%)`} v={fmt(c.kpiAtt)}/>
        <Row l={`Dẫn học thử (${c.trialBrought||0})`} v={fmt(c.trialBringBonus||0)}/>
        <Row l={`Trial → ĐK (${c.trialConv})`} v={fmt(c.trialConvertBonus||0)}/>
        <Row l={`Dạy HT t.công (${c.trialConv})`} v={fmt(c.trialTeachBonus||0)}/>
        <Row l={`Referral (${c.refCount})`} v={fmt(c.refBonus)}/>
        {c.refQBonus>0&&<Row l="Bonus 3 ref/quý" v={fmt(c.refQBonus)}/>}
        <Row l={`Tái ĐK (${c.renewalCount})`} v={fmt(c.renewalBonus)}/>
        <Row l="Thưởng dự giờ" v={fmt(c.obsBonus)}/>
        {(c.penalty||0)>0&&<Row l={`⚠️ Phạt trễ (${c.lateCount} lần)`} v={`-${fmt(c.penalty)}`} color={R}/>}
      </div>
    </Card>
    <Btn full onClick={confirm2} disabled={isC} bg={isC?G:O} color={isC?W:D}>{isC?`✓ Đã xác nhận — ${new Date(data.confirmations[ck]).toLocaleDateString("vi-VN")}`:"Xác nhận bảng lương"}</Btn>
    {obs.length>0&&<Sec title="📋 Kết quả dự giờ">
      {obs.map(o=>{
        const pct=o.pct||o.score||0;const rank=o.rank||(pct>=90?"A+":pct>=80?"A":pct>=65?"B":"C");
        return <Card key={o.id} style={{padding:"10px 12px",borderLeft:`3px solid ${rc2(rank)}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <span style={{fontSize:12,color:"#888"}}>{o.date}</span>
              <div style={{fontSize:10,color:"#666"}}>Người dự giờ: {o.observerName||"—"}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:rc2(rank)}}>{pct}%</div>
              <Badge bg={rc2(rank)+"15"} color={rc2(rank)}>{rank} — {rl2(rank)}</Badge>
            </div>
          </div>
          {/* Group breakdown */}
          {o.scores&&<div style={{display:"flex",gap:3,marginTop:6}}>
            {OBS_GROUPS.map(g=>{
              let gs=0,gm=0;g.items.forEach((_,i)=>{gs+=(o.scores[`${g.name}_${i}`]||0)*g.weight;gm+=4*g.weight;});
              const gpct=gm>0?Math.round(gs/gm*100):0;
              return <div key={g.name} style={{flex:1,padding:"4px",borderRadius:6,background:gpct>=80?G+"08":gpct>=65?O+"08":R+"08",textAlign:"center"}}>
                <div style={{fontSize:12,fontWeight:800,color:gpct>=80?G:gpct>=65?O:R}}>{gpct}%</div>
                <div style={{fontSize:7,color:"#888"}}>{g.name.split(" ")[0]}</div>
              </div>;
            })}
          </div>}
          {o.strengths&&<div style={{fontSize:10,color:G,marginTop:4}}>🌟 {o.strengths}</div>}
          {o.improvements&&<div style={{fontSize:10,color:R,marginTop:2}}>📝 {o.improvements}</div>}
          {o.goals&&<div style={{fontSize:10,color:"#7C3AED",marginTop:2}}>🎯 {o.goals}</div>}
        </Card>;
      })}
    </Sec>}
  </div>;
}

/* TEACHER PROFILE */
function TProf({data,save,user}){
  const t=data.teachers.find(x=>x.id===user.id);if(!t)return null;
  const isFull=(t.employType||"part")==="full";
  const totalSessions=data.sessions.filter(s=>s.teacherId===user.id&&s.checkOut).length;
  const tClasses=data.classes.filter(c=>c.teacherId===user.id);
  const accent=isFull?"#7C3AED":B;
  const[showPw,setShowPw]=useState(false);
  const[oldPw,setOldPw]=useState("");const[newPw,setNewPw]=useState("");const[cfmPw,setCfmPw]=useState("");const[pwMsg,setPwMsg]=useState("");
  const changePw=()=>{
    const curPw=t.password||t.phone;
    if(oldPw!==curPw){setPwMsg("❌ Mật khẩu cũ không đúng");return;}
    if(newPw.length<4){setPwMsg("❌ Mật khẩu mới tối thiểu 4 ký tự");return;}
    if(newPw!==cfmPw){setPwMsg("❌ Xác nhận không khớp");return;}
    save({...data,teachers:data.teachers.map(x=>x.id===t.id?{...x,password:newPw}:x)});
    setOldPw("");setNewPw("");setCfmPw("");setPwMsg("✅ Đã đổi mật khẩu thành công!");setShowPw(false);
  };
  return <div style={{padding:14}}>
    <div style={{background:`linear-gradient(135deg,${accent},${isFull?"#5B21B6":"#2980B9"})`,borderRadius:14,padding:20,color:W,textAlign:"center",marginBottom:14}}>
      <div style={{fontSize:40,marginBottom:6}}>👩‍🏫</div>
      <div style={{fontSize:18,fontWeight:800}}>{t.name}</div>
      <div style={{fontSize:12,opacity:.8,marginTop:2}}>{t.level.toUpperCase()} • {isFull?"👔 Full-time":"⏰ Part-time"}</div>
    </div>
    <Card>
      {[
        {l:"Ngày sinh",v:t.dob||"—"},{l:"Số điện thoại",v:t.phone},{l:"Học vấn",v:t.education||"—"},
        {l:"Chứng chỉ",v:t.certificate||"—"},{l:"Gia nhập WA",v:t.joinDate||"—"},
        ...(isFull?[
          {l:"Loại hình",v:"👔 Full-time"},
          {l:"Lương cố định/tháng",v:fmt(t.fixedSalary||0)},
          {l:"Baseline ca/tháng",v:t.baselineSessions||32},
          {l:"OT B2C/buổi",v:fmt(t.otRateB2C||0)},
          {l:"OT B2B/buổi",v:fmt(t.otRateB2B||0)},
        ]:[
          {l:"Loại hình",v:"⏰ Part-time"},
          {l:"Lương B2C/buổi",v:fmt(t.salaryB2C)},
          {l:"Lương B2B/buổi",v:fmt(t.salaryB2B)},
        ]),
        {l:"Tổng lớp quản lý",v:tClasses.length},{l:"Tổng buổi đã dạy",v:totalSessions},
      ].map((r,i)=> <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F5F5F5",fontSize:12}}><span style={{color:"#888"}}>{r.l}</span><span style={{fontWeight:600}}>{r.v}</span></div>)}
    </Card>
    {/* Change password */}
    <Card style={{marginTop:12,border:`2px solid ${accent}`}}>
      <button onClick={()=>setShowPw(!showPw)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",padding:0}}>
        <span style={{fontWeight:700,fontSize:13,color:accent}}>🔐 Đổi mật khẩu</span>
        <span style={{color:"#888",fontSize:12}}>{showPw?"▲":"▼"}</span>
      </button>
      {showPw&&<div style={{marginTop:10}}>
        <Inp label="Mật khẩu hiện tại" type="password" value={oldPw} onChange={e=>setOldPw(e.target.value)} placeholder="Nhập mật khẩu cũ..."/>
        <Inp label="Mật khẩu mới (≥4 ký tự)" type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Nhập mật khẩu mới..."/>
        <Inp label="Xác nhận mật khẩu mới" type="password" value={cfmPw} onChange={e=>setCfmPw(e.target.value)} placeholder="Nhập lại..."/>
        <Btn full onClick={changePw} bg={G}>Đổi mật khẩu</Btn>
      </div>}
      {pwMsg&&<div style={{marginTop:6,fontSize:12,fontWeight:600,color:pwMsg.includes("✅")?G:R}}>{pwMsg}</div>}
    </Card>
  </div>;
}

/* TEACHER POLICY VIEWER */
function TPolicyView({data}){
  const bp=data.bonusPolicy;
  return <div style={{padding:14}}>
    <Card style={{border:`2px solid ${G}`,marginBottom:14}}>
      <div style={{fontSize:14,fontWeight:800,color:G,marginBottom:10}}>🎁 A — THƯỞNG</div>
      {[
        {title:"HỌC VIÊN TÁI ĐĂNG KÝ",amount:`${fmt(bp.renewalBonus||200000)}/bé`,cond:"Đã tiếp nhận HV ít nhất 2 tháng. Có làm đầy đủ các bước chăm sóc, tổng kết cho PH cuối khóa. Không áp dụng GV thử việc 2 tháng đầu."},
        {title:"TỈ LỆ CHUYÊN CẦN HV ≥"+`${bp.kpiAttThreshold||95}%`,amount:`${fmt(bp.kpiAttBonus||100000)}/tháng`,cond:"Chủ động sắp xếp học bù với PH và nhắc nhở HV đi học đều và đúng giờ."},
        {title:"DẪN 1 HỌC THỬ",amount:`${fmt(bp.trialBringBonus||100000)}/bé`,cond:"Bé chưa từng học/ học thử tại WOW ART."},
        {title:"HV HỌC THỬ → ĐĂNG KÝ CHÍNH THỨC",amount:`${fmt(bp.trialConvertBonus||500000)}/bé`,cond:"Bé học thử đó đăng ký học chính thức tại WOW ART."},
        {title:"DẠY HỌC THỬ THÀNH CÔNG",amount:`${fmt(bp.trialTeachBonus||100000)}/bé`,cond:"Bé đóng tiền sau học thử."},
        {title:"DỰ GIỜ ĐẠT ≥80%",amount:`${fmt(bp.obsBonus||500000)}/quý`,cond:"Điểm dự giờ trung bình ≥80%. Tính theo quý, chia đều 3 tháng."},
      ].map((r,i)=><div key={i} style={{padding:"10px 0",borderBottom:"1px solid #E6FFED"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <span style={{fontWeight:700,fontSize:12,color:"#1a1a2e"}}>{r.title}</span>
          <Badge bg={G+"15"} color={G}>{r.amount}</Badge>
        </div>
        <div style={{fontSize:11,color:"#666",lineHeight:1.5}}>{r.cond}</div>
      </div>)}
    </Card>
    <Card style={{border:`2px solid ${R}`}}>
      <div style={{fontSize:14,fontWeight:800,color:R,marginBottom:10}}>⚠️ B — PHẠT</div>
      <div style={{padding:"10px 0",borderBottom:"1px solid #FEE2E2"}}>
        <div style={{fontWeight:700,fontSize:12,color:"#1a1a2e",marginBottom:4}}>TỈ LỆ CHUYÊN CẦN GIÁO VIÊN</div>
        <div style={{fontSize:11,color:"#666",lineHeight:1.5,marginBottom:6}}>Đi trễ và nghỉ báo gấp (không có lý do chính đáng hoặc trường hợp bất khả kháng):</div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
            <Badge bg={O+"15"} color={O}>Lần 1</Badge><span>Nhắc nhở (không trừ lương)</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
            <Badge bg={R+"15"} color={R}>Lần 2</Badge><span>Trừ {fmt(bp.latePenalty2||50000)}/ca</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
            <Badge bg={R+"15"} color={R}>Lần 3+</Badge><span>Trừ {fmt(bp.latePenalty3||100000)}/ca</span>
          </div>
        </div>
      </div>
    </Card>
  </div>;
}


