import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDEdY5HoIa_jntjBCYVV_X8O7JOgJ_32gs",
  authDomain: "aura-gym-9f65b.firebaseapp.com",
  projectId: "aura-gym-9f65b",
};

const API_URL = "https://script.google.com/macros/s/AKfycbxEUdDekifPCVUnlU-4ouZbp1U0WS02K6uLIUsavQc61Pv_iGpU4ARk7iDAXhcIsp6UKQ/exec";
// ═══════════════════════════════════════════════════════════

const DEFAULT_PERSONALS = [
  "Edson Junior","Letícia Bevilaqua","Jefferson Oliveira","Renã Oliveira",
  "Fagner Andrade","Caio Santos","Danielle Almeida","Felipe Barbosa",
  "Gustavo Medeiros","Gustavo Santos","Kaue Rosa","Nicolas Thomas",
  "Pedro Gonçalves","Rafaela Souza","Victor Salgado","Pedro Henrique",
  "Pedro Villas","Debora Dantas","André Silva","Eduardo Cruz"
];
const DEFAULT_AREAS = ["Máquinas","Peso Livre","Cardio","Pilates","Funcional","Alongamento"];

const pad = (n) => String(n).padStart(2,"0");
const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const todayStr = () => { const d = new Date(); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`; };
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };

function timeDiffMin(a, b) {
  if (!a || !b) return null;
  const [h1,m1] = a.split(":").map(Number);
  const [h2,m2] = b.split(":").map(Number);
  return (h2*60+m2)-(h1*60+m1);
}

function elapsedSince(entrada) {
  if (!entrada) return { min:0,sec:0,total:0 };
  const [h,m] = entrada.split(":").map(Number);
  const now = new Date();
  const diff = (now.getHours()*3600+now.getMinutes()*60+now.getSeconds())-(h*3600+m*60);
  return { min:Math.floor(Math.max(0,diff)/60), sec:Math.max(0,diff)%60, total:Math.max(0,diff) };
}

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(()=>setT(new Date()),1000); return ()=>clearInterval(i); },[]);
  return <span style={{fontVariantNumeric:"tabular-nums"}}>{pad(t.getHours())}:{pad(t.getMinutes())}:{pad(t.getSeconds())}</span>;
}

function useTick(ms=1000) {
  const [tick,setTick] = useState(0);
  useEffect(() => { const i = setInterval(()=>setTick(t=>t+1),ms); return ()=>clearInterval(i); },[ms]);
  return tick;
}

// ═══ Firebase Auth ═══
const fbUrl = (ep) => `https://identitytoolkit.googleapis.com/v1/accounts:${ep}?key=${FIREBASE_CONFIG.apiKey}`;

async function fbSignIn(email, password) {
  const res = await fetch(fbUrl("signInWithPassword"), {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ email, password, returnSecureToken:true }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

async function fbSignUp(email, password) {
  const res = await fetch(fbUrl("signUp"), {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ email, password, returnSecureToken:true }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

// ═══ API helpers ═══
async function apiGet(params) {
  if (!API_URL || API_URL==="COLE_SUA_URL_AQUI") return null;
  try {
    const url = new URL(API_URL);
    Object.entries(params).forEach(([k,v])=>url.searchParams.append(k,v));
    const res = await fetch(url.toString());
    return await res.json();
  } catch(e) { console.error("API GET:",e); return null; }
}

async function apiPost(body) {
  if (!API_URL || API_URL==="COLE_SUA_URL_AQUI") return null;
  try {
    const res = await fetch(API_URL, { method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify(body) });
    return await res.json();
  } catch(e) { console.error("API POST:",e); return null; }
}

const C = {
  bg:"#F2F0EF", card:"#FFFFFF", border:"#E0D5C7",
  accent:"#6A2135", accentDim:"#6A213512", accentMid:"#6A213544",
  text:"#2A1A1F", dim:"#8C7B84",
  danger:"#C0392B", dangerDim:"#C0392B15",
  success:"#6A2135", successDim:"#6A213512",
  warning:"#D4A017", warningDim:"#D4A01715",
  rowOdd:"#F2F0EF", rowEven:"#FFFFFF", headerBg:"#E0D5C7",
};

const TABS = { REGISTRO:0, RESUMO:1, AOVIVO:2, PAINEL:3, CONFIG:4 };

// ═══ LOGIN ═══
const toFakeEmail = (username) => `${username.toLowerCase().trim().replace(/\s+/g,".")}@auragym.local`;
const fromFakeEmail = (email) => email ? email.replace("@auragym.local","").replace(/\./g," ") : "";

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim()) { setError("Digite seu usuário"); return; }
    if (password.length < 4) { setError("Senha precisa ter pelo menos 4 caracteres"); return; }
    setError(""); setLoading(true);
    const fakeEmail = toFakeEmail(username);
    try {
      if (mode === "login") {
        const user = await fbSignIn(fakeEmail, password);
        onLogin({ ...user, displayName: username.trim() });
      } else {
        if (password.length < 6) { setError("Senha precisa ter pelo menos 6 caracteres"); setLoading(false); return; }
        const user = await fbSignUp(fakeEmail, password);
        onLogin({ ...user, displayName: username.trim() });
      }
    } catch (e) {
      const msg = e.message;
      if (msg.includes("EMAIL_NOT_FOUND") || msg.includes("INVALID_LOGIN_CREDENTIALS")) setError("Usuário não encontrado ou senha incorreta");
      else if (msg.includes("INVALID_PASSWORD")) setError("Senha incorreta");
      else if (msg.includes("EMAIL_EXISTS")) setError("Este usuário já existe");
      else if (msg.includes("WEAK_PASSWORD")) setError("Senha muito fraca (mínimo 6 caracteres)");
      else if (msg.includes("TOO_MANY_ATTEMPTS")) setError("Muitas tentativas. Aguarde alguns minutos.");
      else setError("Erro ao conectar. Tente novamente.");
    }
    setLoading(false);
  };

  const inp = { background:"#F2F0EF", border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px", color:C.text, fontSize:15, outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif", padding:20 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:`linear-gradient(135deg,${C.accent},#8B2D47)`, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:700, color:"#fff", marginBottom:12 }}>A</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:22, color:C.accent, letterSpacing:3 }}>AURA GYM</div>
          <div style={{ fontSize:12, color:C.dim, marginTop:4, letterSpacing:1 }}>TORRE DE CONTROLE</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:28 }}>
          <div style={{ fontSize:18, fontWeight:600, color:C.text, marginBottom:4 }}>{mode==="login" ? "Entrar" : "Criar conta"}</div>
          <div style={{ fontSize:13, color:C.dim, marginBottom:24 }}>{mode==="login" ? "Digite seu usuário e senha" : "Escolha um usuário e senha"}</div>
          {error && <div style={{ background:C.dangerDim, border:`1px solid ${C.danger}44`, borderRadius:8, padding:"10px 14px", fontSize:13, color:C.danger, marginBottom:16 }}>{error}</div>}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, color:C.dim, textTransform:"uppercase", letterSpacing:1, marginBottom:4, display:"block" }}>Usuário</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="ex: joao, admin..." style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} autoFocus autoCapitalize="none" autoCorrect="off" />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:11, color:C.dim, textTransform:"uppercase", letterSpacing:1, marginBottom:4, display:"block" }}>Senha</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
          <button onClick={handleSubmit} disabled={loading} style={{ width:"100%", padding:14, border:"none", borderRadius:10, cursor:loading?"wait":"pointer", background: loading ? C.dim : `linear-gradient(135deg,${C.accent},#8B2D47)`, color:C.bg, fontWeight:700, fontSize:15, fontFamily:"inherit", marginBottom:16, opacity: loading ? .6 : 1 }}>
            {loading ? "Aguarde..." : mode==="login" ? "Entrar" : "Criar conta"}
          </button>
          <div style={{ textAlign:"center" }}>
            {mode === "login"
              ? <button onClick={()=>{setMode("register");setError("");}} style={{ background:"none",border:"none",color:C.accent,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>Não tenho conta — criar agora</button>
              : <button onClick={()=>{setMode("login");setError("");}} style={{ background:"none",border:"none",color:C.accent,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>Já tenho conta — entrar</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ MAIN APP ═══
export default function AuraGym() {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [tab, setTab] = useState(TABS.REGISTRO);
  const [liderSala, setLiderSala] = useState("");
  const [capacidade, setCapacidade] = useState(25);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome:"",personal:"",area:"",obs:"",horaEntrada:"" });
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [personals, setPersonals] = useState(DEFAULT_PERSONALS);
  const [areas, setAreas] = useState(DEFAULT_AREAS);
  const [newPersonal, setNewPersonal] = useState("");
  const [newArea, setNewArea] = useState("");
  const syncTimeout = useRef(null);
  const tick = useTick(1000);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage?.getItem?.("aura_user") || "null");
      if (saved) setUser(saved);
      const savedP = JSON.parse(window.localStorage?.getItem?.("aura_personals") || "null");
      if (savedP) setPersonals(savedP);
      const savedA = JSON.parse(window.localStorage?.getItem?.("aura_areas") || "null");
      if (savedA) setAreas(savedA);
    } catch(e) {}
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    try { window.sessionStorage?.setItem?.("aura_user", JSON.stringify(userData)); } catch(e) {}
  };
  const handleLogout = () => {
    setUser(null);
    try { window.sessionStorage?.removeItem?.("aura_user"); } catch(e) {}
  };

  const skipAuth = FIREBASE_CONFIG.apiKey === "COLE_AQUI";

  useEffect(() => {
    if (user || skipAuth) { loadFromCloud(); const i = setInterval(loadFromCloud, 30000); return ()=>clearInterval(i); }
  }, [user, skipAuth]);

  const loadFromCloud = useCallback(async () => {
    const data = await apiGet({ action:"getToday", data: todayKey() });
    if (data && data.records) {
      // Normaliza: garante que a data bate (o Sheets pode formatar diferente)
      const today = todayKey();
      const recs = data.records.filter(r => {
        // Aceita se a data contém o padrão YYYY-MM-DD do dia
        const d = String(r.data || "");
        return d === today || d.startsWith(today) || d.includes(today.replace(/-/g,"/"));
      }).map(r => ({
        ...r,
        id: r.id || Date.now(),
        avaliacao: r.avaliacao ? Number(r.avaliacao) : null,
        saida: r.saida || null,
      }));
      setRecords(recs);
      setConnected(true);
    }
    const cfg = await apiGet({ action:"getConfig" });
    if (cfg?.config) {
      if (cfg.config.capacidade) setCapacidade(Number(cfg.config.capacidade));
      if (cfg.config.lider_sala) setLiderSala(cfg.config.lider_sala);
    }
  }, []);

  // Force refresh
  const forceRefresh = () => { loadFromCloud(); };

  // ── Show login or app based on auth state ──
  const showLogin = !skipAuth && !user;

  const emTreino = showLogin ? [] : records.filter(r => r.nome && !r.saida);
  const finalizados = showLogin ? [] : records.filter(r => r.nome && r.saida);
  const allNamed = showLogin ? [] : records.filter(r => r.nome);
  const duracoes = finalizados.map(r => timeDiffMin(r.entrada,r.saida)).filter(d=>d>0);
  const mediaDuracao = duracoes.length ? Math.round(duracoes.reduce((a,b)=>a+b,0)/duracoes.length) : 0;
  const taxaOcupacao = capacidade>0 ? Math.round((emTreino.length/capacidade)*100) : 0;

  const personalStats = (() => {
    const m = {};
    personals.forEach(p => { m[p]={total:0,emTreino:0,duracoes:[]}; });
    records.forEach(r => {
      if(r.personal && m[r.personal]) {
        m[r.personal].total++;
        if(!r.saida) m[r.personal].emTreino++;
        if(r.saida){const d=timeDiffMin(r.entrada,r.saida);if(d>0)m[r.personal].duracoes.push(d);}
      }
    });
    return m;
  })();

  const registrarEntrada = async () => {
    if(!form.nome.trim()) return;
    const hora = form.horaEntrada || nowTime();
    const record = { id:Date.now(), data:todayKey(), nome:form.nome.trim(), entrada:hora, saida:null, personal:form.personal, area:form.area, obs:form.obs, avaliacao:null, lider:liderSala };
    setRecords(prev=>[...prev, record]);
    setForm({ nome:"",personal:"",area:"",obs:"",horaEntrada:"" }); setShowForm(false);
    setSyncing(true); await apiPost({ action:"save", record }); setSyncing(false);
  };

  const markSaida = async (id) => {
    const saida=nowTime();
    setRecords(prev=>prev.map(r=>r.id===id?{...r,saida}:r));
    setSyncing(true); await apiPost({ action:"update", record:{id,saida} }); setSyncing(false);
  };

  const setAvaliacao = async (id, val) => {
    setRecords(prev=>prev.map(r=>r.id===id?{...r,avaliacao:val}:r));
    await apiPost({ action:"update", record:{id,avaliacao:val} });
  };

  const removeRecord = async (id) => {
    setRecords(prev=>prev.filter(r=>r.id!==id));
    await apiPost({ action:"delete", id, data:todayKey() });
  };

  const saveConfigDebounced = useCallback((key, value) => {
    if(syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(async()=>{ await apiPost({ action:"saveConfig", config:{[key]:value} }); },1500);
  },[]);

  const handleLider = (v) => { setLiderSala(v); saveConfigDebounced("lider_sala",v); };
  const handleCapacidade = (v) => { setCapacidade(v); saveConfigDebounced("capacidade",v); };

  // Personals & Areas management
  const addPersonal = () => {
    if (!newPersonal.trim()) return;
    const updated = [...personals, newPersonal.trim()];
    setPersonals(updated); setNewPersonal("");
    try { window.localStorage?.setItem?.("aura_personals", JSON.stringify(updated)); } catch(e) {}
  };
  const removePersonal = (name) => {
    const updated = personals.filter(p => p !== name);
    setPersonals(updated);
    try { window.localStorage?.setItem?.("aura_personals", JSON.stringify(updated)); } catch(e) {}
  };
  const addArea = () => {
    if (!newArea.trim()) return;
    const updated = [...areas, newArea.trim()];
    setAreas(updated); setNewArea("");
    try { window.localStorage?.setItem?.("aura_areas", JSON.stringify(updated)); } catch(e) {}
  };
  const removeArea = (name) => {
    const updated = areas.filter(a => a !== name);
    setAreas(updated);
    try { window.localStorage?.setItem?.("aura_areas", JSON.stringify(updated)); } catch(e) {}
  };

  const inputStyle = { background:"#F2F0EF",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit" };

  const tabItems = [
    { key:TABS.REGISTRO, label:"📋 Registro" },
    { key:TABS.RESUMO, label:"📊 Resumo" },
    { key:TABS.AOVIVO, label:"🔴 Ao Vivo" },
    { key:TABS.PAINEL, label:"📈 Painel" },
    { key:TABS.CONFIG, label:"⚙️ Config" },
  ];

  const cols = [{k:"#",w:34},{k:"nome",w:158,l:"Nome"},{k:"entrada",w:56,l:"Entrada"},{k:"saida",w:56,l:"Saída"},{k:"dur",w:44,l:"Min"},{k:"personal",w:136,l:"Personal"},{k:"area",w:82,l:"Área"},{k:"status",w:64,l:"Status"},{k:"aval",w:80,l:"Nota"}];
  const totalW = cols.reduce((s,c)=>s+c.w,0);
  const cellS = { padding:"0 5px",height:34,display:"flex",alignItems:"center",fontSize:12,borderRight:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,boxSizing:"border-box",overflow:"hidden",whiteSpace:"nowrap" };

  const isApiConfigured = API_URL && API_URL !== "COLE_SUA_URL_AQUI";

  if (showLogin) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes breathe{0%,100%{box-shadow:0 0 8px ${C.success}44}50%{box-shadow:0 0 20px ${C.success}66}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      {/* HEADER */}
      <div style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:"12px 20px",position:"sticky",top:0,zIndex:100 }}>
        <div style={{ maxWidth:1080,margin:"0 auto" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:32,height:32,borderRadius:7,background:`linear-gradient(135deg,${C.accent},#8B2D47)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff" }}>A</div>
              <span style={{ fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:14,color:C.accent,letterSpacing:2 }}>AURA GYM</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              {/* Sync + Refresh */}
              <button onClick={forceRefresh} title="Atualizar dados" style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:5,padding:"4px 8px",color:C.dim,fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>🔄</button>
              <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                {syncing
                  ? <span style={{ width:7,height:7,border:`2px solid ${C.accent}`,borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"spin .6s linear infinite" }}/>
                  : <span style={{ width:7,height:7,borderRadius:"50%",background:isApiConfigured?(connected?C.success:C.danger):C.warning }}/>
                }
                <span style={{ fontSize:9,color:C.dim }}>{syncing?"Salvando...":connected?"OK":"..."}</span>
              </div>
              <span style={{ fontSize:10,color:C.dim }}>{todayStr()}</span>
              <span style={{ fontFamily:"'Space Mono',monospace",fontSize:16,fontWeight:700 }}><LiveClock /></span>
              {user && (
                <div style={{ display:"flex",alignItems:"center",gap:5,marginLeft:2 }}>
                  <div style={{ width:24,height:24,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff" }}>{(user.displayName||"U")[0].toUpperCase()}</div>
                  <span style={{ fontSize:10,color:C.text,fontWeight:500 }}>{user.displayName||fromFakeEmail(user.email)}</span>
                  <button onClick={handleLogout} style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:5,padding:"3px 8px",color:C.dim,fontSize:9,cursor:"pointer",fontFamily:"inherit" }}>Sair</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ display:"flex",gap:2,marginTop:10,background:"#E8E2DC",borderRadius:7,padding:2 }}>
            {tabItems.map(t2=>(<button key={t2.key} onClick={()=>setTab(t2.key)} style={{ flex:1,padding:"7px 4px",border:"none",borderRadius:5,cursor:"pointer",background:tab===t2.key?C.accent:"transparent",color:tab===t2.key?"#fff":C.dim,fontWeight:tab===t2.key?700:500,fontSize:10,fontFamily:"inherit" }}>{t2.label}</button>))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1080,margin:"0 auto",padding:"14px 12px 50px" }}>

        {/* ═══ REGISTRO ═══ */}
        {tab===TABS.REGISTRO && (<div>
          <div style={{ display:"flex",gap:10,marginBottom:14,flexWrap:"wrap" }}>
            <div style={{ flex:"2 1 180px" }}><label style={{ fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1 }}>Líder de Sala</label><input value={liderSala} onChange={e=>handleLider(e.target.value)} placeholder="Nome..." style={{...inputStyle,marginTop:3}} /></div>
            <div style={{ flex:"0 0 90px" }}><label style={{ fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1 }}>Capacidade</label><input type="number" value={capacidade} onChange={e=>handleCapacidade(Number(e.target.value))} style={{...inputStyle,marginTop:3}} /></div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14 }}>
            {[{l:"Entradas",v:allNamed.length,c:C.accent},{l:"Em Treino",v:emTreino.length,c:C.success},{l:"Média",v:mediaDuracao?`${mediaDuracao}m`:"—",c:C.text},{l:"Ocupação",v:`${taxaOcupacao}%`,c:taxaOcupacao>80?C.danger:C.accent}].map((k,i)=>(
              <div key={i} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 6px",textAlign:"center" }}><div style={{ fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:1 }}>{k.l}</div><div style={{ fontFamily:"'Space Mono',monospace",fontSize:20,fontWeight:700,color:k.c,marginTop:2 }}>{k.v}</div></div>
            ))}
          </div>

          <button onClick={()=>setShowForm(!showForm)} style={{ width:"100%",padding:"12px",border:showForm?`1px solid ${C.border}`:`2px dashed ${C.accentMid}`,borderRadius:10,cursor:"pointer",marginBottom:14,background:showForm?C.card:C.accentDim,color:showForm?C.dim:C.accent,fontWeight:600,fontSize:14,fontFamily:"inherit" }}>{showForm?"✕  Cancelar":"+  Registrar Entrada"}</button>

          {showForm && (
            <div style={{ background:C.card,border:`1px solid ${C.accent}33`,borderRadius:12,padding:18,marginBottom:18,boxShadow:`0 0 30px ${C.accent}11`,animation:"slideIn .2s ease" }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                <div style={{ gridColumn:"1/-1" }}><label style={{ fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1 }}>Nome do Aluno *</label><input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Nome..." style={{...inputStyle,marginTop:3,borderColor:C.accent+"44"}} onKeyDown={e=>e.key==="Enter"&&registrarEntrada()} autoFocus /></div>
                <div><label style={{ fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1 }}>Personal</label><select value={form.personal} onChange={e=>setForm({...form,personal:e.target.value})} style={{...inputStyle,marginTop:3,cursor:"pointer",appearance:"auto"}}><option value="">Selecione...</option>{personals.filter(p => !personalStats[p] || personalStats[p].emTreino < 2).map(p=>{const busy = personalStats[p]?.emTreino === 1; return <option key={p} value={p}>{p}{busy ? " ●" : ""}</option>;})}</select></div>
                <div><label style={{ fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1 }}>Área</label><select value={form.area} onChange={e=>setForm({...form,area:e.target.value})} style={{...inputStyle,marginTop:3,cursor:"pointer",appearance:"auto"}}><option value="">Selecione...</option>{areas.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
                <div><label style={{ fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1 }}>Horário de entrada <span style={{color:C.dim,fontSize:9}}>(vazio = agora)</span></label><input type="time" value={form.horaEntrada} onChange={e=>setForm({...form,horaEntrada:e.target.value})} style={{...inputStyle,marginTop:3}} /></div>
                <div><label style={{ fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1 }}>Observação</label><input value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})} placeholder="Opcional..." style={{...inputStyle,marginTop:3}} /></div>
              </div>
              <button onClick={registrarEntrada} style={{ marginTop:14,width:"100%",padding:12,border:"none",borderRadius:8,background:`linear-gradient(135deg,${C.accent},#8B2D47)`,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit" }}>⏱ Registrar Entrada{form.horaEntrada ? ` às ${form.horaEntrada}` : ` — ${nowTime()}`}</button>
            </div>
          )}

          {emTreino.length>0 && (<div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11,color:C.success,textTransform:"uppercase",letterSpacing:2,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:6 }}><span style={{ width:7,height:7,borderRadius:"50%",background:C.success,animation:"pulse 2s infinite" }}/>Em Treino ({emTreino.length})</div>
            {emTreino.map(r=>{const pBusy = personalStats[r.personal]?.emTreino || 0; return(<div key={r.id} style={{ background:C.successDim,border:`1px solid ${C.success}33`,borderRadius:10,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}><div><div style={{ fontWeight:600,fontSize:14 }}>{r.nome}</div><div style={{ fontSize:11,color:C.dim,marginTop:2 }}>Entrada {r.entrada} · {r.personal ? <span>{r.personal}{pBusy>=2 ? <span style={{color:C.danger,marginLeft:4,fontSize:9}} title="Lotado (2/2)">🔴</span> : pBusy===1 ? <span style={{color:C.warning,marginLeft:4,fontSize:9}} title="Atendendo 1">🟡</span> : null}</span> : "Sem personal"} · {r.area||"—"}</div></div><button onClick={()=>markSaida(r.id)} style={{ padding:"7px 16px",border:"none",borderRadius:6,background:C.danger,color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>Saída ⏱</button></div>);})}
          </div>)}

          {finalizados.length>0 && (<div>
            <div style={{ fontSize:11,color:C.dim,textTransform:"uppercase",letterSpacing:2,fontWeight:600,marginBottom:8 }}>Finalizados ({finalizados.length})</div>
            {finalizados.slice().reverse().map(r=>{const dur=timeDiffMin(r.entrada,r.saida);return(<div key={r.id} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",marginBottom:5,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6,opacity:.8 }}><div style={{ flex:1,minWidth:160 }}><div style={{ fontWeight:500,fontSize:13 }}>{r.nome}</div><div style={{ fontSize:11,color:C.dim,marginTop:2 }}>{r.entrada} → {r.saida} · <span style={{color:C.accent}}>{dur}min</span> · {r.personal||"—"} · {r.area||"—"}</div></div><div style={{ display:"flex",alignItems:"center",gap:4 }}>{[1,2,3,4,5].map(s=>(<button key={s} onClick={()=>setAvaliacao(r.id,s)} style={{ background:"none",border:"none",cursor:"pointer",padding:0,fontSize:14,color:r.avaliacao>=s?C.warning:C.dim+"44" }}>★</button>))}<button onClick={()=>removeRecord(r.id)} style={{ background:"none",border:"none",cursor:"pointer",color:C.dim,fontSize:14,padding:"0 4px",opacity:.4 }}>✕</button></div></div>);})}
          </div>)}

          {allNamed.length===0&&!showForm&&(<div style={{ textAlign:"center",padding:50,color:C.dim }}><div style={{ fontSize:36,marginBottom:8 }}>🏋️</div><div style={{ fontSize:14 }}>Nenhum registro hoje</div></div>)}
        </div>)}

        {/* ═══ RESUMO ═══ */}
        {tab===TABS.RESUMO && (<div>
          <div style={{ fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:10 }}>Resumo — {todayStr()} — {allNamed.length} registros</div>
          {allNamed.length===0?(<div style={{ textAlign:"center",padding:50,color:C.dim }}><div style={{ fontSize:36,marginBottom:8 }}>📊</div><div>Nenhum registro</div></div>):(
            <div style={{ border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",background:C.card }}><div style={{ overflowX:"auto" }}><div style={{ minWidth:totalW }}>
              <div style={{ display:"flex",background:C.headerBg,borderBottom:`2px solid ${C.accent}44` }}>{cols.map(c=>(<div key={c.k} style={{ ...cellS,width:c.w,minWidth:c.w,maxWidth:c.w,height:30,fontSize:10,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:1,borderBottom:"none" }}>{c.l||c.k}</div>))}</div>
              {allNamed.map((r,idx)=>{const dur=timeDiffMin(r.entrada,r.saida);const tr=!r.saida;return(<div key={r.id||idx} style={{ display:"flex",background:tr?C.successDim:(idx%2===0?C.rowOdd:C.rowEven) }}>
                <div style={{ ...cellS,width:34,minWidth:34,justifyContent:"center",color:C.dim,fontSize:10 }}>{idx+1}</div>
                <div style={{ ...cellS,width:158,minWidth:158,fontWeight:500 }}>{r.nome}</div>
                <div style={{ ...cellS,width:56,minWidth:56,fontFamily:"'Space Mono',monospace",fontSize:11,justifyContent:"center" }}>{r.entrada}</div>
                <div style={{ ...cellS,width:56,minWidth:56,fontFamily:"'Space Mono',monospace",fontSize:11,justifyContent:"center",color:r.saida?C.text:C.dim }}>{r.saida||"—"}</div>
                <div style={{ ...cellS,width:44,minWidth:44,fontFamily:"'Space Mono',monospace",fontSize:11,justifyContent:"center",color:dur>0?C.accent:C.dim }}>{dur>0?dur:"—"}</div>
                <div style={{ ...cellS,width:136,minWidth:136,fontSize:12 }}>{r.personal||"—"}</div>
                <div style={{ ...cellS,width:82,minWidth:82,fontSize:12 }}>{r.area||"—"}</div>
                <div style={{ ...cellS,width:64,minWidth:64,justifyContent:"center" }}>{tr?<span style={{ fontSize:10,color:C.success,fontWeight:700,display:"flex",alignItems:"center",gap:3 }}><span style={{ width:5,height:5,borderRadius:"50%",background:C.success,animation:"pulse 2s infinite" }}/>Treino</span>:<span style={{ fontSize:10,color:C.dim }}>Saiu</span>}</div>
                <div style={{ ...cellS,width:80,minWidth:80,justifyContent:"center",gap:1,borderRight:"none" }}>{[1,2,3,4,5].map(s=>(<span key={s} style={{ fontSize:12,color:r.avaliacao>=s?C.warning:C.dim+"33" }}>★</span>))}</div>
              </div>);})}
              <div style={{ display:"flex",background:C.headerBg,borderTop:`2px solid ${C.accent}44` }}>
                <div style={{ ...cellS,width:34,borderBottom:"none" }}/><div style={{ ...cellS,width:158,fontWeight:700,fontSize:10,color:C.accent,borderBottom:"none" }}>TOTAL: {allNamed.length}</div><div style={{ ...cellS,width:56,borderBottom:"none" }}/><div style={{ ...cellS,width:56,borderBottom:"none" }}/><div style={{ ...cellS,width:44,justifyContent:"center",fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:C.accent,borderBottom:"none" }}>{mediaDuracao||"—"}</div><div style={{ ...cellS,width:136,borderBottom:"none" }}/><div style={{ ...cellS,width:82,borderBottom:"none" }}/><div style={{ ...cellS,width:64,justifyContent:"center",fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:C.success,borderBottom:"none" }}>{emTreino.length>0?`${emTreino.length} 🟢`:"—"}</div><div style={{ ...cellS,width:80,borderBottom:"none",borderRight:"none" }}/>
              </div>
            </div></div></div>
          )}
        </div>)}

        {/* ═══ AO VIVO ═══ */}
        {tab===TABS.AOVIVO && (<div>
          <div style={{ display:"flex",gap:8,marginBottom:16,flexWrap:"wrap" }}>
            {[{l:"Em Treino",v:emTreino.length,c:C.success,bc:`${C.success}44`},{l:"Ocupação",v:`${taxaOcupacao}%`,c:taxaOcupacao>80?C.danger:C.accent,bc:C.border},{l:"Saíram",v:finalizados.length,c:C.dim,bc:C.border}].map((k,i)=>(<div key={i} style={{ flex:"1 1 120px",background:C.card,border:`1px solid ${k.bc}`,borderRadius:10,padding:"12px 14px",textAlign:"center" }}><div style={{ fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:1 }}>{k.l}</div><div style={{ fontFamily:"'Space Mono',monospace",fontSize:36,fontWeight:700,color:k.c,marginTop:4 }}>{k.v}</div></div>))}
          </div>
          {emTreino.length===0?(<div style={{ textAlign:"center",padding:50,color:C.dim }}><div style={{ fontSize:48,marginBottom:8 }}>🧘</div><div>Nenhum aluno em treino</div></div>):(
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {emTreino.map(r=>({...r,elapsed:elapsedSince(r.entrada)})).sort((a,b)=>b.elapsed.total-a.elapsed.total).map(r=>{
                const el=r.elapsed,isL=el.min>=60,isW=el.min>=45;
                const bc=isL?C.danger:isW?C.warning:C.success;
                const pct=Math.min((el.min/90)*100,100);
                return(<div key={r.id} style={{ background:C.card,border:`1px solid ${isL?C.danger+"55":isW?C.warning+"44":C.success+"33"}`,borderRadius:12,padding:"14px 16px",animation:"breathe 3s infinite" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8 }}>
                    <div style={{ flex:1,minWidth:180 }}><div style={{ fontWeight:700,fontSize:16 }}>{r.nome}</div><div style={{ fontSize:12,color:C.dim,marginTop:4,display:"flex",flexWrap:"wrap",gap:8 }}><span>⏱ {r.entrada}</span>{r.personal&&<span>👤 {r.personal}</span>}{r.area&&<span>📍 {r.area}</span>}</div></div>
                    <div style={{ textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8 }}><div style={{ fontFamily:"'Space Mono',monospace",fontSize:32,fontWeight:700,color:bc,lineHeight:1 }}>{el.min}<span style={{fontSize:14,color:C.dim,fontWeight:400}}> min</span></div><button onClick={()=>markSaida(r.id)} style={{ padding:"8px 20px",border:"none",borderRadius:6,background:C.danger,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>Registrar Saída</button></div>
                  </div>
                  <div style={{ marginTop:10,background:"#E0D5C7",borderRadius:4,height:6,overflow:"hidden" }}><div style={{ height:"100%",borderRadius:4,width:`${pct}%`,background:`linear-gradient(90deg,${C.success},${isW?C.warning:C.success},${isL?C.danger:isW?C.warning:C.success})`,transition:"width 1s linear" }}/></div>
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:3,fontSize:9,color:C.dim }}><span>0</span><span style={{color:isW?C.warning:C.dim}}>45m</span><span style={{color:isL?C.danger:C.dim}}>60m</span><span>90m</span></div>
                </div>);
              })}
            </div>
          )}
          {finalizados.length>0&&(<div style={{ marginTop:24 }}><div style={{ fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:8 }}>Últimas saídas</div>{finalizados.slice().reverse().slice(0,5).map(r=>{const dur=timeDiffMin(r.entrada,r.saida);return(<div key={r.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:`1px solid ${C.border}22`,opacity:.6 }}><span style={{ fontSize:13 }}>{r.nome}</span><span style={{ fontFamily:"'Space Mono',monospace",fontSize:12,color:C.dim }}>{r.entrada}→{r.saida} · <span style={{color:C.accent}}>{dur}m</span></span></div>);})}</div>)}
        </div>)}

        {/* ═══ PAINEL ═══ */}
        {tab===TABS.PAINEL && (<div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18 }}>
            {[{l:"Total",v:allNamed.length,i:"👥",c:C.accent},{l:"Em Treino",v:emTreino.length,i:"🏃",c:C.success},{l:"Média",v:mediaDuracao?`${mediaDuracao}m`:"—",i:"⏱",c:C.text},{l:"Ocupação",v:`${taxaOcupacao}%`,i:"📈",c:taxaOcupacao>80?C.danger:C.accent}].map((k,i)=>(<div key={i} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:16,textAlign:"center" }}><div style={{ fontSize:22,marginBottom:2 }}>{k.i}</div><div style={{ fontFamily:"'Space Mono',monospace",fontSize:26,fontWeight:700,color:k.c }}>{k.v}</div><div style={{ fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginTop:3 }}>{k.l}</div></div>))}
          </div>
          <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginBottom:18 }}><div style={{ fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:6 }}>Ocupação</div><div style={{ background:"#E0D5C7",borderRadius:5,height:22,overflow:"hidden",position:"relative" }}><div style={{ height:"100%",borderRadius:5,transition:"width .5s",width:`${Math.min(taxaOcupacao,100)}%`,background:taxaOcupacao>80?`linear-gradient(90deg,${C.warning},${C.danger})`:`linear-gradient(90deg,${C.accent},#8B2D47)` }}/><div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:600,fontSize:11,color:"#fff",color:"#fff" }}>{emTreino.length}/{capacidade}</div></div></div>
          <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden" }}>
            <div style={{ fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1,padding:"10px 12px 0" }}>Ranking por Personal</div>
            <table style={{ width:"100%",borderCollapse:"collapse",marginTop:6 }}><thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>{["Personal","Atend.","Média","Treino"].map((h,i)=>(<th key={i} style={{ padding:"7px 10px",fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1,fontWeight:600,textAlign:i===0?"left":"center" }}>{h}</th>))}</tr></thead><tbody>
              {personals.filter(p=>personalStats[p]?.total>0).sort((a,b)=>personalStats[b].total-personalStats[a].total).map((p,i)=>{const s=personalStats[p];const avg=s.duracoes.length?Math.round(s.duracoes.reduce((a,b)=>a+b,0)/s.duracoes.length):"—";return(<tr key={p} style={{ borderBottom:`1px solid ${C.border}22`,background:i%2===0?"transparent":C.bg+"44" }}><td style={{ padding:"9px 10px",fontSize:13,fontWeight:500 }}>{p}</td><td style={{ padding:"9px 10px",textAlign:"center",fontFamily:"'Space Mono',monospace",fontWeight:600,color:C.accent }}>{s.total}</td><td style={{ padding:"9px 10px",textAlign:"center",fontFamily:"'Space Mono',monospace",color:C.dim }}>{avg}</td><td style={{ padding:"9px 10px",textAlign:"center" }}>{s.emTreino>0?<span style={{ background:C.successDim,color:C.success,padding:"2px 10px",borderRadius:12,fontSize:11,fontWeight:600 }}>{s.emTreino}</span>:"—"}</td></tr>);})}
              {personals.every(p=>!personalStats[p]?.total)&&<tr><td colSpan={4} style={{ padding:28,textAlign:"center",color:C.dim }}>Nenhum atendimento</td></tr>}
            </tbody></table>
          </div>
        </div>)}

        {/* ═══ CONFIG ═══ */}
        {tab===TABS.CONFIG && (<div>
          <div style={{ fontSize:16,fontWeight:600,marginBottom:20,color:C.accent }}>⚙️ Configurações</div>

          {/* Personal Trainers */}
          <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:16 }}>
            <div style={{ fontSize:12,color:C.dim,textTransform:"uppercase",letterSpacing:1,fontWeight:600,marginBottom:12 }}>Personal Trainers ({personals.length})</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:12 }}>
              {personals.map(p=>(
                <div key={p} style={{ background:"#E0D5C7",border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 10px",fontSize:13,display:"flex",alignItems:"center",gap:6 }}>
                  <span>{p}</span>
                  <button onClick={()=>removePersonal(p)} style={{ background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0,lineHeight:1,opacity:.6 }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <input value={newPersonal} onChange={e=>setNewPersonal(e.target.value)} placeholder="Nome do novo personal..." style={{...inputStyle,flex:1}} onKeyDown={e=>e.key==="Enter"&&addPersonal()} />
              <button onClick={addPersonal} style={{ padding:"10px 18px",border:"none",borderRadius:8,background:C.accent,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" }}>+ Adicionar</button>
            </div>
          </div>

          {/* Áreas */}
          <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:16 }}>
            <div style={{ fontSize:12,color:C.dim,textTransform:"uppercase",letterSpacing:1,fontWeight:600,marginBottom:12 }}>Áreas ({areas.length})</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:12 }}>
              {areas.map(a=>(
                <div key={a} style={{ background:"#E0D5C7",border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 10px",fontSize:13,display:"flex",alignItems:"center",gap:6 }}>
                  <span>{a}</span>
                  <button onClick={()=>removeArea(a)} style={{ background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14,padding:0,lineHeight:1,opacity:.6 }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <input value={newArea} onChange={e=>setNewArea(e.target.value)} placeholder="Nome da nova área..." style={{...inputStyle,flex:1}} onKeyDown={e=>e.key==="Enter"&&addArea()} />
              <button onClick={addArea} style={{ padding:"10px 18px",border:"none",borderRadius:8,background:C.accent,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" }}>+ Adicionar</button>
            </div>
          </div>

          {/* Info */}
          <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18 }}>
            <div style={{ fontSize:12,color:C.dim,textTransform:"uppercase",letterSpacing:1,fontWeight:600,marginBottom:12 }}>Informações</div>
            <div style={{ fontSize:13,color:C.dim,lineHeight:1.8 }}>
              <div>🔗 API: <span style={{color:connected?C.success:C.danger}}>{connected?"Conectada":"Desconectada"}</span></div>
              <div>🔐 Login: <span style={{color:C.success}}>{user ? `${user.displayName||fromFakeEmail(user.email)}` : "Firebase"}</span></div>
              <div>📅 Data: {todayKey()}</div>
              <div>📊 Registros hoje: {allNamed.length}</div>
            </div>
          </div>
        </div>)}

      </div>
    </div>
  );
}
