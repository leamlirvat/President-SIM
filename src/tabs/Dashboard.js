import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const toHex = (c) => !c ? '#4a90e2' : (c.startsWith('#') ? c : '#' + c.padStart(6, '0'));

const BUILDING_DOMAINS = {
  hospital:        { health:10 },
  school:          { education:5 },
  university:      { education:8, research:15 },
  college:         { education:8 },
  police:          { security:10 },
  roads:           { infrastructure:8 },
  port:            { economy:10, diplomacy:5 },
  airport:         { infrastructure:15, diplomacy:5 },
  army_base:       { military:15 },
  naval_base:      { military:15 },
  nuclear:         { energy:20 },
  wind:            { environment:8 },
  hydraulic:       { environment:5, infrastructure:5 },
  research_center: { research:20 },
  space_center:    { research:30, diplomacy:10 },
  data_center:     { security:15, research:10 },
  central_bank:    { economy:20 },
  media_center:    { satisfaction:10 },
  parliament:      { diplomacy:15, satisfaction:5 },
  lab:             { research:25 },
  mine:            { economy:5 },
  factory:         { economy:10 },
  oil_refinery:    { economy:8 },
  wood_factory:    { environment:-3 },
  concrete:        { infrastructure:5 },
};

const DOMAINS = [
  { id:'economy',       name:'Économie',           icon:'💰', base:30, color:'#f39c12' },
  { id:'education',     name:'Éducation',           icon:'📚', base:20, color:'#3498db' },
  { id:'health',        name:'Santé',               icon:'🏥', base:25, color:'#e74c3c' },
  { id:'infrastructure',name:'Infrastructures',     icon:'🛣️', base:20, color:'#95a5a6' },
  { id:'research',      name:'Recherche & Tech.',   icon:'🔬', base:15, color:'#9b59b6' },
  { id:'military',      name:'Militaire',           icon:'⚔️', base:35, color:'#e94560' },
  { id:'security',      name:'Sécurité intérieure', icon:'🚔', base:30, color:'#e67e22' },
  { id:'environment',   name:'Environnement',       icon:'🌿', base:50, color:'#27ae60' },
  { id:'satisfaction',  name:'Satisfaction pop.',   icon:'😊', base:55, color:'#f1c40f' },
  { id:'diplomacy',     name:'Diplomatie',          icon:'🤝', base:20, color:'#1abc9c' },
];

export default function Dashboard({ country, tileCount }) {
  const [recentCols, setRecentCols] = useState([]);
  const [alliesCount, setAlliesCount] = useState(0);

  useEffect(() => {
    async function load() {
      const [colsRes, membRes] = await Promise.all([
        supabase.from('colonizations').select('*').eq('countryid', country.id).order('startedat', { ascending:false }).limit(5),
        supabase.from('alliance_members').select('id').eq('country_id', country.id),
      ]);
      setRecentCols(colsRes.data || []);
      setAlliesCount(membRes.data?.length || 0);
    }
    load();
  }, [country.id]);

  const buildings = Array.isArray(country.buildings) ? country.buildings : [];
  const color = toHex(country.color);

  function getDomainValue(domId) {
    let val = DOMAINS.find(d => d.id === domId)?.base || 20;
    buildings.forEach(bId => {
      const bonus = BUILDING_DOMAINS[bId]?.[domId] || 0;
      val = Math.min(100, val + bonus);
    });
    if (domId === 'military' && (country.soldiers || 0) > 100) val = Math.min(100, val + 10);
    return Math.round(val);
  }

  const stats = [
    { icon:'💰', label:'Trésorerie',  value:`${Math.floor(country.money??0).toLocaleString()}$`,  color:'#f39c12' },
    { icon:'📈', label:'PIB',          value:`${Math.floor(country.gdp??0).toLocaleString()}$`,    color:'#2ed573' },
    { icon:'⚔️', label:'Soldats',      value:(country.soldiers??0).toLocaleString(),               color:'#e94560' },
    { icon:'🔭', label:'Éclaireurs',   value:(country.scouts??0).toLocaleString(),                 color:'#4a90e2' },
    { icon:'🗺️', label:'Territoire',   value:`${tileCount} case${tileCount>1?'s':''}`,            color:'#9b59b6' },
    { icon:'🤝', label:'Alliances',    value:alliesCount,                                          color:'#1abc9c' },
    { icon:'🏗️', label:'Bâtiments',   value:buildings.length,                                     color:'#e67e22' },
  ];

  return (
    <div style={s.page}>
      {/* En-tête pays */}
      <div style={{ ...s.countryHeader, background:`linear-gradient(135deg, ${color}22, ${color}08)`, borderColor:`${color}33` }}>
        <div style={{ ...s.countryDot, background:color }} />
        <div>
          <h2 style={s.countryName}>{country.name}</h2>
          <div style={s.countryMeta}>Serveur {country.serverid || 1} · Fondé récemment · 🌍 En développement</div>
        </div>
      </div>

      <div style={s.grid}>
        {/* Stats clés */}
        <div style={s.section}>
          <div style={s.sectionH}>📊 Statistiques clés</div>
          <div style={s.statsGrid}>
            {stats.map(st => (
              <div key={st.label} style={{ ...s.statCard, borderColor:`${st.color}22` }}>
                <div style={s.statIcon}>{st.icon}</div>
                <div style={{ ...s.statVal, color:st.color }}>{st.value}</div>
                <div style={s.statLbl}>{st.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Domaines */}
        <div style={s.section}>
          <div style={s.sectionH}>🏛️ Domaines du pays</div>
          <div style={s.domains}>
            {DOMAINS.map(d => {
              const val = getDomainValue(d.id);
              return (
                <div key={d.id} style={s.domRow}>
                  <div style={s.domLabel}>
                    <span style={s.domIco}>{d.icon}</span>
                    <span style={s.domName}>{d.name}</span>
                    <span style={{ ...s.domVal, color:d.color }}>{val}%</span>
                  </div>
                  <div style={s.domBar}>
                    <div style={{ ...s.domFill, width:`${val}%`, background:`linear-gradient(90deg,${d.color}aa,${d.color})` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activité récente */}
        <div style={{ ...s.section, gridColumn:'1 / -1' }}>
          <div style={s.sectionH}>⏱️ Activité récente</div>
          {recentCols.length === 0 ? (
            <div style={s.empty}>Aucune expédition pour l'instant. Va sur la carte pour conquérir !</div>
          ) : (
            <div style={s.eventList}>
              {recentCols.map(col => (
                <div key={col.id} style={s.event}>
                  <div style={{ ...s.eventDot, background: col.status==='completed'?'#2ed573':col.status==='cancelled'?'#e94560':'#e67e00' }}/>
                  <div style={s.eventContent}>
                    <span style={s.eventTitle}>
                      {col.status==='completed' ? '✅ Territoire conquis' : col.status==='cancelled' ? '❌ Expédition annulée' : '⏳ Expédition en cours'}
                    </span>
                    <span style={s.eventMeta}>{col.warriors} guerriers · {col.scouts} éclaireurs</span>
                  </div>
                  <div style={s.eventDate}>{new Date(col.startedat).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page:          { padding:'20px', maxWidth:'1200px' },
  countryHeader: { display:'flex', alignItems:'center', gap:'16px', padding:'18px 20px', border:'1px solid', borderRadius:'14px', marginBottom:'20px' },
  countryDot:    { width:'18px', height:'18px', borderRadius:'50%', flexShrink:0 },
  countryName:   { margin:0, fontSize:'22px', fontWeight:'800', color:'#e8eaf6' },
  countryMeta:   { color:'#8892b0', fontSize:'13px', marginTop:'2px' },
  grid:          { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' },
  section:       { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'18px' },
  sectionH:      { fontSize:'12px', fontWeight:'700', color:'#8892b0', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'14px' },
  statsGrid:     { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:'10px' },
  statCard:      { background:'rgba(255,255,255,0.03)', border:'1px solid', borderRadius:'10px', padding:'14px', textAlign:'center' },
  statIcon:      { fontSize:'22px', marginBottom:'6px' },
  statVal:       { fontSize:'18px', fontWeight:'800', lineHeight:1, marginBottom:'4px' },
  statLbl:       { fontSize:'11px', color:'#8892b0' },
  domains:       { display:'flex', flexDirection:'column', gap:'10px' },
  domRow:        { display:'flex', flexDirection:'column', gap:'5px' },
  domLabel:      { display:'flex', alignItems:'center', gap:'7px' },
  domIco:        { fontSize:'14px', width:'18px', textAlign:'center' },
  domName:       { flex:1, fontSize:'13px', color:'#c8cce0' },
  domVal:        { fontSize:'13px', fontWeight:'700', width:'36px', textAlign:'right' },
  domBar:        { height:'5px', background:'rgba(255,255,255,0.07)', borderRadius:'3px', overflow:'hidden' },
  domFill:       { height:'100%', borderRadius:'3px', transition:'width 0.5s' },
  eventList:     { display:'flex', flexDirection:'column', gap:'8px' },
  event:         { display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:'8px' },
  eventDot:      { width:'8px', height:'8px', borderRadius:'50%', flexShrink:0 },
  eventContent:  { flex:1, display:'flex', flexDirection:'column', gap:'2px' },
  eventTitle:    { fontSize:'13px', fontWeight:'600', color:'#e8eaf6' },
  eventMeta:     { fontSize:'11px', color:'#8892b0' },
  eventDate:     { fontSize:'11px', color:'#4a5568' },
  empty:         { color:'#4a5568', fontSize:'13px', textAlign:'center', padding:'20px' },
};
