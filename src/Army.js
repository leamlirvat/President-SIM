const Army = ({ country }) => {
  const units = [
    { name: 'Infanterie', emoji: '👮', cost: 10, count: country.soldiers || 50, production: 'Instantané' },
    { name: 'Chars', emoji: '🚛', cost: 500, count: 0, production: '24h' },
    { name: 'Avions', emoji: '✈️', cost: 2000, count: 0, production: '48h' },
    { name: 'Drones', emoji: '🚁', cost: 800, count: 0, production: '12h' },
    { name: 'Navires', emoji: '🚢', cost: 3000, count: 0, production: '72h' },
    { name: 'Missiles', emoji: '🚀', cost: 5000, count: 0, production: '96h' }
  ]

  const recruit = (unit) => {
    alert(`Recruter ${unit.name} (${unit.cost}€)`)
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>⚔️ Forces armées</h2>

      <div style={styles.headerStats}>
        <div style={styles.stat}>Puissance totale: 1 250</div>
        <div style={styles.stat}>Niveau: 1</div>
        <div style={styles.stat}>Budget: 2 500€/tour</div>
      </div>

      <div style={styles.grid}>
        {units.map((u, i) => (
          <UnitCard key={i} unit={u} onRecruit={recruit} />
        ))}
      </div>
    </div>
  )
}

const UnitCard = ({ unit, onRecruit }) => (
  <div style={styles.unitCard}>
    <div style={styles.unitHeader}>
      <span style={styles.emoji}>{unit.emoji}</span>
      <div>
        <h4 style={styles.unitName}>{unit.name}</h4>
        <div style={styles.unitCount}>{unit.count} unités</div>
      </div>
    </div>
    <div style={styles.unitProduction}>{unit.production}</div>
    <button style={styles.recruitBtn} onClick={() => onRecruit(unit)}>
      Recruter (x10) - {unit.cost * 10}€
    </button>
  </div>
)

const styles = {
  container: { padding: '20px 0' },
  title: { marginBottom: '25px', fontSize: '24px' },
  headerStats: { display: 'flex', gap: '20px', marginBottom: '30px', fontSize: '14px', color: '#aaa', flexWrap: 'wrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' },
  unitCard: { background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' },
  unitHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  emoji: { fontSize: '28px' },
  unitName: { margin: '0 0 4px 0', fontSize: '16px' },
  unitCount: { fontSize: '14px', color: '#27ae60' },
  unitProduction: { color: '#aaa', fontSize: '13px', marginBottom: '15px' },
  recruitBtn: { width: '100%', padding: '12px', background: '#e94560', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }
}

export default Army
