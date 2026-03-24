import { useState } from 'react';
import { supabase } from '../supabaseClient';

// ─── Politiques par défaut logiques ─────────────────────────────────────────
const DEFAULTS = {
  tax_rate:          25,   // % du PIB collecté comme impôts
  health_budget:     15,   // % du budget pour la santé
  education_budget:  12,   // % pour l'éducation
  military_budget:   20,   // % pour le militaire
  research_budget:    8,   // % pour la recherche
  social_budget:     10,   // % pour les aides sociales
  infrastructure:    10,   // % pour les infrastructures
  // Libertés civiles (booléens)
  free_press:       true,
  open_borders:     false,
  state_health:     true,
  free_education:   true,
  internet_freedom: true,
  democracy:        true,
  corruption_fight: true,
  nuclear_policy:   false,
  conscription:     false,
};

// Budget total = somme des postes de dépenses (doit être ≤ 100%)
const BUDGET_KEYS = ['health_budget','education_budget','military_budget','research_budget','social_budget','infrastructure'];

function calcEffects(p, tileCount, soldiers, buildings) {
  const bCount = Array.isArray(buildings) ? buildings.length : 0;
  const taxRate = p.tax_rate ?? 25;
  const totalBudget = BUDGET_KEYS.reduce((s,k) => s+(p[k]??0), 0);

  // Satisfaction (base 50%)
  let sat = 50;
  sat += (p.free_press      ? 8 : -6);
  sat += (p.state_health    ? 10 : -8);
  sat += (p.free_education  ? 8 : -6);
  sat += (p.internet_freedom? 5 : -4);
  sat += (p.democracy       ? 10 : -15);
  sat += (p.corruption_fight? 6 : -5);
  sat += (p.open_borders    ? 4 : 0);
  sat += (p.social_budget ?? 0) * 0.5;
  sat -= Math.max(0, taxRate - 30) * 0.8;
  sat -= (p.conscription    ? 5 : 0);
  sat = Math.max(0, Math.min(100, Math.round(sat)));

  // Éducation
  let edu = 20 + (p.education_budget ?? 0) * 1.2 + (p.free_education ? 10 : 0) + (p.internet_freedom ? 5 : 0);
  edu = Math.min(100, Math.round(edu));

  // Santé
  let health = 25 + (p.health_budget ?? 0) * 1.5 + (p.state_health ? 12 : 0);
  health = Math.min(100, Math.round(health));

  // Sécurité
  let security = 30 + (p.military_budget ?? 0) * 0.8 + (p.corruption_fight ? 10 : -5);
  security = Math.min(100, Math.round(security));

  // Croissance PIB (bonus %)
  let gdpBonus = 0;
  gdpBonus += (p.open_borders ? 5 : 0);
  gdpBonus += (p.education_budget ?? 0) * 0.3;
  gdpBonus += (p.infrastructure ?? 0) * 0.4;
  gdpBonus += bCount * 0.5;
  gdpBonus -= Math.max(0, taxRate - 40) * 0.3;
  gdpBonus = Math.round(gdpBonus * 10) / 10;

  // Vérification budget
  const budgetOk = totalBudget <= 100;

  return { sat, edu, health, security, gdpBonus, totalBudget, budgetOk, taxRate };
}

export default function Politics({ country, updateCountry, tileCount }) {
  const [policies, setPolicies] = useState({ ...DEFAULTS, ...(country.policies || {}) });
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  function set(key, val) { setPolicies(p => ({ ...p, [key]:val })); setSaved(false); }

  async function save() {
    const fx = calcEffects(policies, tileCount, country.soldiers, country.buildings);
    if (!fx.budgetOk) return;
    setSaving(true);
    await supabase.from('countries').update({ policies }).eq('id', country.id);
    updateCountry({ policies });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const fx = calcEffects(policies, tileCount, country.soldiers, country.buildings);
  const soldiers = country.soldiers || 0;
  const bCount   = Array.isArray(country.buildings) ? country.buildings.length : 0;

  // Calcul revenus/dépenses réels basés sur le PIB
  const gdp = country.gdp || 1600;
  const taxIncome  = Math.round(gdp * (fx.taxRate/100) / 365);  // par jour de jeu
  const armyCost   = Math.round(soldiers * 0.1 / 365);
  const buildCost  = Math.round(bCount * 50 / 365);
  const netPerDay  = taxIncome - armyCost - buildCost;

  return (
    <div style={s.page}>
      {/* Indicateurs */}
      <div style={s.indGrid}>
        <Indicator label="Satisfaction" val={fx.sat} icon="😊" color="#f1c40f"/>
        <Indicator label="Éducation"    val={fx.edu} icon="📚" color="#3498db"/>
        <Indicator label="Santé"        val={fx.health} icon="🏥" color="#e74c3c"/>
        <Indicator label="Sécurité"     val={fx.security} icon="🚔" color="#e67e22"/>
      </div>

      {/* Budget réel */}
      <div style={s.section}>
        <div style={s.secH}>💳 Budget quotidien (revenu PIB/365 par jour de jeu)</div>
        <div style={s.budgetOverview}>
          <div style={s.budgetItem}>
            <span style={s.bLabel}>💰 Impôts ({fx.taxRate}% du PIB)</span>
            <span style={{...s.bVal,color:'#2ed573'}}>+{taxIncome.toLocaleString()}$/jour</span>
          </div>
          <div style={s.budgetItem}>
            <span style={s.bLabel}>⚔️ Armée ({soldiers} soldats)</span>
            <span style={{...s.bVal,color:'#e94560'}}>-{armyCost}/jour</span>
          </div>
          <div style={s.budgetItem}>
            <span style={s.bLabel}>🏗️ Bâtiments ({bCount})</span>
            <span style={{...s.bVal,color:'#e94560'}}>-{buildCost}/jour</span>
          </div>
          <div style={{...s.budgetItem, borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'10px', marginTop:'4px'}}>
            <span style={{color:'#e8eaf6',fontWeight:'700',fontSize:'14px'}}>Balance nette</span>
            <span style={{fontSize:'18px',fontWeight:'800',color:netPerDay>=0?'#2ed573':'#e94560'}}>
              {netPerDay>=0?'+':''}{netPerDay.toLocaleString()}$/jour
            </span>
          </div>
          <div style={s.budgetItem}>
            <span style={s.bLabel}>📈 Bonus croissance PIB</span>
            <span style={{...s.bVal,color:'#4a90e2'}}>+{fx.gdpBonus}%</span>
          </div>
        </div>
      </div>

      {/* Fiscalité */}
      <div style={s.section}>
        <div style={s.secH}>💰 Fiscalité</div>
        <Slider label="Taux d'imposition" id="tax_rate" val={policies.tax_rate??25} min={0} max={80} unit="%" set={set}
          desc={`Revenu : ${Math.round(gdp*(policies.tax_rate??25)/100/365).toLocaleString()}$/jour · Satisfaction : ${(policies.tax_rate??25)>30?'↓':'✓'}`}/>
      </div>

      {/* Allocation du budget */}
      <div style={s.section}>
        <div style={s.secH}>
          📊 Allocation du budget d'État
          <span style={{...s.budgetTotal, color: fx.totalBudget>100?'#e94560':'#2ed573'}}>
            {fx.totalBudget}% / 100% {fx.totalBudget>100?'⚠️ DÉPASSEMENT':'✓'}
          </span>
        </div>
        {!fx.budgetOk && <div style={s.warn}>⚠️ Le budget total ({fx.totalBudget}%) dépasse 100%. Réduis certains postes.</div>}
        <Slider label="🏥 Santé" id="health_budget" val={policies.health_budget??15} min={0} max={50} unit="%" set={set}
          desc={`Santé : ${fx.health}%`}/>
        <Slider label="📚 Éducation" id="education_budget" val={policies.education_budget??12} min={0} max={50} unit="%" set={set}
          desc={`Éducation : ${fx.edu}%`}/>
        <Slider label="⚔️ Militaire" id="military_budget" val={policies.military_budget??20} min={0} max={60} unit="%" set={set}
          desc={`Sécurité : ${fx.security}%`}/>
        <Slider label="🔬 Recherche" id="research_budget" val={policies.research_budget??8} min={0} max={40} unit="%" set={set}
          desc="Booste la vitesse de recherche"/>
        <Slider label="🤝 Social" id="social_budget" val={policies.social_budget??10} min={0} max={40} unit="%" set={set}
          desc={`Satisfaction : +${Math.round((policies.social_budget??0)*0.5)}%`}/>
        <Slider label="🛣️ Infrastructure" id="infrastructure" val={policies.infrastructure??10} min={0} max={40} unit="%" set={set}
          desc="Bonus PIB +0.4% par point"/>
      </div>

      {/* Libertés */}
      <div style={s.section}>
        <div style={s.secH}>⚖️ Libertés civiles & gouvernance</div>
        {[
          { id:'free_press',       name:'Liberté de la presse',   desc:'Transparence, +sat',  pos:'+8% sat',  neg:'-6% sat' },
          { id:'open_borders',     name:'Frontières ouvertes',     desc:'Immigration libre',   pos:'+PIB +sat', neg:'fermé' },
          { id:'state_health',     name:'Santé publique gratuite', desc:'Soins universels',    pos:'+santé',  neg:'-10% santé' },
          { id:'free_education',   name:'École gratuite',          desc:'Éducation universelle',pos:'+édu',   neg:'-8% édu' },
          { id:'internet_freedom', name:'Liberté d\'Internet',     desc:'Accès libre à l\'info',pos:'+tech',  neg:'censuré' },
          { id:'democracy',        name:'Démocratie',              desc:'Élections libres',     pos:'+10% sat',neg:'-15% sat' },
          { id:'corruption_fight', name:'Lutte anti-corruption',   desc:'Transparence',         pos:'+sécu',  neg:'-sécu' },
          { id:'nuclear_policy',   name:'Énergie nucléaire civile',desc:'Énergie abondante',    pos:'+énergie',neg:'–' },
          { id:'conscription',     name:'Service militaire obligatoire', desc:'Armée renforcée',pos:'+soldats',neg:'-5% sat' },
        ].map(law => (
          <div key={law.id} style={s.lawRow}>
            <div style={{flex:1}}>
              <div style={s.lawName}>{law.name}</div>
              <div style={s.lawDesc}>{law.desc} · <span style={{color:policies[law.id]?'#2ed573':'#e94560'}}>{policies[law.id]?law.pos:law.neg}</span></div>
            </div>
            <div style={{...s.toggle, background:policies[law.id]?'#4a90e2':'rgba(255,255,255,0.1)'}}
              onClick={()=>set(law.id, !policies[law.id])}>
              <div style={{...s.toggleK, transform:policies[law.id]?'translateX(20px)':'translateX(2px)'}}/>
            </div>
          </div>
        ))}
      </div>

      {/* Sauvegarder */}
      <div style={{display:'flex',justifyContent:'flex-end',gap:'10px',alignItems:'center'}}>
        {!fx.budgetOk && <span style={{color:'#e94560',fontSize:'13px'}}>⚠️ Corrige le budget avant de sauvegarder</span>}
        <button style={{...s.saveBtn,opacity:saving||!fx.budgetOk?0.5:1}} onClick={save} disabled={saving||!fx.budgetOk}>
          {saving?'⏳ Sauvegarde…':saved?'✅ Appliqué !':'💾 Appliquer les politiques'}
        </button>
      </div>
    </div>
  );
}

function Indicator({ label, val, icon, color }) {
  return (
    <div style={s.indCard}>
      <div style={{fontSize:'22px'}}>{icon}</div>
      <div style={{...s.indVal,color}}>{val}%</div>
      <div style={s.indBar}><div style={{height:'100%',width:`${val}%`,background:color,borderRadius:'3px'}}/></div>
      <div style={s.indLbl}>{label}</div>
    </div>
  );
}

function Slider({ label, id, val, min, max, unit, set, desc }) {
  return (
    <div style={s.sliderRow}>
      <div style={s.sliderTop}>
        <span style={{color:'#e8eaf6',fontSize:'13px',fontWeight:'600'}}>{label}</span>
        <span style={{color:'#4a90e2',fontSize:'14px',fontWeight:'800'}}>{val}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={val} onChange={e=>set(id,Number(e.target.value))}
        style={{width:'100%',accentColor:'#4a90e2',margin:'4px 0'}}/>
      {desc && <div style={{fontSize:'11px',color:'#4a5568'}}>{desc}</div>}
    </div>
  );
}

const s = {
  page:        { padding:'20px', display:'flex', flexDirection:'column', gap:'14px', maxWidth:'900px' },
  indGrid:     { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px' },
  indCard:     { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'14px', textAlign:'center', display:'flex', flexDirection:'column', gap:'5px', alignItems:'center' },
  indVal:      { fontSize:'22px', fontWeight:'800', lineHeight:1 },
  indBar:      { width:'100%', height:'4px', background:'rgba(255,255,255,0.08)', borderRadius:'3px', overflow:'hidden' },
  indLbl:      { fontSize:'11px', color:'#8892b0' },
  section:     { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'18px', display:'flex', flexDirection:'column', gap:'12px' },
  secH:        { fontSize:'12px', fontWeight:'700', color:'#8892b0', textTransform:'uppercase', letterSpacing:'0.5px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  budgetTotal: { fontSize:'13px', fontWeight:'800', letterSpacing:0 },
  budgetOverview:{ display:'flex', flexDirection:'column', gap:'8px' },
  budgetItem:  { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0' },
  bLabel:      { color:'#8892b0', fontSize:'13px' },
  bVal:        { fontSize:'14px', fontWeight:'700' },
  warn:        { padding:'10px 14px', background:'rgba(233,69,96,0.1)', border:'1px solid rgba(233,69,96,0.25)', borderRadius:'8px', color:'#e94560', fontSize:'13px' },
  sliderRow:   { padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' },
  sliderTop:   { display:'flex', justifyContent:'space-between', marginBottom:'2px' },
  lawRow:      { display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' },
  lawName:     { fontSize:'13px', fontWeight:'600', color:'#e8eaf6', marginBottom:'2px' },
  lawDesc:     { fontSize:'11px', color:'#8892b0' },
  toggle:      { width:'44px', height:'24px', borderRadius:'12px', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 },
  toggleK:     { position:'absolute', top:'3px', width:'18px', height:'18px', background:'white', borderRadius:'50%', transition:'transform 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' },
  saveBtn:     { padding:'13px 28px', background:'linear-gradient(135deg,#4a90e2,#357abd)', color:'white', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:'700', cursor:'pointer' },
};
