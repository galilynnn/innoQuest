-- Diagnostic query to check why teams aren't advancing milestones
-- Run this to see what's preventing advancement

-- 1. Check team's current state
SELECT 
    t.team_name,
    t.funding_stage,
    t.total_balance,
    t.successful_rnd_tests,
    t.game_id
FROM teams t
WHERE t.team_name = 'Team 1';

-- 2. Check latest weekly results for the team
SELECT 
    wr.week_number,
    wr.revenue,
    wr.demand,
    wr.pass_fail_status,
    wr.rnd_success,
    wr.profit
FROM weekly_results wr
JOIN teams t ON wr.team_id = t.team_id
WHERE t.team_name = 'Team 1'
ORDER BY wr.week_number DESC
LIMIT 5;

-- 3. Check Investment Configuration (what are the thresholds?)
SELECT 
    gs.game_id,
    gs.investment_config->'seed'->>'mean' as seed_mean,
    gs.investment_config->'seed'->>'sd' as seed_sd,
    gs.investment_config->'series_a'->>'mean' as series_a_mean,
    gs.investment_config->'series_b'->>'mean' as series_b_mean,
    gs.investment_config->'series_c'->>'mean' as series_c_mean,
    gs.max_teams
FROM game_settings gs
JOIN teams t ON gs.game_id = t.game_id
WHERE t.team_name = 'Team 1';

-- 4. Check if team has any milestone achievements
SELECT 
    ma.*,
    t.team_name
FROM milestone_achievements ma
JOIN teams t ON ma.team_id = t.team_id
WHERE t.team_name = 'Team 1';

-- 5. Calculate what the team needs to advance from Pre-Seed to Seed
-- (This will show if they're meeting requirements)
SELECT 
    t.team_name,
    t.funding_stage as current_stage,
    t.successful_rnd_tests,
    wr.revenue as latest_revenue,
    wr.demand as latest_demand,
    (gs.investment_config->'seed'->>'mean')::numeric as seed_revenue_threshold,
    CASE 
        WHEN wr.revenue >= (gs.investment_config->'seed'->>'mean')::numeric THEN '✓' 
        ELSE '✗' 
    END as revenue_met,
    CASE 
        WHEN wr.demand >= 1000 THEN '✓' 
        ELSE '✗' 
    END as demand_met,
    CASE 
        WHEN t.successful_rnd_tests >= 1 THEN '✓' 
        ELSE '✗' 
    END as rnd_tests_met,
    CASE 
        WHEN wr.revenue >= (gs.investment_config->'seed'->>'mean')::numeric 
            AND wr.demand >= 1000 
            AND t.successful_rnd_tests >= 1 
        THEN 'SHOULD ADVANCE' 
        ELSE 'NOT READY' 
    END as advancement_status
FROM teams t
JOIN game_settings gs ON t.game_id = gs.game_id
LEFT JOIN LATERAL (
    SELECT revenue, demand
    FROM weekly_results
    WHERE team_id = t.team_id
    ORDER BY week_number DESC
    LIMIT 1
) wr ON true
WHERE t.team_name = 'Team 1';

