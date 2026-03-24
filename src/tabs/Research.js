import { useState } from 'react';
import { supabase } from '../supabaseClient';

// Points de recherche par jour basés sur le budget R&D
// Points/jour = GDP * research_budget% / 365 / 100
// Coût pour passer un niveau = 1000 points × niveau

const DOMAINS = [
  { id:'tech',        name:'Technologies avancées',  icon:'💻', color:'#6c5ce7', maxLv:5,
    levels:['Automatisation basique','IA industrielle','Réseau 6G','Cyber-défense','Singularité tech.'],
    unlocks:['Usine auto +20%','Drone civil','Antenne relais','Pare-feu IA','Productivité ×2'] },
  { id:'military',    name:'R&D Militaire',           icon:'⚔️', color:'#e94560', maxLv:5,
    levels:['Armement amélioré','Blindage composite','Missiles guidés','Stealth','Arme hypersonique'],
    unlocks:['+15% attaque','Char avancé','Frappe longue portée','Avion invisible','ICBM'] },
  { id:'space',       name:'Programme spatial',       icon:'🚀', color:'#e67e22', maxLv:5,
    levels:['Fusée légère','Satellisation','Station orbitale','Lune','Astéroïdes'],
    unlocks:['Satellite espion','Comm. sécurisée','GPS militaire','Base lunaire','Extraction astéroïdes'] },
  { id:'energy',      name:'Énergie propre',          icon:'⚡', color:'#f1c40f', maxLv:4,
    levels:['Solaire avancé','Fusion froide','Fusion chaude','Énergie libre'],
    unlocks:['+30% efficacité','Prototype fusion','Réacteur III','Énergie illimitée'] },
  { id:'medicine',    name:'Médecine & biotech',      icon:'🧬', color:'#fd79a8', maxLv:4,
    levels:['Vaccinologie','Édition génomique','Nanomédecine','Immortalité partielle'],
    unlocks:['+20% santé','Maladie éradiquée','Nanobots','Espérance de vie ×1.5'] },
  { id:'agriculture', name:'Agro-alimentaire',        icon:'🌾', color:'#27ae60', maxLv:3,
    levels:['OGM efficaces','Agriculture verticale','Synthèse alimentaire'],
    unlocks:['+40% nourriture','−50% surface','Nourriture artificielle'] },
  { id:'cyber',       name:'Cybersécurité',           icon:'🔒', color:'#00b894', maxLv:4,
    levels:['Chiffrement avancé','Guerre info.','IA défensive','Domination cyber'],
    unlocks:['−30% piratage','Désinformation','Bouclier IA','Hack ennemi'] },
  { id:'nuclear',     name:'Tech. nucléaire',         icon:'☢️', color:'#55efc4', maxLv:3,
    levels:['Nucléaire civil','Miniaturisation','Arsenal tactique'],
    unlocks:['Centrale Gen4','Bombe portable','Frappe nucléaire'] },
  { id:'logistics',   name:'Logistique & commerce',   icon:'🚢', color:'#1abc9c', maxLv:3,
    levels:['Commerce optimisé','Ports automatisés','Réseau mondial'],
    unlocks:['+20% revenu commerce','−30% coût import','PIB +10%'] },
  { id:'materials',   name:'Matériaux avancés',       icon:'🔩', color:'#a29bfe', maxLv:4,
    levels:['Alliages légers','Graphène','Métamatériaux','Matière exotique'],
    unlocks:['−20% coût bâtiment','Armure légère','Invisibilité radar','Super conducteurs'] },
];

export default function Research({ country, updateCountry }) {
  const [investing, setInvesting] = useState(null);
  const [msg, setMsg]             = useState('');

  const research  = country.research  || {};
  const policies  = country.policies  || {};
  const gdp       = country.gdp       || 1600;
  const money     = country.money     || 0;

  // Points de recherche accumulés = raw score
  // Niveau = Math.floor(score / 1000)
  // Il faut 1000 pts par niveau pour passer au suivant

  function getScore(id) { return research[id] || 0; }
  function getLevel(id) {
    const dom = DOMAINS.find(d=>d.id===id);
    if (!dom) return 0;
    return Math.min(dom.maxLv, Math.floor(getScore(id) / 1000));
  }
  function getProgress(id) { return getScore(id) % 1000; }

  // Points par jour basés sur le budget R&D
  const resBudgetPct = policies.research_budget ?? 8;
  const ptsPerDay = Math.round((gdp * resBudgetPct/100) / 365 / 10); // divisé par 10 pour équilibrer

  // Coût en $ pour acheter des points de recherche manuellement
  // 1 point de recherche = 1$ (simple et lisible)
  async function invest(domain, pts) {
    const cost = pts; // 1$ par point
    if (money < cost) { setMsg(`❌ Fonds insuffisants (besoin : ${cost.toLocaleString()}$)`); return; }
    const curScore = getScore(domain.id);
    const maxScore = domain.maxLv * 1000;
    if (curScore >= maxScore) { setMsg(`⚠️ ${domain.name} est au maximum !`); return; }
    setInvesting(domain.id); setMsg('');
    const newMoney   = Math.floor(money - cost);
    const newScore   = Math.min(maxScore, curScore + pts);
    const newResearch = { ...research, [domain.id]: newScore };
    await supabase.from('countries').update({ money:newMoney, research:newResearch }).eq('id', country.id);
    updateCountry({ money:newMoney, research:newResearch });
    setMsg(`✅ +${pts} pts investis en ${domain.name} !`);
    setInvesting(null);
  }

  const totalLvl  = DOMAINS.reduce((s,d) => s+getLevel(d.id), 0);
  const maxLvl    = DOMAINS.reduce((s,d) => s+d.maxLv, 0);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <StatBox icon="🔬" label="Niveaux débloqués" val={`${totalLvl} / ${maxLvl}`} color="#9b59b6"/>
        <StatBox icon="📈" label="Points/jour (auto)" val={`+${ptsPerDay} pts`} color="#4a90e2"/>
        <StatBox icon="💰" label="Trésorerie" val={`${Math.floor(money).toLocaleString()}$`} color="#f39c12"/>
        <StatBox icon="⚙️" label="Budget R&D" val={`${resBudgetPct}% du PIB`} color="#2ed573"/>
      </div>

      <div style={s.info}>
        💡 <strong style={{color:'#4a90e2'}}>Auto :</strong> +{ptsPerDay} pts/jour répartissez via votre budget R&D.
        &nbsp;|&nbsp;<strong style={{color:'#f39c12'}}>Manuel :</strong> Investissez 1$ = 1 point de recherche.
        &nbsp;|&nbsp;Chaque <strong style={{color:'#2ed573'}}>niveau</strong> coûte 1 000 points.
      </div>

      {msg && <div style={{...s.msg,...(msg.startsWith('✅')?s.msgOk:msg.startsWith('⚠️')?s.msgWarn:s.msgErr)}}>{msg}</div>}

      <div style={s.grid}>
        {DOMAINS.map(d => {
          const lv  = getLevel(d.id);
          const prg = getProgress(d.id);
          const isMax = lv >= d.maxLv;
          const costFor100  = 100;
          const costFor1000 = 1000;

          return (
            <div key={d.id} style={{...s.card, borderColor:`${d.color}22`}}>
              {/* Header */}
              <div style={s.cardTop}>
                <span style={{fontSize:'26px',flexShrink:0}}>{d.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={s.dName}>{d.name}</div>
                  <div style={{fontSize:'11px',color:'#8892b0',marginTop:'2px'}}>
                    Score : {getScore(d.id).toLocaleString()} pts
                  </div>
                </div>
                <div style={{...s.lvBadge, background:`${d.color}22`, color:d.color}}>
                  Niv. {lv}/{d.maxLv}
                </div>
              </div>

              {/* Barre de progression multi-niveaux */}
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{flex:1,display:'flex',gap:'2px',height:'8px',borderRadius:'4px',overflow:'hidden'}}>
                  {Array.from({length:d.maxLv},(_,i) => {
                    const filled = i < lv;
                    const current = i === lv;
                    return (
                      <div key={i} style={{flex:1,background:filled?d.color:current?`${d.color}44`:'rgba(255,255,255,0.07)',position:'relative',overflow:'hidden'}}>
                        {current && prg>0 && (
                          <div style={{position:'absolute',inset:0,background:d.color,width:`${prg/10}%`,transition:'width 0.5s'}}/>
                        )}
                      </div>
                    );
                  })}
                </div>
                <span style={{fontSize:'11px',fontWeight:'700',color:d.color,width:'36px',textAlign:'right',flexShrink:0}}>
                  {isMax?'MAX':`${prg/10}%`}
                </span>
              </div>

              {/* Niveau actuel + suivant */}
              {lv < d.maxLv && (
                <div style={s.levelInfo}>
                  <div>
                    <span style={{color:'#8892b0',fontSize:'11px'}}>Acquis : </span>
                    <span style={{color:'#2ed573',fontSize:'11px',fontWeight:'600'}}>{d.levels[lv-1]||'—'}</span>
                  </div>
                  <div>
                    <span style={{color:'#8892b0',fontSize:'11px'}}>Prochain : </span>
                    <span style={{color:d.color,fontSize:'11px',fontWeight:'600'}}>{d.levels[lv]}</span>
                  </div>
                </div>
              )}

              {/* Déblocages */}
              <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                {d.unlocks.map((u,i) => (
                  <div key={u} style={{...s.unlockTag,opacity:i<lv?1:0.3,borderColor:i<lv?d.color+'44':'transparent',color:i<lv?d.color:'#555'}}>
                    {i<lv?'✅':'🔒'} {u}
                  </div>
                ))}
              </div>

              {/* Investissement */}
              {!isMax ? (
                <div style={s.investRow}>
                  <button style={{...s.iBtn, opacity:investing?0.5:1}} onClick={()=>invest(d,100)} disabled={!!investing}>
                    +100 pts · {costFor100}$
                  </button>
                  <button style={{...s.iBtnBig, background:`linear-gradient(135deg,${d.color}cc,${d.color})`, opacity:investing?0.5:1}}
                    onClick={()=>invest(d,1000)} disabled={!!investing}>
                    {investing===d.id?'⏳…':`+1 000 pts · ${costFor1000.toLocaleString()}$`}
                  </button>
                </div>
              ) : (
                <div style={s.maxMsg}>🏆 Maîtrise absolue atteinte !</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ icon, label, val, color }) {
  return (
    <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'12px 16px',display:'flex',flexDirection:'column',gap:'3px'}}>
      <div style={{fontSize:'18px'}}>{icon}</div>
      <div style={{fontSize:'18px',fontWeight:'800',color,lineHeight:1}}>{val}</div>
      <div style={{fontSize:'11px',color:'#8892b0'}}>{label}</div>
    </div>
  );
}

const s = {
  page:       { padding:'20px', display:'flex', flexDirection:'column', gap:'14px' },
  header:     { display:'flex', gap:'10px', flexWrap:'wrap' },
  info:       { padding:'11px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', fontSize:'13px', color:'#8892b0', lineHeight:1.6 },
  msg:        { padding:'10px 14px', borderRadius:'8px', fontSize:'13px' },
  msgOk:      { background:'rgba(46,213,115,0.12)', border:'1px solid rgba(46,213,115,0.25)', color:'#2ed573' },
  msgErr:     { background:'rgba(233,69,96,0.12)', border:'1px solid rgba(233,69,96,0.25)', color:'#e94560' },
  msgWarn:    { background:'rgba(230,126,0,0.12)', border:'1px solid rgba(230,126,0,0.25)', color:'#e67e22' },
  grid:       { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))', gap:'12px' },
  card:       { background:'rgba(255,255,255,0.03)', border:'1px solid', borderRadius:'12px', padding:'16px', display:'flex', flexDirection:'column', gap:'10px' },
  cardTop:    { display:'flex', alignItems:'flex-start', gap:'10px' },
  dName:      { fontSize:'14px', fontWeight:'700', color:'#e8eaf6' },
  lvBadge:    { padding:'4px 10px', borderRadius:'6px', fontSize:'12px', fontWeight:'800', flexShrink:0 },
  levelInfo:  { display:'flex', flexDirection:'column', gap:'3px', padding:'8px', background:'rgba(255,255,255,0.03)', borderRadius:'7px' },
  unlockTag:  { fontSize:'11px', padding:'3px 7px', border:'1px solid transparent', borderRadius:'5px', background:'rgba(255,255,255,0.04)', transition:'opacity 0.3s' },
  investRow:  { display:'flex', gap:'8px' },
  iBtn:       { flex:1, padding:'9px 0', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#e8eaf6', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'600' },
  iBtnBig:    { flex:2, padding:'9px 0', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'700' },
  maxMsg:     { textAlign:'center', color:'#f1c40f', fontSize:'13px', fontWeight:'700', padding:'8px', background:'rgba(241,196,15,0.1)', borderRadius:'8px' },
};
