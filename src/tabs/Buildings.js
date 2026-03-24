import { useState } from 'react';
import { supabase } from '../supabaseClient';

const BUILDINGS = [
  { id:'mine',            name:'Mine',               icon:'⛏️', cost:1000,  domain:'Ressources',      effect:'+Fer, Charbon, Cuivre /tick',    cat:'production' },
  { id:'oil_refinery',    name:'Raffinerie pétrole',  icon:'🛢️', cost:3000,  domain:'Économie',        effect:'+Pétrole, Plastique /tick',      cat:'production' },
  { id:'wood_factory',    name:'Usine de bois',       icon:'🪵', cost:1500,  domain:'Ressources',      effect:'+Bois /tick',                    cat:'production' },
  { id:'factory',         name:'Usine industrielle',  icon:'🏭', cost:2000,  domain:'Économie',        effect:'+Pièces, Moteurs, Alu. /tick',   cat:'production' },
  { id:'concrete',        name:'Usine de béton',      icon:'🏗️', cost:2000,  domain:'Infrastructure',  effect:'+Ciment /tick',                  cat:'production' },
  { id:'nuclear',         name:'Centrale nucléaire',  icon:'☢️', cost:8000,  domain:'Énergie',         effect:'+Énergie +500/h',                cat:'energy' },
  { id:'wind',            name:'Parc éolien',         icon:'🌬️', cost:1500,  domain:'Environnement',   effect:'+Énergie +100/h · Vert',         cat:'energy' },
  { id:'hydraulic',       name:'Barrage hydraulique', icon:'💧', cost:4000,  domain:'Énergie',         effect:'+Énergie +300/h',                cat:'energy' },
  { id:'thermal',         name:'Centrale thermique',  icon:'🔥', cost:2500,  domain:'Énergie',         effect:'+Énergie +200/h',                cat:'energy' },
  { id:'energy_storage',  name:'Stockage électrique', icon:'🔋', cost:2500,  domain:'Énergie',         effect:'Stabilise le réseau',            cat:'energy' },
  { id:'hospital',        name:'Hôpital',             icon:'🏥', cost:3000,  domain:'Santé +10%',      effect:'Population en meilleure santé',  cat:'social' },
  { id:'school',          name:'École',               icon:'🏫', cost:1500,  domain:'Éducation +5%',   effect:'Améliore le niveau d\'éducation',cat:'social' },
  { id:'college',         name:'Lycée',               icon:'📚', cost:2000,  domain:'Éducation +8%',   effect:'Prépare aux études supérieures', cat:'social' },
  { id:'university',      name:'Université',          icon:'🎓', cost:4000,  domain:'Éducation +15%',  effect:'+Recherche & Tech.',             cat:'social' },
  { id:'police',          name:'Commissariat',        icon:'🚔', cost:1500,  domain:'Sécurité +10%',   effect:'Réduit la criminalité',          cat:'social' },
  { id:'media_center',    name:'Media Center',        icon:'📺', cost:3000,  domain:'Popularité +10%', effect:'Contrôle de l\'opinion',         cat:'social' },
  { id:'roads',           name:'Réseau routier',      icon:'🛣️', cost:2000,  domain:'Infrastructure',  effect:'+Mobilité & commerce',           cat:'infra' },
  { id:'port',            name:'Port commercial',     icon:'⚓', cost:5000,  domain:'Économie +10%',   effect:'+Commerce · +Or /tick',          cat:'infra' },
  { id:'airport',         name:'Aéroport civil',      icon:'✈️', cost:7000,  domain:'Infrastructure',  effect:'+Mobilité · +Diplomatie',        cat:'infra' },
  { id:'army_base',       name:'Base militaire',      icon:'🪖', cost:5000,  domain:'Militaire +15%',  effect:'+Production soldats',            cat:'military' },
  { id:'naval_base',      name:'Base navale',         icon:'⚓', cost:6000,  domain:'Militaire +15%',  effect:'+Flotte navale',                 cat:'military' },
  { id:'research_center', name:'Centre de recherche', icon:'🔬', cost:5000,  domain:'Recherche +20%',  effect:'+Microcomposants /tick',         cat:'research' },
  { id:'lab',             name:'Labo haute techno.',  icon:'⚗️', cost:8000,  domain:'Recherche +25%',  effect:'+Chips, Médicaments /tick',      cat:'research' },
  { id:'space_center',    name:'Centre spatial',      icon:'🚀', cost:20000, domain:'Spatial +30%',    effect:'Débloque armée spatiale',        cat:'research' },
  { id:'data_center',     name:'Centre de données',   icon:'💾', cost:7000,  domain:'Cyber +20%',      effect:'Protection cyber · +R&D',        cat:'research' },
  { id:'central_bank',    name:'Banque centrale',     icon:'🏦', cost:10000, domain:'Économie +20%',   effect:'+Stabilité · +Or /tick',         cat:'economy' },
  { id:'parliament',      name:'Parlement',           icon:'🏛️', cost:15000, domain:'Diplomatie +15%', effect:'Débloque toutes les lois',       cat:'economy' },
];

const CATS = [
  { id:'all',       label:'Tous' },
  { id:'production',label:'🏭 Production' },
  { id:'energy',    label:'⚡ Énergie' },
  { id:'social',    label:'👥 Social' },
  { id:'infra',     label:'🛣️ Infrastructure' },
  { id:'military',  label:'⚔️ Militaire' },
  { id:'research',  label:'🔬 Recherche' },
  { id:'economy',   label:'💰 Économie' },
];

export default function Buildings({ country, updateCountry }) {
  const [cat, setCat] = useState('all');
  const [building, setBuilding] = useState(null);
  const [msg, setMsg] = useState('');

  const owned = Array.isArray(country.buildings) ? country.buildings : [];
  const filtered = cat === 'all' ? BUILDINGS : BUILDINGS.filter(b => b.cat === cat);

  function countOwned(id) { return owned.filter(b => b === id).length; }

  async function build(b) {
    if ((country.money || 0) < b.cost) {
      setMsg(`❌ Fonds insuffisants. Besoin : ${b.cost.toLocaleString()}$`);
      return;
    }
    setBuilding(b.id); setMsg('');
    const newMoney = (country.money || 0) - b.cost;
    const newBuildings = [...owned, b.id];
    await supabase.from('countries').update({ money: Math.floor(newMoney), buildings: newBuildings }).eq('id', country.id);
    updateCountry({ money: Math.floor(newMoney), buildings: newBuildings });
    setMsg(`✅ ${b.name} construit !`);
    setBuilding(null);
  }

  const totalBuilt = owned.length;
  const totalInvested = owned.reduce((s, id) => s + (BUILDINGS.find(b => b.id === id)?.cost || 0), 0);

  return (
    <div style={s.page}>
      <div style={s.topRow}>
        <div style={s.stat}><span style={s.statV}>{totalBuilt}</span><span style={s.statL}>Bâtiments construits</span></div>
        <div style={s.stat}><span style={{ ...s.statV, color:'#f39c12' }}>{totalInvested.toLocaleString()}$</span><span style={s.statL}>Total investi</span></div>
        <div style={s.stat}><span style={{ ...s.statV, color:'#f39c12' }}>{Math.floor(country.money??0).toLocaleString()}$</span><span style={s.statL}>Trésorerie disponible</span></div>
      </div>

      {msg && <div style={{ ...s.msg, ...(msg.startsWith('✅')?s.msgOk:s.msgErr) }}>{msg}</div>}

      <div style={s.cats}>
        {CATS.map(c => (
          <button key={c.id} style={{ ...s.catBtn, ...(cat===c.id?s.catOn:{}) }} onClick={() => { setCat(c.id); setMsg(''); }}>{c.label}</button>
        ))}
      </div>

      <div style={s.grid}>
        {filtered.map(b => {
          const n = countOwned(b.id);
          const canAfford = (country.money || 0) >= b.cost;
          return (
            <div key={b.id} style={{ ...s.card, ...(n>0?s.cardOwned:{}) }}>
              <div style={s.cardTop}>
                <span style={s.bIcon}>{b.icon}</span>
                <div style={s.bInfo}>
                  <div style={s.bName}>{b.name}</div>
                  <div style={s.bDomain}>{b.domain}</div>
                </div>
                {n > 0 && <div style={s.badge}>×{n}</div>}
              </div>
              <div style={s.effect}>{b.effect}</div>
              <div style={s.cardFoot}>
                <div style={{ ...s.price, color:canAfford?'#f39c12':'#e94560' }}>
                  💰 {b.cost.toLocaleString()}$
                </div>
                <button
                  style={{ ...s.buildBtn, background:canAfford?'linear-gradient(135deg,#4a90e2,#357abd)':'rgba(255,255,255,0.07)', opacity:building?0.6:1 }}
                  onClick={() => build(b)}
                  disabled={!!building || !canAfford}
                >
                  {building===b.id ? '⏳...' : canAfford ? '🏗️ Construire' : '❌ Fonds'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  page:    { padding:'20px', display:'flex', flexDirection:'column', gap:'14px' },
  topRow:  { display:'flex', gap:'12px' },
  stat:    { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'12px 18px', display:'flex', flexDirection:'column', gap:'2px' },
  statV:   { fontSize:'20px', fontWeight:'800', color:'#2ed573' },
  statL:   { fontSize:'11px', color:'#8892b0' },
  msg:     { padding:'10px 14px', borderRadius:'8px', fontSize:'13px' },
  msgOk:   { background:'rgba(46,213,115,0.12)', border:'1px solid rgba(46,213,115,0.25)', color:'#2ed573' },
  msgErr:  { background:'rgba(233,69,96,0.12)', border:'1px solid rgba(233,69,96,0.25)', color:'#e94560' },
  cats:    { display:'flex', gap:'8px', flexWrap:'wrap' },
  catBtn:  { padding:'7px 16px', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.03)', color:'#8892b0', borderRadius:'20px', cursor:'pointer', fontSize:'13px', fontWeight:'500', transition:'all 0.15s' },
  catOn:   { background:'rgba(74,144,226,0.18)', color:'#4a90e2', borderColor:'rgba(74,144,226,0.4)' },
  grid:    { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:'12px' },
  card:    { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'14px', display:'flex', flexDirection:'column', gap:'10px', transition:'border-color 0.2s' },
  cardOwned:{ borderColor:'rgba(46,213,115,0.25)', background:'rgba(46,213,115,0.04)' },
  cardTop: { display:'flex', alignItems:'flex-start', gap:'10px' },
  bIcon:   { fontSize:'26px', flexShrink:0 },
  bInfo:   { flex:1 },
  bName:   { fontSize:'14px', fontWeight:'700', color:'#e8eaf6', marginBottom:'2px' },
  bDomain: { fontSize:'11px', color:'#4a90e2', fontWeight:'600' },
  badge:   { background:'rgba(46,213,115,0.2)', color:'#2ed573', fontSize:'13px', fontWeight:'800', padding:'3px 8px', borderRadius:'6px', flexShrink:0 },
  effect:  { fontSize:'12px', color:'#8892b0', lineHeight:1.5, flex:1 },
  cardFoot:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', marginTop:'auto' },
  price:   { fontSize:'14px', fontWeight:'700' },
  buildBtn:{ padding:'8px 14px', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer', whiteSpace:'nowrap' },
};
