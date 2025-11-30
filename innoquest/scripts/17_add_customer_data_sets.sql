-- Create customer_data_sets table for CSV uploads
CREATE TABLE IF NOT EXISTS public.customer_data_sets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id uuid NOT NULL,
    file_name text NOT NULL,
    record_count integer NOT NULL DEFAULT 0,
    uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
    is_active boolean NOT NULL DEFAULT false,
    csv_data jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_data_sets_game_id ON public.customer_data_sets(game_id);
CREATE INDEX IF NOT EXISTS idx_customer_data_sets_is_active ON public.customer_data_sets(is_active);

-- Add RLS policies
ALTER TABLE public.customer_data_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users" ON public.customer_data_sets
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.customer_data_sets
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.customer_data_sets
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.customer_data_sets
    FOR DELETE USING (auth.role() = 'authenticated');
