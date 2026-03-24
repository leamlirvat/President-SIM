import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

export default function Stats({ country, updateCountry }) {
  const [tileCount, setTileCount] = useState(0);
  const [nextTick, setNextTick] = useState(30);

  const loadTileCount = useCallback(async () => {
    const { count } = await supabase
      .from('tiles')
      .select('*', { count: 'exact', head: true })
      .eq('ownercountryid', country.id);
    setTileCount(count || 0);
  }, [country.id]);

  // Countdown production armée
  useEffect(() => {
    loadTileCount();
    const countdownInterval = setInterval(() => {
      setNextTick(prev => {
        if (prev <= 1) { loadTileCount(); return 30; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, [loadTileCount]);

  const money = Math.floor(country.money ?? 0);
  const soldiers = country.soldiers ?? 0;
  const scouts = country.scouts ?? 0;
  const gdp = Math.floor(country.gdp ?? 0);
  const production = tileCount; // soldats produits tous les 30s

  return (
    <div style={styles.card}>
      <div style={styles.title}>📊 Statistiques</div>

      <StatRow icon="💰" label="Argent" value={`${money.toLocaleString()} €`} />
      <StatRow icon="⚔️" label="Soldats" value={soldiers.toLocaleString()} />
      <StatRow icon="🔭" label="Éclaireurs" value={scouts.toLocaleString()} />
      <StatRow icon="📈" label="PIB" value={`${gdp.toLocaleString()} €`} />
      <StatRow icon="🗺️" label="Territoire" value={`${tileCount} case${tileCount > 1 ? 's' : ''}`} />

      <div style={styles.divider} />

      {/* Production d'armée */}
      <div style={styles.productionBox}>
        <div style={styles.productionTitle}>⚙️ Production d'armée</div>
        <div style={styles.productionRow}>
          <span style={styles.productionVal}>+{production} soldat{production > 1 ? 's' : ''}</span>
          <span style={styles.productionSub}>/ 30 secondes</span>
        </div>
        <div style={styles.timerBar}>
          <div style={{ ...styles.timerFill, width: `${((30 - nextTick) / 30) * 100}%` }} />
        </div>
        <div style={styles.timerLabel}>Prochain renfort dans {nextTick}s</div>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }) {
  return (
    <div style={styles.row}>
      <span style={styles.icon}>{icon}</span>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </div>
  );
}

const styles = {
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' },
  title: { fontSize: '11px', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' },
  row: { display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' },
  icon: { fontSize: '15px', width: '20px', flexShrink: 0 },
  label: { flex: 1, fontSize: '13px', color: '#bbb' },
  value: { fontSize: '13px', fontWeight: '600', color: 'white' },
  divider: { height: '1px', background: 'rgba(255,255,255,0.06)', margin: '12px 0' },
  productionBox: { background: 'rgba(255,165,0,0.07)', border: '1px solid rgba(255,165,0,0.15)', borderRadius: '8px', padding: '12px' },
  productionTitle: { fontSize: '11px', fontWeight: '700', color: '#f90', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  productionRow: { display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' },
  productionVal: { fontSize: '18px', fontWeight: '800', color: '#ffd700' },
  productionSub: { fontSize: '11px', color: '#888' },
  timerBar: { height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' },
  timerFill: { height: '100%', background: 'linear-gradient(90deg, #f90, #ffd700)', borderRadius: '2px', transition: 'width 1s linear' },
  timerLabel: { fontSize: '11px', color: '#888', textAlign: 'right' },
};
