import { useState } from 'react';
import { supabase } from '../supabaseClient';

const BRANCHES = [
  { id:'land',    name:'Armée de terre',      icon:'🪖', color:'#e94560',
    units:[
      { id:'infantry', name:'Infanterie',      icon:'👤', cost:10,    time:'5 min',  desc:'Unité de base polyvalente' },
      { id:'tank',     name:'Char blindé',     icon:'🛡️', cost:800,   time:'2h',     desc:'Puissance de feu lourde' },
      { id:'artillery',name:'Artillerie',      icon:'💥', cost:500,   time:'1h',     desc:'Attaque à longue portée' },
    ]
  },
  { id:'air',     name:'Armée de l\'air',     icon:'✈️', color:'#4a90e2',
    units:[
      { id:'fighter',  name:'Avion de chasse', icon:'🛩️', cost:3000,  time:'4h',     desc:'Supériorité aérienne' },
      { id:'bomber',   name:'Bombardier',      icon:'💣', cost:5000,  time:'6h',     desc:'Frappe terrestre massive' },
      { id:'drone',    name:'Drone',           icon:'🚁', cost:800,   time:'1h',     desc:'Reconnaissance et attaque' },
    ]
  },
  { id:'naval',   name:'Marine',              icon:'⚓', color:'#1abc9c',
    units:[
      { id:'frigate',  name:'Frégate',         icon:'🚢', cost:8000,  time:'8h',     desc:'Navire de combat' },
      { id:'submarine',name:'Sous-marin',      icon:'🌊', cost:12000, time:'12h',    desc:'Attaque furtive' },
      { id:'carrier',  name:'Porte-avions',    icon:'⛵', cost:30000, time:'48h',    desc:'Puissance de projection' },
    ]
  },
  { id:'special', name:'Forces spéciales',    icon:'🎯', color:'#9b59b6',
    units:[
      { id:'spec_ops', name:'Ops spéciales',   icon:'🥷', cost:2000,  time:'3h',     desc:'Missions secrètes' },
    ]
  },
  { id:'defense', name:'Défense AA',          icon:'🛡️', color:'#f39c12',
    units:[
      { id:'aa_missile',name:'Batterie AA',    icon:'🎯', cost:3000,  time:'4h',     desc:'Protège contre les frappes aériennes' },
    ]
  },
  { id:'cyber',   name:'Cyberarmée',          icon:'💻', color:'#00b894',
    units:[
      { id:'hacker',   name:'Hackers',         icon:'💾', cost:1500,  time:'2h',     desc:'Attaque & défense numérique' },
    ]
  },
  { id:'space',   name:'Armée spatiale',      icon:'🚀', color:'#e67e22',
    units:[
      { id:'spy_sat',  name:'Satellite espion',icon:'🛰️', cost:15000, time:'12h',    desc:'Renseignement global' },
      { id:'comm_sat', name:'Satellite comm.',  icon:'📡', cost:12000, time:'10h',    desc:'Communications sécurisées' },
    ]
  },
];

export default function Military({ country, updateCountry }) {
  const [activeBranch, setActiveBranch] = useState('land');
  const [recruiting, setRecruiting] = useState(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');

  const units = country.military_units || {};
  const branch = BRANCHES.find(b => b.id === activeBranch);

  function totalUnitsForBranch(bId) {
    const br = BRANCHES.find(b => b.id === bId);
    return (br?.units || []).reduce((s, u) => s + (units[u.id] || 0), 0);
  }

  async function recruit(unit) {
    const totalCost = unit.cost * qty;
    if ((country.money || 0) < totalCost) {
      setMsg(`❌ Pas assez d'argent. Besoin : ${totalCost.toLocaleString()}$`);
      return;
    }
    setMsg('');
    setRecruiting(unit.id);
    const newMoney = (country.money || 0) - totalCost;
    const newUnits = { ...units, [unit.id]: (units[unit.id] || 0) + qty };
    await supabase.from('countries').update({ money: Math.floor(newMoney), military_units: newUnits }).eq('id', country.id);
    updateCountry({ money: Math.floor(newMoney), military_units: newUnits });
    setMsg(`✅ ${qty} ${unit.name} recrutés avec succès !`);
    setRecruiting(null);
  }

  return (
    <div style={s.page}>
      {/* Résumé */}
      <div style={s.summary}>
        <div style={s.sumCard}>
          <div style={s.sumIcon}>⚔️</div>
          <div style={{ ...s.sumVal, color:'#e94560' }}>{(country.soldiers||0).toLocaleString()}</div>
          <div style={s.sumLbl}>Soldats (carte)</div>
        </div>
        <div style={s.sumCard}>
          <div style={s.sumIcon}>🔭</div>
          <div style={{ ...s.sumVal, color:'#4a90e2' }}>{(country.scouts||0).toLocaleString()}</div>
          <div style={s.sumLbl}>Éclaireurs</div>
        </div>
        {BRANCHES.map(b => {
          const total = totalUnitsForBranch(b.id);
          if (total === 0) return null;
          return (
            <div key={b.id} style={s.sumCard}>
              <div style={s.sumIcon}>{b.icon}</div>
              <div style={{ ...s.sumVal, color:b.color }}>{total}</div>
              <div style={s.sumLbl}>{b.name}</div>
            </div>
          );
        })}
      </div>

      <div style={s.main}>
        {/* Branches */}
        <div style={s.branchList}>
          {BRANCHES.map(b => (
            <button key={b.id}
              style={{ ...s.branchBtn, ...(activeBranch===b.id ? { ...s.branchBtnOn, boxShadow:`inset 3px 0 0 ${b.color}` } : {}) }}
              onClick={() => { setActiveBranch(b.id); setMsg(''); }}>
              <span style={s.branchIco}>{b.icon}</span>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
                <span style={s.branchName}>{b.name}</span>
                <span style={s.branchCount}>{totalUnitsForBranch(b.id)} unités</span>
              </div>
            </button>
          ))}
        </div>

        {/* Unités */}
        <div style={s.unitsArea}>
          <div style={{ ...s.branchHeader, color:branch?.color }}>
            {branch?.icon} {branch?.name}
          </div>
          {msg && <div style={{ ...s.msg, ...(msg.startsWith('✅') ? s.msgOk : s.msgErr) }}>{msg}</div>}
          <div style={s.qtyRow}>
            <span style={s.qtyLabel}>Quantité à recruter :</span>
            {[1,5,10,50].map(n => (
              <button key={n} style={{ ...s.qtyBtn, ...(qty===n?s.qtyBtnOn:{}) }} onClick={() => setQty(n)}>{n}</button>
            ))}
          </div>
          <div style={s.unitGrid}>
            {branch?.units.map(unit => {
              const owned = units[unit.id] || 0;
              const canAfford = (country.money || 0) >= unit.cost * qty;
              return (
                <div key={unit.id} style={s.unitCard}>
                  <div style={s.unitTop}>
                    <span style={s.unitIcon}>{unit.icon}</span>
                    <div style={s.unitInfo}>
                      <div style={s.unitName}>{unit.name}</div>
                      <div style={s.unitDesc}>{unit.desc}</div>
                    </div>
                    <div style={{ ...s.ownedBadge, background: owned>0?'rgba(46,213,115,0.15)':'rgba(255,255,255,0.05)', color: owned>0?'#2ed573':'#555' }}>
                      {owned} /{' '}{unit.id==='infantry'?'∞':unit.id.includes('carrier')?'2':'99'}
                    </div>
                  </div>
                  <div style={s.unitMeta}>
                    <span>💰 {(unit.cost * qty).toLocaleString()}$ ({qty}x)</span>
                    <span>⏱️ {unit.time}</span>
                  </div>
                  <button
                    style={{ ...s.recruitBtn, background:canAfford?`linear-gradient(135deg,${branch.color}cc,${branch.color})`:'rgba(255,255,255,0.07)', opacity:recruiting?0.6:1 }}
                    onClick={() => recruit(unit)}
                    disabled={!!recruiting || !canAfford}
                  >
                    {recruiting===unit.id ? '⏳ Recrutement...' : canAfford ? `🎯 Recruter ${qty}x` : '💰 Fonds insuffisants'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:        { padding:'20px', display:'flex', flexDirection:'column', gap:'16px', height:'100%', boxSizing:'border-box' },
  summary:     { display:'flex', gap:'10px', flexWrap:'wrap' },
  sumCard:     { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'12px 16px', textAlign:'center', minWidth:'100px' },
  sumIcon:     { fontSize:'20px', marginBottom:'4px' },
  sumVal:      { fontSize:'20px', fontWeight:'800', lineHeight:1 },
  sumLbl:      { fontSize:'11px', color:'#8892b0', marginTop:'3px' },
  main:        { display:'flex', gap:'16px', flex:1, minHeight:0 },
  branchList:  { width:'200px', flexShrink:0, display:'flex', flexDirection:'column', gap:'2px' },
  branchBtn:   { display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', border:'none', background:'rgba(255,255,255,0.02)', color:'#8892b0', cursor:'pointer', borderRadius:'8px', transition:'all 0.15s', textAlign:'left' },
  branchBtnOn: { background:'rgba(255,255,255,0.07)', color:'#e8eaf6' },
  branchIco:   { fontSize:'18px', flexShrink:0 },
  branchName:  { fontSize:'13px', fontWeight:'600' },
  branchCount: { fontSize:'11px', color:'#4a5568', marginTop:'1px' },
  unitsArea:   { flex:1, overflowY:'auto' },
  branchHeader:{ fontSize:'16px', fontWeight:'800', marginBottom:'14px' },
  msg:         { padding:'10px 14px', borderRadius:'8px', fontSize:'13px', marginBottom:'12px' },
  msgOk:       { background:'rgba(46,213,115,0.12)', border:'1px solid rgba(46,213,115,0.25)', color:'#2ed573' },
  msgErr:      { background:'rgba(233,69,96,0.12)', border:'1px solid rgba(233,69,96,0.25)', color:'#e94560' },
  qtyRow:      { display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' },
  qtyLabel:    { color:'#8892b0', fontSize:'13px', marginRight:'4px' },
  qtyBtn:      { padding:'6px 14px', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'#8892b0', borderRadius:'6px', cursor:'pointer', fontSize:'13px', fontWeight:'600' },
  qtyBtnOn:    { background:'rgba(74,144,226,0.2)', color:'#4a90e2', borderColor:'rgba(74,144,226,0.4)' },
  unitGrid:    { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'12px' },
  unitCard:    { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'14px', display:'flex', flexDirection:'column', gap:'10px' },
  unitTop:     { display:'flex', alignItems:'flex-start', gap:'12px' },
  unitIcon:    { fontSize:'28px', flexShrink:0 },
  unitInfo:    { flex:1 },
  unitName:    { fontSize:'14px', fontWeight:'700', color:'#e8eaf6', marginBottom:'3px' },
  unitDesc:    { fontSize:'12px', color:'#8892b0' },
  ownedBadge:  { padding:'4px 10px', borderRadius:'6px', fontSize:'12px', fontWeight:'700', flexShrink:0 },
  unitMeta:    { display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#8892b0' },
  recruitBtn:  { padding:'10px', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer' },
};
