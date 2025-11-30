Product Probability Configuration table added to Game Configuration component.

**Database:**
- Run script: `scripts/13_add_product_probability_weights.sql`
- Adds `product_probability_weights` JSONB column to `game_settings`

**Features:**
- Editable table with all products as rows
- Columns: Health (H), Sustainability (S), Brand Loyalty (B), Experimental (E), Total Check, Income, Price (λ)
- Total Check column validates H+S+B+E = 1.0 (green if valid, red if not)
- All values editable via number inputs
- Saved to database when clicking "Save Settings"
- Disabled when game is active

**Logic:**
Purchase probability formula will use these weights to calculate customer purchase likelihood based on their attributes and team's price.
