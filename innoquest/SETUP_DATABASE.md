```sql
-- 1. Disable RLS for prototype (fixes "violates row-level security" error)
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs DISABLE ROW LEVEL SECURITY;

-- 2. Clean up old invalid game settings
DELETE FROM game_settings WHERE game_id = 'default-game' OR game_id LIKE 'game_%';

-- 3. Insert default game settings with proper UUID (fixes UUID error)
INSERT INTO game_settings (id, game_id, total_weeks, week_duration_minutes, max_teams, current_week, game_status)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 10, 5, 10, 0, 'setup')
ON CONFLICT DO NOTHING;
```

**After running this:**
1. Close and refresh your browser
2. Go to Config tab → Set max teams → Save
3. Go to Teams tab → Set credentials → Confirm
4. ✅ Teams should now be created successfully!

---

## ⚠️ IMPORTANT: Fix RLS Error First

If you see **"new row violates row-level security policy"**, run this first:

```sql
-- Disable RLS for prototype (allows all operations)
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs DISABLE ROW LEVEL SECURITY;
```

## Quick Setup Steps

To fix the UUID error and enable team management, you need to run the database seed script.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the content from `scripts/02_seed_sample_data.sql`
5. Click "Run" to execute

This will:
- Create sample customers and products
- **Create the default game settings with proper UUID** (fixes the error)

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db reset
# Then seed the data
psql <your-connection-string> -f scripts/02_seed_sample_data.sql
```

### Option 3: Manual Fix (Quick)

If you just want to fix the UUID error quickly, run this single SQL command in Supabase SQL Editor:

```sql
-- Delete old invalid game settings (if any exist)
DELETE FROM game_settings WHERE game_id = 'default-game' OR game_id LIKE 'game_%';

-- Insert the correct game settings with UUID
INSERT INTO game_settings (id, game_id, total_weeks, week_duration_minutes, max_teams, current_week, game_status)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 10, 5, 10, 0, 'setup')
ON CONFLICT DO NOTHING;
```

## How the Fixed System Works

### Admin Workflow:

1. **Go to Config Tab**
   - Set "Max Teams" to desired number (1-10)
   - Click "Save Settings"
   - ✅ Settings are saved, teams tab will refresh

2. **Go to Teams Tab**
   - You'll see **only the number of rows** you specified (e.g., if max_teams = 5, you see 5 rows)
   - Click "Edit" on each row
   - Enter username and password
   - Click "Confirm"
   - ✅ Team is created in database with proper UUID

3. **Students Can Now Login**
   - Students use the username/password you set
   - System uses proper UUID `00000000-0000-0000-0000-000000000001` for game_id

### What Was Fixed:

1. ✅ Changed from string `"default-game"` to proper UUID format
2. ✅ Fixed timestamp-based game_id creation (`game_1763234887142`)
3. ✅ Teams management now only shows rows based on max_teams setting
4. ✅ Validation: max_teams must be between 1-10
5. ✅ Auto-refresh teams tab when settings are updated
6. ✅ All buttons now have proper styling and work correctly

### Files Changed:

- `components/admin/admin-dashboard.tsx` - Fixed UUID, added refresh mechanism
- `components/admin/game-configuration.tsx` - Added validation, workflow notes, triggers refresh
- `components/admin/teams-management.tsx` - Dynamic rows based on max_teams, proper UUID handling
- `app/admin/dashboard/page.tsx` - Fixed timestamp-based game ID
- `scripts/02_seed_sample_data.sql` - Added default game settings

## Troubleshooting

### Still seeing UUID error?
- Make sure you ran the seed script (Option 1 or 3 above)
- Clear your browser's localStorage/sessionStorage
- Refresh the page

### Max teams not updating?
- Make sure you clicked "Save Settings" in Config tab
- The Teams tab should automatically refresh
- If not, manually switch to another tab and back to Teams

### Teams not being created?
- Check that you entered both username AND password
- Make sure the game settings exist in database (run seed script)
- Check browser console for any errors
