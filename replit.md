# President Simulator

A multiplayer geopolitical strategy game built with React and Supabase.

## Overview

Players create a country, manage resources, capture territories on a 50x50 grid map, build infrastructure, research technologies, and form alliances.

## Stack

- **Frontend**: React 18 (Create React App), port 5000
- **Backend**: Supabase (auth + PostgreSQL + Realtime)
- **Workflow**: `PORT=5000 npm start`

## Environment Variables

Set in Replit secrets:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

## Database Tables

- **countries**: `user_id`, `name`, `color`, `money`, `gdp`, `soldiers`, `scouts`, `serverid`, `buildings` (JSONB), `resources` (JSONB), `policies` (JSONB), `research` (JSONB)
- **tiles**: `x`, `y`, `serverid`, `terrain_type`, `ownercountryid`, `soldiers_required`
- **discoveries**: `countryid`, `tileid`
- **colonizations**: `countryid`, `tileid`, `warriors`, `scouts`, `status`, `startedat`, `completedat`
- **alliances**: `id`, `serverid`, `name`, `description`, `leader_country_id`
- **alliance_members**: `alliance_id`, `country_id`, `role`
- **alliance_modules**: `alliance_id`, `module`, `activated_by`
- **alliance_sanctions**: `alliance_id`, `target_country_id`, `reason`, `active`

## Project Structure

```
src/
  App.js              - Root component, auth state & routing
  Auth.js             - Login/register
  CreateCountry.js    - Country creation form (server choice + name/color)
  Game.js             - Game layout (sidebar + tabs), game tick loop, auto-research
  MapView.js          - 50x50 interactive map grid
  Tutorial.js         - Onboarding overlay
  supabaseClient.js   - Supabase client initialization
  tabs/
    Dashboard.js      - Country overview (stats + domain bars + recent activity)
    Economy.js        - Budget, income/expense breakdown, resource stocks
    Military.js       - Unit recruitment (land/air/naval/cyber/space)
    Buildings.js      - Infrastructure construction
    Diplomacy.js      - Alliances (create/join/leave), modules, sanctions
    Politics.js       - Tax rate, budget allocation, civil liberties laws
    Research.js       - 10 research domains with auto + manual investment
```

## Game Loop (Game.js)

- **Every 2 seconds (= 1 game day)**: income/expenses calculated from GDP × tax rate; GDP grows from tiles, buildings, education; **auto-research points accumulate** per domain (GDP × research_budget% / 365 / 10)
- **Every 20 seconds**: sync money, GDP, and accumulated research points to Supabase
- **Every 30 seconds**: soldier production + building resource production
- **Realtime subscriptions**: country data (other tab changes), tile changes (other players' moves on map)

## Politics Tab

- Tax rate slider (0–80% of GDP)
- Budget allocation across: Health, Education, Military, Research, Social, Infrastructure
- 9 civil liberty toggles: Free press, Open borders, State health, Free education, etc.
- Calculated effects: Satisfaction, Education, Health, Security scores, GDP bonus
- Saves to `countries.policies` JSON column

## Research Tab

- 10 domains: Tech, Military R&D, Space, Clean Energy, Medicine, Agri-food, Cybersecurity, Nuclear, Logistics, Materials
- Auto-accumulation: points added every game day from GDP × research_budget%
- Manual investment: 1$ = 1 point
- Level system: 1000 pts per level, up to 4–5 levels per domain
- Unlocks shown as cards with progress bars

## Key Features

- Auth with Supabase (login/register)
- Country creation with server choice (3 servers) and color selection
- Interactive map: colonize tiles, fog of war, real-time updates from other players
- Full economy simulation with buildings, policies, and resource production
- Military recruitment (7 unit categories)
- Alliance system with roles, modules, and economic sanctions
- Auto-research progression tied to R&D budget
- Tutorial overlay for new players
