import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const Alliances = ({ country }) => {
  const [tab, setTab] = useState('mes-alliances')
  const [newAllianceName, setNewAllianceName] = useState('')

  const allianceFeatures = {
    militaire: ['Pacte défense', 'Bases partagées', 'Non-agression', 'Aide auto'],
    economie: ['Marché commun', 'Fonds secours', 'Projets communs', 'Sans taxes'],
    politique: ['Votes ONU', 'Sanctions', 'Embargo', 'Diplomatie']
  }

  const createAlliance = async () => {
    if (!newAllianceName.trim()) return
    const color = Math.floor(Math.random() * 16777215).toString(16)
    const { data } = await supabase
      .from('alliances')
      .insert({ name: newAllianceName.trim(), leadercountryid: country.id, color, serverid: country.serverid })
      .select()
      .single()
    await supabase.from('alliance_members').insert({
      allianceid: data.id,
      countryid: country.id,
      role: 'leader'
    })
    setNewAllianceName('')
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🤝 Alliances diplomatiques</h2>

      <div style={styles.createSection}>
        <input
          style={styles.input}
          placeholder="Nom de ta nouvelle alliance"
          value={newAllianceName}
          onChange={(e) => setNewAllianceName(e.target.value)}
        />
        <button style={styles.createBtn} onClick={createAlliance}>Créer</button>
      </div>

      <div style={styles.tabs}>
        <button style={{ ...styles.tabBtn, ...(tab === 'mes-alliances' ? styles.tabActive : {}) }}
                onClick={() => setTab('mes-alliances')}>Mes alliances</button>
        <button style={{ ...styles.tabBtn, ...(tab === 'publiques' ? styles.tabActive : {}) }}
                onClick={() => setTab('publiques')}>Publiques</button>
        <button style={{ ...styles.tabBtn, ...(tab === 'fonctionnalites' ? styles.tabActive : {}) }}
                onClick={() => setTab('fonctionnalites')}>Fonctionnalités</button>
      </div>

      {tab === 'mes-alliances' && (
        <div style={styles.emptyState}>
          Aucune alliance. Crée la tienne ou rejoins-en une !
        </div>
      )}

      {tab === 'publiques' && (
        <div style={styles.publicAlliance}>
          <div style={styles.allianceCard}>
            <div style={{ ...styles.allianceColor, backgroundColor: '#ff6b6b' }} />
            <div style={styles.allianceInfo}>
              <div style={styles.allianceName}>Union Européenne</div>
              <div>15 membres • Ouverte</div>
            </div>
            <button style={styles.joinBtn}>Rejoindre</button>
          </div>
        </div>
      )}

      {tab === 'fonctionnalites' && (
        <div style={styles.featuresGrid}>
          {Object.entries(allianceFeatures).flatMap(([category, features]) => 
            features.map((feature, i) => (
              <FeatureCard key={`${category}-${i}`} feature={feature} category={category} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

const FeatureCard = ({ feature, category }) => (
  <div style={styles.featureCard}>
    <div style={styles.featureIcon}>⭐</div>
    <div style={styles.featureName}>{feature}</div>
    <div style={styles.featureCategory}>{category}</div>
  </div>
)

const styles = {
  container: { padding: '20px 0' },
  title: { marginBottom: '25px' },
  createSection: { display: 'flex', gap: '12px', marginBottom: '25px' },
  input: { flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white' },
  createBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #27ae60, #229954)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600 },
  tabs: { display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '25px' },
  tabBtn: { flex: 1, padding: '14px', background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' },
  tabActive: { background: 'rgba(255,255,255,0.15)', color: 'white' },
  emptyState: { textAlign: 'center', color: '#aaa', padding: '40px', fontSize: '16px' },
  publicAlliance: { maxHeight: '400px', overflowY: 'auto' },
  allianceCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '12px' },
  allianceColor: { width: '40px', height: '40px', borderRadius: '8px' },
  allianceInfo: { flex: 1 },
  allianceName: { fontSize: '18px', fontWeight: 600, marginBottom: '4px' },
  joinBtn: { padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 500 },
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' },
  featureCard: { background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', textAlign: 'center' },
  featureIcon: { fontSize: '24px', marginBottom: '12px' },
  featureName: { fontSize: '14px', marginBottom: '8px', fontWeight: 500 },
  featureCategory: { fontSize: '12px', color: '#aaa', textTransform: 'uppercase' }
}

export default Alliances
