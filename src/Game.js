import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import MapView from './MapView';
import Dashboard from './tabs/Dashboard';
import Economy from './tabs/Economy';
import Military from './tabs/Military';
import Buildings from './tabs/Buildings';
import Diplomacy from './tabs/Diplomacy';
import Politics from './tabs/Politics';
import Research from './tabs/Research';
import Tutorial from './Tutorial';

const toHex = (c) => !c ? '#4a90e2' : (c.startsWith('#') ? c : '#' + c.padStart(6, '0'));

const NAV = [
  { id:'map',       icon:'🗺️',  label:'Carte' },
  { id:'dashboard', icon:'📊',  label:'Vue d\'ensemble' },
  { id:'economy',   icon:'💰',  label:'Économie' },
  { id:'buildings', icon:'🏗️', label:'Bâtiments' },
  { id:'military',  icon:'⚔️', label:'Armée' },
  { id:'diplomacy', icon:'🤝',  label:'Diplomatie' },
  { id:'politics',  icon:'⚖️', label:'Politique' },
  { id:'research',  icon:'🔬',  label:'Recherche' },
];

const BUILDING_PROD = {
  mine:           { iron:10, coal:8, copper:5 },
  oil_refinery:   { oil:15, plastic:5 },
  wood_factory:   { wood:20 },
  factory:        { parts:5, engines:2, aluminum:3 },
  concrete:       { cement:15 },
  port:           { gold:3 },
  central_bank:   { gold:8 },
  lab:            { chips:5, meds:3 },
  research_center:{ chips:2 },
};

const RESEARCH_DOMAIN_IDS = ['tech','military','space','energy','medicine','agriculture','cyber','nuclear','logistics','materials'];
const RESEARCH_DOMAIN_MAX  = { tech:5, military:5, space:5, energy:4, medicine:4, agriculture:3, cyber:4, nuclear:3, logistics:3, materials:4 };

export default function Game({ country: init, setCountry: setAppCountry }) {
  const [country, setLocalCountry] = useState(init);
  const [tab, setTab]         = useState('map');
  const [sidebar, setSidebar] = useState(true);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('ps_tutorial_done'));
  const [tileCount, setTileCount] = useState(0);
  const [gameDay, setGameDay]     = useState(0);
  const [dayDisplay, setDayDisplay] = useState('Jour 1');

  // ─── Refs pour éviter les stale closures ────────────────────────────────
  const moneyRef    = useRef(init.money ?? 0);
  const gdpRef      = useRef(init.gdp ?? 1600);
  const tileRef     = useRef(0);
  const countryRef  = useRef(init);
  const gameDayRef  = useRef(0);
  const syncTimer   = useRef(0);
  const researchRef = useRef(init.research || {});
  const pendingResRef = useRef({});

  // Garde countryRef synchronisé avec l'état React
  useEffect(() => {
    countryRef.current = country;
  }, [country]);

  // ─── updateCountry : met à jour React state + refs ──────────────────────
  // CRITIQUE : on synchronise aussi moneyRef/gdpRef pour éviter que le tick
  // n'écrase les achats manuels (bâtiments, unités, recherche, politique)
  const updateCountry = useCallback((updates) => {
    setLocalCountry(prev => {
      const resolved = typeof updates === 'function' ? updates(prev) : updates;
      const next = { ...prev, ...resolved };
      setAppCountry(next);
      countryRef.current = next;
      // Synchroniser les refs de calcul avec tout changement manuel
      if ('money'    in resolved) moneyRef.current    = next.money    ?? moneyRef.current;
      if ('gdp'      in resolved) gdpRef.current      = next.gdp      ?? gdpRef.current;
      if ('research' in resolved) researchRef.current = next.research  || {};
      return next;
    });
  }, [setAppCountry]);

  // ─── Realtime : mises à jour du pays depuis d'autres onglets/joueurs ───
  useEffect(() => {
    const ch = supabase
      .channel(`country-rt-${country.id}`)
      .on('postgres_changes',
        { event:'UPDATE', schema:'public', table:'countries', filter:`id=eq.${country.id}` },
        payload => {
          // On exclut money/gdp (gérés localement par le tick)
          // mais on récupère tout le reste (policies, buildings, units, research…)
          const { money: _m, gdp: _g, ...rest } = payload.new;
          setLocalCountry(prev => ({ ...prev, ...rest }));
          if (payload.new.research) researchRef.current = payload.new.research;
        })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [country.id]);

  // ─── Chargement du nombre de cases possédées ────────────────────────────
  const loadTileCount = useCallback(async () => {
    const { count } = await supabase
      .from('tiles').select('*', { count:'exact', head:true })
      .eq('ownercountryid', country.id);
    const c = count || 0;
    setTileCount(c);
    tileRef.current = c;
  }, [country.id]);

  useEffect(() => { loadTileCount(); }, [loadTileCount]);

  // ─── TICK : 1 jour de jeu = 2 secondes réelles ──────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      const c  = countryRef.current;
      const tc = tileRef.current;
      const buildings = Array.isArray(c.buildings) ? c.buildings : [];
      const policies  = c.policies || {};
      const taxRate   = (policies.tax_rate ?? 25) / 100;

      const gdp   = gdpRef.current;
      const money = moneyRef.current;

      // Revenu journalier : PIB × taux d'imposition / 365
      const dailyIncome = (gdp / 365) * taxRate;

      // Dépenses journalières
      const armyExp     = (c.soldiers || 0) * 0.1 / 365;
      const buildingExp = buildings.length * 50 / 365;
      const netDaily    = dailyIncome - armyExp - buildingExp;

      // Croissance du PIB par jour
      const baseGrowth = (gdp * 0.03) / 365;
      const tileBonus  = tc * 0.5;
      const bldBonus   = buildings.length * 5;
      const eduBonus   = ((policies.education_budget ?? 12) / 100) * (gdp * 0.005) / 365;
      const gdpGrowth  = baseGrowth + tileBonus + bldBonus + eduBonus;

      moneyRef.current = money + netDaily;
      gdpRef.current   = gdp   + gdpGrowth;

      // Accumulation auto de recherche par jour
      const resBudgetPct = (policies.research_budget ?? 8) / 100;
      const ptsPerDayTotal = (gdp * resBudgetPct) / 365 / 10;
      if (ptsPerDayTotal > 0) {
        const ptsPerDomain = ptsPerDayTotal / RESEARCH_DOMAIN_IDS.length;
        RESEARCH_DOMAIN_IDS.forEach(domId => {
          const maxScore = (RESEARCH_DOMAIN_MAX[domId] || 5) * 1000;
          const current  = (researchRef.current[domId] || 0) + (pendingResRef.current[domId] || 0);
          if (current < maxScore) {
            pendingResRef.current[domId] = (pendingResRef.current[domId] || 0) + ptsPerDomain;
          }
        });
      }

      gameDayRef.current += 1;
      syncTimer.current  += 1;

      const day   = gameDayRef.current;
      const year  = Math.floor(day / 365) + 1;
      const month = Math.floor((day % 365) / 30) + 1;
      setGameDay(day);
      setDayDisplay(`An ${year} · Mois ${month}`);

      // Mise à jour de l'affichage React chaque tick
      setLocalCountry(prev => ({
        ...prev,
        money: Math.round(moneyRef.current),
        gdp:   Math.round(gdpRef.current),
      }));

      // Sync Supabase toutes les 5 jours de jeu (= 10 secondes réelles)
      if (syncTimer.current >= 5) {
        syncTimer.current = 0;

        // Appliquer les points de recherche en attente
        const newResearch = { ...researchRef.current };
        let researchChanged = false;
        Object.entries(pendingResRef.current).forEach(([domId, pts]) => {
          if (pts > 0) {
            const maxScore = (RESEARCH_DOMAIN_MAX[domId] || 5) * 1000;
            newResearch[domId] = Math.min(maxScore, (newResearch[domId] || 0) + pts);
            researchChanged = true;
          }
        });
        pendingResRef.current = {};

        if (researchChanged) {
          researchRef.current = newResearch;
          setLocalCountry(prev => ({ ...prev, research: newResearch }));
        }

        // Sauvegarde Supabase : money + gdp + research (si changé) + last_active
        supabase.from('countries').update({
          money:       Math.round(moneyRef.current),
          gdp:         Math.round(gdpRef.current),
          last_active: new Date().toISOString(),
          ...(researchChanged ? { research: newResearch } : {}),
        }).eq('id', c.id).then(() => {});
      }
    }, 2000);
    return () => clearInterval(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country.id]);

  // ─── PRODUCTION : soldats + ressources (toutes les 30 secondes) ─────────
  useEffect(() => {
    const prod = setInterval(async () => {
      const tc = tileRef.current;
      const { data: curr } = await supabase
        .from('countries')
        .select('soldiers, resources, buildings')
        .eq('id', country.id)
        .single();
      if (!curr) return;

      const buildings = Array.isArray(curr.buildings) ? curr.buildings : [];
      const resources = curr.resources || {};
      const newRes = { ...resources };

      buildings.forEach(bId => {
        const prod = BUILDING_PROD[bId] || {};
        Object.entries(prod).forEach(([res, amt]) => {
          newRes[res] = (newRes[res] || 0) + amt;
        });
      });

      // Soldats : +1 par case possédée toutes les 30s
      const newSoldiers = (curr.soldiers || 0) + Math.max(0, tc);

      await supabase.from('countries').update({
        soldiers:  newSoldiers,
        resources: newRes,
      }).eq('id', country.id);

      setLocalCountry(prev => ({ ...prev, soldiers: newSoldiers, resources: newRes }));
      await loadTileCount();
    }, 30000);
    return () => clearInterval(prod);
  }, [country.id, loadTileCount]);

  // ─── Réinitialisation des refs quand on change de compte ─────────────────
  useEffect(() => {
    moneyRef.current    = init.money    ?? 0;
    gdpRef.current      = init.gdp      ?? 1600;
    researchRef.current = init.research || {};
    pendingResRef.current = {};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country.id]);

  // ─── Déconnexion : sauvegarde tout avant de partir ───────────────────────
  async function logout() {
    const finalResearch = { ...researchRef.current };
    Object.entries(pendingResRef.current).forEach(([domId, pts]) => {
      if (pts > 0) {
        const maxScore = (RESEARCH_DOMAIN_MAX[domId] || 5) * 1000;
        finalResearch[domId] = Math.min(maxScore, (finalResearch[domId] || 0) + pts);
      }
    });
    await supabase.from('countries').update({
      money:       Math.round(moneyRef.current),
      gdp:         Math.round(gdpRef.current),
      research:    finalResearch,
      last_active: new Date().toISOString(),
    }).eq('id', country.id);
    await supabase.auth.signOut();
  }

  const color = toHex(country.color);
  const SERVER_NAMES = { 1:'Europe-1 • Normal', 2:'Monde-1 • Rapide', 3:'Asie-1 • Hardcore' };

  const policies = country.policies || {};
  const taxRate  = (policies.tax_rate ?? 25) / 100;
  const dailyInc = Math.round((country.gdp / 365) * taxRate);
  const dailyExp = Math.round(
    ((country.soldiers || 0) * 0.1 +
     (Array.isArray(country.buildings) ? country.buildings.length : 0) * 50) / 365
  );
  const dailyNet = dailyInc - dailyExp;

  const resBudgetPct = policies.research_budget ?? 8;
  const ptsPerDay    = Math.round((country.gdp * resBudgetPct / 100) / 365 / 10);

  return (
    <div style={s.root}>
      {showTutorial && (
        <Tutorial onClose={() => { localStorage.setItem('ps_tutorial_done','1'); setShowTutorial(false); }} />
      )}

      {/* ── Sidebar ── */}
      <aside style={{ ...s.sidebar, width: sidebar ? '224px' : '60px' }}>
        <div style={s.sHead} onClick={() => setSidebar(p => !p)}>
          <span style={s.sLogo}>🌍</span>
          {sidebar && <span style={s.sTitle}>President Sim</span>}
        </div>

        {sidebar && (
          <div style={{ ...s.badge, borderColor: color+'55', background: color+'0f' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }}/>
            <div style={{ overflow:'hidden', minWidth:0 }}>
              <div style={s.bName}>{country.name}</div>
              <div style={s.bSrv}>{SERVER_NAMES[country.serverid] || 'Serveur 1'}</div>
            </div>
          </div>
        )}

        {sidebar && (
          <div style={s.dateBox}>
            <span style={s.dateIcon}>📅</span>
            <div>
              <div style={s.dateVal}>{dayDisplay}</div>
              <div style={s.dateSub}>Jour {gameDay} de ton règne</div>
            </div>
          </div>
        )}

        {sidebar && ptsPerDay > 0 && (
          <div style={s.researchBox}>
            <span style={s.resIcon}>🔬</span>
            <div>
              <div style={s.resVal}>+{ptsPerDay} pts/jour</div>
              <div style={s.resSub}>Recherche auto</div>
            </div>
          </div>
        )}

        <nav style={s.nav}>
          {NAV.map(item => (
            <button key={item.id}
              style={{ ...s.nBtn, ...(tab===item.id ? { ...s.nBtnOn, boxShadow:`inset 3px 0 0 ${color}`, color:'#e8eaf6' } : {}) }}
              onClick={() => setTab(item.id)} title={item.label}>
              <span style={s.nIco}>{item.icon}</span>
              {sidebar && <span style={s.nLbl}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div style={s.sFoot}>
          {sidebar && (
            <div style={s.incomeBox}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'4px' }}>
                <span style={{ color:'#8892b0' }}>Revenu/jour</span>
                <span style={{ color: dailyNet>=0?'#2ed573':'#e94560', fontWeight:'700' }}>
                  {dailyNet>=0?'+':''}{dailyNet.toLocaleString()}$
                </span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px' }}>
                <span style={{ color:'#4a5568' }}>+{dailyInc}$ − {dailyExp}$</span>
                <span style={{ color:'#4a5568' }}>{tileCount} cases</span>
              </div>
            </div>
          )}
          <button style={s.nBtn} onClick={() => setShowTutorial(true)} title="Tutoriel">
            <span style={s.nIco}>❓</span>
            {sidebar && <span style={s.nLbl}>Tutoriel</span>}
          </button>
          <button style={s.nBtn} onClick={logout} title="Déconnexion">
            <span style={s.nIco}>🚪</span>
            {sidebar && <span style={s.nLbl}>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <div style={s.main}>
        <header style={s.topbar}>
          <h2 style={s.ptitle}>
            {NAV.find(n=>n.id===tab)?.icon} {NAV.find(n=>n.id===tab)?.label}
          </h2>
          <div style={s.chips}>
            <Chip icon="💰" v={fmt(country.money??0)+'$'}  lbl="Trésorerie" c={dailyNet>=0?'#f39c12':'#e94560'}/>
            <Chip icon="📈" v={fmt(country.gdp??0)+'$'}    lbl="PIB/an"     c="#2ed573"/>
            <Chip icon="⚔️" v={fmt(country.soldiers??0)}   lbl="Soldats"    c="#e94560"/>
            <Chip icon="🔭" v={fmt(country.scouts??0)}     lbl="Éclaireurs" c="#4a90e2"/>
            <Chip icon="🗺️" v={tileCount}                  lbl="Cases"      c="#9b59b6"/>
          </div>
        </header>

        <main style={s.content}>
          {tab==='map'       && <MapView country={country} updateCountry={updateCountry} onTileCapture={loadTileCount}/>}
          {tab==='dashboard' && <Dashboard country={country} tileCount={tileCount} gameDay={gameDay} dayDisplay={dayDisplay} dailyNet={dailyNet}/>}
          {tab==='economy'   && <Economy country={country} updateCountry={updateCountry} tileCount={tileCount} dailyInc={dailyInc} dailyExp={dailyExp}/>}
          {tab==='buildings' && <Buildings country={country} updateCountry={updateCountry}/>}
          {tab==='military'  && <Military country={country} updateCountry={updateCountry}/>}
          {tab==='diplomacy' && <Diplomacy country={country} updateCountry={updateCountry}/>}
          {tab==='politics'  && <Politics country={country} updateCountry={updateCountry} tileCount={tileCount}/>}
          {tab==='research'  && <Research country={country} updateCountry={updateCountry}/>}
        </main>
      </div>
    </div>
  );
}

function fmt(n) {
  const v = Math.floor(n);
  if (v >= 1e9) return (v/1e9).toFixed(1)+'G';
  if (v >= 1e6) return (v/1e6).toFixed(1)+'M';
  if (v >= 1e3) return (v/1e3).toFixed(1)+'k';
  return v.toLocaleString();
}

function Chip({ icon, v, lbl, c }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'5px 11px', background:'rgba(255,255,255,0.04)', border:`1px solid ${c}33`, borderRadius:'8px' }}>
      <span style={{ fontSize:'14px' }}>{icon}</span>
      <div>
        <div style={{ fontSize:'13px', fontWeight:'700', color:c, lineHeight:1 }}>{v}</div>
        <div style={{ fontSize:'10px', color:'#8892b0', marginTop:'1px' }}>{lbl}</div>
      </div>
    </div>
  );
}

const s = {
  root:        { display:'flex', height:'100vh', background:'#0d0f1a', overflow:'hidden', fontFamily:"'Inter',system-ui,sans-serif", color:'#e8eaf6' },
  sidebar:     { display:'flex', flexDirection:'column', background:'#0f1120', borderRight:'1px solid rgba(255,255,255,0.06)', transition:'width 0.22s', overflow:'hidden', flexShrink:0 },
  sHead:       { display:'flex', alignItems:'center', gap:'10px', padding:'14px', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.05)', userSelect:'none' },
  sLogo:       { fontSize:'20px', flexShrink:0 },
  sTitle:      { color:'#e8eaf6', fontWeight:'800', fontSize:'14px', flex:1, whiteSpace:'nowrap' },
  badge:       { margin:'10px', padding:'10px 12px', border:'1px solid', borderRadius:'10px', display:'flex', alignItems:'center', gap:'10px' },
  bName:       { color:'#e8eaf6', fontSize:'13px', fontWeight:'700', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  bSrv:        { color:'#8892b0', fontSize:'11px', marginTop:'1px' },
  dateBox:     { display:'flex', alignItems:'center', gap:'8px', margin:'0 10px 4px', padding:'8px 10px', background:'rgba(255,255,255,0.03)', borderRadius:'8px' },
  dateIcon:    { fontSize:'14px', flexShrink:0 },
  dateVal:     { color:'#e8eaf6', fontSize:'12px', fontWeight:'700' },
  dateSub:     { color:'#4a5568', fontSize:'10px', marginTop:'1px' },
  researchBox: { display:'flex', alignItems:'center', gap:'8px', margin:'0 10px 8px', padding:'7px 10px', background:'rgba(155,89,182,0.08)', border:'1px solid rgba(155,89,182,0.2)', borderRadius:'8px' },
  resIcon:     { fontSize:'13px', flexShrink:0 },
  resVal:      { color:'#9b59b6', fontSize:'12px', fontWeight:'700' },
  resSub:      { color:'#4a5568', fontSize:'10px' },
  nav:         { flex:1, padding:'8px', display:'flex', flexDirection:'column', gap:'2px', overflowY:'auto' },
  nBtn:        { display:'flex', alignItems:'center', gap:'10px', width:'100%', padding:'10px 12px', border:'none', background:'none', color:'#8892b0', cursor:'pointer', borderRadius:'8px', transition:'all 0.15s', whiteSpace:'nowrap', textAlign:'left' },
  nBtnOn:      { background:'rgba(255,255,255,0.07)' },
  nIco:        { fontSize:'17px', flexShrink:0, width:'20px', textAlign:'center' },
  nLbl:        { fontSize:'13px', fontWeight:'500' },
  sFoot:       { padding:'8px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', gap:'2px' },
  incomeBox:   { margin:'0 4px 8px', padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.05)' },
  main:        { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  topbar:      { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', height:'54px', background:'#0f1120', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 },
  ptitle:      { margin:0, fontSize:'15px', fontWeight:'700', color:'#e8eaf6' },
  chips:       { display:'flex', gap:'8px' },
  content:     { flex:1, overflow:'auto' },
};
