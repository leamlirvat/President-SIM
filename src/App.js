import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import CreateCountry from './CreateCountry';
import Game from './Game';

export default function App() {
  const [session, setSession] = useState(null);
  const [country, setCountry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) checkCountry(s.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      if (s) checkCountry(s.user.id);
      else { setCountry(null); setLoading(false); }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function checkCountry(userId) {
    setLoading(true);
    const { data } = await supabase
      .from('countries')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    setCountry(data || null);
    setLoading(false);
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0f', color: '#666', fontSize: '20px', gap: '12px' }}>
      ⏳ Chargement...
    </div>
  );

  if (!session) return <Auth />;
  if (!country) return <CreateCountry setCountry={setCountry} />;
  return <Game country={country} setCountry={setCountry} />;
}
