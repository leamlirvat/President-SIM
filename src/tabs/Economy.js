import { supabase } from '../supabaseClient';

const RESOURCES = [
  { id:'food',       name:'Nourriture',       icon:'🌾', color:'#27ae60', category:'base' },
  { id:'water',      name:'Eau',              icon:'💧', color:'#3498db', category:'base' },
  { id:'oil',        name:'Pétrole',          icon:'🛢️', color:'#2c3e50', category:'energie' },
  { id:'gas',        name:'Gaz naturel',      icon:'🔥', color:'#e67e22', category:'energie' },
  { id:'coal',       name:'Charbon',          icon:'⬛', color:'#7f8c8d', category:'energie' },
  { id:'uranium',    name:'Uranium',          icon:'☢️', color:'#2ecc71', category:'energie' },
  { id:'iron',       name:'Fer',              icon:'⚙️', color:'#95a5a6', category:'materiaux' },
  { id:'copper',     name:'Cuivre',           icon:'🟤', color:'#c0392b', category:'materiaux' },
  { id:'aluminum',   name:'Aluminium',        icon:'🔳', color:'#bdc3c7', category:'materiaux' },
  { id:'gold',       name:'Or',              icon:'🥇', color:'#f39c12', category:'metaux' },
  { id:'wood',       name:'Bois',            icon:'🪵', color:'#8d6e63', category:'base' },
  { id:'cement',     name:'Ciment',          icon:'🏗️', color:'#b0bec5', category:'materiaux' },
  { id:'glass',      name:'Verre',           icon:'🔮', color:'#81ecec', category:'materiaux' },
  { id:'plastic',    name:'Plastique',        icon:'🧪', color:'#74b9ff', category:'chimie' },
  { id:'fertilizer', name:'Engrais',         icon:'🌱', color:'#55efc4', category:'chimie' },
  { id:'engines',    name:'Moteurs',         icon:'🔧', color:'#e17055', category:'industrie' },
  { id:'parts',      name:'Pièces méca.',    icon:'🔩', color:'#a29bfe', category:'industrie' },
  { id:'tnt',        name:'Poudre TNT',      icon:'💥', color:'#d63031', category:'militaire' },
  { id:'ammo',       name:'Munitions',       icon:'🔫', color:'#636e72', category:'militaire' },
  { id:'chips',      name:'Microcomposants', icon:'💾', color:'#6c5ce7', category:'tech' },
  { id:'meds',       name:'Médicaments',     icon:'💊', color:'#fd79a8', category:'tech' },
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

const CATS = { base:'🌿 Matières premières', energie:'⚡ Énergie', materiaux:'🔩 Matériaux', metaux:'🥇 Métaux précieux', chimie:'⚗️ Chimie', industrie:'🏭 Industrie', militaire:'⚔️ Militaire', tech:'💻 Technologie' };

export default function Economy({ country, updateCountry, tileCount, dailyInc, dailyExp }) {
  const buildings = Array.isArray(country.buildings) ? country.buildings : [];
  const resources  = country.resources || {};
  const policies   = country.policies  || {};
  const gdp        = country.gdp       || 1600;

  const taxRate  = policies.tax_rate ?? 25;
  const soldiers = country.soldiers || 0;

  // PIB par jour de jeu (1 jour = 2 secondes réelles)
  const gdpPerDay    = Math.round(gdp / 365);
  const taxPerDay    = Math.round(gdp * (taxRate/100) / 365);
  const armyCostDay  = Math.round(soldiers * 0.1 / 365);
  const bldCostDay   = Math.round(buildings.length * 50 / 365);
  const netDay       = taxPerDay - armyCostDay - bldCostDay;

  // PIB par année de jeu (365 jours × 2s = 730 secondes réelles = ~12 minutes)
  const gdpGrowthRate = ((0.03 + tileCount*0.0002 + buildings.length*0.001) * 100).toFixed(2);

  // Production par tick (30s) depuis les bâtiments
  function getProd(resId) {
    let total = 0;
    buildings.forEach(bId => { total += BUILDING_PROD[bId]?.[resId] || 0; });
    return total;
  }

  // Grouper par catégorie
  const bycat = {};
  RESOURCES.forEach(r => {
    if (!bycat[r.category]) bycat[r.category] = [];
    bycat[r.category].push(r);
  });

  return (
    <div style={s.page}>
      {/* ─── PIB et flux ─── */}
      <div style={s.section}>
        <div style={s.sH}>📈 PIB et flux financiers</div>
        <div style={s.gdpRow}>
          <div style={s.gdpCard}>
            <div style={s.gdpIcon}>📈</div>
            <div style={{...s.gdpVal, color:'#2ed573'}}>{Math.floor(gdp).toLocaleString()}$</div>
            <div style={s.gdpLbl}>PIB annuel</div>
          </div>
          <div style={s.gdpCard}>
            <div style={s.gdpIcon}>💵</div>
            <div style={{...s.gdpVal, color:'#f39c12'}}>{gdpPerDay.toLocaleString()}$/jr</div>
            <div style={s.gdpLbl}>Production / jour</div>
          </div>
          <div style={s.gdpCard}>
            <div style={s.gdpIcon}>📊</div>
            <div style={{...s.gdpVal, color:'#4a90e2'}}>+{gdpGrowthRate}%</div>
            <div style={s.gdpLbl}>Croissance annuelle</div>
          </div>
          <div style={s.gdpCard}>
            <div style={s.gdpIcon}>💰</div>
            <div style={{...s.gdpVal, color: netDay>=0?'#2ed573':'#e94560'}}>
              {netDay>=0?'+':''}{netDay.toLocaleString()}$/jr
            </div>
            <div style={s.gdpLbl}>Balance nette/jour</div>
          </div>
        </div>
      </div>

      {/* ─── Budget détaillé ─── */}
      <div style={s.section}>
        <div style={s.sH}>💳 Budget détaillé (par jour de jeu = 2 secondes réelles)</div>
        <div style={s.budgetTable}>
          <BudgetLine label={`💰 Impôts (${taxRate}% du PIB)`} val={`+${taxPerDay.toLocaleString()}$`} c="#2ed573" note={`${taxRate}% × ${Math.floor(gdp).toLocaleString()} / 365`}/>
          <BudgetLine label={`⚔️ Armée (${soldiers} soldats)`} val={`-${armyCostDay}$`} c="#e94560" note="$0.10/soldat/an"/>
          <BudgetLine label={`🏗️ Bâtiments (${buildings.length})`} val={`-${bldCostDay}$`} c="#e94560" note="$50/bâtiment/an"/>
          <BudgetLine label="🗺️ Production territoire" val={`+${tileCount} soldats/30s`} c="#9b59b6" note={`${tileCount} case${tileCount>1?'s':''}`}/>
          <div style={s.budgetTotal}>
            <span style={{color:'#e8eaf6',fontWeight:'800',fontSize:'15px'}}>Résultat quotidien</span>
            <span style={{fontSize:'20px',fontWeight:'800',color:netDay>=0?'#2ed573':'#e94560'}}>
              {netDay>=0?'+':''}{netDay.toLocaleString()}$ / jour
            </span>
          </div>
          {netDay < 0 && (
            <div style={s.warnBox}>⚠️ Tu es en déficit ! Augmente tes impôts ou construis davantage.</div>
          )}
        </div>
      </div>

      {/* ─── Ressources ─── */}
      <div style={s.section}>
        <div style={s.sH}>📦 Ressources naturelles ({RESOURCES.length} types)</div>
        {Object.entries(CATS).map(([catId, catName]) => {
          const items = bycat[catId] || [];
          return (
            <div key={catId} style={{marginBottom:'14px'}}>
              <div style={s.catLabel}>{catName}</div>
              <div style={s.resGrid}>
                {items.map(r => {
                  const amt  = resources[r.id] || 0;
                  const prod = getProd(r.id);
                  return (
                    <div key={r.id} style={{...s.resCard, borderColor:`${r.color}25`}}>
                      <div style={s.resTop}>
                        <span style={{fontSize:'20px'}}>{r.icon}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'11px',color:'#8892b0',marginBottom:'1px'}}>{r.name}</div>
                          <div style={{...s.resAmt, color:r.color}}>{Math.floor(amt).toLocaleString()}</div>
                        </div>
                        {prod > 0 && <div style={s.prodTag}>+{prod}/tick</div>}
                      </div>
                      <div style={s.resBar}>
                        <div style={{height:'100%',width:`${Math.min(100,(amt/Math.max(amt,2000))*100)}%`,background:r.color,opacity:0.7,borderRadius:'2px'}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {buildings.length === 0 && (
          <div style={s.hint}>💡 Construis des mines, raffineries et usines dans l'onglet Bâtiments pour produire des ressources toutes les 30 secondes.</div>
        )}
      </div>
    </div>
  );
}

function BudgetLine({ label, val, c, note }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
      <div>
        <div style={{fontSize:'13px',fontWeight:'600',color:'#e8eaf6'}}>{label}</div>
        {note && <div style={{fontSize:'11px',color:'#4a5568',marginTop:'1px'}}>{note}</div>}
      </div>
      <span style={{fontSize:'15px',fontWeight:'700',color:c}}>{val}</span>
    </div>
  );
}

const s = {
  page:       { padding:'20px', display:'flex', flexDirection:'column', gap:'16px', maxWidth:'1200px' },
  section:    { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'18px' },
  sH:         { fontSize:'12px', fontWeight:'700', color:'#8892b0', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'14px' },
  gdpRow:     { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px' },
  gdpCard:    { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'14px', textAlign:'center' },
  gdpIcon:    { fontSize:'20px', marginBottom:'5px' },
  gdpVal:     { fontSize:'20px', fontWeight:'800', lineHeight:1, marginBottom:'4px' },
  gdpLbl:     { fontSize:'11px', color:'#8892b0' },
  budgetTable:{ display:'flex', flexDirection:'column', gap:'0' },
  budgetTotal:{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'14px', marginTop:'6px', borderTop:'1px solid rgba(255,255,255,0.1)' },
  warnBox:    { padding:'10px 14px', background:'rgba(233,69,96,0.1)', border:'1px solid rgba(233,69,96,0.25)', borderRadius:'8px', color:'#e94560', fontSize:'13px', marginTop:'10px' },
  catLabel:   { fontSize:'12px', fontWeight:'700', color:'#8892b0', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.4px' },
  resGrid:    { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:'8px' },
  resCard:    { background:'rgba(255,255,255,0.03)', border:'1px solid', borderRadius:'10px', padding:'10px' },
  resTop:     { display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'6px' },
  resAmt:     { fontSize:'16px', fontWeight:'800', lineHeight:1 },
  prodTag:    { fontSize:'10px', fontWeight:'700', background:'rgba(46,213,115,0.15)', color:'#2ed573', padding:'2px 5px', borderRadius:'4px', whiteSpace:'nowrap', flexShrink:0 },
  resBar:     { height:'3px', background:'rgba(255,255,255,0.07)', borderRadius:'2px', overflow:'hidden' },
  hint:       { marginTop:'10px', padding:'12px 14px', background:'rgba(74,144,226,0.07)', border:'1px solid rgba(74,144,226,0.15)', borderRadius:'8px', color:'#8892b0', fontSize:'13px' },
};
