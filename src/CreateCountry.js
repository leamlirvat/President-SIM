import { useState } from 'react';
import { supabase } from './supabaseClient';

const SERVERS = [
  { id:1, name:'Europe-1', type:'Normal',   desc:'Progression standard',    emoji:'🌍', speed:'x1' },
  { id:2, name:'Monde-1',  type:'Rapide',   desc:'Vitesse de jeu doublée',  emoji:'⚡', speed:'x2' },
  { id:3, name:'Asie-1',   type:'Hardcore', desc:'Économie & guerres dures',emoji:'💀', speed:'x1' },
];

const COLORS = [
  '#e94560','#4a90e2','#2ed573','#f39c12','#9b59b6','#1abc9c',
  '#e67e22','#e74c3c','#3498db','#27ae60','#fd79a8','#fdcb6e',
  '#00b894','#6c5ce7','#a29bfe','#ff7675','#74b9ff','#55efc4',
];

// ─── Placement aléatoire du territoire de départ ─────────────────────────────
// On cherche une zone 3×3 entièrement libre sur le serveur donné.
// On essaie jusqu'à 40 positions aléatoires. Si toutes échouent, on prend
// n'importe quel bloc libre (cas de carte très peuplée).
async function findFreeStart(sid) {
  const MAX_TRIES = 40;
  for (let i = 0; i < MAX_TRIES; i++) {
    const cx = Math.floor(Math.random() * 44) + 3;   // 3..46
    const cy = Math.floor(Math.random() * 44) + 3;

    const xs = [cx - 1, cx, cx + 1];
    const ys = [cy - 1, cy, cy + 1];

    const { data: candidates } = await supabase
      .from('tiles')
      .select('id, ownercountryid, x, y')
      .eq('serverid', sid)
      .in('x', xs)
      .in('y', ys);

    if (!candidates || candidates.length < 9) continue; // 9 tuiles attendues

    const allFree = candidates.every(t => !t.ownercountryid);
    if (allFree) return candidates;
  }

  // Fallback : position aléatoire peu importe si occupée (extrême densité)
  const cx = Math.floor(Math.random() * 44) + 3;
  const cy = Math.floor(Math.random() * 44) + 3;
  const { data: fallback } = await supabase
    .from('tiles')
    .select('id, ownercountryid, x, y')
    .eq('serverid', sid)
    .in('x', [cx - 1, cx, cx + 1])
    .in('y', [cy - 1, cy, cy + 1]);
  return fallback || [];
}

async function initTerritory(cid, sid) {
  const tiles = await findFreeStart(sid);
  if (!tiles.length) return;

  const ids = tiles.map(t => t.id);

  // Marquer toutes les tuiles comme appartenant au joueur
  await supabase.from('tiles').update({ ownercountryid: cid }).in('id', ids);

  // Enregistrer la découverte de chaque tuile
  for (const id of ids) {
    const { error } = await supabase
      .from('discoveries')
      .insert({ countryid: cid, tileid: id });
    if (error && error.code !== '23505') console.warn('discovery:', error.message);
  }
}

export default function CreateCountry({ setCountry }) {
  const [step, setStep]     = useState(1);
  const [server, setServer] = useState(null);
  const [name, setName]     = useState('');
  const [color, setColor]   = useState('#4a90e2');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function create() {
    if (!name.trim()) return setError('Donne un nom à ton pays !');
    if (!server)      return setError('Choisis un serveur !');
    setError(''); setLoading(true);

    const { data: ud } = await supabase.auth.getUser();
    if (!ud?.user) { setError("Erreur d'authentification."); setLoading(false); return; }

    const { data, error: err } = await supabase
      .from('countries')
      .insert({
        user_id:         ud.user.id,
        name:            name.trim(),
        color:           color.replace('#', ''),
        serverid:        server.id,
        money:           5000,
        gdp:             1600,
        soldiers:        50,
        scouts:          10,
        army_production: 5,
        buildings:       [],
        resources:       {},
        policies:        {},
        research:        {},
        military_units:  {},
      })
      .select('*')
      .single();

    if (err) { setError(err.message); setLoading(false); return; }

    // Placement aléatoire du territoire de départ
    await initTerritory(data.id, server.id);
    setCountry(data);
    setLoading(false);
  }

  return (
    <div style={s.page}>
      <div style={s.glow}/>
      <div style={s.card}>
        {/* Stepper */}
        <div style={s.stepper}>
          {[{n:1,l:'Serveur'},{n:2,l:'Pays'}].map((st, i) => (
            <div key={st.n} style={{ display:'flex', alignItems:'center', gap: i===0?0:'10px' }}>
              {i > 0 && <div style={{ ...s.stepLine, ...(step >= st.n ? s.stepLineOn : {}) }}/>}
              <div style={{ ...s.stepItem, ...(step >= st.n ? s.stepOn : {}) }}>
                <div style={s.stepNum}>{st.n}</div>
                <span>{st.l}</span>
              </div>
            </div>
          ))}
        </div>

        {error && <div style={s.err}>⚠️ {error}</div>}

        {/* Étape 1 : Serveur */}
        {step === 1 && (
          <>
            <h2 style={s.h2}>Choisis ton serveur</h2>
            <p style={s.p}>Chaque serveur a sa propre carte et sa communauté de joueurs.</p>
            <div style={s.serverList}>
              {SERVERS.map(sv => (
                <div key={sv.id}
                  style={{ ...s.sv, ...(server?.id === sv.id ? s.svOn : {}) }}
                  onClick={() => setServer(sv)}>
                  <span style={s.svEmoji}>{sv.emoji}</span>
                  <div style={s.svInfo}>
                    <div style={s.svName}>
                      {sv.name} <span style={s.svSpeed}>{sv.speed}</span>
                    </div>
                    <div style={s.svType}>{sv.type} — {sv.desc}</div>
                  </div>
                  {server?.id === sv.id && <div style={s.check}>✓</div>}
                </div>
              ))}
            </div>
            <button
              style={{ ...s.btn, ...((!server) ? s.btnOff : {}) }}
              onClick={() => server && setStep(2)}
              disabled={!server}>
              Suivant →
            </button>
          </>
        )}

        {/* Étape 2 : Pays */}
        {step === 2 && (
          <>
            <h2 style={s.h2}>Crée ton pays</h2>
            <p style={s.p}>Serveur : <strong style={{ color:'#4a90e2' }}>{server?.name} ({server?.type})</strong></p>

            <label style={s.lbl}>Nom du pays</label>
            <input style={s.input}
              placeholder="Ex : République de France"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && create()}
              maxLength={32}
              autoFocus/>

            <label style={s.lbl}>Couleur du drapeau</label>
            <div style={s.colorGrid}>
              {COLORS.map(c => (
                <div key={c}
                  style={{ ...s.dot, background:c, ...(color === c ? s.dotOn : {}) }}
                  onClick={() => setColor(c)}/>
              ))}
            </div>

            <div style={s.preview}>
              <div style={{ ...s.flag, background:color }}/>
              <div>
                <div style={s.previewName}>{name || 'Mon pays'}</div>
                <div style={s.previewSub}>Aperçu du drapeau</div>
              </div>
            </div>

            <div style={s.startBox}>
              {[
                '🏛️ Territoire de départ (9 cases) placé aléatoirement',
                '💰 5 000$ de trésorerie de départ',
                '⚔️ 50 soldats + 10 éclaireurs',
                '📈 PIB initial : 1 600$',
                '🔬 Recherche et bâtiments vierges',
              ].map(t => (
                <div key={t} style={s.startItem}>{t}</div>
              ))}
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button
                style={{ ...s.btn, flex:'none', padding:'14px 18px', background:'rgba(255,255,255,0.06)', color:'#aaa' }}
                onClick={() => setStep(1)}>
                ← Retour
              </button>
              <button style={{ ...s.btn, flex:1 }} onClick={create} disabled={loading}>
                {loading ? '⏳ Création en cours...' : '🚀 Lancer mon pays !'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page:       { display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'#0d0f1a', padding:'20px', position:'relative', overflow:'hidden', fontFamily:"'Inter',system-ui,sans-serif" },
  glow:       { position:'fixed', inset:0, background:'radial-gradient(ellipse at 30% 50%,rgba(74,144,226,0.07) 0%,transparent 60%)', pointerEvents:'none' },
  card:       { background:'rgba(19,22,39,0.98)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px', padding:'36px', maxWidth:'500px', width:'100%', position:'relative' },
  stepper:    { display:'flex', alignItems:'center', marginBottom:'28px', gap:'10px' },
  stepItem:   { display:'flex', alignItems:'center', gap:'8px', color:'#4a5568', fontSize:'13px', fontWeight:'600', transition:'color 0.2s' },
  stepOn:     { color:'#4a90e2' },
  stepNum:    { width:'26px', height:'26px', borderRadius:'50%', background:'rgba(74,144,226,0.15)', border:'1px solid rgba(74,144,226,0.35)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:'#4a90e2' },
  stepLine:   { flex:1, height:'1px', background:'rgba(255,255,255,0.07)', width:'40px' },
  stepLineOn: { background:'rgba(74,144,226,0.4)' },
  h2:         { margin:'0 0 6px', fontSize:'22px', fontWeight:'800', color:'#e8eaf6' },
  p:          { margin:'0 0 22px', color:'#8892b0', fontSize:'13px' },
  err:        { background:'rgba(233,69,96,0.12)', border:'1px solid rgba(233,69,96,0.3)', borderRadius:'8px', padding:'10px 14px', color:'#e94560', fontSize:'13px', marginBottom:'16px' },
  serverList: { display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px' },
  sv:         { display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', cursor:'pointer', background:'rgba(255,255,255,0.02)', transition:'all 0.2s' },
  svOn:       { border:'1px solid rgba(74,144,226,0.5)', background:'rgba(74,144,226,0.08)' },
  svEmoji:    { fontSize:'28px', flexShrink:0 },
  svInfo:     { flex:1 },
  svName:     { color:'#e8eaf6', fontWeight:'700', fontSize:'15px' },
  svSpeed:    { fontSize:'11px', background:'rgba(74,144,226,0.2)', color:'#4a90e2', padding:'1px 6px', borderRadius:'4px', marginLeft:'6px' },
  svType:     { color:'#4a90e2', fontSize:'12px', marginTop:'2px' },
  check:      { color:'#2ed573', fontWeight:'800', fontSize:'18px' },
  btn:        { width:'100%', padding:'14px', background:'linear-gradient(135deg,#4a90e2,#357abd)', color:'white', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:'700', cursor:'pointer' },
  btnOff:     { opacity:0.4, cursor:'not-allowed' },
  lbl:        { display:'block', color:'#8892b0', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' },
  input:      { width:'100%', padding:'13px 16px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', fontSize:'14px', background:'rgba(255,255,255,0.04)', color:'white', outline:'none', boxSizing:'border-box', marginBottom:'20px' },
  colorGrid:  { display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px' },
  dot:        { width:'34px', height:'34px', borderRadius:'50%', cursor:'pointer', transition:'transform 0.15s,box-shadow 0.15s' },
  dotOn:      { transform:'scale(1.2)', boxShadow:'0 0 0 3px rgba(255,255,255,0.35)' },
  preview:    { display:'flex', alignItems:'center', gap:'14px', marginBottom:'20px', padding:'12px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px' },
  flag:       { width:'52px', height:'34px', borderRadius:'4px', flexShrink:0 },
  previewName:{ color:'#e8eaf6', fontWeight:'700', fontSize:'15px' },
  previewSub: { color:'#8892b0', fontSize:'12px', marginTop:'2px' },
  startBox:   { display:'flex', flexDirection:'column', gap:'6px', marginBottom:'20px' },
  startItem:  { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'8px', padding:'8px 12px', color:'#8892b0', fontSize:'12px' },
};
