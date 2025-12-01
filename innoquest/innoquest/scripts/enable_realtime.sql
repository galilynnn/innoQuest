-- Enable Realtime for required tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
