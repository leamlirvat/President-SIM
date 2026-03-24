# President Simulator — Configuration Supabase COMPLÈTE

Copie-colle **TOUT** ce SQL dans **Supabase → SQL Editor → New query**, puis clique **Run**.

> ⚠️ Les blocs `INSERT INTO tiles` ne s'exécutent que si la table est vide pour ce serveur (protection `ON CONFLICT DO NOTHING`).

---

## SQL COMPLET

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TABLE countries — toutes les données d'un joueur
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS countries (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT         NOT NULL,
  color           TEXT         DEFAULT '4a90e2',
  serverid        INTEGER      DEFAULT 1,
  money           FLOAT        DEFAULT 5000,
  gdp             FLOAT        DEFAULT 1600,
  soldiers        INTEGER      DEFAULT 50,
  scouts          INTEGER      DEFAULT 10,
  army_production INTEGER      DEFAULT 5,
  buildings       JSONB        DEFAULT '[]'::JSONB,
  resources       JSONB        DEFAULT '{}'::JSONB,
  policies        JSONB        DEFAULT '{}'::JSONB,
  research        JSONB        DEFAULT '{}'::JSONB,
  military_units  JSONB        DEFAULT '{}'::JSONB,
  population      BIGINT       DEFAULT 1000000,
  level           INTEGER      DEFAULT 1,
  prestige        INTEGER      DEFAULT 0,
  debt            NUMERIC      DEFAULT 0,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  last_active     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Ajout des colonnes manquantes si la table existe déjà
ALTER TABLE countries ADD COLUMN IF NOT EXISTS buildings       JSONB        DEFAULT '[]'::JSONB;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS resources       JSONB        DEFAULT '{}'::JSONB;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS policies        JSONB        DEFAULT '{}'::JSONB;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS research        JSONB        DEFAULT '{}'::JSONB;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS military_units  JSONB        DEFAULT '{}'::JSONB;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS population      BIGINT       DEFAULT 1000000;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS level           INTEGER      DEFAULT 1;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS prestige        INTEGER      DEFAULT 0;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS debt            NUMERIC      DEFAULT 0;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS last_active     TIMESTAMPTZ  DEFAULT NOW();
ALTER TABLE countries ADD COLUMN IF NOT EXISTS army_production INTEGER      DEFAULT 5;

-- Corriger les lignes existantes sans valeurs JSON par défaut
UPDATE countries SET buildings      = '[]'::JSONB  WHERE buildings      IS NULL;
UPDATE countries SET resources      = '{}'::JSONB  WHERE resources      IS NULL;
UPDATE countries SET policies       = '{}'::JSONB  WHERE policies       IS NULL;
UPDATE countries SET research       = '{}'::JSONB  WHERE research       IS NULL;
UPDATE countries SET military_units = '{}'::JSONB  WHERE military_units IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. TABLE tiles — la carte du jeu (50×50 par serveur)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tiles (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  x                INTEGER NOT NULL,
  y                INTEGER NOT NULL,
  terraintype      TEXT    DEFAULT 'plaine'
                           CHECK (terraintype IN ('plaine','foret','montagne','desert')),
  soldiersrequired INTEGER DEFAULT 5,
  ownercountryid   UUID    REFERENCES countries(id) ON DELETE SET NULL,
  serverid         INTEGER DEFAULT 1,
  UNIQUE(x, y, serverid)
);

-- ─── SERVEUR 1 — Europe-1 (Normal) ───────────────────────────────────────
INSERT INTO tiles (x, y, terraintype, soldiersrequired, serverid)
SELECT
  gs_x,
  gs_y,
  (ARRAY['plaine','plaine','plaine','foret','foret','montagne','desert'])
    [floor(random()*7+1)::int],
  floor(random()*20+5)::int,
  1
FROM generate_series(0,49) AS gs_x
CROSS JOIN generate_series(0,49) AS gs_y
ON CONFLICT (x, y, serverid) DO NOTHING;

-- ─── SERVEUR 2 — Monde-1 (Rapide) ────────────────────────────────────────
INSERT INTO tiles (x, y, terraintype, soldiersrequired, serverid)
SELECT
  gs_x,
  gs_y,
  (ARRAY['plaine','plaine','plaine','foret','foret','montagne','desert'])
    [floor(random()*7+1)::int],
  floor(random()*20+5)::int,
  2
FROM generate_series(0,49) AS gs_x
CROSS JOIN generate_series(0,49) AS gs_y
ON CONFLICT (x, y, serverid) DO NOTHING;

-- ─── SERVEUR 3 — Asie-1 (Hardcore) ──────────────────────────────────────
INSERT INTO tiles (x, y, terraintype, soldiersrequired, serverid)
SELECT
  gs_x,
  gs_y,
  (ARRAY['plaine','foret','foret','montagne','montagne','desert','desert'])
    [floor(random()*7+1)::int],
  floor(random()*30+10)::int,
  3
FROM generate_series(0,49) AS gs_x
CROSS JOIN generate_series(0,49) AS gs_y
ON CONFLICT (x, y, serverid) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. TABLE discoveries — brouillard de guerre (tuiles vues par un joueur)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS discoveries (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  countryid UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  tileid    UUID NOT NULL REFERENCES tiles(id)     ON DELETE CASCADE,
  UNIQUE(countryid, tileid)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. TABLE colonizations — expéditions en cours
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS colonizations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  countryid   UUID        NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  tileid      UUID        NOT NULL REFERENCES tiles(id)     ON DELETE CASCADE,
  warriors    INTEGER     DEFAULT 0,
  scouts      INTEGER     DEFAULT 0,
  startedat   TIMESTAMPTZ DEFAULT NOW(),
  completesat TIMESTAMPTZ NOT NULL,
  status      TEXT        DEFAULT 'pending'
                          CHECK (status IN ('pending','completed','cancelled'))
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. TABLE alliances — guildes par serveur
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS alliances (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  serverid          INTEGER     NOT NULL,
  name              TEXT        NOT NULL,
  description       TEXT        DEFAULT '',
  leader_country_id UUID        REFERENCES countries(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. TABLE alliance_members — membres des alliances
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS alliance_members (
  id          BIGSERIAL   PRIMARY KEY,
  alliance_id UUID        NOT NULL REFERENCES alliances(id)  ON DELETE CASCADE,
  country_id  UUID        NOT NULL REFERENCES countries(id)  ON DELETE CASCADE,
  role        TEXT        DEFAULT 'member'
                          CHECK (role IN ('leader','officer','member')),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alliance_id, country_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. TABLE alliance_modules — fonctionnalités activées dans une alliance
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS alliance_modules (
  id           BIGSERIAL   PRIMARY KEY,
  alliance_id  UUID        NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  module       TEXT        NOT NULL,
  activated_by UUID        REFERENCES countries(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. TABLE alliance_sanctions — sanctions économiques entre alliances
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS alliance_sanctions (
  id                  BIGSERIAL   PRIMARY KEY,
  alliance_id         UUID        NOT NULL REFERENCES alliances(id)  ON DELETE CASCADE,
  target_country_id   UUID        NOT NULL REFERENCES countries(id)  ON DELETE CASCADE,
  reason              TEXT        DEFAULT '',
  created_by          UUID        REFERENCES countries(id),
  active              BOOLEAN     DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

-- countries
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "countries_select"    ON countries;
DROP POLICY IF EXISTS "countries_insert"    ON countries;
DROP POLICY IF EXISTS "countries_update"    ON countries;
DROP POLICY IF EXISTS "countries_delete"    ON countries;

CREATE POLICY "countries_select" ON countries
  FOR SELECT USING (true);   -- tout le monde peut voir les pays (carte)

CREATE POLICY "countries_insert" ON countries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "countries_update" ON countries
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "countries_delete" ON countries
  FOR DELETE USING (user_id = auth.uid());

-- tiles
ALTER TABLE tiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tiles_select" ON tiles;
DROP POLICY IF EXISTS "tiles_update" ON tiles;

CREATE POLICY "tiles_select" ON tiles FOR SELECT USING (true);
CREATE POLICY "tiles_update" ON tiles FOR UPDATE USING (true);

-- discoveries
ALTER TABLE discoveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discoveries_all" ON discoveries;

CREATE POLICY "discoveries_all" ON discoveries
  FOR ALL TO authenticated
  USING      (countryid IN (SELECT id FROM countries WHERE user_id = auth.uid()))
  WITH CHECK (countryid IN (SELECT id FROM countries WHERE user_id = auth.uid()));

-- colonizations
ALTER TABLE colonizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "colonizations_all" ON colonizations;

CREATE POLICY "colonizations_all" ON colonizations
  FOR ALL TO authenticated
  USING      (countryid IN (SELECT id FROM countries WHERE user_id = auth.uid()))
  WITH CHECK (countryid IN (SELECT id FROM countries WHERE user_id = auth.uid()));

-- alliances : lecture publique, écriture si membre leader
ALTER TABLE alliances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alliances_select" ON alliances;
DROP POLICY IF EXISTS "alliances_insert" ON alliances;
DROP POLICY IF EXISTS "alliances_delete" ON alliances;

CREATE POLICY "alliances_select" ON alliances FOR SELECT USING (true);

CREATE POLICY "alliances_insert" ON alliances
  FOR INSERT WITH CHECK (
    leader_country_id IN (SELECT id FROM countries WHERE user_id = auth.uid())
  );

CREATE POLICY "alliances_delete" ON alliances
  FOR DELETE USING (
    leader_country_id IN (SELECT id FROM countries WHERE user_id = auth.uid())
  );

-- alliance_members
ALTER TABLE alliance_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alliance_members_select" ON alliance_members;
DROP POLICY IF EXISTS "alliance_members_insert" ON alliance_members;
DROP POLICY IF EXISTS "alliance_members_delete" ON alliance_members;
DROP POLICY IF EXISTS "alliance_members_update" ON alliance_members;

CREATE POLICY "alliance_members_select" ON alliance_members FOR SELECT USING (true);

CREATE POLICY "alliance_members_insert" ON alliance_members
  FOR INSERT WITH CHECK (
    country_id IN (SELECT id FROM countries WHERE user_id = auth.uid())
  );

CREATE POLICY "alliance_members_delete" ON alliance_members
  FOR DELETE USING (
    country_id IN (SELECT id FROM countries WHERE user_id = auth.uid())
  );

CREATE POLICY "alliance_members_update" ON alliance_members
  FOR UPDATE USING (
    alliance_id IN (
      SELECT alliance_id FROM alliance_members
      WHERE country_id IN (SELECT id FROM countries WHERE user_id = auth.uid())
        AND role IN ('leader','officer')
    )
  );

-- alliance_modules
ALTER TABLE alliance_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alliance_modules_all" ON alliance_modules;

CREATE POLICY "alliance_modules_all" ON alliance_modules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- alliance_sanctions
ALTER TABLE alliance_sanctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alliance_sanctions_all" ON alliance_sanctions;

CREATE POLICY "alliance_sanctions_all" ON alliance_sanctions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. INDEX pour les performances
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_countries_user_id   ON countries(user_id);
CREATE INDEX IF NOT EXISTS idx_countries_serverid  ON countries(serverid);
CREATE INDEX IF NOT EXISTS idx_tiles_server        ON tiles(serverid);
CREATE INDEX IF NOT EXISTS idx_tiles_owner         ON tiles(ownercountryid);
CREATE INDEX IF NOT EXISTS idx_discoveries_country ON discoveries(countryid);
CREATE INDEX IF NOT EXISTS idx_colonizations_ctry  ON colonizations(countryid);
CREATE INDEX IF NOT EXISTS idx_colonizations_status ON colonizations(status);
CREATE INDEX IF NOT EXISTS idx_alliance_members_alli ON alliance_members(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_members_ctry ON alliance_members(country_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. REALTIME — activer les mises à jour temps réel
-- ═══════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE countries;
ALTER PUBLICATION supabase_realtime ADD TABLE tiles;
ALTER PUBLICATION supabase_realtime ADD TABLE discoveries;
ALTER PUBLICATION supabase_realtime ADD TABLE colonizations;
ALTER PUBLICATION supabase_realtime ADD TABLE alliances;
ALTER PUBLICATION supabase_realtime ADD TABLE alliance_members;
```

---

## Schéma des tables

### `countries` — données complètes d'un joueur
| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire |
| `user_id` | uuid | Lié à `auth.users.id` |
| `name` | text | Nom du pays |
| `color` | text | Couleur hex (sans #) |
| `serverid` | int | Serveur : 1=Europe, 2=Monde, 3=Asie |
| `money` | float | Trésorerie actuelle |
| `gdp` | float | PIB annuel |
| `soldiers` | int | Soldats disponibles |
| `scouts` | int | Éclaireurs disponibles |
| `buildings` | jsonb | Liste des bâtiments construits `["mine","port",…]` |
| `resources` | jsonb | Stocks de ressources `{"iron":150,"oil":40,…}` |
| `policies` | jsonb | Paramètres politiques `{"tax_rate":25,…}` |
| `research` | jsonb | Points de recherche `{"tech":1500,"military":800,…}` |
| `military_units` | jsonb | Unités achetées `{"tank":3,"drone":5,…}` |
| `population` | bigint | Population du pays |
| `last_active` | timestamptz | Dernière activité (sync toutes les 10s) |

### `tiles` — carte du jeu
| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire |
| `x`, `y` | int | Coordonnées 0–49 |
| `terraintype` | text | `plaine` / `foret` / `montagne` / `desert` |
| `soldiersrequired` | int | Guerriers minimum pour capturer |
| `ownercountryid` | uuid | `null` = neutre |
| `serverid` | int | Serveur (1, 2 ou 3) |

### `alliances`
| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire |
| `serverid` | int | Serveur de l'alliance |
| `name` | text | Nom |
| `description` | text | Description optionnelle |
| `leader_country_id` | uuid | Pays fondateur/leader |

### `alliance_members`
| Colonne | Type | Description |
|---|---|---|
| `alliance_id` | uuid | FK → alliances |
| `country_id` | uuid | FK → countries |
| `role` | text | `leader` / `officer` / `member` |

---

## Après avoir exécuté le SQL

Dans **Supabase → Database → Replication**, vérifie que ces tables sont bien cochées :
- ✅ `countries`
- ✅ `tiles`
- ✅ `discoveries`
- ✅ `colonizations`
- ✅ `alliances`
- ✅ `alliance_members`
