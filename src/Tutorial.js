import { useState } from 'react';

const STEPS = [
  { icon:'🏛️', title:'Bienvenue dans President Simulator !', desc:"Tu es maintenant président de ta nation. Ce tutoriel te guide à travers les premières étapes.", detail:"Ton pays commence avec un petit territoire au centre de la carte, 1 000$ de trésorerie, 50 soldats et 10 éclaireurs. Bonne chance, chef d'État !" },
  { icon:'💰', title:'Étape 1 — Gérer ton budget', desc:"Dans l'onglet Économie, consulte tes ressources et ton PIB. Le budget est crucial pour tout développement.", detail:"Tu commences avec un PIB de 1 600$. Surveille ton solde : chaque bâtiment, unité et décision politique a un coût." },
  { icon:'🏗️', title:'Étape 2 — Construire des bâtiments', desc:"Dans l'onglet Bâtiments, construis une centrale électrique et une mine pour produire tes premières ressources.", detail:"Chaque bâtiment améliore tes domaines (économie, éducation, santé…) et produit des ressources de façon passive toutes les heures." },
  { icon:'⚔️', title:'Étape 3 — Recruter & conquérir', desc:"Sur la Carte, les cases dorées adjacentes à ton territoire sont conquérables. Clique dessus pour envoyer une expédition.", detail:"Chaque terrain demande un nombre minimum de guerriers. Les éclaireurs réduisent le temps d'expédition de 5 secondes chacun." },
  { icon:'🤝', title:'Étape 4 — Commerce & alliances', desc:"Dans l'onglet Diplomatie, crée ou rejoins des alliances. Échangez ressources, défendez-vous mutuellement.", detail:"Les alliances offrent : marché commun, pacte de défense, projets d'infrastructure partagés, et bien plus encore (45+ fonctionnalités)." },
  { icon:'⚖️', title:'Étape 5 — Voter des lois', desc:"Dans l'onglet Politique, ajuste les lois sur les impôts, la santé, l'éducation et les libertés civiles.", detail:"Tes lois impactent la satisfaction de la population, tes revenus et ta réputation internationale. Équilibre = puissance !" },
  { icon:'🔬', title:'Étape 6 — Recherche & espace', desc:"Dans l'onglet Recherche, lance des programmes : technologie, médecine, spatial, cybersécurité…", detail:"La recherche débloque de nouvelles unités, bâtiments et capacités. Le programme spatial te permet de lancer des satellites et d'exploiter des astéroïdes !" },
];

export default function Tutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.progress}>
          {STEPS.map((_,i)=><div key={i} style={{...s.dot,...(i<=step?s.dotOn:{})}} onClick={()=>setStep(i)}/>)}
        </div>
        <div style={s.icon}>{cur.icon}</div>
        <h2 style={s.title}>{cur.title}</h2>
        <p style={s.desc}>{cur.desc}</p>
        <div style={s.detail}>{cur.detail}</div>
        <div style={s.stepLbl}>Étape {step+1} / {STEPS.length}</div>
        <div style={s.actions}>
          <button style={s.btnSec} onClick={onClose}>Passer</button>
          {step>0 && <button style={s.btnSec} onClick={()=>setStep(p=>p-1)}>← Précédent</button>}
          <button style={s.btnPri} onClick={()=>isLast?onClose():setStep(p=>p+1)}>
            {isLast ? '🚀 Commencer !' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  );
}
const s={
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'},
  modal:  {background:'#131627',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'40px',maxWidth:'520px',width:'90%',textAlign:'center'},
  progress:{display:'flex',gap:'6px',justifyContent:'center',marginBottom:'28px'},
  dot:    {width:'8px',height:'8px',borderRadius:'50%',background:'rgba(255,255,255,0.12)',cursor:'pointer',transition:'all 0.2s'},
  dotOn:  {background:'#4a90e2',width:'24px',borderRadius:'4px'},
  icon:   {fontSize:'56px',marginBottom:'16px'},
  title:  {margin:'0 0 12px',fontSize:'22px',fontWeight:'800',color:'#e8eaf6'},
  desc:   {margin:'0 0 16px',color:'#8892b0',fontSize:'14px',lineHeight:1.6},
  detail: {background:'rgba(74,144,226,0.08)',border:'1px solid rgba(74,144,226,0.2)',borderRadius:'10px',padding:'14px',color:'#a8b4d0',fontSize:'13px',lineHeight:1.7,marginBottom:'24px',textAlign:'left'},
  stepLbl:{color:'#4a5568',fontSize:'12px',marginBottom:'20px'},
  actions:{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'},
  btnPri: {padding:'12px 24px',background:'linear-gradient(135deg,#4a90e2,#357abd)',color:'white',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:'pointer'},
  btnSec: {padding:'12px 20px',background:'rgba(255,255,255,0.05)',color:'#8892b0',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',fontSize:'14px',cursor:'pointer'},
};
