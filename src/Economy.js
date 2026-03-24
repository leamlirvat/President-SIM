import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const Economy = ({ country }) => {
  const [resources, setResources] = useState({
    food: 1000, oil: 500, iron: 800, charbon: 1000, cuivre: 600,
    gold: 100, engines: 50, tnt: 200, plastic: 300, water: 2000
  })

  useEffect(() => {
    loadResources()
    const interval = setInterval(loadResources, 5000)
    return () => clearInterval(interval)
  }, [country.id])

  async function loadResources() {
    const { data } = await supabase
      .from('country_resources')
      .select()
      .eq('countryid', country.id)
      .single()
    if (data) setResources(data)
  }

  const resourceList = [
    { key: 'food', emoji: '🍞', name: 'Nourriture' },
    { key: 'oil', emoji: '🛢️', name: 'Pétrole' },
    { key: 'iron', emoji: '⛏️', name: 'Fer' },
    { key: 'charbon', emoji: '⚫', name: 'Charbon' },
    { key: 'cuivre', emoji: '🧡', name: 'Cuivre' },
    { key: 'gold', emoji: '⭐', name: 'Or' },
    { key: 'engines', emoji: '⚙️', name: 'Moteurs' },
    { key: 'tnt', emoji: '💥', name: 'TNT' },
    { key: 'plastic', emoji: '🛒', name: 'Plastique' },
    { key: 'water', emoji: '💧', name: 'Eau' }
  ]

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>💰 Économie & Ressources</h2>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <h3>Revenus automatiques</h3>
          <p>15€ par case • 30 secondes</p>
        </div>
        <div style={styles.statCard}>
          <h3>Production totale</h3>
          <p>{Object.values(resources).reduce((a, b) => a + b, 0).toLocaleString()}</p>
        </div>
      </div>

      <div style={styles.resourcesGrid}>
        {resourceList.map(r => (
          <ResourceCard key={r.key} resource={r} amount={resources[r.key]} />
        ))}
      </div>

      <div style={styles.market}>
        <h3>🌍 Marché mondial</h3>
        <div style={styles.marketActions}>
          <button style={styles.actionBtn}>Vendre Fer (100u)</button>
          <button style={styles.actionBtn}>Acheter Pétrole</button>
        </div>
      </div>
    </div>
  )
}

const ResourceCard = ({ resource, amount }) => (
  <div style={styles.resourceCard}>
    <div style={styles.resourceEmoji}>{resource.emoji}</div>
    <div>
      <div style={styles.resourceName}>{resource.name}</div>
      <div style={styles.resourceAmount}>{amount.toLocaleString()}</div>
    </div>
  </div>
)

const styles = {
  container: { padding: '20px 0' },
  title: { marginBottom: '25px', fontSize: '24px', fontWeight: 700 },
  stats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' },
  statCard: { background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center' },
  resourcesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' },
  resourceCard: { display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px' },
  resourceEmoji: { fontSize: '24px' },
  resourceName: { fontSize: '14px', color: '#ccc', marginBottom: '4px' },
  resourceAmount: { fontSize: '18px', fontWeight: 600 },
  market: { background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px' },
  marketActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  actionBtn: { padding: '12px 20px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }
}

export default Economy
