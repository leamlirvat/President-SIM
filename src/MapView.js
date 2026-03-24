import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';

const MAP_SIZE = 50;
const TILE_SIZE = 12; // px per tile (visible area)
const GAP = 1;        // px gap between tiles

const toHex = (c) => !c ? '#4a90e2' : (c.startsWith('#') ? c : '#' + c.padStart(6,'0'));

function hexToRgb(hex) {
  const h = hex.replace('#','');
  return { r:parseInt(h.slice(0,2),16), g:parseInt(h.slice(2,4),16), b:parseInt(h.slice(4,6),16) };
}

function darken(hex, pct) {
  const { r,g,b } = hexToRgb(hex);
  const f = 1 - pct/100;
  return `rgb(${Math.round(r*f)},${Math.round(g*f)},${Math.round(b*f)})`;
}

function lighten(hex, pct) {
  const { r,g,b } = hexToRgb(hex);
  const f = pct/100;
  return `rgb(${Math.min(255,Math.round(r+(255-r)*f))},${Math.min(255,Math.round(g+(255-g)*f))},${Math.min(255,Math.round(b+(255-b)*f))})`;
}

const TERRAIN = {
  plaine:   { base:'#2d6a4f', light:'#40916c', label:'Plaine',    emoji:'🌾', baseTime:30,  minWarriors:5  },
  foret:    { base:'#1b4332', light:'#2d6a4f', label:'Forêt',     emoji:'🌲', baseTime:60,  minWarriors:10 },
  montagne: { base:'#4a3728', light:'#6b5344', label:'Montagne',  emoji:'⛰️', baseTime:120, minWarriors:20 },
  desert:   { base:'#9c6b00', light:'#c88600', label:'Désert',    emoji:'🏜️', baseTime:90,  minWarriors:15 },
};

const TPX = TILE_SIZE + GAP;

export default function MapView({ country, updateCountry, onTileCapture }) {
  const [tiles, setTiles]           = useState([]);
  const [countries, setCountries]   = useState({});  // id → {name,color}
  const [colonizations, setCols]    = useState([]);
  const [selectedTile, setSel]      = useState(null);
  const [warriors, setWarriors]     = useState(5);
  const [scouts, setScouts]         = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMsg]           = useState('');
  const [now, setNow]               = useState(Date.now());
  const [loading, setLoading]       = useState(true);
  const tilesMap = useRef({});

  // 1-second timer for countdowns
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Build lookup
  useEffect(() => {
    const m = {};
    tiles.forEach(t => { m[`${t.x}-${t.y}`] = t; });
    tilesMap.current = m;
  }, [tiles]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const sid = country.serverid || 1;

    const [tilesRes, colsRes, cRes] = await Promise.all([
      supabase.from('tiles').select('*').eq('serverid', sid),
      supabase.from('colonizations').select('*').eq('countryid', country.id).eq('status','pending'),
      supabase.from('countries').select('id,name,color').eq('serverid', sid),
    ]);

    setTiles(tilesRes.data || []);
    setCols(colsRes.data || []);

    const cmap = {};
    (cRes.data || []).forEach(c => { cmap[c.id] = c; });
    setCountries(cmap);
    setLoading(false);
  }, [country.id, country.serverid]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime: tiles updates on same server
  useEffect(() => {
    const sid = country.serverid || 1;
    const ch = supabase
      .channel(`tiles-server-${sid}`)
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'tiles', filter:`serverid=eq.${sid}` },
        payload => {
          setTiles(prev => prev.map(t => t.id===payload.new.id ? { ...t, ...payload.new } : t));
        })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [country.serverid]);

  // Check colonizations completed
  useEffect(() => {
    const iv = setInterval(async () => {
      const done = colonizations.filter(c => new Date(c.completesat) <= new Date(now));
      if (!done.length) return;
      for (const col of done) await finalizeColonization(col);
      await loadAll();
    }, 2000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colonizations, now]);

  async function safeDiscover(tileid) {
    const { error } = await supabase.from('discoveries').insert({ countryid:country.id, tileid });
    if (error && error.code !== '23505') console.warn(error.message);
  }

  async function finalizeColonization(col) {
    await Promise.all([
      supabase.from('tiles').update({ ownercountryid:country.id }).eq('id', col.tileid),
      supabase.from('colonizations').update({ status:'completed' }).eq('id', col.id),
    ]);
    await safeDiscover(col.tileid);
    const { data: curr } = await supabase.from('countries').select('soldiers,scouts').eq('id', country.id).single();
    if (curr) {
      const u = { soldiers:(curr.soldiers||0)+col.warriors, scouts:(curr.scouts||0)+col.scouts };
      await supabase.from('countries').update(u).eq('id', country.id);
      updateCountry(u);
    }
    onTileCapture?.();
  }

  // ─── Tile state for THIS player ──────────────────────────────────────────
  function getTileState(tile) {
    if (!tile) return 'empty';
    const col = colonizations.find(c => c.tileid===tile.id && c.status==='pending');
    if (col) return 'colonizing';
    if (tile.ownercountryid === country.id) return 'owned';
    if (tile.ownercountryid) return 'enemy';
    if (isAdjacent(tile.x, tile.y)) return 'capturable';
    return 'neutral';
  }

  function isAdjacent(x, y) {
    return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([nx,ny]) => {
      const t = tilesMap.current[`${nx}-${ny}`];
      return t && t.ownercountryid === country.id;
    });
  }

  function getTileColor(tile, state) {
    const ter = TERRAIN[tile?.terraintype] || TERRAIN.plaine;
    switch (state) {
      case 'owned':
        return toHex(country.color);
      case 'colonizing':
        return '#d4800a';
      case 'capturable':
        return lighten(ter.light, 15);
      case 'enemy': {
        const oc = countries[tile.ownercountryid];
        return oc ? toHex(oc.color) : '#8b0000';
      }
      case 'neutral':
        return ter.base;
      default:
        return '#111520';
    }
  }

  function calcTime(tile, sc) {
    const base = TERRAIN[tile?.terraintype]?.baseTime || 60;
    return Math.max(base - Math.min(sc*5, Math.floor(base*0.6)), 10);
  }

  function handleClick(x, y) {
    const tile = tilesMap.current[`${x}-${y}`];
    if (!tile) return;
    const state = getTileState(tile);
    setMsg('');
    const ter = TERRAIN[tile.terraintype] || TERRAIN.plaine;
    setWarriors(ter.minWarriors);
    setScouts(1);
    setSel({ ...tile, state });
  }

  async function startColonization() {
    if (!selectedTile) return;
    const cs = country.soldiers ?? 0;
    const csc = country.scouts ?? 0;
    if (warriors < 1) return setMsg('❌ Au moins 1 guerrier requis.');
    if (warriors > cs) return setMsg(`❌ Soldats insuffisants (${cs} dispo).`);
    if (scouts < 1) return setMsg('❌ Au moins 1 éclaireur requis.');
    if (scouts > csc) return setMsg(`❌ Éclaireurs insuffisants (${csc} dispo).`);
    const ter = TERRAIN[selectedTile.terraintype] || TERRAIN.plaine;
    if (warriors < ter.minWarriors) return setMsg(`❌ Il faut au moins ${ter.minWarriors} guerriers pour ce terrain.`);

    setSubmitting(true); setMsg('');
    const dur = calcTime(selectedTile, scouts);
    const completesat = new Date(Date.now() + dur*1000).toISOString();
    const ns = cs-warriors, nsc = csc-scouts;

    await Promise.all([
      supabase.from('countries').update({ soldiers:ns, scouts:nsc }).eq('id', country.id),
      supabase.from('colonizations').insert({ countryid:country.id, tileid:selectedTile.id, warriors, scouts, completesat, status:'pending' }),
    ]);
    await safeDiscover(selectedTile.id);
    updateCountry({ soldiers:ns, scouts:nsc });
    setSel(null);
    setSubmitting(false);
    await loadAll();
  }

  async function cancelColonization(col) {
    await supabase.from('colonizations').update({ status:'cancelled' }).eq('id', col.id);
    const { data: curr } = await supabase.from('countries').select('soldiers,scouts').eq('id', country.id).single();
    if (curr) {
      const u = { soldiers:(curr.soldiers||0)+col.warriors, scouts:(curr.scouts||0)+col.scouts };
      await supabase.from('countries').update(u).eq('id', country.id);
      updateCountry(u);
    }
    await loadAll();
  }

  const colorHex  = toHex(country.color);
  const activeCols = colonizations.filter(c => c.status==='pending');

  return (
    <div style={s.wrap}>
      {/* ── Map Area ── */}
      <div style={s.mapArea}>
        {/* Légende */}
        <div style={s.legend}>
          <span style={s.legTitle}>🗺️ Serveur {country.serverid||1}</span>
          {Object.entries(TERRAIN).map(([k,t]) => (
            <LegDot key={k} color={t.base} label={`${t.emoji} ${t.label}`}/>
          ))}
          <LegDot color={colorHex} label="Ton territoire"/>
          <LegDot color={lighten(TERRAIN.plaine.light,15)} label="Conquérable"/>
          <LegDot color="#d4800a" label="Expédition"/>
          <LegDot color="#8b0000" label="Ennemi"/>
        </div>

        {/* Carte scrollable */}
        <div style={s.mapBox}>
          {loading ? (
            <div style={s.loading}>⏳ Chargement de la carte…</div>
          ) : (
            <div style={s.grid}>
              {Array.from({ length:MAP_SIZE }, (_,y) =>
                Array.from({ length:MAP_SIZE }, (_,x) => {
                  const tile  = tilesMap.current[`${x}-${y}`];
                  const state = getTileState(tile||null);
                  const bg    = tile ? getTileColor(tile, state) : '#111520';
                  const isSel = selectedTile?.x===x && selectedTile?.y===y;
                  const col   = tile && colonizations.find(c => c.tileid===tile.id);
                  const secL  = col ? Math.max(0, Math.ceil((new Date(col.completesat)-now)/1000)) : 0;
                  const ter   = TERRAIN[tile?.terraintype] || TERRAIN.plaine;

                  const oc    = tile?.ownercountryid && countries[tile.ownercountryid];
                  const title = tile
                    ? `${ter.emoji} ${ter.label} (${x},${y})${oc ? ` — ${oc.name}` : ''}${col ? ` ⏳${secL}s` : ''}`
                    : `(${x},${y})`;

                  return (
                    <div key={`${x}-${y}`}
                      onClick={() => handleClick(x,y)}
                      title={title}
                      style={{
                        width: TILE_SIZE, height: TILE_SIZE,
                        background: bg,
                        cursor: state!=='empty' ? 'pointer' : 'default',
                        outline: isSel ? '2px solid white' : state==='colonizing' ? '1px solid #d4800a' : state==='capturable' ? '1px solid rgba(255,255,255,0.3)' : 'none',
                        outlineOffset: '-1px',
                        borderRadius: '1px',
                        boxSizing: 'border-box',
                        transition: 'filter 0.1s',
                      }}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={s.panel}>
        {/* Expéditions actives */}
        {activeCols.length > 0 && (
          <div style={s.expBox}>
            <div style={s.boxH}>⚔️ Expéditions ({activeCols.length})</div>
            {activeCols.map(col => {
              const tile = tiles.find(t => t.id===col.tileid);
              const ter  = TERRAIN[tile?.terraintype] || TERRAIN.plaine;
              const secL = Math.max(0, Math.ceil((new Date(col.completesat)-now)/1000));
              const base = ter.baseTime;
              const pct  = Math.min(100, Math.round((1 - secL/base)*100));
              return (
                <div key={col.id} style={s.colCard}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'13px', fontWeight:'600', color:'#e8eaf6' }}>
                      {ter.emoji} ({tile?.x},{tile?.y})
                    </span>
                    <button style={s.cancelBtn} onClick={() => cancelColonization(col)}>✕</button>
                  </div>
                  <div style={{ fontSize:'11px', color:'#8892b0', margin:'4px 0' }}>
                    ⚔️ {col.warriors} · 🔭 {col.scouts} · {secL>0?`⏳ ${secL}s`:'✅ Finalisation…'}
                  </div>
                  <div style={s.colBar}>
                    <div style={{ height:'100%', width:`${pct}%`, background:secL===0?'#27ae60':'#d4800a', borderRadius:'3px', transition:'width 1s linear' }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tile sélectionnée */}
        {selectedTile ? (
          <div style={s.tilePanel}>
            <div style={s.tileH}>
              <div>
                <div style={s.tileName}>
                  {TERRAIN[selectedTile.terraintype]?.emoji} {TERRAIN[selectedTile.terraintype]?.label}
                </div>
                <div style={s.tileCoord}>({selectedTile.x}, {selectedTile.y})</div>
              </div>
              <button style={s.closeBtn} onClick={()=>{setSel(null);setMsg('');}}>✕</button>
            </div>

            <div style={s.tileBody}>
              <TRow label="Statut"
                value={
                  selectedTile.state==='owned'      ? '✅ Ton territoire' :
                  selectedTile.state==='enemy'      ? `👥 ${countries[selectedTile.ownercountryid]?.name||'Ennemi'}` :
                  selectedTile.state==='colonizing' ? '⏳ Expédition en cours' :
                  selectedTile.state==='capturable' ? '🎯 Conquérable' : '⬜ Neutre'}
              />
              <TRow label="Terrain" value={`${TERRAIN[selectedTile.terraintype]?.emoji} ${TERRAIN[selectedTile.terraintype]?.label}`}/>
              <TRow label="Guerriers requis" value={`min. ${TERRAIN[selectedTile.terraintype]?.minWarriors}`}/>
              <TRow label="Tes soldats" value={country.soldiers??0}
                ok={(country.soldiers??0)>=(TERRAIN[selectedTile.terraintype]?.minWarriors||0)}/>
              <TRow label="Tes éclaireurs" value={country.scouts??0}/>
            </div>

            {message && <div style={s.errMsg}>{message}</div>}

            {selectedTile.state==='capturable' && (
              <div style={s.form}>
                <div style={s.formH}>⚔️ Lancer une expédition</div>
                <InputNum label="Guerriers" value={warriors} min={TERRAIN[selectedTile.terraintype]?.minWarriors||1} max={country.soldiers??0}
                  onChange={setWarriors} hint={`Min. ${TERRAIN[selectedTile.terraintype]?.minWarriors}`}/>
                <InputNum label="Éclaireurs" value={scouts} min={1} max={country.scouts??0}
                  onChange={setScouts} hint="−5s chacun"/>
                <div style={s.timeEst}>⏱️ Durée : <strong style={{color:'#4a90e2'}}>{calcTime(selectedTile, scouts)}s</strong></div>
                <button style={{...s.goBtn, opacity:submitting?0.5:1}} onClick={startColonization} disabled={submitting}>
                  {submitting ? '⏳ Lancement…' : '🚀 Lancer l\'expédition'}
                </button>
              </div>
            )}
            {selectedTile.state==='owned'      && <div style={s.infoMsg}>✅ Ce territoire t'appartient</div>}
            {selectedTile.state==='neutral'    && <div style={s.infoMsg}>ℹ️ Non adjacent à ton territoire</div>}
            {selectedTile.state==='enemy'      && <div style={s.infoMsg}>⚔️ Territoire ennemi — guerre bientôt</div>}
            {selectedTile.state==='colonizing' && <div style={s.infoMsg}>⏳ Expédition déjà en cours ici</div>}
          </div>
        ) : !loading && (
          <div style={s.placeholder}>
            <div style={{fontSize:'34px', marginBottom:'12px'}}>👆</div>
            <div style={{color:'#8892b0', fontWeight:'600', marginBottom:'8px'}}>Clique sur une case</div>
            <div style={{color:'#4a5568', fontSize:'12px', lineHeight:1.8}}>
              <div>🌾 Plaine → 5 guerriers · 30s</div>
              <div>🌲 Forêt → 10 guerriers · 60s</div>
              <div>🏜️ Désert → 15 guerriers · 90s</div>
              <div>⛰️ Montagne → 20 guerriers · 120s</div>
            </div>
            <div style={{marginTop:'12px', color:'#2d3748', fontSize:'11px'}}>
              Cases claires = conquérables<br/>
              Toutes les cases sont visibles
            </div>
          </div>
        )}

        {/* Autres pays sur le serveur */}
        {Object.values(countries).filter(c=>c.id!==country.id).length > 0 && (
          <div style={s.othersBox}>
            <div style={s.boxH}>🌍 Joueurs sur ce serveur</div>
            {Object.values(countries).filter(c=>c.id!==country.id).map(c => (
              <div key={c.id} style={s.otherRow}>
                <div style={{width:10,height:10,borderRadius:'50%',background:toHex(c.color),flexShrink:0}}/>
                <span style={{fontSize:'13px',color:'#c8cce0'}}>{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LegDot({ color, label }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:'#8892b0'}}>
      <div style={{width:10,height:10,borderRadius:'2px',background:color,flexShrink:0}}/>
      <span>{label}</span>
    </div>
  );
}

function TRow({ label, value, ok }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
      <span style={{color:'#8892b0',fontSize:'12px'}}>{label}</span>
      <span style={{fontSize:'12px',fontWeight:'600',color:ok===true?'#2ed573':ok===false?'#e94560':'#e8eaf6'}}>{value}</span>
    </div>
  );
}

function InputNum({ label, value, min, max, onChange, hint }) {
  return (
    <div style={{marginBottom:'10px'}}>
      <div style={{color:'#8892b0',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'5px'}}>{label}</div>
      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
        <button style={s.numBtn} onClick={()=>onChange(Math.max(min,value-1))}>−</button>
        <input style={s.numIn} type="number" min={min} max={max} value={value}
          onChange={e=>onChange(Math.max(min,Math.min(max,parseInt(e.target.value)||min)))}/>
        <button style={s.numBtn} onClick={()=>onChange(Math.min(max,value+1))}>+</button>
      </div>
      {hint && <div style={{fontSize:'10px',color:'#4a5568',marginTop:'3px'}}>{hint}</div>}
    </div>
  );
}

const s = {
  wrap:      { display:'flex', height:'100%', overflow:'hidden' },
  mapArea:   { display:'flex', flexDirection:'column', flex:1, minWidth:0, padding:'14px', gap:'10px', overflow:'hidden' },
  legend:    { display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center', flexShrink:0 },
  legTitle:  { fontSize:'12px', fontWeight:'700', color:'#8892b0', marginRight:'4px' },
  mapBox:    { flex:1, overflow:'auto', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', background:'#060810', padding:'8px' },
  loading:   { display:'flex', alignItems:'center', justifyContent:'center', width:`${MAP_SIZE*TPX}px`, height:'300px', color:'#555' },
  grid:      { display:'grid', gridTemplateColumns:`repeat(${MAP_SIZE},${TILE_SIZE}px)`, gap:`${GAP}px`, width:'fit-content' },
  panel:     { width:'280px', flexShrink:0, padding:'14px', display:'flex', flexDirection:'column', gap:'12px', overflowY:'auto', borderLeft:'1px solid rgba(255,255,255,0.06)' },
  expBox:    { background:'rgba(212,128,10,0.09)', border:'1px solid rgba(212,128,10,0.25)', borderRadius:'10px', padding:'12px' },
  boxH:      { fontSize:'11px', fontWeight:'700', color:'#d4800a', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'10px' },
  colCard:   { background:'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'10px', marginBottom:'8px' },
  colBar:    { height:'4px', background:'rgba(255,255,255,0.08)', borderRadius:'3px', overflow:'hidden', marginTop:'4px' },
  cancelBtn: { background:'none', border:'none', color:'#e94560', cursor:'pointer', fontSize:'14px', padding:'0 2px' },
  tilePanel: { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'12px', overflow:'hidden' },
  tileH:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'13px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)' },
  tileName:  { fontSize:'15px', fontWeight:'700', color:'#e8eaf6' },
  tileCoord: { fontSize:'11px', color:'#8892b0', marginTop:'2px' },
  closeBtn:  { background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:'18px', lineHeight:1, padding:0 },
  tileBody:  { padding:'12px 13px' },
  errMsg:    { margin:'0 13px 10px', padding:'8px 12px', background:'rgba(233,69,96,0.12)', border:'1px solid rgba(233,69,96,0.25)', borderRadius:'8px', color:'#e94560', fontSize:'12px' },
  form:      { padding:'0 13px 13px' },
  formH:     { fontSize:'11px', fontWeight:'700', color:'#8892b0', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'10px' },
  timeEst:   { fontSize:'13px', color:'#8892b0', marginBottom:'10px' },
  goBtn:     { width:'100%', padding:'11px', background:'linear-gradient(135deg,#4a90e2,#357abd)', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer' },
  numBtn:    { width:'30px', height:'30px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'white', cursor:'pointer', fontSize:'16px', flexShrink:0 },
  numIn:     { flex:1, padding:'5px 8px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'white', textAlign:'center', fontSize:'14px', fontWeight:'700', outline:'none' },
  infoMsg:   { margin:'0 13px 13px', padding:'9px 12px', background:'rgba(255,255,255,0.04)', borderRadius:'8px', color:'#8892b0', fontSize:'12px', textAlign:'center' },
  placeholder:{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px', textAlign:'center', color:'#e8eaf6' },
  othersBox: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'12px' },
  otherRow:  { display:'flex', alignItems:'center', gap:'8px', padding:'4px 0' },
};
