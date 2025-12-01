-- Add analytics_quantity column to weekly_results table
ALTER TABLE weekly_results 
ADD COLUMN analytics_quantity INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX idx_weekly_results_analytics_quantity ON weekly_results(analytics_quantity);
