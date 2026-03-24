import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true); setError(''); setMessage('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setLoading(false);
  }
  async function handleSignup() {
    setLoading(true); setError(''); setMessage('');
    const { error: err } = await supabase.auth.signUp({ email, password });
    if (err) setError(err.message);
    else setMessage('Vérifie ton email pour confirmer ton compte !');
    setLoading(false);
  }
  const submit = tab === 'login' ? handleLogin : handleSignup;

  return (
    <div style={s.page}>
      <div style={s.glow1}/><div style={s.glow2}/>
      <div style={s.panel}>
        <div style={s.logoRow}><span style={s.logoIcon}>🌍</span><span style={s.logoText}>President Simulator</span></div>
        <p style={s.sub}>Stratégie géopolitique multijoueur</p>
        <div style={s.featGrid}>
          {[['🗺️','Carte monde 50×50'],['⚔️','7 branches militaires'],['💰','21 ressources'],['🤝','Alliances & diplomatie'],['⚖️','Politique complète'],['🔬','Arbre de recherche']].map(([ic,t])=>(
            <div key={t} style={s.feat}><span>{ic}</span><span style={s.featTxt}>{t}</span></div>
          ))}
        </div>
      </div>
      <div style={s.formWrap}>
        <div style={s.card}>
          <div style={s.tabs}>
            <button style={{...s.tab,...(tab==='login'?s.tabOn:{})}} onClick={()=>{setTab('login');setError('');setMessage('');}}>Se connecter</button>
            <button style={{...s.tab,...(tab==='signup'?s.tabOn:{})}} onClick={()=>{setTab('signup');setError('');setMessage('');}}>S'inscrire</button>
          </div>
          {error   && <div style={s.alertErr}>⚠️ {error}</div>}
          {message && <div style={s.alertOk}>✅ {message}</div>}
          <input style={s.input} type="email" placeholder="Adresse email" value={email} onChange={e=>setEmail(e.target.value)} autoFocus/>
          <input style={s.input} type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
          <button style={s.btn} onClick={submit} disabled={loading}>
            {loading ? '⏳ Chargement...' : (tab==='login' ? '🚀 Se connecter' : '🌍 Créer mon compte')}
          </button>
          <div style={s.hint}>{tab==='login' ? "Pas encore de compte ? Inscris-toi." : "Déjà un compte ? Connecte-toi."}</div>
        </div>
      </div>
    </div>
  );
}
const s={
  page:    {display:'flex',minHeight:'100vh',background:'#0d0f1a',fontFamily:"'Inter',system-ui,sans-serif",position:'relative',overflow:'hidden'},
  glow1:   {position:'fixed',top:'-20%',left:'-10%',width:'600px',height:'600px',background:'radial-gradient(circle,rgba(74,144,226,0.09) 0%,transparent 70%)',pointerEvents:'none'},
  glow2:   {position:'fixed',bottom:'-20%',right:'-10%',width:'500px',height:'500px',background:'radial-gradient(circle,rgba(233,69,96,0.07) 0%,transparent 70%)',pointerEvents:'none'},
  panel:   {flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px 60px 60px 80px'},
  logoRow: {display:'flex',alignItems:'center',gap:'14px',marginBottom:'10px'},
  logoIcon:{fontSize:'48px'},
  logoText:{fontSize:'32px',fontWeight:'900',color:'#e8eaf6',letterSpacing:'-1px'},
  sub:     {margin:'0 0 40px',color:'#8892b0',fontSize:'15px'},
  featGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',maxWidth:'400px'},
  feat:    {display:'flex',alignItems:'center',gap:'10px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'12px 14px'},
  featTxt: {color:'#a8b4d0',fontSize:'13px'},
  formWrap:{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 80px 40px 40px'},
  card:    {background:'rgba(19,22,39,0.97)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'20px',padding:'36px',width:'100%',maxWidth:'400px',backdropFilter:'blur(20px)'},
  tabs:    {display:'flex',background:'rgba(0,0,0,0.35)',borderRadius:'10px',padding:'4px',marginBottom:'24px',gap:'4px'},
  tab:     {flex:1,padding:'10px',background:'none',border:'none',borderRadius:'7px',color:'#8892b0',fontSize:'14px',fontWeight:'600',cursor:'pointer',transition:'all 0.2s'},
  tabOn:   {background:'rgba(74,144,226,0.18)',color:'#4a90e2',boxShadow:'0 0 0 1px rgba(74,144,226,0.3)'},
  alertErr:{background:'rgba(233,69,96,0.12)',border:'1px solid rgba(233,69,96,0.25)',borderRadius:'8px',padding:'10px 14px',color:'#e94560',fontSize:'13px',marginBottom:'14px'},
  alertOk: {background:'rgba(46,213,115,0.12)',border:'1px solid rgba(46,213,115,0.25)',borderRadius:'8px',padding:'10px 14px',color:'#2ed573',fontSize:'13px',marginBottom:'14px'},
  input:   {width:'100%',padding:'13px 16px',border:'1px solid rgba(255,255,255,0.09)',borderRadius:'10px',fontSize:'14px',background:'rgba(255,255,255,0.04)',color:'white',outline:'none',marginBottom:'10px',boxSizing:'border-box'},
  btn:     {width:'100%',padding:'14px',background:'linear-gradient(135deg,#4a90e2,#357abd)',color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer',marginTop:'4px'},
  hint:    {textAlign:'center',color:'#4a5568',fontSize:'12px',marginTop:'14px'},
};
