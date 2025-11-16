-- Create customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT UNIQUE NOT NULL,
  monthly_income INTEGER NOT NULL,
  monthly_food_spending INTEGER NOT NULL,
  working_hours INTEGER NOT NULL,
  health_consciousness INTEGER NOT NULL,
  experimental_food_interest INTEGER NOT NULL,
  sustainability_preference INTEGER NOT NULL,
  brand_loyalty INTEGER NOT NULL,
  probability DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  base_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  game_id UUID NOT NULL,
  selected_product_id UUID REFERENCES products(id),
  funding_stage TEXT DEFAULT 'Pre-Seed',
  total_balance DECIMAL(15,2) DEFAULT 0,
  successful_rnd_tests INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create weekly_results table
CREATE TABLE weekly_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  set_price DECIMAL(10,2),
  demand INTEGER,
  revenue DECIMAL(15,2),
  costs DECIMAL(15,2),
  profit DECIMAL(15,2),
  rnd_tier TEXT,
  rnd_success BOOLEAN,
  analytics_purchased BOOLEAN DEFAULT false,
  analytics_cost DECIMAL(10,2),
  investment_tier TEXT,
  pass_fail_status TEXT,
  bonus_earned DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create rnd_tests table
CREATE TABLE rnd_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  tier TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create analytics_purchases table
CREATE TABLE analytics_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  tool_type TEXT NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create game_settings table
CREATE TABLE game_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  total_weeks INTEGER DEFAULT 10,
  week_duration_minutes INTEGER DEFAULT 5,
  max_teams INTEGER DEFAULT 10,
  current_week INTEGER DEFAULT 0,
  game_status TEXT DEFAULT 'setup',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create game_logs table
CREATE TABLE game_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  result JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_users table for authentication
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for customers (public read)
CREATE POLICY "Allow public read on customers" ON customers FOR SELECT USING (true);

-- Create policies for products (public read)
CREATE POLICY "Allow public read on products" ON products FOR SELECT USING (true);

-- Create policies for teams (authenticated users can read their own team)
CREATE POLICY "Teams are readable by authenticated users" ON teams FOR SELECT USING (auth.role() = 'authenticated');

-- Create policies for weekly_results
CREATE POLICY "Weekly results readable by authenticated users" ON weekly_results FOR SELECT USING (auth.role() = 'authenticated');

-- Create policies for game_logs (authenticated read)
CREATE POLICY "Game logs readable by authenticated users" ON game_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX idx_teams_game_id ON teams(game_id);
CREATE INDEX idx_weekly_results_team_id ON weekly_results(team_id);
CREATE INDEX idx_weekly_results_game_id ON weekly_results(game_id);
CREATE INDEX idx_rnd_tests_team_id ON rnd_tests(team_id);
CREATE INDEX idx_game_logs_game_id ON game_logs(game_id);
CREATE INDEX idx_game_logs_team_id ON game_logs(team_id);
