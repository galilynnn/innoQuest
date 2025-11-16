# Backend Startup Sim - Frontend Application

A comprehensive web-based business simulation game built with Next.js, TypeScript, and Supabase.

## Features

### Admin Interface
- **Game Configuration**: Set number of weeks, week duration, and max teams
- **Team Management**: Create teams with auto-generated credentials
- **Live Monitoring**: Real-time leaderboard and performance tracking
- **Customer Data Management**: Manage customer database that affects calculations
- **Export Reports**: Generate PDF and CSV reports with final standings

### Student Interface
- **Weekly Decisions**: Product selection, price setting, R&D investment, and analytics purchases
- **Real-time Calculations**: Live profit projections based on decisions
- **Reports & Analytics**: Performance tracking, revenue trends, R&D success rates
- **Decision History**: Complete audit trail of all weekly decisions

## Game Mechanics

### Products
10 predefined products with different demand multipliers and profit margins to test strategy.

### R&D Investment Tiers
- **Basic**: $5,000 (70% success rate)
- **Standard**: $15,000 (80% success rate)
- **Advanced**: $35,000 (90% success rate)
- **Premium**: $60,000 (95% success rate)

### Funding Stages
- Pre-Seed → Seed → Series A → Series B → Series C
- Automatic progression based on revenue targets and R&D test success

### Weekly Calculations
- Demand calculation: Base Market Size × Product Multiplier × Price Elasticity × R&D Multiplier
- Revenue: Demand × Price
- Costs: COGS + Operating Costs + R&D Investment + Analytics Tools
- Profit = Revenue - Total Costs

## Technical Stack

- **Frontend**: Next.js 16, TypeScript, React, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth + Custom Team Credentials
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account with configured database

### Environment Variables
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
\`\`\`

### Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Run the database migration:
\`\`\`bash
npx supabase db push
\`\`\`

3. Seed sample data:
\`\`\`bash
# Run the SQL scripts in scripts/ folder via Supabase dashboard
\`\`\`

4. Start development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open http://localhost:3000

## Usage

### Admin Login
- Navigate to `/admin/login`
- Use configured admin credentials
- Create teams and start games

### Student Login
- Navigate to `/student/login`
- Use team-generated credentials
- Submit weekly decisions

## API Routes

- `POST /api/calculate-weekly` - Calculate weekly results
- `POST /api/advance-week` - Progress to next week

## Database Schema

### Core Tables
- `customers` - Customer demographic data
- `teams` - Team information and credentials
- `weekly_results` - Weekly performance metrics
- `rnd_tests` - R&D test history
- `game_settings` - Game configuration
- `game_logs` - Audit trail of all actions

## Performance Constraints
- Supports up to 10 concurrent student teams + 1 admin
- 20-minute session timeout
- Sub-second calculation response times
- Mobile device blocking (iPad/Desktop optimized)

## Security Features
- Row Level Security (RLS) on all data tables
- Supabase authentication with token refresh
- Session timeout protection
- Audit logging of all actions
- Admin-only intervention capabilities

## Deployment

Deploy to Vercel with one command:
\`\`\`bash
git push
\`\`\`

Environment variables are automatically configured from Supabase integration.

## Support

For issues or questions, contact the development team or create an issue in the repository.
