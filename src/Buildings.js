const Buildings = ({ country }) => {
  const buildings = [
    { name: 'Usine', emoji: '🏭', cost: 200, income: '+5€/tour', domain: 'Économie' },
    { name: 'Mine de fer', emoji: '⛏️', cost: 300, income: '+10 Fer', domain: 'Ressources' },
    { name: 'Centrale nucléaire', emoji: '☢️', cost: 800, income: '+Énergie', domain: 'Énergie' },
    { name: 'École', emoji: '🏫', cost: 150, income: '+Recherche', domain: 'Éducation' },
    { name: 'Hôpital', emoji: '🏥', cost: 250, income: '+Santé', domain: 'Santé' },
    { name: 'Port commercial', emoji: '⚓', cost: 800, income: '+Commerce', domain: 'Commerce' },
    { name: 'Aéroport', emoji: '✈️', cost: 1200, income: '+Transport', domain: 'Infrastructures' },
    { name: 'Base militaire', emoji: '🏰', cost: 600, income: '+Défense', domain: 'Militaire' },
    { name: 'Université', emoji: '🎓', cost: 400, income: '+Technologie', domain: 'Recherche' },
    { name: 'Banque centrale', emoji: '🏦', cost: 1000, income: '+Stabilité', domain: 'Économie' }
  ]

  const handleBuild = (building) => {
    alert(`Construire ${building.name} (${building.cost}€)`)
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏗️ Bâtiments & Infrastructure</h2>

      <div style={styles.stats}>
        <div style={styles.stat}>Total bâtiments: 12</div>
        <div style={styles.stat}>Niveau moyen: 1.2</div>
      </div>

      <div style={styles.grid}>
        {buildings.map((b, i) => (
          <BuildingCard key={i} building={b} onBuild={handleBuild} />
        ))}
      </div>
    </div>
  )
}

const BuildingCard = ({ building, onBuild }) => (
  <div style={styles.buildingCard}>
    <div style={styles.buildingHeader}>
      <span style={styles.emoji}>{building.emoji}</span>
      <h4 style={styles.buildingName}>{building.name}</h4>
    </div>
    <div style={styles.buildingIncome}>{building.income}</div>
    <div style={styles.buildingDomain}>{building.domain}</div>
    <button style={styles.buildBtn} onClick={() => onBuild(building)}>
      Construire ({building.cost}€)
    </button>
  </div>
)

const styles = {
  container: { padding: '20px 0' },
  title: { marginBottom: '25px', fontSize: '24px' },
  stats: { display: 'flex', gap: '20px', marginBottom: '30px', fontSize: '14px', color: '#aaa' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
  buildingCard: { background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  buildingHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  emoji: { fontSize: '24px' },
  buildingName: { margin: 0, fontSize: '16px', fontWeight: 600 },
  buildingIncome: { color: '#27ae60', fontWeight: 500, marginBottom: '8px' },
  buildingDomain: { fontSize: '12px', color: '#aaa', marginBottom: '15px' },
  buildBtn: { width: '100%', padding: '12px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }
}

export default Buildings
