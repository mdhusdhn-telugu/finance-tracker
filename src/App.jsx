import { useState, useMemo, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query } from "firebase/firestore";
import Login from "./Login";
import {
  LayoutDashboard, TrendingUp, TrendingDown, Target, Receipt,
  Landmark, Wallet, Settings, Menu, X, Plus, Edit2, Trash2,
  ArrowUpRight, ArrowDownRight, PiggyBank, BarChart3, Sparkles,
  ChevronDown, Search, Calendar, CreditCard, AlertCircle,
  CheckCircle, MoreVertical, Bell, RefreshCw, Home, Zap,
  DollarSign, Tag, Globe, ChevronRight, LogOut, User
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  bg:        "#090c14",
  surface:   "#111520",
  card:      "#161b2e",
  elevated:  "#1d2440",
  border:    "rgba(255,255,255,0.07)",
  borderMd:  "rgba(255,255,255,0.12)",
  accent:    "#6366f1", // Sleek modern Indigo
  accentDim: "rgba(99,102,241,0.15)",
  green:     "#10b981",
  greenDim:  "rgba(16,185,129,0.12)",
  red:       "#f43f5e",
  redDim:    "rgba(244,63,94,0.12)",
  blue:      "#3b82f6",
  blueDim:   "rgba(59,130,246,0.12)",
  purple:    "#8b5cf6",
  purpleDim: "rgba(139,92,246,0.12)",
  text:      "#eef0fc",
  textSub:   "#94a3b8",
  textMuted: "#475569",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const EXPENSE_CATS = [
  { name:"Food & Dining",  color:"#6366f1", emoji:"🍽️" },
  { name:"Rent",           color:"#3b82f6", emoji:"🏠" },
  { name:"Transport",      color:"#10b981", emoji:"🚗" },
  { name:"Utilities",      color:"#f43f5e", emoji:"⚡" },
  { name:"Entertainment",  color:"#8b5cf6", emoji:"🎬" },
  { name:"Health",         color:"#ec4899", emoji:"❤️" },
  { name:"Shopping",       color:"#f97316", emoji:"🛍️" },
  { name:"Education",      color:"#06b6d4", emoji:"📚" },
  { name:"Other",          color:"#94a3b8", emoji:"📦" },
];
const INCOME_CATS = [
  { name:"Salary",             color:"#10b981", emoji:"💼" },
  { name:"Freelance",          color:"#3b82f6", emoji:"💻" },
  { name:"Investment Returns", color:"#8b5cf6", emoji:"📈" },
  { name:"Business",           color:"#6366f1", emoji:"🏢" },
  { name:"Other",              color:"#94a3b8", emoji:"📦" },
];
const INVESTMENT_TYPES = ["Mutual Fund","Stocks","Crypto","Gold","Real Estate","Bonds","Other"];
const LIABILITY_TYPES  = ["Mortgage","Loan","Credit Card","Other"];
const CURRENCIES = [
  { code:"INR", symbol:"₹" }, { code:"USD", symbol:"$" },
  { code:"EUR", symbol:"€" }, { code:"GBP", symbol:"£" },
  { code:"JPY", symbol:"¥" },
];

// ─── DYNAMIC DATE UTILS ───────────────────────────────────────────────────────
const today = new Date();
const currentYear = today.getFullYear();
const currentMonthNum = today.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
const currentMonthLabel = today.toLocaleString('default', { month: 'long', year: 'numeric' });

// Generate "YYYY-MM" format for the current month (e.g., "2026-05")
const CURRENT_MONTH = `${currentYear}-${String(currentMonthNum + 1).padStart(2, '0')}`;

// Generate the last 4 months for the chart labels
const MONTHS = [];
const MONTH_PREFIXES = [];
for (let i = 3; i >= 0; i--) {
  const d = new Date(currentYear, currentMonthNum - i, 1);
  MONTHS.push(d.toLocaleString('default', { month: 'short' })); 
  MONTH_PREFIXES.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); 
}

// Generate the last 4 months for the filter dropdowns (e.g., Expenses & Income views)
const FILTER_MONTH_OPTIONS = [];
for (let i = 0; i < 4; i++) {
  const d = new Date(currentYear, currentMonthNum - i, 1);
  FILTER_MONTH_OPTIONS.push({
    prefix: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`
  });
}

// ─── INIT DATA (Budgets Only) ────────────────────────────────────────────────
const INIT_BUDGETS = {
  "Food & Dining":6000,"Rent":12000,"Transport":2000,"Utilities":1500,
  "Entertainment":2000,"Health":2000,"Shopping":5000,"Education":3000,"Other":2000,
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const SYM = {INR:"₹",USD:"$",EUR:"€",GBP:"£",JPY:"¥"};
function fmt(n, cur="INR", compact=false) {
  const s = SYM[cur]||"₹";
  if (compact) {
    if (Math.abs(n)>=10000000) return `${s}${(n/10000000).toFixed(1)}Cr`;
    if (Math.abs(n)>=100000)   return `${s}${(n/100000).toFixed(1)}L`;
    if (Math.abs(n)>=1000)     return `${s}${(n/1000).toFixed(1)}K`;
  }
  return `${s}${Number(n).toLocaleString("en-IN")}`;
}
const catColor  = (n,inc=false) => (inc?INCOME_CATS:EXPENSE_CATS).find(c=>c.name===n)?.color || "#94a3b8";
const catEmoji  = (n,inc=false) => (inc?INCOME_CATS:EXPENSE_CATS).find(c=>c.name===n)?.emoji || "📦";
const fmtDate   = d => new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
function daysUntil(dueDay) {
  const now = new Date(); const t = new Date(now.getFullYear(),now.getMonth(),dueDay);
  if(t<now) t.setMonth(t.getMonth()+1);
  return Math.ceil((t-now)/864e5);
}

// ─── REUSABLE COMPONENTS ──────────────────────────────────────────────────────
function Modal({title,onClose,children,wide=false}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.card,border:`1px solid ${T.borderMd}`,borderRadius:20,width:"100%",maxWidth:wide?620:460,maxHeight:"88vh",overflow:"auto",boxShadow:"0 25px 80px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${T.border}`}}>
          <h3 style={{fontSize:17,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",margin:0}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.textSub,cursor:"pointer",padding:4,display:"flex",borderRadius:8}}>
            <X size={18}/>
          </button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  );
}

function Fld({label,type="text",value,onChange,options,min,step,placeholder,note}) {
  const s = {width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 13px",color:T.text,fontSize:14,outline:"none",fontFamily:"'Inter', sans-serif",boxSizing:"border-box"};
  return (
    <div style={{marginBottom:16}}>
      <label style={{display:"block",fontSize:11,fontWeight:600,color:T.textSub,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</label>
      {type==="select"
        ? <select value={value} onChange={e=>onChange(e.target.value)} style={s}>
            {options.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} min={min} step={step} style={s}/>
      }
      {note && <p style={{margin:"4px 0 0",fontSize:11,color:T.textSub}}>{note}</p>}
    </div>
  );
}

function Btn({children,onClick,variant="primary",size="md",full=false,style:ex}) {
  const base={display:"flex",alignItems:"center",justifyContent:"center",gap:6,border:"none",cursor:"pointer",fontFamily:"'Inter', sans-serif",fontWeight:600,borderRadius:10,transition:"opacity 0.15s, transform 0.1s",whiteSpace:"nowrap"};
  const V={
    primary: {background:T.accent,      color:"#fff",        padding:size==="sm"?"7px 14px":"10px 20px",fontSize:size==="sm"?13:14},
    ghost:   {background:"transparent", color:T.textSub,      padding:size==="sm"?"7px 14px":"10px 20px",fontSize:size==="sm"?13:14,border:`1px solid ${T.border}`},
    danger:  {background:T.redDim,      color:T.red,          padding:size==="sm"?"7px 14px":"10px 20px",fontSize:size==="sm"?13:14},
    success: {background:T.greenDim,    color:T.green,        padding:size==="sm"?"7px 14px":"10px 20px",fontSize:size==="sm"?13:14},
  };
  return <button onClick={onClick} style={{...base,...V[variant],width:full?"100%":"auto",...ex}}>{children}</button>;
}

function Card({children,style:ex,onClick,hover=false}) {
  const [h,sH]=useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>hover&&sH(true)} onMouseLeave={()=>sH(false)}
      style={{background:T.card,border:`1px solid ${h?T.borderMd:T.border}`,borderRadius:16,padding:20,transition:"border-color 0.2s",cursor:onClick?"pointer":"default",...ex}}>
      {children}
    </div>
  );
}

function StatCard({label,value,sub,icon:Icon,color,trend,currency}) {
  return (
    <Card style={{flex:1,minWidth:0}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
        <div style={{background:color+"22",borderRadius:12,padding:10,display:"flex"}}><Icon size={20} color={color}/></div>
        {trend!=null && (
          <div style={{display:"flex",alignItems:"center",gap:3,fontSize:12,fontWeight:600,color:trend>=0?T.green:T.red,background:trend>=0?T.greenDim:T.redDim,padding:"4px 8px",borderRadius:8}}>
            {trend>=0?<ArrowUpRight size={13}/>:<ArrowDownRight size={13}/>}{Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{fontSize:26,fontWeight:800,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",marginBottom:4,lineHeight:1}}>{value}</div>
      <div style={{fontSize:13,color:T.textSub,fontWeight:500}}>{label}</div>
      {sub && <div style={{fontSize:12,color:T.textMuted,marginTop:6}}>{sub}</div>}
    </Card>
  );
}

function CustomTooltip({active,payload,label,currency="INR"}) {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:T.elevated,border:`1px solid ${T.borderMd}`,borderRadius:12,padding:"12px 16px",fontSize:13,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
      <div style={{color:T.textSub,marginBottom:8,fontWeight:600}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:i<payload.length-1?4:0}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:p.color||p.fill}}/>
          <span style={{color:T.textSub}}>{p.name}:</span>
          <span style={{color:T.text,fontWeight:700}}>{fmt(p.value,currency,true)}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({icon:Icon,message,action}) {
  return (
    <div style={{textAlign:"center",padding:"60px 20px",color:T.textSub}}>
      <div style={{background:T.elevated,borderRadius:"50%",width:64,height:64,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
        <Icon size={28} color={T.textMuted}/>
      </div>
      <p style={{fontSize:15,marginBottom:action?16:0,color:T.textSub}}>{message}</p>
      {action}
    </div>
  );
}

function PageHeader({title,subtitle,action}) {
  return (
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
      <div>
        <h1 style={{fontSize:26,fontWeight:800,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",margin:0,marginBottom:4}}>{title}</h1>
        {subtitle && <p style={{fontSize:14,color:T.textSub,margin:0}}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Badge({children,color}) {
  return <span style={{background:color+"22",color:color,borderRadius:6,padding:"3px 8px",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{children}</span>;
}

function ProgressBar({value,max,color,height=8}) {
  const pct = Math.min(100,(value/max)*100);
  return (
    <div style={{background:T.elevated,borderRadius:99,height,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:99,transition:"width 0.6s ease"}}/>
    </div>
  );
}

// ─── DASHBOARD VIEW ───────────────────────────────────────────────────────────
function DashboardView({expenses,income,goals,bills,investments,liabilities,budgets,currency,setView}) {
  const curExp  = useMemo(()=>expenses.filter(e=>e.date.startsWith(CURRENT_MONTH)).reduce((s,e)=>s+e.amount,0),[expenses]);
  const curInc  = useMemo(()=>income.filter(i=>i.date.startsWith(CURRENT_MONTH)).reduce((s,i)=>s+i.amount,0),[income]);
  const savings = curInc - curExp;
  const savePct = curInc>0 ? Math.round((savings/curInc)*100) : 0;
  const totalInv  = investments.reduce((s,i)=>s+i.amount,0);
  const totalLiab = liabilities.reduce((s,l)=>s+l.amount,0);
  const netWorth  = totalInv + (curInc-curExp) - totalLiab;

  const monthlyData = useMemo(()=>MONTHS.map((m,i)=>({
    month:m,
    Income:  income.filter(inc=>inc.date.startsWith(MONTH_PREFIXES[i])).reduce((s,x)=>s+x.amount,0),
    Expenses:expenses.filter(e=>e.date.startsWith(MONTH_PREFIXES[i])).reduce((s,x)=>s+x.amount,0),
  })),[expenses,income]);

  const catData = useMemo(()=>{
    const g={};
    expenses.filter(e=>e.date.startsWith(CURRENT_MONTH)).forEach(e=>{g[e.category]=(g[e.category]||0)+e.amount;});
    return Object.entries(g).map(([n,v])=>({name:n,value:v})).sort((a,b)=>b.value-a.value);
  },[expenses]);

  const recent = useMemo(()=>[...expenses].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5),[expenses]);

  const billAlerts = useMemo(()=>bills.filter(b=>daysUntil(b.dueDate)<=b.reminderDaysBefore).slice(0,3),[bills]);

  return (
    <div>
<PageHeader 
  title="Dashboard" 
  subtitle={`${currentMonthLabel} · Your financial overview`}
/>
      {/* Stat Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16,marginBottom:24}}>
        <StatCard label="Monthly Income"   value={fmt(curInc,currency,true)}   icon={TrendingUp}   color={T.green}  trend={5}  currency={currency}/>
        <StatCard label="Monthly Expenses" value={fmt(curExp,currency,true)}    icon={TrendingDown}  color={T.red}    trend={-3} currency={currency}/>
        <StatCard label="Net Savings"      value={fmt(savings,currency,true)}   icon={PiggyBank}    color={T.accent} sub={`${savePct}% of income`} currency={currency}/>
        <StatCard label="Net Worth"        value={fmt(netWorth,currency,true)}  icon={Landmark}     color={T.purple} sub="Assets − Liabilities" currency={currency}/>
      </div>

      {/* Bill Alerts */}
      {billAlerts.length>0 && (
        <Card style={{marginBottom:24,borderColor:T.accent+"44",background:"linear-gradient(135deg,#0e1024 0%,"+T.card+" 100%)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <Bell size={16} color={T.accent}/>
            <span style={{fontSize:13,fontWeight:700,color:T.accent}}>Bills Due Soon</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            {billAlerts.map(b=>(
              <div key={b.id} style={{display:"flex",alignItems:"center",gap:8,background:T.accentDim,borderRadius:10,padding:"8px 12px"}}>
                <AlertCircle size={14} color={T.accent}/>
                <span style={{fontSize:13,color:T.text,fontWeight:500}}>{b.description}</span>
                <span style={{fontSize:13,color:T.accent,fontWeight:700}}>{fmt(b.amount,currency,true)}</span>
                <Badge color={T.accent}>{daysUntil(b.dueDate)}d left</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20,marginBottom:24}}>
        {/* Income vs Expenses Chart */}
        <Card style={{gridColumn:"span 2"}}>
          <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",marginBottom:20}}>Income vs Expenses</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{top:5,right:5,left:5,bottom:5}}>
              <defs>
                <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={0.3}/><stop offset="95%" stopColor={T.green} stopOpacity={0}/></linearGradient>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.red} stopOpacity={0.3}/><stop offset="95%" stopColor={T.red} stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3"/>
              <XAxis dataKey="month" tick={{fill:T.textSub,fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>fmt(v,currency,true)} tick={{fill:T.textSub,fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip currency={currency}/>}/>
              <Area type="monotone" dataKey="Income"   stroke={T.green} strokeWidth={2} fill="url(#gI)"/>
              <Area type="monotone" dataKey="Expenses" stroke={T.red}   strokeWidth={2} fill="url(#gE)"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",marginBottom:16}}>Spending by Category</div>
          {catData.length === 0 ? (
            <EmptyState icon={PieChart} message="No expenses this month yet" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {catData.map((e,i)=><Cell key={i} fill={catColor(e.name)}/>)}
                  </Pie>
                  <Tooltip content={<CustomTooltip currency={currency}/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
                {catData.slice(0,4).map((c,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:catColor(c.name),flexShrink:0}}/>
                    <span style={{fontSize:12,color:T.textSub,flex:1}}>{c.name}</span>
                    <span style={{fontSize:12,color:T.text,fontWeight:600}}>{fmt(c.value,currency,true)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Goals */}
        <Card>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <span style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif"}}>Financial Goals</span>
            <button onClick={()=>setView("goals")} style={{background:"none",border:"none",color:T.textSub,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:2}}>View all <ChevronRight size={12}/></button>
          </div>
          {goals.length === 0 ? (
            <EmptyState icon={Target} message="No active goals" />
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {goals.slice(0,3).map(g=>{
                const pct=Math.round((g.currentAmount/g.targetAmount)*100);
                return (
                  <div key={g.id}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:13,color:T.text,fontWeight:500}}>{g.name}</span>
                      <span style={{fontSize:12,color:g.color,fontWeight:700}}>{pct}%</span>
                    </div>
                    <ProgressBar value={g.currentAmount} max={g.targetAmount} color={g.color}/>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                      <span style={{fontSize:11,color:T.textSub}}>{fmt(g.currentAmount,currency,true)}</span>
                      <span style={{fontSize:11,color:T.textMuted}}>{fmt(g.targetAmount,currency,true)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <span style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif"}}>Recent Transactions</span>
          <button onClick={()=>setView("expenses")} style={{background:"none",border:"none",color:T.textSub,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:2}}>View all <ChevronRight size={12}/></button>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={Receipt} message="No recent transactions" />
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:1}}>
            {recent.map((e,i)=>(
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<recent.length-1?`1px solid ${T.border}`:"none"}}>
                <div style={{background:catColor(e.category)+"22",borderRadius:10,padding:8,fontSize:16,flexShrink:0}}>{catEmoji(e.category)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:T.text,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.description}</div>
                  <div style={{fontSize:11,color:T.textSub}}>{fmtDate(e.date)} · {e.category}</div>
                </div>
                <div style={{fontSize:14,color:T.red,fontWeight:700}}>−{fmt(e.amount,currency,true)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── TRANSACTIONS VIEW (shared for Expenses & Income) ─────────────────────────
function TransactionsView({type,items,onAdd,onEdit,onDelete,currency,setModal}) {
  const isInc = type==="income";
  const cats  = isInc ? INCOME_CATS : EXPENSE_CATS;
  const [search,setSearch] = useState("");
  const [filterCat,setFilterCat] = useState("All");
  const [filterMonth,setFilterMonth] = useState("All");

  const filtered = useMemo(()=>{
    return items.filter(e=>{
      const mok  = filterMonth==="All" || e.date.startsWith(filterMonth);
      const cok  = filterCat==="All"   || e.category===filterCat;
      const sok  = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase());
      return mok&&cok&&sok;
    }).sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[items,search,filterCat,filterMonth]);

  const total = filtered.reduce((s,e)=>s+e.amount,0);

  return (
    <div>
      <PageHeader
        title={isInc?"Income":"Expenses"}
        subtitle={`${filtered.length} transactions · Total: ${fmt(total,currency,true)}`}
        action={<Btn onClick={()=>setModal({type:isInc?"addIncome":"addExpense",data:null})}><Plus size={16}/> Add {isInc?"Income":"Expense"}</Btn>}
      />

      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 12px",flex:1,minWidth:180}}>
          <Search size={14} color={T.textSub}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{background:"none",border:"none",color:T.text,fontSize:13,outline:"none",width:"100%",fontFamily:"'Inter', sans-serif"}}/>
        </div>
        
        {/* DYNAMIC MONTH DROPDOWN */}
        <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'Inter', sans-serif"}}>
          <option value="All">All Months</option>
          {FILTER_MONTH_OPTIONS.map(m=><option key={m.prefix} value={m.prefix}>{m.label}</option>)}
        </select>

        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'Inter', sans-serif"}}>
          <option value="All">All Categories</option>
          {cats.map(c=><option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
        </select>
      </div>

      {/* List */}
      {filtered.length===0
        ? <EmptyState icon={isInc?TrendingUp:Receipt} message={`No ${isInc?"income":"expenses"} found`} action={<Btn onClick={()=>setModal({type:isInc?"addIncome":"addExpense",data:null})}>Add your first {isInc?"income":"expense"}</Btn>}/>
        : (
          <Card style={{padding:0,overflow:"hidden"}}>
            {filtered.map((e,i)=>(
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 20px",borderBottom:i<filtered.length-1?`1px solid ${T.border}`:"none",transition:"background 0.15s"}}
                onMouseEnter={ev=>ev.currentTarget.style.background=T.elevated}
                onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                <div style={{background:catColor(e.category,isInc)+"22",borderRadius:10,padding:10,fontSize:18,flexShrink:0}}>{catEmoji(e.category,isInc)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,color:T.text,fontWeight:500}}>{e.description}</div>
                  <div style={{fontSize:12,color:T.textSub,marginTop:2,display:"flex",gap:8,alignItems:"center"}}>
                    <span>{fmtDate(e.date)}</span>
                    <Badge color={catColor(e.category,isInc)}>{e.category}</Badge>
                  </div>
                </div>
                <div style={{fontSize:16,fontWeight:700,color:isInc?T.green:T.red,marginRight:8}}>{isInc?"+":"−"}{fmt(e.amount,currency,true)}</div>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setModal({type:isInc?"editIncome":"editExpense",data:e})} style={{background:T.elevated,border:"none",color:T.textSub,cursor:"pointer",padding:7,borderRadius:8,display:"flex"}}><Edit2 size={14}/></button>
                  <button onClick={()=>onDelete(e.id)} style={{background:T.redDim,border:"none",color:T.red,cursor:"pointer",padding:7,borderRadius:8,display:"flex"}}><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </Card>
        )
      }
    </div>
  );
}

// ─── BUDGET VIEW ──────────────────────────────────────────────────────────────
function BudgetView({expenses,budgets,setBudgets,currency}) {
  const [editing,setEditing] = useState(null);
  const [val,setVal] = useState("");

  const curExp = useMemo(()=>{
    const g={};
    expenses.filter(e=>e.date.startsWith(CURRENT_MONTH)).forEach(e=>{g[e.category]=(g[e.category]||0)+e.amount;});
    return g;
  },[expenses]);

  const totalBudget = Object.values(budgets).reduce((s,v)=>s+v,0);
  const totalSpent  = Object.entries(curExp).reduce((s,[,v])=>s+v,0);

  return (
    <div>
      <PageHeader title="Budget" subtitle={`${currentMonthLabel} · ${fmt(totalSpent,currency,true)} of ${fmt(totalBudget,currency,true)} used`}/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16,marginBottom:28}}>
        <StatCard label="Total Budget"    value={fmt(totalBudget,currency,true)}              icon={Wallet}    color={T.blue}   currency={currency}/>
        <StatCard label="Spent This Month" value={fmt(totalSpent,currency,true)}              icon={TrendingDown} color={T.red}  currency={currency}/>
        <StatCard label="Remaining"        value={fmt(totalBudget-totalSpent,currency,true)} icon={CheckCircle} color={T.green} currency={currency}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
        {EXPENSE_CATS.map(cat=>{
          const budget = budgets[cat.name]||0;
          const spent  = curExp[cat.name]||0;
          const pct    = budget>0?Math.min(100,(spent/budget)*100):0;
          const over   = spent>budget && budget>0;
          return (
            <Card key={cat.name}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:20}}>{cat.emoji}</span>
                  <div>
                    <div style={{fontSize:14,color:T.text,fontWeight:600}}>{cat.name}</div>
                    <div style={{fontSize:11,color:T.textSub}}>{Math.round(pct)}% used</div>
                  </div>
                </div>
                <button onClick={()=>{setEditing(cat.name);setVal(budget||"");}} style={{background:T.elevated,border:"none",color:T.textSub,cursor:"pointer",padding:6,borderRadius:8,display:"flex"}}><Edit2 size={13}/></button>
              </div>
              {editing===cat.name
                ? (
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input value={val} onChange={e=>setVal(e.target.value)} type="number" placeholder="Budget amount" style={{flex:1,background:T.surface,border:`1px solid ${T.borderMd}`,borderRadius:8,padding:"8px 10px",color:T.text,fontSize:13,outline:"none",fontFamily:"'Inter', sans-serif"}}/>
                    <Btn size="sm" onClick={()=>{setBudgets(p=>({...p,[cat.name]:parseFloat(val)||0}));setEditing(null);}}>Save</Btn>
                    <Btn size="sm" variant="ghost" onClick={()=>setEditing(null)}>×</Btn>
                  </div>
                ) : (
                  <>
                    <ProgressBar value={spent} max={budget||1} color={over?T.red:cat.color} height={6}/>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                      <span style={{fontSize:12,color:over?T.red:T.textSub,fontWeight:over?700:400}}>{fmt(spent,currency,true)} spent</span>
                      <span style={{fontSize:12,color:budget?T.textMuted:T.textSub}}>{budget?`of ${fmt(budget,currency,true)}`:"No budget set"}</span>
                    </div>
                    {over && <div style={{marginTop:6,fontSize:11,color:T.red,fontWeight:600}}>⚠ Over budget by {fmt(spent-budget,currency,true)}</div>}
                  </>
                )
              }
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── GOALS VIEW ───────────────────────────────────────────────────────────────
function GoalsView({goals,onAdd,onEdit,onDelete,setModal,currency}) {
  const total    = goals.reduce((s,g)=>s+g.targetAmount,0);
  const achieved = goals.reduce((s,g)=>s+g.currentAmount,0);
  return (
    <div>
      <PageHeader title="Financial Goals" subtitle={`${goals.length} goals · ${fmt(achieved,currency,true)} saved of ${fmt(total,currency,true)}`}
        action={<Btn onClick={()=>setModal({type:"addGoal",data:null})}><Plus size={16}/> New Goal</Btn>}/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16,marginBottom:28}}>
        <StatCard label="Total Target" value={fmt(total,currency,true)}    icon={Target}    color={T.accent} currency={currency}/>
        <StatCard label="Saved So Far"  value={fmt(achieved,currency,true)} icon={PiggyBank} color={T.green}  currency={currency}/>
        <StatCard label="Remaining"     value={fmt(total-achieved,currency,true)} icon={TrendingUp} color={T.blue} currency={currency}/>
      </div>

      {goals.length===0
        ? <EmptyState icon={Target} message="No goals yet — start saving!" action={<Btn onClick={()=>setModal({type:"addGoal",data:null})}>Create your first goal</Btn>}/>
        : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
            {goals.map(g=>{
              const pct  = Math.round((g.currentAmount/g.targetAmount)*100);
              const done = pct>=100;
              const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline)-new Date())/864e5) : null;
              return (
                <Card key={g.id} style={{borderTop:`3px solid ${g.color}`}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",marginBottom:4}}>{g.name}</div>
                      {done
                        ? <Badge color={T.green}>Completed 🎉</Badge>
                        : daysLeft!=null && <Badge color={daysLeft<30?T.red:T.textSub}>{daysLeft>0?`${daysLeft}d left`:"Overdue"}</Badge>
                      }
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>setModal({type:"editGoal",data:g})} style={{background:T.elevated,border:"none",color:T.textSub,cursor:"pointer",padding:6,borderRadius:8,display:"flex"}}><Edit2 size={13}/></button>
                      <button onClick={()=>onDelete(g.id)} style={{background:T.redDim,border:"none",color:T.red,cursor:"pointer",padding:6,borderRadius:8,display:"flex"}}><Trash2 size={13}/></button>
                    </div>
                  </div>
                  <div style={{fontSize:28,fontWeight:800,color:g.color,fontFamily:"'Plus Jakarta Sans', sans-serif",marginBottom:8}}>{pct}%</div>
                  <ProgressBar value={g.currentAmount} max={g.targetAmount} color={g.color} height={8}/>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
                    <div><div style={{fontSize:11,color:T.textSub}}>Saved</div><div style={{fontSize:14,fontWeight:700,color:T.text}}>{fmt(g.currentAmount,currency,true)}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:11,color:T.textSub}}>Target</div><div style={{fontSize:14,fontWeight:700,color:T.text}}>{fmt(g.targetAmount,currency,true)}</div></div>
                  </div>
                  <Btn full style={{marginTop:14}} size="sm" onClick={()=>setModal({type:"contributeGoal",data:g})}>+ Add Contribution</Btn>
                </Card>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ─── BILLS VIEW ───────────────────────────────────────────────────────────────
function BillsView({bills,onAdd,onDelete,setModal,currency}) {
  const monthly = bills.reduce((s,b)=>s+b.amount,0);
  const annual  = monthly*12;
  const sorted  = useMemo(()=>[...bills].sort((a,b)=>daysUntil(a.dueDate)-daysUntil(b.dueDate)),[bills]);
  return (
    <div>
      <PageHeader title="Recurring Bills" subtitle={`${bills.length} bills · ${fmt(monthly,currency,true)}/month`}
        action={<Btn onClick={()=>setModal({type:"addBill",data:null})}><Plus size={16}/> Add Bill</Btn>}/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16,marginBottom:28}}>
        <StatCard label="Monthly Total"  value={fmt(monthly,currency,true)} icon={CreditCard} color={T.accent} currency={currency}/>
        <StatCard label="Annual Total"   value={fmt(annual,currency,true)}  icon={Calendar}   color={T.blue}   currency={currency}/>
        <StatCard label="Active Bills"   value={bills.length}               icon={Receipt}    color={T.purple}/>
      </div>

      {sorted.length===0
        ? <EmptyState icon={CreditCard} message="No recurring bills" action={<Btn onClick={()=>setModal({type:"addBill",data:null})}>Add a bill</Btn>}/>
        : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
            {sorted.map(b=>{
              const days = daysUntil(b.dueDate);
              const urgent = days<=b.reminderDaysBefore;
              return (
                <Card key={b.id} style={urgent?{borderColor:T.accent+"55"}:{}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{background:catColor(b.category)+"22",borderRadius:10,padding:10,fontSize:18}}>{catEmoji(b.category)}</div>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:T.text}}>{b.description}</div>
                        <div style={{fontSize:12,color:T.textSub,marginTop:2}}>
                          Due: {b.dueDate}{b.dueDate===1?"st":b.dueDate===2?"nd":b.dueDate===3?"rd":"th"} of month
                        </div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:16,fontWeight:800,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif"}}>{fmt(b.amount,currency,true)}</div>
                      <Badge color={urgent?T.accent:T.textSub}>{days===0?"Due today":`${days}d`}</Badge>
                    </div>
                  </div>
                  <div style={{marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,color:T.textMuted}}>Reminder {b.reminderDaysBefore}d before</span>
                    <button onClick={()=>onDelete(b.id)} style={{background:T.redDim,border:"none",color:T.red,cursor:"pointer",padding:"5px 8px",borderRadius:8,display:"flex",alignItems:"center",gap:4,fontSize:12}}><Trash2 size={12}/> Remove</button>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ─── INVESTMENTS VIEW ─────────────────────────────────────────────────────────
function InvestmentsView({investments,onDelete,setModal,currency}) {
  const totalValue    = investments.reduce((s,i)=>s+i.amount,0);
  const totalCost     = investments.reduce((s,i)=>s+i.costBasis,0);
  const totalReturn   = totalValue-totalCost;
  const returnPct     = totalCost>0?((totalReturn/totalCost)*100).toFixed(1):0;

  const byType = useMemo(()=>{
    const g={};
    investments.forEach(i=>{g[i.type]=(g[i.type]||0)+i.amount;});
    return Object.entries(g).map(([n,v])=>({name:n,value:v}));
  },[investments]);

  const typeColors = {"Mutual Fund":T.green,"Stocks":T.blue,"Crypto":T.red,"Gold":T.accent,"Real Estate":T.purple,"Bonds":T.textSub,"Other":"#06b6d4"};

  return (
    <div>
      <PageHeader title="Investments" subtitle="Portfolio performance overview"
        action={<Btn onClick={()=>setModal({type:"addInvestment",data:null})}><Plus size={16}/> Add Investment</Btn>}/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16,marginBottom:24}}>
        <StatCard label="Portfolio Value" value={fmt(totalValue,currency,true)}  icon={TrendingUp}   color={T.green}  currency={currency}/>
        <StatCard label="Total Invested"  value={fmt(totalCost,currency,true)}   icon={Wallet}       color={T.blue}   currency={currency}/>
        <StatCard label="Total Return"    value={fmt(totalReturn,currency,true)} icon={BarChart3}    color={totalReturn>=0?T.green:T.red} trend={parseFloat(returnPct)} currency={currency}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20,marginBottom:24}}>
        <Card>
          <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",marginBottom:16}}>Portfolio Allocation</div>
          {investments.length === 0 ? (
            <EmptyState icon={BarChart3} message="No investments tracked" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byType} cx="50%" cy="50%" outerRadius={75} paddingAngle={3} dataKey="value">
                    {byType.map((e,i)=><Cell key={i} fill={typeColors[e.name]||T.textSub}/>)}
                  </Pie>
                  <Tooltip content={<CustomTooltip currency={currency}/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                {byType.map((b,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:typeColors[b.name]||T.textSub}}/>
                    <span style={{fontSize:11,color:T.textSub}}>{b.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card style={{flex:2}}>
          <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",marginBottom:16}}>Holdings</div>
          {investments.length === 0 ? (
            <EmptyState icon={TrendingUp} message="Add assets to view them here" />
          ) : (
            investments.map(inv=>{
              const ret = inv.amount-inv.costBasis;
              const pct = ((ret/inv.costBasis)*100).toFixed(1);
              const pos = ret>=0;
              return (
                <div key={inv.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{background:(typeColors[inv.type]||T.textSub)+"22",borderRadius:10,padding:8,flexShrink:0}}>
                    <BarChart3 size={16} color={typeColors[inv.type]||T.textSub}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:T.text,fontWeight:600}}>{inv.name}</div>
                    <div style={{fontSize:11,color:T.textSub}}><Badge color={typeColors[inv.type]||T.textSub}>{inv.type}</Badge></div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.text}}>{fmt(inv.amount,currency,true)}</div>
                    <div style={{fontSize:12,color:pos?T.green:T.red,fontWeight:600}}>{pos?"+":""}{fmt(ret,currency,true)} ({pct}%)</div>
                  </div>
                  <button onClick={()=>onDelete(inv.id)} style={{background:T.redDim,border:"none",color:T.red,cursor:"pointer",padding:6,borderRadius:8,display:"flex"}}><Trash2 size={12}/></button>
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── NET WORTH VIEW ───────────────────────────────────────────────────────────
function NetWorthView({investments,liabilities,onDeleteLiab,setModal,currency}) {
  const totalAssets = investments.reduce((s,i)=>s+i.amount,0) + 50000;
  const totalLiab   = liabilities.reduce((s,l)=>s+l.amount,0);
  const netWorth    = totalAssets-totalLiab;
  const debtRatio   = totalAssets>0?((totalLiab/totalAssets)*100).toFixed(1):0;

  const barData = [
    {name:"Assets",     value:totalAssets, fill:T.green},
    {name:"Liabilities",value:totalLiab,   fill:T.red},
    {name:"Net Worth",  value:netWorth,    fill:T.accent},
  ];

  return (
    <div>
      <PageHeader title="Net Worth" subtitle="Assets minus Liabilities"
        action={<Btn onClick={()=>setModal({type:"addLiability",data:null})}><Plus size={16}/> Add Liability</Btn>}/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16,marginBottom:24}}>
        <StatCard label="Total Assets"      value={fmt(totalAssets,currency,true)} icon={TrendingUp}  color={T.green}  currency={currency}/>
        <StatCard label="Total Liabilities" value={fmt(totalLiab,currency,true)}   icon={CreditCard}  color={T.red}    currency={currency}/>
        <StatCard label="Net Worth"         value={fmt(netWorth,currency,true)}     icon={Landmark}    color={T.accent} currency={currency}/>
        <StatCard label="Debt-to-Asset"     value={`${debtRatio}%`}                icon={BarChart3}   color={T.purple}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20}}>
        <Card>
          <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",marginBottom:16}}>Overview</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{top:5,right:5,left:5,bottom:5}}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="name" tick={{fill:T.textSub,fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>fmt(v,currency,true)} tick={{fill:T.textSub,fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip currency={currency}/>}/>
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {barData.map((d,i)=><Cell key={i} fill={d.fill}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",marginBottom:16}}>Liabilities</div>
          {liabilities.length===0 ? <EmptyState icon={CreditCard} message="No liabilities recorded"/> : (
            liabilities.map(l=>(
              <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                <div style={{background:T.redDim,borderRadius:10,padding:8,display:"flex"}}><CreditCard size={16} color={T.red}/></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:T.text,fontWeight:600}}>{l.name}</div>
                  <div style={{fontSize:11,color:T.textSub}}><Badge color={T.red}>{l.type}</Badge> · since {fmtDate(l.date)}</div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:T.red}}>{fmt(l.amount,currency,true)}</div>
                <button onClick={()=>onDeleteLiab(l.id)} style={{background:T.redDim,border:"none",color:T.red,cursor:"pointer",padding:6,borderRadius:8,display:"flex"}}><Trash2 size={12}/></button>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── AI INSIGHTS VIEW ─────────────────────────────────────────────────────────
function AIInsightsView({expenses,income,goals,currency}) {
  const [loading,setLoading] = useState(false);
  const [insights,setInsights] = useState(null);
  const [error,setError] = useState(null);

  const totalExp = expenses.filter(e=>e.date.startsWith(CURRENT_MONTH)).reduce((s,e)=>s+e.amount,0);
  const totalInc = income.filter(i=>i.date.startsWith(CURRENT_MONTH)).reduce((s,i)=>s+i.amount,0);
  const catSummary = {};
  expenses.filter(e=>e.date.startsWith(CURRENT_MONTH)).forEach(e=>{catSummary[e.category]=(catSummary[e.category]||0)+e.amount;});

  const getInsights = async () => {
    setLoading(true); setError(null); setInsights(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          messages:[{role:"user",content:`You are a personal finance advisor. Analyze this financial data and give 5 specific, actionable insights. Return ONLY a JSON array of objects like: [{"title":"...","insight":"...","type":"tip|warning|positive"}]. No other text.
Data: Monthly income: ${fmt(totalInc,currency)}, Monthly expenses: ${fmt(totalExp,currency)}, Savings: ${fmt(totalInc-totalExp,currency)}
Category breakdown: ${JSON.stringify(catSummary)}
Goals: ${JSON.stringify(goals.map(g=>({name:g.name,progress:Math.round((g.currentAmount/g.targetAmount)*100)+"%"})))}
Currency: ${currency}. Be specific with amounts and percentages.`}]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text||"";
      const clean = text.replace(/```json|```/g,"").trim();
      setInsights(JSON.parse(clean));
    } catch(e) { setError("Could not generate insights. Please try again."); }
    setLoading(false);
  };

  const typeStyle = {
    tip:      {color:T.blue,   bg:T.blueDim,   icon:"💡"},
    warning:  {color:T.accent, bg:T.accentDim, icon:"⚠️"},
    positive: {color:T.green,  bg:T.greenDim,  icon:"✅"},
  };

  return (
    <div>
      <PageHeader title="AI Financial Advisor" subtitle="Powered by Claude — get personalized insights"/>

      <Card style={{marginBottom:24,background:"linear-gradient(135deg,#0e1024 0%,"+T.card+" 100%)",borderColor:T.accent+"44"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <div style={{background:T.accentDim,borderRadius:12,padding:10,display:"flex"}}><Sparkles size={20} color={T.accent}/></div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif"}}>Your Financial Snapshot — {currentMonthLabel}</div>
            <div style={{fontSize:13,color:T.textSub}}>Let Claude analyze your spending and suggest improvements</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
          <div style={{background:T.surface,borderRadius:10,padding:12,textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:700,color:T.green,fontFamily:"'Plus Jakarta Sans', sans-serif"}}>{fmt(totalInc,currency,true)}</div>
            <div style={{fontSize:11,color:T.textSub}}>Income</div>
          </div>
          <div style={{background:T.surface,borderRadius:10,padding:12,textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:700,color:T.red,fontFamily:"'Plus Jakarta Sans', sans-serif"}}>{fmt(totalExp,currency,true)}</div>
            <div style={{fontSize:11,color:T.textSub}}>Expenses</div>
          </div>
          <div style={{background:T.surface,borderRadius:10,padding:12,textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:700,color:T.accent,fontFamily:"'Plus Jakarta Sans', sans-serif"}}>{fmt(totalInc-totalExp,currency,true)}</div>
            <div style={{fontSize:11,color:T.textSub}}>Savings</div>
          </div>
        </div>
        <Btn onClick={getInsights} full style={{background:"linear-gradient(135deg,"+T.accent+",#4f46e5)"}} disabled={loading}>
          {loading ? <><RefreshCw size={16} style={{animation:"spin 1s linear infinite"}}/> Analyzing…</> : <><Sparkles size={16}/> Generate AI Insights</>}
        </Btn>
      </Card>

      {error && <div style={{background:T.redDim,border:`1px solid ${T.red}44`,borderRadius:12,padding:16,color:T.red,fontSize:14,marginBottom:20}}>{error}</div>}

      {insights && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {insights.map((ins,i)=>{
            const s = typeStyle[ins.type]||typeStyle.tip;
            return (
              <Card key={i} style={{borderLeft:`3px solid ${s.color}`,display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{fontSize:22,flexShrink:0,marginTop:2}}>{s.icon}</div>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",marginBottom:6}}>{ins.title}</div>
                  <div style={{fontSize:14,color:T.textSub,lineHeight:1.6}}>{ins.insight}</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {!insights && !loading && (
        <EmptyState icon={Sparkles} message="Click 'Generate AI Insights' to get personalized recommendations based on your spending patterns"/>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
function SettingsView({currency,setCurrency}) {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Customize your experience"/>
      <div style={{maxWidth:540,display:"flex",flexDirection:"column",gap:16}}>
        <Card>
          <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",marginBottom:16,display:"flex",alignItems:"center",gap:8}}><Globe size={16} color={T.accent}/> Currency</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10}}>
            {CURRENCIES.map(c=>(
              <button key={c.code} onClick={()=>setCurrency(c.code)}
                style={{background:currency===c.code?T.accentDim:T.surface,border:`1px solid ${currency===c.code?T.accent:T.border}`,borderRadius:10,padding:"12px 8px",cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                <div style={{fontSize:20,marginBottom:4}}>{c.symbol}</div>
                <div style={{fontSize:13,color:T.text,fontWeight:600}}>{c.code}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",marginBottom:4,display:"flex",alignItems:"center",gap:8}}><User size={16} color={T.blue}/> About</div>
          <p style={{fontSize:13,color:T.textSub,lineHeight:1.7,margin:0}}>Finance Tracker Pro · v2.0.0<br/>Built with React, Recharts, and Claude AI.<br/>Connected securely to Firebase.</p>
        </Card>
      </div>
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function TransactionModal({modal,onClose,onSave,type}) {
  const isInc  = type==="income";
  const cats   = isInc ? INCOME_CATS : EXPENSE_CATS;
  const edit   = modal?.data;
  const [amt,  setAmt]  = useState(edit?.amount||"");
  const [cat,  setCat]  = useState(edit?.category||cats[0].name);
  const [desc, setDesc] = useState(edit?.description||"");
  const [date, setDate] = useState(edit?.date||new Date().toISOString().slice(0,10));
  const save=()=>{if(!amt||!date)return; onSave({amount:parseFloat(amt),category:cat,description:desc,date},edit?.id); onClose();};
  return (
    <Modal title={`${edit?"Edit":"Add"} ${isInc?"Income":"Expense"}`} onClose={onClose}>
      <Fld label="Amount" type="number" value={amt} onChange={setAmt} min="0" step="1" placeholder="0"/>
      <Fld label="Category" type="select" value={cat} onChange={setCat} options={cats.map(c=>c.name)}/>
      <Fld label="Description" value={desc} onChange={setDesc} placeholder="What was this for?"/>
      <Fld label="Date" type="date" value={date} onChange={setDate}/>
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <Btn full onClick={save}>{edit?"Update":"Add"}</Btn>
        <Btn full variant="ghost" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}

function GoalModal({modal,onClose,onSave}) {
  const edit = modal?.data;
  const [name,setName]   = useState(edit?.name||"");
  const [target,setTgt]  = useState(edit?.targetAmount||"");
  const [current,setCur] = useState(edit?.currentAmount||"");
  const [deadline,setDl] = useState(edit?.deadline||"");
  const [color,setClr]   = useState(edit?.color||"#10b981");
  const colors = ["#10b981","#3b82f6","#6366f1","#8b5cf6","#f43f5e","#ec4899","#f97316","#06b6d4"];
  const save=()=>{if(!name||!target)return; onSave({name,targetAmount:parseFloat(target),currentAmount:parseFloat(current)||0,deadline,color},edit?.id); onClose();};
  return (
    <Modal title={`${edit?"Edit":"New"} Goal`} onClose={onClose}>
      <Fld label="Goal Name" value={name} onChange={setName} placeholder="e.g. Emergency Fund"/>
      <Fld label="Target Amount" type="number" value={target} onChange={setTgt} min="0"/>
      <Fld label="Current Amount Saved" type="number" value={current} onChange={setCur} min="0"/>
      <Fld label="Deadline (optional)" type="date" value={deadline} onChange={setDl}/>
      <div style={{marginBottom:16}}>
        <label style={{display:"block",fontSize:11,fontWeight:600,color:T.textSub,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Color</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {colors.map(c=><button key={c} onClick={()=>setClr(c)} style={{width:28,height:28,borderRadius:"50%",background:c,border:`2px solid ${c===color?"#fff":"transparent"}`,cursor:"pointer"}}/>)}
        </div>
      </div>
      <div style={{display:"flex",gap:10}}><Btn full onClick={save}>{edit?"Update":"Create"}</Btn><Btn full variant="ghost" onClick={onClose}>Cancel</Btn></div>
    </Modal>
  );
}

function ContributeModal({modal,onClose,onContribute}) {
  const [amt,setAmt] = useState("");
  const g = modal?.data;
  const save=()=>{if(!amt||!g)return; onContribute(g.id,parseFloat(amt)); onClose();};
  return (
    <Modal title={`Add to "${g?.name}"`} onClose={onClose}>
      <p style={{fontSize:14,color:T.textSub,marginBottom:16}}>Current: {fmt(g?.currentAmount||0)} → Target: {fmt(g?.targetAmount||0)}</p>
      <Fld label="Amount to Add" type="number" value={amt} onChange={setAmt} min="0" step="1" placeholder="0"/>
      <div style={{display:"flex",gap:10}}><Btn full onClick={save}>Add Contribution</Btn><Btn full variant="ghost" onClick={onClose}>Cancel</Btn></div>
    </Modal>
  );
}

function BillModal({onClose,onSave}) {
  const [amt,setAmt]=useState(""); const [cat,setCat]=useState(EXPENSE_CATS[0].name);
  const [desc,setDesc]=useState(""); const [due,setDue]=useState("1"); const [rem,setRem]=useState("3");
  const save=()=>{if(!amt||!desc)return; onSave({amount:parseFloat(amt),category:cat,description:desc,dueDate:parseInt(due),reminderDaysBefore:parseInt(rem)}); onClose();};
  return (
    <Modal title="Add Recurring Bill" onClose={onClose}>
      <Fld label="Amount" type="number" value={amt} onChange={setAmt} min="0" step="1"/>
      <Fld label="Category" type="select" value={cat} onChange={setCat} options={EXPENSE_CATS.map(c=>c.name)}/>
      <Fld label="Description" value={desc} onChange={setDesc} placeholder="e.g. Netflix, Rent"/>
      <Fld label="Due Date (day of month)" type="number" value={due} onChange={setDue} min="1" max="31" placeholder="1-31"/>
      <Fld label="Remind (days before)" type="number" value={rem} onChange={setRem} min="0" max="14"/>
      <div style={{display:"flex",gap:10}}><Btn full onClick={save}>Add Bill</Btn><Btn full variant="ghost" onClick={onClose}>Cancel</Btn></div>
    </Modal>
  );
}

function InvestmentModal({onClose,onSave}) {
  const [name,setName]=useState(""); const [amt,setAmt]=useState(""); const [cost,setCost]=useState("");
  const [type,setType]=useState(INVESTMENT_TYPES[0]); const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const save=()=>{if(!name||!amt||!cost)return; onSave({name,amount:parseFloat(amt),costBasis:parseFloat(cost),type,date}); onClose();};
  return (
    <Modal title="Add Investment" onClose={onClose}>
      <Fld label="Investment Name" value={name} onChange={setName} placeholder="e.g. HDFC Midcap Fund"/>
      <Fld label="Current Value" type="number" value={amt} onChange={setAmt} min="0"/>
      <Fld label="Amount Invested (Cost Basis)" type="number" value={cost} onChange={setCost} min="0"/>
      <Fld label="Type" type="select" value={type} onChange={setType} options={INVESTMENT_TYPES}/>
      <Fld label="Date Acquired" type="date" value={date} onChange={setDate}/>
      <div style={{display:"flex",gap:10}}><Btn full onClick={save}>Add</Btn><Btn full variant="ghost" onClick={onClose}>Cancel</Btn></div>
    </Modal>
  );
}

function LiabilityModal({onClose,onSave}) {
  const [name,setName]=useState(""); const [amt,setAmt]=useState("");
  const [type,setType]=useState(LIABILITY_TYPES[0]); const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const save=()=>{if(!name||!amt)return; onSave({name,amount:parseFloat(amt),type,date}); onClose();};
  return (
    <Modal title="Add Liability" onClose={onClose}>
      <Fld label="Name" value={name} onChange={setName} placeholder="e.g. Home Loan — SBI"/>
      <Fld label="Outstanding Amount" type="number" value={amt} onChange={setAmt} min="0"/>
      <Fld label="Type" type="select" value={type} onChange={setType} options={LIABILITY_TYPES}/>
      <Fld label="Since" type="date" value={date} onChange={setDate}/>
      <div style={{display:"flex",gap:10}}><Btn full onClick={save}>Add</Btn><Btn full variant="ghost" onClick={onClose}>Cancel</Btn></div>
    </Modal>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV = [
  {id:"dashboard",    icon:LayoutDashboard, label:"Dashboard"},
  {id:"expenses",     icon:TrendingDown,    label:"Expenses"},
  {id:"income",       icon:TrendingUp,      label:"Income"},
  {id:"budget",       icon:Wallet,          label:"Budget"},
  {id:"goals",        icon:Target,          label:"Goals"},
  {id:"bills",        icon:Receipt,         label:"Bills"},
  {id:"investments",  icon:BarChart3,       label:"Investments"},
  {id:"networth",     icon:Landmark,        label:"Net Worth"},
  {id:"ai",           icon:Sparkles,        label:"AI Insights"},
  {id:"settings",     icon:Settings,        label:"Settings"},
];

function Sidebar({view,setView,open,setOpen}) {
  const close=()=>setOpen(false);
  const content=(
    <div style={{display:"flex",flexDirection:"column",height:"100%",padding:"20px 0"}}>
      <div style={{padding:"0 20px 24px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:"linear-gradient(135deg,"+T.accent+",#4f46e5)",borderRadius:10,padding:8,display:"flex"}}><Wallet size={18} color="#fff"/></div>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif",lineHeight:1}}>FinTracker</div>
            <div style={{fontSize:11,color:T.textSub,marginTop:2}}>Pro</div>
          </div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 10px"}}>
        {NAV.map(n=>{
          const active = view===n.id;
          return (
            <button key={n.id} onClick={()=>{setView(n.id);close();}}
              style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:active?T.accentDim:"transparent",border:"none",borderRadius:10,padding:"10px 12px",cursor:"pointer",marginBottom:2,textAlign:"left",transition:"background 0.15s"}}>
              <n.icon size={17} color={active?T.accent:T.textSub}/>
              <span style={{fontSize:14,color:active?T.accent:T.textSub,fontWeight:active?700:500,fontFamily:"'Inter', sans-serif"}}>{n.label}</span>
              {n.id==="ai" && <span style={{marginLeft:"auto",background:"linear-gradient(135deg,"+T.accent+",#4f46e5)",borderRadius:4,padding:"1px 5px",fontSize:10,color:"#fff",fontWeight:700}}>AI</span>}
            </button>
          );
        })}
      </div>
      <div style={{marginTop: "auto", padding:"12px 10px", borderTop:`1px solid ${T.border}`}}>
        <button onClick={() => signOut(auth)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:"transparent",border:"none",borderRadius:10,padding:"10px 12px",cursor:"pointer",textAlign:"left",transition:"background 0.15s", color: T.red}}>
          <LogOut size={17} color={T.red}/>
          <span style={{fontSize:14,fontWeight:600,fontFamily:"'Inter', sans-serif"}}>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && <div onClick={close} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:90,display:"block"}} className="md-hide"/>}
      {/* Desktop sidebar */}
      <aside style={{width:220,background:T.surface,borderRight:`1px solid ${T.border}`,height:"100vh",flexShrink:0,overflow:"hidden",display:"none"}} className="desktop-sidebar">{content}</aside>
      {/* Mobile drawer */}
      <aside style={{position:"fixed",top:0,left:open?0:-240,width:240,height:"100vh",background:T.surface,borderRight:`1px solid ${T.borderMd}`,zIndex:100,transition:"left 0.3s ease",overflow:"hidden"}}>{content}</aside>
      <style>{`
        @media(min-width:768px){
          .desktop-sidebar{display:block!important;}
          .md-hide{display:none!important;}
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
      `}</style>
    </>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [view, setView] = useState("dashboard");
  const [sideOpen, setSideOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [currency, setCurrency] = useState("INR");

  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [goals, setGoals] = useState([]);
  const [bills, setBills] = useState([]);
  const [investments, setInv] = useState([]);
  const [liabilities, setLiab] = useState([]);
  const [budgets, setBudgets] = useState(INIT_BUDGETS); 

  // 1. Listen for User Login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore Sync (Only runs when a user is logged in)
  useEffect(() => {
    if (!user) return;

    const syncData = (collectionName, stateSetter) => {
      const q = query(collection(db, `users/${user.uid}/${collectionName}`));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        stateSetter(data);
      });
    };

    const unsubExp = syncData("expenses", setExpenses);
    const unsubInc = syncData("income", setIncome);
    const unsubGoals = syncData("goals", setGoals);
    const unsubBills = syncData("bills", setBills);
    const unsubInv = syncData("investments", setInv);
    const unsubLiab = syncData("liabilities", setLiab);

    return () => { unsubExp(); unsubInc(); unsubGoals(); unsubBills(); unsubInv(); unsubLiab(); };
  }, [user]);

  // 3. Database Handlers
  const addData = async (col, data) => await addDoc(collection(db, `users/${user.uid}/${col}`), data);
  const editData = async (col, id, data) => await updateDoc(doc(db, `users/${user.uid}/${col}`, id), data);
  const delData = async (col, id) => await deleteDoc(doc(db, `users/${user.uid}/${col}`, id));

  const addExp    = d  => addData("expenses", d);
  const editExp   = (d,id) => editData("expenses", id, d);
  const delExp    = id => delData("expenses", id);
  
  const addInc    = d  => addData("income", d);
  const editInc   = (d,id) => editData("income", id, d);
  const delInc    = id => delData("income", id);
  
  const addGoal   = d  => addData("goals", d);
  const editGoal  = (d,id) => editData("goals", id, d);
  const delGoal   = id => delData("goals", id);
  const contGoal  = (id, amt) => {
    const g = goals.find(x => x.id === id);
    if(g) editData("goals", id, { currentAmount: Math.min(g.targetAmount, g.currentAmount + amt) });
  };

  const addBill   = d  => addData("bills", d);
  const delBill   = id => delData("bills", id);
  
  const addInv    = d  => addData("investments", d);
  const delInv    = id => delData("investments", id);
  
  const addLiab   = d  => addData("liabilities", d);
  const delLiab   = id => delData("liabilities", id);

  const closeModal = () => setModal(null);

  const renderModal = () => {
    if(!modal) return null;
    switch(modal.type) {
      case "addExpense":   return <TransactionModal modal={modal} onClose={closeModal} onSave={addExp} type="expense"/>;
      case "editExpense":  return <TransactionModal modal={modal} onClose={closeModal} onSave={editExp} type="expense"/>;
      case "addIncome":    return <TransactionModal modal={modal} onClose={closeModal} onSave={addInc} type="income"/>;
      case "editIncome":   return <TransactionModal modal={modal} onClose={closeModal} onSave={editInc} type="income"/>;
      case "addGoal":      return <GoalModal modal={modal} onClose={closeModal} onSave={addGoal}/>;
      case "editGoal":     return <GoalModal modal={modal} onClose={closeModal} onSave={editGoal}/>;
      case "contributeGoal": return <ContributeModal modal={modal} onClose={closeModal} onContribute={contGoal}/>;
      case "addBill":      return <BillModal onClose={closeModal} onSave={addBill}/>;
      case "addInvestment":return <InvestmentModal onClose={closeModal} onSave={addInv}/>;
      case "addLiability": return <LiabilityModal onClose={closeModal} onSave={addLiab}/>;
      default: return null;
    }
  };

  const viewProps = {expenses,income,goals,bills,investments,liabilities,budgets,setBudgets,currency,setModal,setView};

  if (authLoading) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, color: T.text, fontFamily: "'Inter', sans-serif" }}>Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div style={{display:"flex",height:"100vh",background:T.bg,color:T.text,fontFamily:"'Inter', sans-serif",overflow:"hidden"}}>
      <Sidebar view={view} setView={setView} open={sideOpen} setOpen={setSideOpen}/>

      {/* Top bar (mobile) */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:56,background:T.surface+"ee",backdropFilter:"blur(10px)",borderBottom:`1px solid ${T.border}`,zIndex:80,display:"flex",alignItems:"center",padding:"0 16px",gap:12}} className="mobile-topbar">
        <button onClick={()=>setSideOpen(s=>!s)} style={{background:"none",border:"none",color:T.text,cursor:"pointer",display:"flex",padding:4}}>
          <Menu size={22}/>
        </button>
        <span style={{fontSize:16,fontWeight:700,color:T.text,fontFamily:"'Plus Jakarta Sans', sans-serif"}}>FinTracker Pro</span>
      </div>

      {/* Main content */}
      <main style={{flex:1,overflowY:"auto",padding:"20px",paddingTop:72}} className="main-content">
        <div style={{maxWidth:"100%",margin:"0 auto"}}>
          {view==="dashboard"   && <DashboardView   {...viewProps}/>}
          {view==="expenses"    && <TransactionsView type="expense" items={expenses} onAdd={addExp} onEdit={editExp} onDelete={delExp} currency={currency} setModal={setModal}/>}
          {view==="income"      && <TransactionsView type="income"  items={income}   onAdd={addInc} onEdit={editInc} onDelete={delInc} currency={currency} setModal={setModal}/>}
          {view==="budget"      && <BudgetView      {...viewProps}/>}
          {view==="goals"       && <GoalsView       goals={goals} onAdd={addGoal} onEdit={editGoal} onDelete={delGoal} setModal={setModal} currency={currency}/>}
          {view==="bills"       && <BillsView       bills={bills} onAdd={addBill} onDelete={delBill} setModal={setModal} currency={currency}/>}
          {view==="investments" && <InvestmentsView  investments={investments} onDelete={delInv} setModal={setModal} currency={currency}/>}
          {view==="networth"    && <NetWorthView      investments={investments} liabilities={liabilities} onDeleteLiab={delLiab} setModal={setModal} currency={currency}/>}
          {view==="ai"          && <AIInsightsView   expenses={expenses} income={income} goals={goals} currency={currency}/>}
          {view==="settings"    && <SettingsView      currency={currency} setCurrency={setCurrency}/>}
        </div>
      </main>

      {renderModal()}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.bg};}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${T.elevated};border-radius:2px;}
        input[type=number]::-webkit-inner-spin-button{opacity:0.5;}
        select option{background:${T.elevated};}
        @media(min-width:768px){
          .mobile-topbar{display:none!important;}
          .main-content{padding-top:24px!important;}
        }
      `}</style>
    </div>
  );
}