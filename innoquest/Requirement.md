# Comprehensive Requirements Document (CRD)  
# Backend Startup Sim Web Application

## 1. Purpose & Objectives

### 1.1 Business Purpose  
Transform the existing manual Excel-based business simulation game into an automated web application that eliminates administrative calculation overhead while preserving core game logic and educational value.

### 1.2 Primary Objectives  
- **Automate Calculations**: Remove manual admin computation of probabilities, demand, and revenue  
- **Real-time Gameplay**: Enable simultaneous participation for up to 10 teams + 1 admin  
- **Dynamic Configuration**: Allow admin customization of game parameters and customer data  
- **Comprehensive Logging**: Maintain complete audit trail of all game decisions and outcomes  
- **Preserve Core Logic**: Exactly replicate all existing Excel formulas and game mechanics

## 2. Features & Functionality

### 2.1 Admin Features  
**User Management**  
- Dynamic team creation with auto-generated credentials  
- Maximum 10 concurrent student teams  
- 20-minute session timeout for security

**Game Configuration**  
- Adjustable number of weeks (default: 10)  
- Configurable week duration (default: 5 minutes)  
- Dynamic customer data management (add/edit/delete)  
- Real-time game parameter modifications via Game Controls interface

**Monitoring & Reporting**  
- Real-time dashboard showing all team metrics  
- Player performance summary with pass/fail status  
- Comprehensive game logs stored per round  
- PDF report generation capability  
- Leaderboard visibility (admin-only)

**System Control**  
- Emergency intervention capabilities  
- Game reset functionality with log preservation  
- Automatic backups after each round

### 2.2 Student Features  
**Core Gameplay**  
- Product selection from 10 predefined options  
- Weekly price setting with real-time impact  
- R&D investment decisions (4 tiers: Basic to Premium)  
- Analytics tools purchase with variable pricing

**Strategic Elements**  
- Sequential R&D testing (max 2 attempts per round)  
- Analytics-driven customer insights  
- Investment round progression (Seed → Series A → B → C)  
- Financial risk management

**Information Access**  
- Personal decision history and outcomes  
- Weekly income summaries  
- Current funding stage status  
- Test record tracking  
- Analytics visualization based on purchased tools

### 2.3 System Features  
**Real-time Processing**  
- Automatic end-of-round calculations  
- Dynamic price sensitivity based on market conditions  
- Instant probability and demand computations  
- Live dashboard updates

**Data Management**  
- Spreadsheet-like customer data structure  
- Dynamic customer database affecting live calculations  
- Comprehensive audit logging  
- Automated backup system

## 3. User Flows & Game Mechanics

### 3.1 Student Gameplay Flow  
```  
Week Start  
  ↓  
Choose Product (if first week)  
  ↓  
Set Product Price  
  ↓  
Purchase Analytics Tools (Optional)  
  ↓  
Select R&D Strategy  
  ↓  
Choose Investment Tier  
  ↓  
Review Investment Summary  
  ↓  
Confirm Decisions → Popup Verification  
  ↓  
Week End → Automatic Calculation  
  ↓  
View Results → Pass/Fail Status + Bonuses  
  ↓  
Next Week  
```

### 3.2 R&D System Mechanics  
- **Optional Participation**: Students may skip R&D but miss insights  
- **Sequential Attempts**: Maximum 2 tests per round  
- **Tier Selection**: Basic/Standard/Advanced/Premium with fixed success probabilities  
- **Financial Risk**: Double failure results in monetary loss  
- **Cooldown**: Resets after each round completion

### 3.3 Investment Progression  
**Qualification Criteria**  
- Revenue targets per round  
- Demand thresholds  
- Successful R&D test count  
- Automatic bonus calculation

**Funding Stages**  
1. **Seed Round**: Base requirements + 1 successful R&D test  
2. **Series A**: Higher targets + 3 successful tests  
3. **Series B**: Advanced targets + 6 successful tests  
4. **Series C**: Maximum targets + 8 successful tests

### 3.4 Analytics Tools System  
- **Dynamic Pricing**: Variable costs based on tool complexity  
- **Current Data Only**: Historical/real-time visualization without predictions  
- **Customer Insights**: Cross-tabulated data visualizations  
- **Examples**: Working Hours vs Health Consciousness, Income vs Spending patterns

## 4. Technical Requirements

### 4.1 Functional Requirements  
**Calculation Engine**  
- Exact replication of all Excel probability formulas  
- Real-time demand calculation with R&D multipliers  
- Dynamic price sensitivity adjustments  
- Automatic investment qualification checks

**Data Management**  
- Customer data structure preservation:  
  - ID, Monthly Income, Monthly Food Spending  
  - Working Hours, Health Consciousness  
  - Experimental Food Interest, Sustainability Preference  
  - Brand Loyalty, Probability  
- Comprehensive logging of all user actions  
- JSON-structured action details and results

**Game State Management**  
- Weekly progression with configurable timing  
- Automatic round-end processing  
- Real-time leaderboard updates  
- Session state persistence

### 4.2 Non-Functional Requirements  
**Performance**  
- Support for 10 concurrent players + 1 admin  
- Real-time dashboard updates  
- Sub-second calculation response times  
- Auto-refresh after each round completion

**Security**  
- Simple username/password authentication  
- 20-minute inactivity timeout  
- Admin-only intervention capabilities  
- Secure data persistence

**Reliability**  
- Automated backups after each round  
- Error handling for invalid inputs  
- System recovery capabilities  
- Comprehensive logging for debugging

**Compatibility**  
- Web application accessible via laptop/iPad  
- Mobile device blocking with user notification  
- Cross-browser compatibility  
- Responsive design for tablet/desktop

### 4.3 Technical Stack  
**Frontend**  
- React with Next.js and TypeScript  
- Real-time data visualization components  
- Responsive design (iPad/laptop optimized)

**Backend**  
- Next.js API routes  
- Real-time calculations and game logic  
- Authentication and session management

**Database**  
- Supabase with structured tables:  
  - customers, game_logs, teams, products  
  - rnd_tests, analytics_purchases, weekly_results  
  - game_settings

**Deployment & Infrastructure**  
- Vercel deployment platform  
- Docker containerization  
- GitHub version control  
- Automated backup systems

### 4.4 Data Schema Requirements  
**Core Tables**  
- `customers`: All demographic and preference fields  
- `game_logs`: Comprehensive action tracking  
- `teams`: Player credentials and game state  
- `products`: Product definitions and attributes  
- `weekly_results`: Performance metrics and progression

**Business Logic Preservation**  
- Exact Excel formula implementation  
- Dynamic customer data impact on calculations  
- R&D multiplier logic maintenance  
- Investment qualification rules

## 5. Constraints & Assumptions

### 5.1 Constraints  
- Maximum 10 concurrent student teams  
- iPad and laptop access only (no mobile)  
- 20-minute session timeout  
- Fixed success probabilities per R&D tier  
- Preserved Excel calculation logic

### 5.2 Assumptions  
- Admin has technical capability to manage customer data  
- Game sessions typically last 10 weeks (configurable)  
- Week duration defaults to 5 minutes (adjustable)  
- PDF reporting meets institutional needs  
- Real-time performance requirements are met with specified scale

## 6. Success Metrics

### 6.1 Technical Success  
- Elimination of manual admin calculations  
- Real-time gameplay with 10+ concurrent users  
- Accurate replication of Excel game logic  
- Comprehensive logging and reporting

### 6.2 User Success  
- Smooth student gameplay experience  
- Effective admin monitoring and control  
- Educational value preservation  
- Positive user feedback on automation

### 6.3 Business Success  
- Reduced administrative overhead  
- Scalable game deployment  
- Maintainable codebase  
- Successful classroom integration


