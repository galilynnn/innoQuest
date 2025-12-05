
-- ============================================
-- Simple Stage Advancement Eligibility Table
-- ============================================
-- Shows: team name, current stage, required values, current values, eligibility (✅/❌)

SELECT 
  t.team_name AS "Team Name",
  t.funding_stage AS "Current Stage",
  sr.to_stage AS "Next Stage",
  sr.min_revenue AS "Required Revenue",
  t.current_revenue AS "Current Revenue",
  sr.min_customers AS "Required Customers",
  t.total_customers AS "Current Customers",
  sr.min_weeks AS "Required Weeks",
  gs.current_week AS "Current Week",
  CASE 
    WHEN t.current_revenue >= sr.min_revenue 
     AND t.total_customers >= sr.min_customers 
     AND gs.current_week >= sr.min_weeks 
    THEN '✅' ELSE '❌' 
  END AS "Eligible"
FROM teams t
JOIN game_settings gs ON t.game_id = gs.game_id
LEFT JOIN advancement_requirements sr ON t.funding_stage = sr.from_stage AND sr.game_id = t.game_id
WHERE t.game_id = '00000000-0000-0000-0000-000000000001'
ORDER BY t.team_name;

WITH team_current_data AS (
  SELECT 
    t.team_id,
    t.team_name,
    t.funding_stage,
    t.current_balance,
    t.current_revenue,
    t.total_customers,
    gs.current_week,
    gs.game_status
  FROM teams t
  JOIN game_settings gs ON t.game_id = gs.game_id
  WHERE t.game_id = '00000000-0000-0000-0000-000000000001'
),
stage_requirements AS (
  SELECT 
    from_stage,
    to_stage,
    min_revenue,
    min_customers,
    min_weeks
  FROM advancement_requirements
  WHERE game_id = '00000000-0000-0000-0000-000000000001'
),
eligibility_check AS (
  SELECT 
    tcd.team_id,
    tcd.team_name,
    tcd.funding_stage AS current_stage,
    sr.to_stage AS next_stage,
    tcd.current_balance,
    tcd.current_revenue,
    tcd.total_customers,
    tcd.current_week,
    sr.min_revenue AS required_revenue,
    sr.min_customers AS required_customers,
    sr.min_weeks AS required_weeks,
    -- Check each requirement
    CASE 
      WHEN tcd.current_revenue >= sr.min_revenue THEN '✅'
      ELSE '❌'
    END AS revenue_met,
    CASE 
      WHEN tcd.total_customers >= sr.min_customers THEN '✅'
      ELSE '❌'
    END AS customers_met,
    CASE 
      WHEN tcd.current_week >= sr.min_weeks THEN '✅'
      ELSE '❌'
    END AS weeks_met,
    -- Overall eligibility
    CASE 
      WHEN tcd.current_revenue >= sr.min_revenue 
       AND tcd.total_customers >= sr.min_customers 
       AND tcd.current_week >= sr.min_weeks 
      THEN '🎉 ELIGIBLE'
      ELSE '⏳ Not Ready'
    END AS eligibility_status
  FROM team_current_data tcd
  LEFT JOIN stage_requirements sr 
    ON tcd.funding_stage = sr.from_stage
  WHERE tcd.game_status IN ('lobby', 'active')
)
SELECT 
  team_name AS "Team Name",
  current_stage AS "Current Stage",
  next_stage AS "Next Stage",
  TO_CHAR(current_balance, 'FM$999,999,999') AS "Balance",
  TO_CHAR(current_revenue, 'FM$999,999,999') AS "Revenue",
  TO_CHAR(required_revenue, 'FM$999,999,999') AS "Required Revenue",
  revenue_met AS "✓",
  total_customers AS "Customers",
  required_customers AS "Required Customers",
  customers_met AS "✓",
  current_week AS "Week",
  required_weeks AS "Required Weeks",
  weeks_met AS "✓",
  eligibility_status AS "Status"
FROM eligibility_check
ORDER BY 
  CASE current_stage
    WHEN 'pre-seed' THEN 1
    WHEN 'seed' THEN 2
    WHEN 'series-a' THEN 3
    WHEN 'series-b' THEN 4
    WHEN 'series-c' THEN 5
    WHEN 'ipo' THEN 6
    ELSE 7
  END,
  eligibility_status DESC,
  team_name;

-- ============================================
-- Summary by Stage
-- ============================================
SELECT 
  current_stage AS "Current Stage",
  COUNT(*) AS "Total Teams",
  COUNT(*) FILTER (WHERE eligibility_status = '🎉 ELIGIBLE') AS "Eligible",
  COUNT(*) FILTER (WHERE eligibility_status = '⏳ Not Ready') AS "Not Ready"
FROM eligibility_check
GROUP BY current_stage
ORDER BY 
  CASE current_stage
    WHEN 'pre-seed' THEN 1
    WHEN 'seed' THEN 2
    WHEN 'series-a' THEN 3
    WHEN 'series-b' THEN 4
    WHEN 'series-c' THEN 5
    WHEN 'ipo' THEN 6
    ELSE 7
  END;

-- ============================================
-- Detailed Progress Report
-- ============================================
SELECT 
  team_name AS "Team Name",
  current_stage AS "Stage",
  eligibility_status AS "Status",
  CONCAT(
    ROUND((current_revenue::NUMERIC / NULLIF(required_revenue, 0) * 100)::NUMERIC, 1), '%'
  ) AS "Revenue Progress",
  CONCAT(
    ROUND((total_customers::NUMERIC / NULLIF(required_customers, 0) * 100)::NUMERIC, 1), '%'
  ) AS "Customer Progress",
  CONCAT(current_week, ' / ', required_weeks) AS "Week Progress",
  -- What's blocking advancement?
  CASE 
    WHEN eligibility_status = '🎉 ELIGIBLE' THEN '✨ Ready to advance!'
    ELSE 
      CONCAT(
        CASE WHEN revenue_met = '❌' THEN '💰 Need more revenue ' ELSE '' END,
        CASE WHEN customers_met = '❌' THEN '👥 Need more customers ' ELSE '' END,
        CASE WHEN weeks_met = '❌' THEN '⏰ Need more weeks ' ELSE '' END
      )
  END AS "Blocking Factors"
FROM eligibility_check
ORDER BY 
  CASE current_stage
    WHEN 'pre-seed' THEN 1
    WHEN 'seed' THEN 2
    WHEN 'series-a' THEN 3
    WHEN 'series-b' THEN 4
    WHEN 'series-c' THEN 5
    WHEN 'ipo' THEN 6
    ELSE 7
  END,
  eligibility_status DESC,
  team_name;
