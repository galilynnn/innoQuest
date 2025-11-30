# InnoQuest - Technical Documentation

## Table of Contents
- [Overview](#overview)
- [How It Works (Plain English)](#how-it-works-plain-english)
- [Complete User Journey](#complete-user-journey)
- [Tech Stack (Why We Chose Each Tool)](#tech-stack-why-we-chose-each-tool)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [Game Flow Logic](#game-flow-logic)
- [Real-Time Synchronization](#real-time-synchronization)
- [API Endpoints](#api-endpoints)
- [Component Architecture](#component-architecture)

---

## Overview

InnoQuest is a multiplayer business simulation game where teams compete by making strategic decisions across multiple weeks. The system supports simultaneous gameplay with admin-controlled progression and real-time status tracking.

---

## How It Works (Plain English)

### The Big Picture

Think of InnoQuest like a digital board game that multiple teams play at the same time on their own computers. The admin is like a game master who sets everything up and controls when the game moves forward.

### Why We Built It This Way

**No Server Needed:**
We use **Next.js** as our backend because it's "serverless." This means we don't need to set up, maintain, or pay for a dedicated server running 24/7. When someone visits the website, Next.js automatically handles their request and shuts down when done. It's like having a vending machine instead of a full restaurant - it only works when someone needs it.

**Database in the Cloud:**
We use **Supabase** (which is built on PostgreSQL) because it's also fully managed in the cloud. We don't need to install database software, worry about backups, or handle server maintenance. Supabase gives us a database that's always online, and we just connect to it with a special key (like a password for our app).

**Real-Time Without Complexity:**
Instead of complex WebSocket connections, we use simple "polling" - the website checks for updates every few seconds. It's like checking your mailbox every minute instead of having someone knock on your door when mail arrives. Simple and reliable.

**Session Storage:**
We store who's logged in using the browser's built-in `sessionStorage`. It's like writing a note on a sticky pad in your browser - fast, simple, and automatically disappears when you close the tab.

---

## Complete User Journey

### Act 1: Admin Setup (Before Students Arrive)

**What Happens:**
The admin (teacher/facilitator) opens the website and goes to the admin dashboard.

**Step-by-Step Flow:**

1. **Admin Creates Team Accounts**
   - **Human Version:** The admin types in usernames and passwords for each team (like "team01" / "password123")
   - **Technical Version:** When the admin clicks "Save", the website sends the data to our API endpoint
   - **Behind the Scenes:** 
     ```
     Website → Next.js API → Supabase Database
     
     The API receives: { username: "team01", password: "password123" }
     The API creates: { 
       id: auto-generated UUID,
       username: "team01",
       password_hash: hashed version of "password123",
       last_activity: NULL (means "not joined yet"),
       total_balance: 100000 (starting money)
     }
     This gets stored in the "teams" table
     ```
   - **Why Hash?** We don't store the actual password. We convert it to a jumbled code (hash) so if someone hacks the database, they can't see real passwords.

2. **Admin Sees "Not Joined" Status**
   - **Human Version:** The team list shows "Not Joined" in red for all teams
   - **Technical Version:** The website checks if `last_activity` is NULL in the database
   - **Behind the Scenes:**
     ```
     Every 3 seconds:
     Website → Supabase: "Give me all teams"
     Supabase → Website: [{ team_name: "Team 1", last_activity: null }, ...]
     Website: "NULL means not joined, show red badge"
     ```

### Act 2: Students Log In (Joining the Game)

**What Happens:**
Students open the website on their computers/phones and click the "Student" button.

**Step-by-Step Flow:**

1. **Student Enters Credentials**
   - **Human Version:** Student types their username and password
   - **Technical Version:** Form data is captured in React state
   - **Behind the Scenes:**
     ```
     Student types: username = "team01", password = "password123"
     React stores it in: const [username, setUsername] = useState("")
     ```

2. **Login Button Clicked**
   - **Human Version:** Student clicks "Login"
   - **Technical Version:** Form submits and validates credentials
   - **Behind the Scenes:**
     ```
     Step 1: Hash the entered password
     Input password → Hash function → "hashedPassword123"
     
     Step 2: Query database
     Website → Supabase: "Find team where username = 'team01' AND password_hash = 'hashedPassword123'"
     
     Step 3A: Match Found ✅
     Supabase → Website: { id: "uuid-abc", team_name: "Team 1", game_id: "uuid-xyz" }
     
     Step 3B: No Match ❌
     Supabase → Website: null
     Website shows: "Invalid username or password"
     ```

3. **Session Created**
   - **Human Version:** Student is now "logged in" and their name appears in the player list
   - **Technical Version:** Login data is stored in sessionStorage and database is updated
   - **Behind the Scenes:**
     ```
     Step 1: Save to browser
     sessionStorage.setItem('team_id', 'uuid-abc')
     sessionStorage.setItem('team_name', 'Team 1')
     sessionStorage.setItem('game_id', 'uuid-xyz')
     
     Step 2: Update database
     Website → Supabase: "UPDATE teams SET last_activity = NOW() WHERE id = 'uuid-abc'"
     
     Step 3: Redirect based on game status
     Website → Supabase: "What's the game_status?"
     Supabase → Website: "lobby" or "active"
     
     If "lobby" → Send student to waiting room (/student/lobby)
     If "active" → Send student directly to game (/student/gameplay)
     ```

4. **Admin Sees "Joined" Status**
   - **Human Version:** The admin dashboard now shows this team as "Joined" in green
   - **Technical Version:** Polling detects last_activity is no longer NULL
   - **Behind the Scenes:**
     ```
     Admin page checks every 3 seconds:
     Website → Supabase: "Give me all teams"
     Supabase → Website: [{ team_name: "Team 1", last_activity: "2025-11-17 10:30:15" }, ...]
     Website: "last_activity exists! Show green 'Joined' badge"
     ```

### Act 3: The Waiting Room (Lobby)

**What Happens:**
Students wait in a lobby page until the admin starts the game. They can see other players joining.

**Step-by-Step Flow:**

1. **Lobby Page Loads**
   - **Human Version:** Student sees "Waiting for game to start..." and a list of players
   - **Technical Version:** React component mounts and starts polling
   - **Behind the Scenes:**
     ```
     useEffect runs:
     
     Every 1 second, check:
     Step 1: Read session
     const gameId = sessionStorage.getItem('game_id')
     
     Step 2: Check game status
     Website → Supabase: "SELECT game_status FROM game_settings WHERE game_id = 'uuid-xyz'"
     Supabase → Website: { game_status: "lobby" }
     
     Step 3: If still lobby, load player list
     Website → Supabase: "SELECT * FROM teams WHERE game_id = 'uuid-xyz'"
     Supabase → Website: [{ team_name: "Team 1" }, { team_name: "Team 2" }, ...]
     
     Website displays: "Team 1 ✅, Team 2 ✅, Team 3 ❌ (not joined)"
     ```

2. **Continuous Checking (The Magic of Polling)**
   - **Human Version:** The page automatically updates when the game starts - no refresh needed!
   - **Technical Version:** setInterval keeps checking every second
   - **Behind the Scenes:**
     ```
     Second 1: Check game_status → "lobby" → Stay on page
     Second 2: Check game_status → "lobby" → Stay on page
     Second 3: Check game_status → "lobby" → Stay on page
     ...
     Second 47: Check game_status → "active" → REDIRECT TO GAME!
     
     When "active" detected:
     window.location.href = '/student/gameplay'
     All students move at the same time ✨
     ```

### Act 4: Starting the Game (The Big Moment)

**What Happens:**
The admin clicks "Start Game" and all students instantly move to the gameplay screen.

**Step-by-Step Flow:**

1. **Admin Clicks "Start Game"**
   - **Human Version:** Admin presses the big "Start Game" button
   - **Technical Version:** Button onClick triggers API call
   - **Behind the Scenes:**
     ```
     Button clicked → JavaScript runs:
     
     fetch('/api/start-game', {
       method: 'POST',
       body: JSON.stringify({ gameId: 'uuid-xyz' })
     })
     
     Request travels: Website → Next.js API endpoint
     ```

2. **API Validates Everything**
   - **Human Version:** System checks if anyone is actually logged in
   - **Technical Version:** API queries database and validates
   - **Behind the Scenes:**
     ```
     API endpoint /api/start-game receives request:
     
     Step 1: Get all teams
     const teams = await supabase
       .from('teams')
       .select('*')
       .eq('game_id', gameId)
     
     Step 2: Filter logged-in teams
     const loggedInTeams = teams.filter(t => t.last_activity !== null)
     
     Step 3: Validate
     if (loggedInTeams.length === 0) {
       return error: "No players logged in!"
     }
     
     Step 4: All good! Continue...
     ```

3. **Database Status Changes**
   - **Human Version:** The game officially starts
   - **Technical Version:** game_status changes from "lobby" to "active"
   - **Behind the Scenes:**
     ```
     API → Supabase:
     "UPDATE game_settings 
      SET game_status = 'active',
          current_week = 1,
          updated_at = NOW()
      WHERE game_id = 'uuid-xyz'"
     
     Supabase confirms: "Updated successfully"
     
     Also log the event:
     "INSERT INTO game_logs (action, details) 
      VALUES ('game_started', '{"players": 3}')"
     ```

4. **Students Auto-Redirect**
   - **Human Version:** Within 1 second, all student screens change to the game page
   - **Technical Version:** Polling detects status change and redirects
   - **Behind the Scenes:**
     ```
     Student lobby pages (all polling every 1 second):
     
     Poll #1: game_status = "lobby" → stay
     Poll #2: game_status = "lobby" → stay
     Poll #3: game_status = "ACTIVE" → 🎮 REDIRECT!
     
     JavaScript runs:
     console.log("🎮 GAME STARTED! Redirecting...")
     window.location.href = '/student/gameplay'
     
     All 3 students redirect at almost the exact same time!
     ```

### Act 5: Playing the Game (Active Gameplay)

**What Happens:**
Students see their team's status, make decisions, and advance through weeks.

**Step-by-Step Flow:**

1. **Gameplay Page Loads**
   - **Human Version:** Student sees "Week 1 of 12", their balance, and decision forms
   - **Technical Version:** React component loads team data from database
   - **Behind the Scenes:**
     ```
     Page loads → useEffect runs:
     
     Step 1: Get session
     const teamId = sessionStorage.getItem('team_id')
     
     Step 2: Load team data
     Website → Supabase: "SELECT * FROM teams WHERE id = 'uuid-abc'"
     Supabase → Website: { 
       team_name: "Team 1", 
       total_balance: 100000,
       funding_stage: "Bootstrap"
     }
     
     Step 3: Load game settings
     Website → Supabase: "SELECT * FROM game_settings WHERE game_id = 'uuid-xyz'"
     Supabase → Website: {
       current_week: 1,
       total_weeks: 12,
       game_status: "active"
     }
     
     Step 4: Display on screen
     "Week 1 of 12"
     "Balance: $100,000"
     ```

2. **Heartbeat Keeps Student "Alive"**
   - **Human Version:** As long as the page is open, the admin sees this student as "online"
   - **Technical Version:** Every 10 seconds, update last_activity
   - **Behind the Scenes:**
     ```
     setInterval runs every 10 seconds:
     
     Second 10: Update database
     Website → Supabase: "UPDATE teams SET last_activity = NOW() WHERE id = 'uuid-abc'"
     
     Second 20: Update again
     Website → Supabase: "UPDATE teams SET last_activity = NOW() WHERE id = 'uuid-abc'"
     
     This continues as long as page is open...
     
     Admin can see: "Last seen: 5 seconds ago" (active!)
     ```

3. **Student Makes Decisions**
   - **Human Version:** Student fills out forms (hire people, set prices, marketing budget)
   - **Technical Version:** React state captures form inputs
   - **Behind the Scenes:**
     ```
     Student types: Marketing Budget = 5000
     
     React state updates:
     const [decisions, setDecisions] = useState({
       marketing_budget: 5000,
       num_hires: 2,
       product_price: 99
     })
     
     Not saved yet - just in memory!
     ```

4. **Student Clicks "Next Week"**
   - **Human Version:** Student submits decisions and advances to the next week
   - **Technical Version:** Decisions are saved, week progresses
   - **Behind the Scenes:**
     ```
     Step 1: Confirm action
     Browser shows: "Advance from Week 1 to Week 2?"
     Student clicks: OK
     
     Step 2: Log current week
     Website → Supabase:
     "INSERT INTO game_logs (
       team_id: 'uuid-abc',
       action: 'week_completed',
       details: {
         week: 1,
         balance: 100000,
         decisions: { marketing: 5000, hires: 2 }
       }
     )"
     
     Step 3: Update week number
     Website → Supabase:
     "UPDATE game_settings 
      SET current_week = 2
      WHERE game_id = 'uuid-xyz'"
     
     Step 4: Reload page
     window.location.reload()
     
     Step 5: Page loads again, now shows "Week 2 of 12"
     ```

### Act 6: Admin Monitoring (Behind the Scenes)

**What Happens:**
While students play, the admin can see everything happening in real-time.

**Step-by-Step Flow:**

1. **Week Progression Panel**
   - **Human Version:** Admin sees "Week 2 | 3 / 5 Teams Joined | Advance Week button"
   - **Technical Version:** Component polls database every 3 seconds
   - **Behind the Scenes:**
     ```
     Every 3 seconds:
     
     Step 1: Get game status
     Website → Supabase: "SELECT current_week, total_weeks FROM game_settings"
     Supabase → Website: { current_week: 2, total_weeks: 12 }
     
     Step 2: Count active teams
     Website → Supabase: "SELECT COUNT(*) FROM teams WHERE last_activity IS NOT NULL"
     Supabase → Website: { count: 3 }
     
     Step 3: Get total teams
     Website → Supabase: "SELECT max_teams FROM game_settings"
     Supabase → Website: { max_teams: 5 }
     
     Step 4: Display
     "Week 2 of 12"
     "3 / 5 Teams Joined"
     ```

2. **Teams Management Panel**
   - **Human Version:** Admin sees list of all teams with their status
   - **Technical Version:** Data loaded on page mount, no auto-refresh (to avoid typing interruption)
   - **Behind the Scenes:**
     ```
     When admin opens the page:
     
     Website → Supabase: "SELECT * FROM teams"
     Supabase → Website: [
       { team_name: "Team 1", last_activity: "2025-11-17 10:45:00" },
       { team_name: "Team 2", last_activity: null },
       { team_name: "Team 3", last_activity: "2025-11-17 10:44:55" }
     ]
     
     Display logic:
     - Team 1: last_activity exists → Show "Joined" (green)
     - Team 2: last_activity is null → Show "Not Joined" (red)
     - Team 3: last_activity exists → Show "Joined" (green)
     
     No auto-refresh! Admin can type passwords without interruption.
     ```

### Act 7: Game Ends (Completion)

**What Happens:**
When the final week is reached, the game automatically ends.

**Step-by-Step Flow:**

1. **Final Week Detection**
   - **Human Version:** Student clicks "Next Week" on Week 12 (last week)
   - **Technical Version:** API detects current_week >= total_weeks
   - **Behind the Scenes:**
     ```
     Week advancement logic:
     
     Current week: 12
     Total weeks: 12
     Next week would be: 13
     
     Check: 13 >= 12? YES!
     
     Update database:
     "UPDATE game_settings 
      SET current_week = 12,
          game_status = 'completed'
      WHERE game_id = 'uuid-xyz'"
     
     Game is now over!
     ```

2. **Students See "Game Over"**
   - **Human Version:** Page shows final results, buttons disabled
   - **Technical Version:** Conditional rendering based on game_status
   - **Behind the Scenes:**
     ```
     Page loads:
     
     const gameStatus = gameSettings.game_status
     
     if (gameStatus === 'completed') {
       Show: "Game Completed! Final Week: 12"
       Disable: "Next Week" button
       Show: Final leaderboard, results
     }
     ```

---

## Tech Stack (Why We Chose Each Tool)

### Frontend Framework

**What We Use:** Next.js 16.0.3 with React 19.2.0

**In Plain English:**
Next.js is like a Swiss Army knife for building websites. It handles both the website display (frontend) and the server logic (backend) in one package.

**Why We Chose It:**
1. **Serverless Backend:** We don't need to rent a server that runs 24/7. Next.js automatically creates mini-servers (called API routes) that only run when someone makes a request. It's like ordering food delivery instead of running a restaurant - you only pay when someone orders.

2. **File-Based Routing:** Creating new pages is as simple as creating new files. Want a `/student/login` page? Just create `app/student/login/page.tsx`. No complex configuration needed.

3. **React Integration:** We get all the power of React (reusable components, state management) built-in.

4. **Fast Development:** Hot reload means we see changes instantly without refreshing the browser.

**Real Example:**
```
When a student visits /student/gameplay:
→ Next.js automatically finds app/student/gameplay/page.tsx
→ Renders the React component
→ Sends HTML to the browser
→ All in milliseconds!
```

---

### Database

**What We Use:** Supabase (PostgreSQL)

**In Plain English:**
Supabase is like having a spreadsheet in the cloud that multiple people can read and write to at the same time, but way more powerful.

**Why We Chose It:**
1. **Managed Cloud Database:** We don't install anything. Supabase hosts the database for us. It's like using Gmail instead of running your own email server.

2. **PostgreSQL Power:** Behind the scenes, it's using PostgreSQL - one of the most reliable database systems in the world. It can handle complex queries, relationships between data, and millions of records.

3. **Built-in Real-Time:** Supabase can notify us when data changes (though we're using polling for simplicity).

4. **JavaScript SDK:** We can talk to the database directly from our website using simple JavaScript commands. No need for a separate backend API.

5. **Free Tier:** Perfect for prototypes and small projects. We only pay if we grow big.

**Real Example:**
```
Instead of:
1. Set up Linux server
2. Install PostgreSQL
3. Configure security
4. Set up backups
5. Monitor server health

We just:
1. Create Supabase account
2. Copy connection key
3. Done! Database ready.
```

---

### Styling

**What We Use:** Tailwind CSS

**In Plain English:**
Tailwind is like having pre-made LEGO blocks for styling. Instead of writing custom CSS, we combine small utility classes.

**Why We Chose It:**
1. **Fast Styling:** `className="bg-red-500 text-white px-4 py-2"` instantly creates a red button with white text and padding. No CSS file needed.

2. **Consistent Design:** All colors, spacing, and sizes come from a predefined scale. This keeps the design consistent across the entire app.

3. **Responsive Out-of-the-Box:** `md:text-lg lg:text-xl` makes text bigger on tablets and desktops automatically.

4. **No CSS Conflicts:** Each component styles itself. No worrying about global CSS overwriting things.

**Real Example:**
```html
<!-- Traditional CSS -->
<button class="login-button">Login</button>
<style>
  .login-button {
    background-color: #E63946;
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
  }
</style>

<!-- Tailwind CSS (no separate CSS file needed!) -->
<button className="bg-[#E63946] text-white px-4 py-2 rounded-lg">
  Login
</button>
```

---

### Programming Language

**What We Use:** TypeScript

**In Plain English:**
TypeScript is JavaScript with a safety net. It catches mistakes before your code even runs.

**Why We Chose It:**
1. **Type Safety:** TypeScript knows what type of data each variable should hold. If you try to put text where a number should go, it yells at you before the code runs.

2. **Better Autocomplete:** Your editor can suggest exactly what properties an object has. No guessing!

3. **Easier Refactoring:** Rename a variable and TypeScript automatically updates it everywhere. No missed spots.

4. **Clearer Code:** When you see `teamId: string`, you know exactly what it should be. No surprises.

**Real Example:**
```typescript
// JavaScript - No protection ❌
function getTeamBalance(team) {
  return team.balanse  // Typo! No error until runtime
}

// TypeScript - Catches error immediately ✅
interface Team {
  balance: number
}

function getTeamBalance(team: Team) {
  return team.balanse  // ❌ Error: Property 'balanse' doesn't exist. Did you mean 'balance'?
}
```

---

### Why NO WebSockets / NO Complex Real-Time?

**What We Use Instead:** Simple polling (checking every 1-3 seconds)

**In Plain English:**
Instead of having the database "push" updates to us instantly, we "pull" by asking "anything new?" every few seconds.

**Why We Chose It:**
1. **Simplicity:** Polling is just a regular database query in a loop. WebSockets require complex connection management, reconnection logic, and state synchronization.

2. **Reliability:** If a poll fails, the next one just runs a second later. WebSocket disconnections need error handling and reconnection logic.

3. **Good Enough:** For a game where weeks last minutes, checking every 1-3 seconds feels instant to users.

4. **Free Tier Friendly:** Supabase limits real-time connections on free tier. Polling uses standard database queries.

**Real Example:**
```javascript
// WebSocket approach (complex) ❌
const socket = new WebSocket('ws://...')
socket.onopen = () => { /* handle open */ }
socket.onmessage = (msg) => { /* handle message */ }
socket.onerror = () => { /* handle error */ }
socket.onclose = () => { /* reconnect logic */ }

// Polling approach (simple) ✅
setInterval(async () => {
  const status = await supabase
    .from('game_settings')
    .select('game_status')
  
  if (status === 'active') redirect()
}, 1000)
```

---

### Why sessionStorage Instead of Cookies/JWT?

**What We Use:** Browser's built-in `sessionStorage`

**In Plain English:**
sessionStorage is like a notepad in your browser tab that only that tab can read, and it erases itself when you close the tab.

**Why We Chose It:**
1. **Simplicity:** Just use `sessionStorage.setItem('key', 'value')`. No token generation, no cookie configuration, no expiry management.

2. **Automatic Cleanup:** Close the tab, and the session is gone. No manual logout cleanup needed.

3. **No Server Overhead:** The server doesn't need to validate tokens or manage sessions. We just send the `team_id` with requests.

4. **Good for Prototypes:** In production, we'd use JWT or httpOnly cookies for security. But for a classroom game, sessionStorage is perfect.

**Trade-offs:**
- ❌ Lost when tab closes (not a problem for a single-session game)
- ❌ Vulnerable to XSS attacks (acceptable for prototype with controlled users)
- ❌ No cross-tab sharing (each tab is independent - actually a feature!)

**Real Example:**
```javascript
// JWT approach (production) 🔒
const token = jwt.sign({ teamId }, secret, { expiresIn: '1h' })
res.cookie('token', token, { httpOnly: true, secure: true })
// Need middleware to verify token on every request

// sessionStorage approach (prototype) 🚀
sessionStorage.setItem('team_id', teamId)
// Just read it directly when needed
const teamId = sessionStorage.getItem('team_id')
```

---

### Why Disabled Row-Level Security (RLS)?

**What We Did:** Used Supabase `service_role` key with RLS disabled

**In Plain English:**
RLS (Row-Level Security) is like putting locks on individual rows in the database so users can only see their own data. We turned it off for simplicity.

**Why We Chose It:**
1. **Faster Development:** No need to write complex security policies for each table. We can focus on building features.

2. **Controlled Environment:** This is a classroom game with trusted users. Not a public app with malicious actors.

3. **Full Access Needed:** Admin needs to see all teams' data. Students need to see game settings. Easier without RLS barriers.

4. **Prototype Stage:** In production, we'd enable RLS and write proper policies. But for MVP, speed matters more.

**Future Plan:**
```sql
-- Production would have policies like:
CREATE POLICY "Teams can only see their own data"
ON teams FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admin can see all teams"
ON teams FOR SELECT
USING (auth.role() = 'admin');
```

---

### Complete Technology Justification Summary

| Technology | What It Replaces | Why We Chose It |
|------------|------------------|-----------------|
| **Next.js** | Express.js + React separately | All-in-one framework, serverless API routes, no separate backend needed |
| **Supabase** | Self-hosted PostgreSQL | Managed cloud database, no server setup, built-in auth & real-time |
| **TypeScript** | Plain JavaScript | Catch errors before runtime, better autocomplete, self-documenting code |
| **Tailwind CSS** | Custom CSS files | Fast styling with utility classes, consistent design system |
| **sessionStorage** | JWT tokens / Cookies | Simple for prototypes, automatic cleanup, no server session management |
| **Polling** | WebSockets | Simpler to implement, more reliable, good enough for our use case |
| **Service Role Key** | RLS policies | Faster development, full database access, acceptable for controlled environment |

---

## Tech Stack

### Frontend
- **Next.js 16.0.3** - React framework with App Router
- **React 19.2.0** - UI component library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Turbopack** - Fast bundler for development

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Supabase PostgreSQL** - Database and real-time subscriptions
- **Service Role Authentication** - Direct database access (RLS disabled for prototype)

### State Management
- **React useState/useEffect** - Local component state
- **sessionStorage** - Client-side session persistence
- **Polling** - Real-time status updates (1s for lobby, 3s for admin, 10s for heartbeat)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │   Student View   │         │    Admin View    │            │
│  ├──────────────────┤         ├──────────────────┤            │
│  │ • Login Page     │         │ • Dashboard      │            │
│  │ • Lobby Page     │         │ • Teams Mgmt     │            │
│  │ • Gameplay Page  │         │ • Lobby Control  │            │
│  │                  │         │ • Week Progress  │            │
│  │ Polling: 1s/10s  │         │ Polling: 3s      │            │
│  └────────┬─────────┘         └────────┬─────────┘            │
│           │                            │                       │
│           └────────────┬───────────────┘                       │
│                        │                                       │
└────────────────────────┼───────────────────────────────────────┘
                         │
                         │ HTTPS Requests
                         │
┌────────────────────────┼───────────────────────────────────────┐
│                        │        API LAYER                       │
├────────────────────────┼───────────────────────────────────────┤
│                        ▼                                        │
│  ┌─────────────────────────────────────────────────────┐      │
│  │          Next.js API Routes (Serverless)            │      │
│  ├─────────────────────────────────────────────────────┤      │
│  │                                                      │      │
│  │  /api/start-game      → Start game (lobby→active)   │      │
│  │  /api/advance-week    → Advance to next week        │      │
│  │  /api/calculate-weekly → Process team decisions     │      │
│  │                                                      │      │
│  └──────────────────────┬──────────────────────────────┘      │
│                         │                                      │
└─────────────────────────┼──────────────────────────────────────┘
                          │
                          │ Supabase Client (service_role)
                          │
┌─────────────────────────┼──────────────────────────────────────┐
│                         │      DATABASE LAYER                   │
├─────────────────────────┼──────────────────────────────────────┤
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────┐         │
│  │         Supabase PostgreSQL Database             │         │
│  ├──────────────────────────────────────────────────┤         │
│  │                                                   │         │
│  │  Tables:                                          │         │
│  │  • game_settings    (game state, week, status)   │         │
│  │  • teams            (accounts, balance, status)  │         │
│  │  • game_logs        (audit trail)                │         │
│  │  • customers        (game data)                  │         │
│  │  • team_decisions   (player choices)             │         │
│  │  • team_history     (weekly snapshots)           │         │
│  │                                                   │         │
│  │  RLS: DISABLED (Prototype - service_role key)    │         │
│  │                                                   │         │
│  └──────────────────────────────────────────────────┘         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

#### `game_settings`
Stores game configuration and current state.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `game_id` | UUID | Game instance identifier |
| `game_status` | TEXT | 'lobby', 'active', 'completed' |
| `current_week` | INTEGER | Current week number (1-N) |
| `total_weeks` | INTEGER | Total weeks in game |
| `max_teams` | INTEGER | Maximum number of teams |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

#### `teams`
Stores team accounts and current game state.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Team unique identifier |
| `game_id` | UUID | Associated game |
| `team_name` | TEXT | Display name |
| `username` | TEXT (UNIQUE) | Login username |
| `password_hash` | TEXT | Hashed password |
| `total_balance` | NUMERIC | Current cash balance (฿) |
| `funding_stage` | TEXT | Current funding stage |
| `last_activity` | TIMESTAMP (NULL) | Last login/heartbeat |
| `is_active` | BOOLEAN | Account enabled status |

**Key Logic:**
- `last_activity = NULL` → Team shows as "Not Joined"
- `last_activity != NULL` → Team shows as "Joined"
- Updated every 10 seconds via heartbeat

#### `game_logs`
Audit trail for all game actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Log entry identifier |
| `game_id` | UUID | Associated game |
| `team_id` | UUID (NULL) | Associated team (if applicable) |
| `action` | TEXT | Action type (e.g., 'game_started', 'week_completed') |
| `details` | JSONB | Action details |
| `result` | JSONB | Action result |
| `created_at` | TIMESTAMP | Log timestamp |

---

## Authentication Flow

```
┌─────────────┐
│   Student   │
│   Browser   │
└──────┬──────┘
       │
       │ 1. Navigate to /
       │
       ▼
┌─────────────────┐
│   Home Page     │
│  Two Buttons:   │
│  [Admin][Student]│
└──────┬──────────┘
       │
       │ 2. Click "Student"
       │
       ▼
┌─────────────────────────────┐
│   Student Login Page        │
│   /student/login            │
├─────────────────────────────┤
│ Input: username, password   │
│                             │
│ 3. Submit credentials       │
└──────┬──────────────────────┘
       │
       │ POST validation
       │
       ▼
┌─────────────────────────────┐
│  Supabase Query             │
│  SELECT * FROM teams        │
│  WHERE username = ?         │
│  AND password_hash = ?      │
└──────┬──────────────────────┘
       │
       │ Match found?
       │
       ├─── NO ──→ Alert "Invalid credentials"
       │
       └─── YES
            │
            │ 4. Update last_activity = NOW()
            │
            ▼
       ┌────────────────────────┐
       │  sessionStorage.set:   │
       │  • team_id             │
       │  • team_name           │
       │  • game_id             │
       └────────┬───────────────┘
                │
                │ 5. Check game_status
                │
                ├─── 'lobby' ──→ Redirect to /student/lobby
                │
                └─── 'active' ──→ Redirect to /student/gameplay
```

### Session Persistence
- **Storage:** Browser `sessionStorage`
- **Duration:** Until browser tab closes
- **Data:** `team_id`, `team_name`, `game_id`
- **Validation:** Checked on every protected page load

---

## Game Flow Logic

### State Machine

```
┌──────────────┐
│    LOBBY     │  Initial state
│   (waiting)  │  • Admin creates teams
└──────┬───────┘  • Students log in
       │          • Shows "Not Joined" / "Joined"
       │
       │ Admin clicks "Start Game"
       │ (requires ≥1 logged in player)
       │
       ▼
┌──────────────────┐
│  /api/start-game │  Transition logic
├──────────────────┤
│ 1. Validate      │
│ 2. Set status    │  game_status = 'active'
│ 3. Set week      │  current_week = 1
│ 4. Log action    │  game_logs.insert()
└──────┬───────────┘
       │
       │ Students auto-redirect (1s polling)
       │
       ▼
┌──────────────┐
│   ACTIVE     │  Gameplay state
│  (playing)   │  • Students see Week N
└──────┬───────┘  • Make decisions
       │          • Submit choices
       │
       │ Student clicks "Next Week"
       │ OR Admin clicks "Advance Week"
       │
       ▼
┌────────────────────┐
│ /api/advance-week  │  Week progression
├────────────────────┤
│ 1. Log week N data │  game_logs.insert()
│ 2. Process teams   │  Calculate results
│ 3. Increment week  │  current_week++
│ 4. Update status   │  Check if final week
└──────┬─────────────┘
       │
       │ current_week >= total_weeks?
       │
       ├─── NO ──→ Stay in ACTIVE (week N+1)
       │
       └─── YES
            │
            ▼
       ┌──────────────┐
       │  COMPLETED   │  End state
       │   (ended)    │  • Show final results
       └──────────────┘  • No more decisions
```

### Week Advancement Logic

**When "Next Week" button clicked:**

```javascript
1. Validate:
   - Game is active
   - Team is authenticated
   - Not past total_weeks

2. Log current week:
   INSERT INTO game_logs (
     game_id,
     team_id,
     action: 'week_completed',
     details: {
       week: current_week,
       balance: team.total_balance,
       funding_stage: team.funding_stage
     }
   )

3. Update game state:
   UPDATE game_settings
   SET current_week = current_week + 1,
       game_status = CASE
         WHEN current_week + 1 >= total_weeks THEN 'completed'
         ELSE 'active'
       END
   WHERE game_id = ?

4. Reload page to show new week
```

---

## Real-Time Synchronization

### Polling Strategy

| Component | Interval | Purpose | Method |
|-----------|----------|---------|--------|
| **Lobby Page** (Student) | 1 second | Detect game start | Query `game_settings.game_status` |
| **Lobby Control** (Admin) | 3 seconds | Show online players | Query `teams.last_activity` |
| **Week Progression** (Admin) | 3 seconds | Show team count | Query `teams.last_activity` |
| **Gameplay Heartbeat** (Student) | 10 seconds | Update presence | Update `teams.last_activity` |

### Heartbeat System

**Purpose:** Track which students are actively playing

```javascript
// In /student/gameplay page
useEffect(() => {
  const heartbeat = setInterval(async () => {
    const teamId = sessionStorage.getItem('team_id')
    
    await supabase
      .from('teams')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', teamId)
  }, 10000) // Every 10 seconds
  
  return () => clearInterval(heartbeat)
}, [])
```

**Status Detection:**
- `last_activity IS NULL` → "Not Joined" (never logged in)
- `last_activity > NOW() - 30 seconds` → "Joined" (active)
- `last_activity < NOW() - 30 seconds` → "Joined" (but may be offline)

### Stale Closure Prevention

**Problem:** React useEffect intervals capture old function references

**Solution:** Inline all logic directly in the interval callback

```javascript
// ❌ BAD - Stale closure
useEffect(() => {
  const interval = setInterval(loadData, 1000)
  return () => clearInterval(interval)
}, [])

// ✅ GOOD - Fresh data every poll
useEffect(() => {
  const interval = setInterval(async () => {
    const gameId = sessionStorage.getItem('game_id')
    const { data } = await supabase
      .from('game_settings')
      .select('game_status')
      .eq('game_id', gameId)
      .single()
    
    if (data.game_status === 'active') {
      window.location.href = '/student/gameplay'
    }
  }, 1000)
  
  return () => clearInterval(interval)
}, [])
```

---

## API Endpoints

### POST `/api/start-game`

**Purpose:** Transition game from lobby to active state

**Request:**
```json
{
  "gameId": "00000000-0000-0000-0000-000000000001"
}
```

**Logic:**
1. Query all teams for gameId
2. Filter teams where `last_activity IS NOT NULL` (logged in players)
3. Validate at least 1 player is logged in
4. Update `game_settings`: `game_status = 'active'`, `current_week = 1`
5. Insert log: `action = 'game_started'`

**Response:**
```json
{
  "message": "Game started successfully",
  "players": 5
}
```

### POST `/api/advance-week`

**Purpose:** Process decisions and advance to next week

**Request:**
```json
{
  "gameId": "00000000-0000-0000-0000-000000000001"
}
```

**Logic:**
1. Get current week from `game_settings`
2. Query all active teams (logged in)
3. For each team:
   - Load decisions from `team_decisions`
   - Run game calculations
   - Update `teams.total_balance`
   - Insert snapshot to `team_history`
4. Increment `current_week`
5. If `current_week >= total_weeks`, set `game_status = 'completed'`

**Response:**
```json
{
  "message": "Week advanced",
  "week": 2
}
```

### POST `/api/calculate-weekly`

**Purpose:** Run weekly calculations for a single team

**Request:**
```json
{
  "teamId": "uuid",
  "week": 2
}
```

**Logic:**
- Load team decisions
- Calculate revenue, expenses, growth
- Update balance and funding stage
- Store results in history

---

## Component Architecture

### Admin Components

#### `components/admin/teams-management.tsx`
- **Purpose:** CRUD operations for team accounts
- **Features:**
  - Dynamic rows based on `max_teams`
  - Edit/Confirm buttons for credentials
  - Status indicator (Joined/Not Joined)
- **No auto-refresh** (fixed to prevent typing interruption)

#### `components/admin/lobby-control.tsx`
- **Purpose:** Pre-game controls
- **Features:**
  - Player list with online/offline status
  - "Start Game" button (validates ≥1 player)
  - 3-second polling for status updates
- **State transitions:** Shows different UI for lobby/active/completed

#### `components/admin/week-progression.tsx`
- **Purpose:** Week advancement controls
- **Features:**
  - Shows current week and team join count
  - "Advance Week" button for admin
  - Warning if not all teams joined
  - 3-second auto-refresh

### Student Components

#### `app/student/login/page.tsx`
- **Purpose:** Authentication
- **Logic:**
  - Validate username/password
  - Update `last_activity` on success
  - Store session data
  - Route to lobby or gameplay based on `game_status`

#### `app/student/lobby/page.tsx`
- **Purpose:** Waiting room before game starts
- **Features:**
  - 1-second polling for game status
  - Auto-redirect when `game_status === 'active'`
  - Shows list of all players
- **Critical:** Inline polling logic to prevent stale closure

#### `app/student/gameplay/page.tsx`
- **Purpose:** Main gameplay interface
- **Features:**
  - Week display (Week N of M)
  - Balance and funding stage
  - **"Next Week" button** (new feature)
  - Tabs for decisions/reports/history
  - 10-second heartbeat
- **Redirects:** To lobby if game not active

---

## Key Technical Decisions

### Why sessionStorage instead of cookies?
- **Simpler implementation** for prototype
- **Tab-scoped:** Each browser tab has independent session
- **No server overhead:** No cookie parsing
- **Trade-off:** Lost on tab close (acceptable for prototype)

### Why polling instead of WebSockets?
- **Simplicity:** No WebSocket server needed
- **Supabase free tier:** Limited real-time connections
- **Acceptable latency:** 1-3 second updates sufficient for game
- **Future:** Can migrate to Supabase Realtime subscriptions

### Why disable RLS?
- **Prototype speed:** Faster development without policy configuration
- **Service role key:** Full database access
- **Future:** Re-enable with proper policies for production

### Why UUID for game_id?
- **Fixed identifier:** Single game instance (`00000000-0000-0000-0000-000000000001`)
- **Scalability:** Ready for multi-game support
- **Type safety:** PostgreSQL UUID type with validation

---

## Data Flow Examples

### Example 1: Student Logs In

```
1. Student enters username "team01", password "password123"
   
2. Query: SELECT * FROM teams 
   WHERE username = 'team01' 
   AND password_hash = 'password123'
   
3. Match found → teamData = { id: uuid, team_name: "Team 1", ... }
   
4. Update: UPDATE teams 
   SET last_activity = NOW() 
   WHERE id = teamData.id
   
5. Store: sessionStorage.setItem('team_id', teamData.id)
          sessionStorage.setItem('team_name', teamData.team_name)
          sessionStorage.setItem('game_id', teamData.game_id)
   
6. Query: SELECT game_status FROM game_settings 
   WHERE game_id = teamData.game_id
   
7. Route: game_status === 'lobby' → /student/lobby
          game_status === 'active' → /student/gameplay
```

### Example 2: Admin Starts Game

```
1. Admin clicks "Start Game" button in lobby control
   
2. Validate: Query teams WHERE last_activity IS NOT NULL
   → Result: 3 teams logged in
   
3. Check: 3 >= 1 (minimum requirement) ✅
   
4. Update: UPDATE game_settings 
   SET game_status = 'active', 
       current_week = 1,
       updated_at = NOW()
   WHERE game_id = '00000000-0000-0000-0000-000000000001'
   
5. Log: INSERT INTO game_logs (
     game_id, action, details, result
   ) VALUES (
     '00000000-...', 
     'game_started', 
     '{"players": 3}',
     '{"success": true}'
   )
   
6. Students' lobby pages detect change (1s polling):
   → game_status === 'active' 
   → window.location.href = '/student/gameplay'
```

### Example 3: Student Advances Week

```
1. Student clicks "Next Week" button (current_week = 1)
   
2. Confirm: Alert "Advance from Week 1 to Week 2?"
   
3. Log previous week:
   INSERT INTO game_logs (
     game_id: 'uuid',
     team_id: 'uuid',
     action: 'week_completed',
     details: {
       week: 1,
       balance: 100000,
       funding_stage: 'Bootstrap'
     }
   )
   
4. Update game:
   UPDATE game_settings 
   SET current_week = 2,
       game_status = (2 >= total_weeks ? 'completed' : 'active')
   WHERE game_id = 'uuid'
   
5. Reload: window.location.reload()
   → Page shows "Week 2 of 12"
```

---

## Security Considerations

### Current State (Prototype)
- ✅ Password hashing (SHA-256 or bcrypt recommended)
- ✅ UUID-based identifiers (prevents enumeration)
- ❌ RLS disabled (service_role key used)
- ❌ sessionStorage (vulnerable to XSS)
- ❌ No HTTPS enforcement
- ❌ No rate limiting

### Production Recommendations
1. **Enable RLS:** Create policies for team data isolation
2. **Use httpOnly cookies:** Prevent XSS attacks
3. **Add CSRF protection:** Protect state-changing operations
4. **Implement rate limiting:** Prevent API abuse
5. **Enable HTTPS:** Encrypt data in transit
6. **Add input validation:** Sanitize all user inputs
7. **Use JWT tokens:** Replace sessionStorage
8. **Add audit logging:** Track all admin actions

---

## Performance Optimization

### Current Optimizations
- **Conditional polling:** Only active pages poll
- **Single game query:** Reuse game_id from session
- **Indexed columns:** UUID primary keys
- **Connection pooling:** Supabase manages connections

### Future Improvements
1. **WebSocket migration:** Replace polling with real-time subscriptions
2. **Caching:** Cache game_settings in Redis
3. **Database indexes:** Add indexes on `last_activity`, `game_id`
4. **Query optimization:** Use `.select()` to limit returned columns
5. **Pagination:** For large team lists
6. **Code splitting:** Lazy load admin components

---

## Troubleshooting Guide

### Issue: Students Not Redirecting After "Start Game"

**Symptoms:** Admin clicks Start Game, students stay on lobby page

**Causes:**
1. Stale closure in polling logic
2. game_status value mismatch ('playing' vs 'active')

**Solution:**
- Inline polling logic in useEffect (no external function)
- Verify game_status === 'active' in all checks

### Issue: Teams Show "Not Joined" After Login

**Symptoms:** Student logs in but admin sees "Not Joined"

**Causes:**
1. `last_activity` not updated on login
2. Database default overwriting NULL

**Solution:**
- Update `last_activity` in login handler
- Remove DEFAULT CURRENT_TIMESTAMP from schema

### Issue: Typing Interrupted in Admin Panel

**Symptoms:** Input fields lose focus every 3 seconds

**Cause:** Auto-refresh interval in teams management

**Solution:**
- Remove `setInterval` from teams-management component
- Only use polling in read-only components

---

## Future Enhancements

### Phase 1: Core Features
- [ ] Team decision forms (hiring, marketing, product)
- [ ] Weekly calculation engine (revenue, expenses)
- [ ] Leaderboard with rankings
- [ ] Historical data visualization

### Phase 2: User Experience
- [ ] Real-time notifications (WebSocket)
- [ ] Mobile responsive design
- [ ] Dark mode support
- [ ] Tooltips and help system

### Phase 3: Production Ready
- [ ] Enable RLS with proper policies
- [ ] JWT-based authentication
- [ ] Admin role management
- [ ] Comprehensive error handling
- [ ] Load testing and optimization

---

## Appendix: Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Game Configuration
NEXT_PUBLIC_GAME_ID=00000000-0000-0000-0000-000000000001
NEXT_PUBLIC_CURRENCY_SYMBOL=฿
```

---

## Contact & Support

For technical questions or issues:
- Check `game_logs` table for error details
- Review browser console for client-side errors
- Check Supabase logs for database errors

**Last Updated:** November 17, 2025
