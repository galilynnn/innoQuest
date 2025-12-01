-- Seed sample customers data for the game
INSERT INTO customers (customer_id, monthly_income, monthly_food_spending, working_hours, health_consciousness, experimental_food_interest, sustainability_preference, brand_loyalty, probability)
VALUES
  ('C001', 45000, 600, 40, 7, 5, 6, 7, 0.75),
  ('C002', 65000, 800, 45, 8, 7, 8, 8, 0.82),
  ('C003', 35000, 450, 35, 5, 4, 4, 6, 0.62),
  ('C004', 75000, 1000, 50, 9, 8, 9, 9, 0.88),
  ('C005', 55000, 700, 42, 6, 6, 7, 7, 0.70),
  ('C006', 42000, 550, 38, 7, 5, 5, 6, 0.68),
  ('C007', 85000, 1100, 48, 9, 9, 9, 9, 0.92),
  ('C008', 48000, 620, 41, 6, 5, 6, 7, 0.71),
  ('C009', 52000, 680, 43, 7, 6, 7, 8, 0.76),
  ('C010', 40000, 500, 37, 5, 4, 5, 6, 0.64),
  ('C011', 70000, 900, 46, 8, 8, 8, 8, 0.85),
  ('C012', 38000, 480, 36, 6, 5, 5, 6, 0.66),
  ('C013', 60000, 750, 44, 7, 6, 7, 7, 0.74),
  ('C014', 50000, 650, 40, 6, 5, 6, 7, 0.69),
  ('C015', 80000, 1050, 49, 9, 8, 8, 9, 0.89),
  ('C016', 45000, 600, 39, 7, 5, 6, 7, 0.72),
  ('C017', 58000, 720, 42, 7, 6, 7, 8, 0.77),
  ('C018', 41000, 520, 37, 5, 4, 5, 6, 0.63),
  ('C019', 72000, 920, 47, 8, 8, 8, 8, 0.84),
  ('C020', 54000, 700, 41, 7, 6, 7, 7, 0.75);

-- Seed sample products
INSERT INTO products (product_id, name, description, category, base_price)
VALUES
  ('P001', 'Organic Meal Kit', 'Premium organic ingredients meal package', 'Premium', 120),
  ('P002', 'Budget Meal Prep', 'Affordable meal preparation package', 'Budget', 60),
  ('P003', 'Keto Food Box', 'Low-carb specialized meal kit', 'Specialty', 95),
  ('P004', 'Vegan Options', 'Plant-based meal delivery', 'Specialty', 100),
  ('P005', 'Quick Lunch Sets', 'Ready-to-eat lunch containers', 'Convenience', 75),
  ('P006', 'Breakfast Bundles', 'Morning meal packages', 'Convenience', 50),
  ('P007', 'Family Packages', 'Multi-person family meals', 'Family', 150),
  ('P008', 'Premium Catering', 'High-end catering service', 'Premium', 200),
  ('P009', 'Seasonal Specials', 'Limited time specialty meals', 'Specialty', 85),
  ('P010', 'Corporate Meals', 'B2B bulk meal service', 'B2B', 70);

-- Insert default game settings with UUID
INSERT INTO game_settings (id, game_id, total_weeks, week_duration_minutes, max_teams, current_week, game_status)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 10, 5, 10, 0, 'setup')
ON CONFLICT DO NOTHING;
