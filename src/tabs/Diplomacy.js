import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const toHex = (c) => !c ? '#4a90e2' : (c.startsWith('#') ? c : '#' + c.padStart(6,'0'));

const MODULES = [
  { id:'DEFENSE_PACT',    icon:'🛡️', name:'Pacte de défense', desc:'Les membres se défendent mutuellement en cas d\'attaque. Bonus de combat +20%.', color:'#e94560' },
  { id:'COMMON_MARKET',   icon:'🛒', name:'Marché commun',     desc:'Commerce entre membres sans taxe (0% vs 10% global). Boost PIB +5%/membre.', color:'#27ae60' },
  { id:'SHARED_RESEARCH', icon:'🔬', name:'Recherche commune', desc:'Pool de recherche partagé. 10% des points de recherche de chaque membre profite à tous.', color:'#9b59b6' },
  { id:'SANCTIONS',       icon:'🚫', name:'Sanctions économiques', desc:'L\'alliance peut voter des sanctions contre un pays ennemi. Malus commerce -30%.', color:'#e67e22' },
];

const ROLES = { leader:'👑 Leader', officer:'⭐ Officier', member:'🧑 Membre' };

export default function Diplomacy({ country, updateCountry }) {
  const [tab, setTab]           = useState('alliances');
  const [alliances, setAlliances] = useState([]);
  const [myAlliance, setMyAlliance] = useState(null);   // alliance object if member
  const [myRole, setMyRole]       = useState(null);
  const [modules, setModules]     = useState([]);         // active modules for myAlliance
  const [sanctions, setSanctions] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [newName, setNewName]     = useState('');
  const [newDesc, setNewDesc]     = useState('');
  const [sanctTarget, setSanctTarget] = useState('');
  const [msg, setMsg]             = useState('');

  const sid = country.serverid || 1;

  const load = useCallback(async () => {
    setLoading(true);
    const [alliRes, cRes] = await Promise.all([
      supabase.from('alliances')
        .select('*, alliance_members(country_id, role, countries(id,name,color,soldiers,gdp))')
        .eq('serverid', sid),
      supabase.from('countries').select('id,name,color,soldiers,gdp').eq('serverid', sid).neq('id', country.id),
    ]);

    const alls = alliRes.data || [];
    setAlliances(alls);
    setCountries(cRes.data || []);

    // Find if I'm a member of any alliance
    let myAll = null;
    let myRl = null;
    for (const a of alls) {
      const mem = (a.alliance_members||[]).find(m => m.country_id === country.id);
      if (mem) { myAll = a; myRl = mem.role; break; }
    }
    setMyAlliance(myAll);
    setMyRole(myRl);

    if (myAll) {
      const [modRes, sanctRes] = await Promise.all([
        supabase.from('alliance_modules').select('*').eq('alliance_id', myAll.id),
        supabase.from('alliance_sanctions').select('*, countries(name,color)').eq('alliance_id', myAll.id).eq('active', true),
      ]);
      setModules(modRes.data || []);
      setSanctions(sanctRes.data || []);
    } else {
      setModules([]);
      setSanctions([]);
    }
    setLoading(false);
  }, [country.id, sid]);

  useEffect(() => { load(); }, [load]);

  async function createAlliance() {
    if (!newName.trim()) return setMsg('❌ Donne un nom à ton alliance.');
    if (myAlliance) return setMsg('❌ Tu es déjà dans une alliance. Quitte-la d\'abord.');
    setMsg('');
    const { data, error } = await supabase.from('alliances')
      .insert({ name:newName.trim(), description:newDesc.trim(), leader_country_id:country.id, serverid:sid })
      .select().single();
    if (error) return setMsg('❌ '+error.message);
    await supabase.from('alliance_members').insert({ alliance_id:data.id, country_id:country.id, role:'leader' });
    setMsg('✅ Alliance créée avec succès !');
    setNewName(''); setNewDesc(''); setCreating(false);
    await load();
  }

  async function join(allianceId) {
    if (myAlliance) return setMsg('❌ Quitte ton alliance actuelle d\'abord.');
    const { error } = await supabase.from('alliance_members').insert({ alliance_id:allianceId, country_id:country.id, role:'member' });
    if (error) return setMsg('❌ '+error.message);
    setMsg('✅ Alliance rejointe !');
    await load();
  }

  async function leave() {
    if (!myAlliance) return;
    if (myRole==='leader' && (myAlliance.alliance_members||[]).length > 1)
      return setMsg('❌ Transfère le leadership avant de quitter.');
    await supabase.from('alliance_members').delete().eq('alliance_id', myAlliance.id).eq('country_id', country.id);
    if (myRole==='leader') await supabase.from('alliances').delete().eq('id', myAlliance.id);
    setMsg('✅ Tu as quitté l\'alliance.'); await load();
  }

  async function toggleModule(mod) {
    if (!myAlliance || myRole !== 'leader') return;
    const existing = modules.find(m => m.module === mod.id);
    if (existing) {
      await supabase.from('alliance_modules').delete().eq('id', existing.id);
    } else {
      await supabase.from('alliance_modules').insert({ alliance_id:myAlliance.id, module:mod.id, activated_by:country.id });
    }
    await load();
  }

  async function imposeSanction() {
    if (!sanctTarget) return setMsg('❌ Choisis un pays cible.');
    const tc = countries.find(c => c.id === sanctTarget);
    if (!tc) return setMsg('❌ Pays introuvable.');
    const { error } = await supabase.from('alliance_sanctions').insert({
      alliance_id:myAlliance.id, target_country_id: sanctTarget,
      reason:'Décidé par l\'alliance', created_by:country.id, active:true,
    });
    if (error) return setMsg('❌ '+error.message);
    setMsg('✅ Sanction imposée contre '+tc.name);
    setSanctTarget('');
    await load();
  }

  async function liftSanction(id) {
    await supabase.from('alliance_sanctions').update({ active:false }).eq('id', id);
    await load();
  }

  async function changeRole(countryId, role) {
    if (!myAlliance || myRole!=='leader') return;
    await supabase.from('alliance_members').update({ role }).eq('alliance_id', myAlliance.id).eq('country_id', countryId);
    await load();
  }

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'#555'}}>⏳ Chargement…</div>;

  const isLeader = myRole === 'leader';
  const hasDefPact    = modules.some(m => m.module==='DEFENSE_PACT');
  const hasCommonMkt  = modules.some(m => m.module==='COMMON_MARKET');

  return (
    <div style={s.page}>
      {/* Tabs */}
      <div style={s.tabRow}>
        {[
          ['alliances','🤝 Alliances'],
          myAlliance ? ['manage','⚙️ Gestion'] : null,
          myAlliance ? ['treaties','📜 Traités'] : null,
          ['countries','🌍 Pays ('+sid+')'],
        ].filter(Boolean).map(([id,lbl]) => (
          <button key={id} style={{...s.tab,...(tab===id?s.tabOn:{})}} onClick={()=>{setTab(id);setMsg('');}}>{lbl}</button>
        ))}
      </div>

      {msg && <div style={{...s.msg,...(msg.startsWith('✅')?s.msgOk:s.msgErr)}}>{msg}</div>}

      {/* ── Alliances ── */}
      {tab==='alliances' && (
        <div style={s.content}>
          <div style={s.sH}>
            <span>🏛️ Alliances du serveur {sid} ({alliances.length})</span>
            {!myAlliance && (
              <button style={s.createBtn} onClick={()=>setCreating(!creating)}>
                {creating?'✕ Annuler':'+ Créer une alliance'}
              </button>
            )}
          </div>

          {creating && (
            <div style={s.createForm}>
              <input style={s.input} placeholder="Nom de l'alliance" value={newName} onChange={e=>setNewName(e.target.value)} autoFocus/>
              <textarea style={{...s.input,height:'60px',resize:'vertical'}} placeholder="Description (optionnel)" value={newDesc} onChange={e=>setNewDesc(e.target.value)}/>
              <button style={s.goBtn} onClick={createAlliance}>🚀 Créer</button>
            </div>
          )}

          {alliances.length===0 ? (
            <div style={s.empty}>Aucune alliance sur ce serveur. Crée la première !</div>
          ) : alliances.map(a => {
            const mems  = a.alliance_members||[];
            const mine  = myAlliance?.id === a.id;
            return (
              <div key={a.id} style={{...s.alliCard,...(mine?s.alliCardOn:{})}}>
                <div style={s.alliTop}>
                  <div style={s.alliIcon}>🤝</div>
                  <div style={{flex:1}}>
                    <div style={s.alliName}>{a.name}</div>
                    {a.description && <div style={s.alliDesc}>{a.description}</div>}
                    <div style={s.alliMeta}>👥 {mems.length} membre{mems.length>1?'s':''} · {mine?`Ton rôle : ${ROLES[myRole]}`:'Rejoindre ?'}</div>
                  </div>
                  {mine ? (
                    <button style={s.leaveBtn} onClick={leave}>Quitter</button>
                  ) : (
                    <button style={s.joinBtn} onClick={()=>join(a.id)}>Rejoindre</button>
                  )}
                </div>
                {mems.length>0 && (
                  <div style={s.memList}>
                    {mems.map(m=>(
                      <div key={m.country_id} style={s.memTag}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:toHex(m.countries?.color),flexShrink:0}}/>
                        <span>{m.countries?.name}</span>
                        <span style={{fontSize:'11px',color:'#555'}}>{ROLES[m.role]||m.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Gestion (leader/officer only) ── */}
      {tab==='manage' && myAlliance && (
        <div style={s.content}>
          <div style={s.sH}><span>⚙️ Gestion — {myAlliance.name}</span></div>

          {/* Modules */}
          <div style={s.section}>
            <div style={s.secH}>🧩 Modules d'alliance</div>
            {MODULES.map(mod => {
              const active = modules.some(m => m.module===mod.id);
              const canToggle = myRole==='leader';
              return (
                <div key={mod.id} style={{...s.modCard,...(active?{borderColor:mod.color+'44',background:mod.color+'08'}:{})}}>
                  <div style={s.modTop}>
                    <span style={s.modIcon}>{mod.icon}</span>
                    <div style={s.modInfo}>
                      <div style={s.modName}>{mod.name}</div>
                      <div style={s.modDesc}>{mod.desc}</div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
                      <div style={{...s.toggle, background:active?mod.color:'rgba(255,255,255,0.1)', cursor:canToggle?'pointer':'not-allowed', opacity:canToggle?1:0.5}}
                        onClick={()=>canToggle&&toggleModule(mod)}>
                        <div style={{...s.toggleK, transform:active?'translateX(20px)':'translateX(2px)'}}/>
                      </div>
                      <span style={{fontSize:'10px',color:active?mod.color:'#555',fontWeight:'700'}}>{active?'ACTIF':'INACTIF'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Membres et rôles */}
          <div style={s.section}>
            <div style={s.secH}>👥 Membres et rôles</div>
            {(myAlliance.alliance_members||[]).map(m => (
              <div key={m.country_id} style={s.memberRow}>
                <div style={{width:10,height:10,borderRadius:'50%',background:toHex(m.countries?.color),flexShrink:0}}/>
                <span style={{flex:1,fontSize:'13px',color:'#e8eaf6'}}>{m.countries?.name}</span>
                <span style={{fontSize:'12px',color:'#8892b0'}}>{ROLES[m.role]||m.role}</span>
                {isLeader && m.country_id!==country.id && (
                  <select style={s.roleSelect} value={m.role} onChange={e=>changeRole(m.country_id,e.target.value)}>
                    <option value="member">Membre</option>
                    <option value="officer">Officier</option>
                    <option value="leader">Leader</option>
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* Sanctions */}
          {modules.some(m=>m.module==='SANCTIONS') && (
            <div style={s.section}>
              <div style={s.secH}>🚫 Sanctions économiques</div>
              {isLeader && (
                <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
                  <select style={{...s.input,flex:1}} value={sanctTarget} onChange={e=>setSanctTarget(e.target.value)}>
                    <option value="">Choisir un pays cible…</option>
                    {countries.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button style={s.sanctBtn} onClick={imposeSanction}>🚫 Sanctionner</button>
                </div>
              )}
              {sanctions.length===0 ? (
                <div style={{color:'#4a5568',fontSize:'13px'}}>Aucune sanction active.</div>
              ) : sanctions.map(san=>(
                <div key={san.id} style={s.sanctCard}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:toHex(san.countries?.color),flexShrink:0}}/>
                  <span style={{flex:1,fontSize:'13px',color:'#e8eaf6'}}>{san.countries?.name}</span>
                  <span style={{fontSize:'11px',color:'#e94560'}}>−30% commerce</span>
                  {isLeader && <button style={s.liftBtn} onClick={()=>liftSanction(san.id)}>Lever</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Traités ── */}
      {tab==='treaties' && myAlliance && (
        <div style={s.content}>
          <div style={s.sH}><span>📜 Traités & effets actifs</span></div>
          <div style={s.section}>
            <div style={s.secH}>🧩 Modules actifs</div>
            {modules.length===0 ? (
              <div style={{color:'#4a5568',fontSize:'13px'}}>Aucun module actif. Active-les dans Gestion.</div>
            ) : modules.map(m => {
              const def = MODULES.find(md=>md.id===m.module);
              return (
                <div key={m.id} style={{...s.modCard, borderColor:(def?.color||'#4a90e2')+'44', background:(def?.color||'#4a90e2')+'08'}}>
                  <span style={{fontSize:'20px'}}>{def?.icon}</span>
                  <div>
                    <div style={{fontSize:'14px',fontWeight:'700',color:'#e8eaf6',marginBottom:'3px'}}>{def?.name}</div>
                    <div style={{fontSize:'12px',color:'#8892b0'}}>{def?.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={s.section}>
            <div style={s.secH}>💡 Effets sur ton économie</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {hasDefPact && <EffectRow icon="🛡️" label="Pacte de défense" val="+20% résistance aux attaques" c="#e94560"/>}
              {hasCommonMkt && <EffectRow icon="🛒" label="Marché commun" val="0% taxe commerce inter-alliance" c="#27ae60"/>}
              {modules.some(m=>m.module==='SHARED_RESEARCH') && <EffectRow icon="🔬" label="Recherche commune" val="+10% bonus recherche partagé" c="#9b59b6"/>}
              {sanctions.length>0 && <EffectRow icon="🚫" label="Sanctions actives" val={`${sanctions.length} pays sanctionné${sanctions.length>1?'s':''}`} c="#e67e22"/>}
              {modules.length===0 && <div style={{color:'#4a5568',fontSize:'13px'}}>Active des modules pour voir les effets.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Pays sur le serveur ── */}
      {tab==='countries' && (
        <div style={s.content}>
          <div style={s.sH}><span>🌍 Pays sur le serveur {sid} ({countries.length})</span></div>
          {countries.length===0 ? (
            <div style={s.empty}>Tu es seul sur ce serveur. Invite des amis !</div>
          ) : countries.map(c => {
            const isSanctioned = sanctions.some(san=>san.target_country_id===c.id);
            return (
              <div key={c.id} style={s.cCard}>
                <div style={{width:14,height:14,borderRadius:'50%',background:toHex(c.color),flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:'14px',fontWeight:'700',color:'#e8eaf6'}}>{c.name}</div>
                  <div style={{fontSize:'12px',color:'#8892b0'}}>⚔️ {(c.soldiers||0).toLocaleString()} · 📈 {Math.floor(c.gdp||0).toLocaleString()}$ PIB</div>
                </div>
                {isSanctioned && <span style={{fontSize:'11px',color:'#e94560',fontWeight:'700'}}>🚫 Sanctionné</span>}
                <div style={{display:'flex',gap:'6px'}}>
                  <button style={s.dipBtn} title="Bientôt">🤝 Traité</button>
                  <button style={s.dipBtn} title="Bientôt">⚔️ Guerre</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EffectRow({ icon, label, val, c }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:`rgba(255,255,255,0.03)`,border:`1px solid ${c}22`,borderRadius:'8px'}}>
      <span style={{fontSize:'18px'}}>{icon}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:'13px',fontWeight:'600',color:'#e8eaf6'}}>{label}</div>
        <div style={{fontSize:'12px',color:c,fontWeight:'600'}}>{val}</div>
      </div>
    </div>
  );
}

const s = {
  page:       { padding:'20px', display:'flex', flexDirection:'column', gap:'14px', maxWidth:'900px' },
  tabRow:     { display:'flex', gap:'8px', flexWrap:'wrap' },
  tab:        { padding:'8px 18px', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.03)', color:'#8892b0', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' },
  tabOn:      { background:'rgba(74,144,226,0.18)', color:'#4a90e2', borderColor:'rgba(74,144,226,0.4)' },
  msg:        { padding:'10px 14px', borderRadius:'8px', fontSize:'13px' },
  msgOk:      { background:'rgba(46,213,115,0.12)', border:'1px solid rgba(46,213,115,0.25)', color:'#2ed573' },
  msgErr:     { background:'rgba(233,69,96,0.12)', border:'1px solid rgba(233,69,96,0.25)', color:'#e94560' },
  content:    { display:'flex', flexDirection:'column', gap:'12px' },
  sH:         { display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:'13px', fontWeight:'700', color:'#8892b0' },
  section:    { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'16px', display:'flex', flexDirection:'column', gap:'10px' },
  secH:       { fontSize:'12px', fontWeight:'700', color:'#8892b0', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px' },
  createBtn:  { padding:'7px 16px', background:'rgba(74,144,226,0.18)', border:'1px solid rgba(74,144,226,0.4)', color:'#4a90e2', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' },
  createForm: { background:'rgba(74,144,226,0.06)', border:'1px solid rgba(74,144,226,0.2)', borderRadius:'12px', padding:'14px', display:'flex', flexDirection:'column', gap:'8px' },
  input:      { padding:'10px 12px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', background:'rgba(255,255,255,0.05)', color:'white', outline:'none', fontSize:'13px', boxSizing:'border-box' },
  goBtn:      { padding:'10px', background:'linear-gradient(135deg,#4a90e2,#357abd)', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer' },
  empty:      { color:'#4a5568', fontSize:'13px', textAlign:'center', padding:'30px' },
  alliCard:   { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'14px', display:'flex', flexDirection:'column', gap:'10px' },
  alliCardOn: { border:'1px solid rgba(74,144,226,0.35)', background:'rgba(74,144,226,0.06)' },
  alliTop:    { display:'flex', alignItems:'flex-start', gap:'12px' },
  alliIcon:   { fontSize:'26px', flexShrink:0 },
  alliName:   { fontSize:'15px', fontWeight:'800', color:'#e8eaf6', marginBottom:'2px' },
  alliDesc:   { fontSize:'12px', color:'#8892b0', marginBottom:'4px' },
  alliMeta:   { fontSize:'11px', color:'#4a5568' },
  joinBtn:    { padding:'7px 14px', background:'linear-gradient(135deg,#4a90e2,#357abd)', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'700', flexShrink:0 },
  leaveBtn:   { padding:'7px 14px', background:'rgba(233,69,96,0.15)', color:'#e94560', border:'1px solid rgba(233,69,96,0.3)', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'700', flexShrink:0 },
  memList:    { display:'flex', gap:'8px', flexWrap:'wrap' },
  memTag:     { display:'flex', alignItems:'center', gap:'6px', padding:'4px 10px', background:'rgba(255,255,255,0.05)', borderRadius:'20px', fontSize:'12px', color:'#c8cce0' },
  modCard:    { display:'flex', alignItems:'center', gap:'12px', padding:'12px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px' },
  modTop:     { display:'flex', alignItems:'flex-start', gap:'12px', width:'100%' },
  modIcon:    { fontSize:'22px', flexShrink:0 },
  modInfo:    { flex:1 },
  modName:    { fontSize:'14px', fontWeight:'700', color:'#e8eaf6', marginBottom:'3px' },
  modDesc:    { fontSize:'12px', color:'#8892b0', lineHeight:1.4 },
  toggle:     { width:'44px', height:'24px', borderRadius:'12px', position:'relative', transition:'background 0.2s', flexShrink:0 },
  toggleK:    { position:'absolute', top:'3px', width:'18px', height:'18px', background:'white', borderRadius:'50%', transition:'transform 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' },
  memberRow:  { display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' },
  roleSelect: { padding:'4px 8px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'#e8eaf6', fontSize:'12px', cursor:'pointer' },
  sanctBtn:   { padding:'9px 16px', background:'rgba(233,69,96,0.2)', border:'1px solid rgba(233,69,96,0.4)', color:'#e94560', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600', flexShrink:0 },
  sanctCard:  { display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'rgba(233,69,96,0.07)', borderRadius:'8px' },
  liftBtn:    { padding:'4px 10px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#8892b0', borderRadius:'6px', cursor:'pointer', fontSize:'11px' },
  cCard:      { display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px' },
  dipBtn:     { padding:'6px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#8892b0', borderRadius:'7px', cursor:'pointer', fontSize:'12px' },
};
