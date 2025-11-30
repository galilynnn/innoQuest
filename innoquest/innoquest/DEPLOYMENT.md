# Vercel Deployment Guide for InnoQuest

## Prerequisites
✅ Your Supabase credentials are in `.env`
✅ All code is committed to GitHub
✅ Node.js installed

## Step-by-Step Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**
   - Visit https://vercel.com
   - Sign in with GitHub

2. **Import Project**
   - Click "Add New Project"
   - Select your `InnoQuest` repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: Keep as `./` or select `innoquest` if it's a subdirectory
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://ekftjakuqftekymynbdy.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZnRqYWt1cWZ0ZWt5bXluYmR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDkzMzIsImV4cCI6MjA3ODc4NTMzMn0.oJcJEY66JYBzEdd_lnOnGL4jThbX5y7de7ZYOwGblog
   NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZnRqYWt1cWZ0ZWt5bXluYmR5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIwOTMzMiwiZXhwIjoyMDc4Nzg1MzMyfQ.SaxA-fXoOI-xabxtnPlADo0mAXD27SD72rwHG-tE9Mg
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete (2-3 minutes)

6. **Get Your URL**
   - After deployment, you'll get a URL like: `https://innoquest-xyz.vercel.app`
   - Visit the URL to verify deployment

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from Project Directory**
   ```bash
   cd /Users/galilynnn/InnoQuest/InnoQuest/innoquest
   vercel
   ```

4. **Follow Prompts**
   - Set up and deploy: Yes
   - Which scope: Select your account
   - Link to existing project: No
   - Project name: InnoQuest (or your preferred name)
   - Directory: `./`
   - Override settings: No

5. **Add Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   # Paste: https://ekftjakuqftekymynbdy.supabase.co
   
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   # Paste your anon key
   
   vercel env add NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
   # Paste your service role key
   ```

6. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Post-Deployment Configuration

### Update Supabase Settings

1. **Go to Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Update Authentication URLs**
   - Go to **Authentication** → **URL Configuration**
   - Site URL: Add your Vercel URL (e.g., `https://innoquest-xyz.vercel.app`)
   - Redirect URLs: Add `https://innoquest-xyz.vercel.app/**`

3. **Verify Realtime is Enabled**
   - Go to **Database** → **Replication**
   - Ensure `game_settings`, `teams`, and `weekly_results` tables are enabled

### Test Your Deployment

1. **Admin Login**
   - Visit `https://your-app.vercel.app/admin/login`
   - Login and verify dashboard works

2. **Student Login**
   - Visit `https://your-app.vercel.app/student/login`
   - Login and verify gameplay works

3. **Database Operations**
   - Test creating teams
   - Test submitting decisions
   - Test advancing weeks

## Automatic Deployments

Vercel automatically deploys your app when you push to GitHub:
- **main branch** → Production deployment
- **other branches** → Preview deployments

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Ensure RLS policies allow operations

### Realtime Not Working
- Verify realtime is enabled in Supabase
- Check browser console for errors
- Ensure Vercel URL is in Supabase allowed URLs

## Useful Commands

```bash
# View deployment logs
vercel logs

# View environment variables
vercel env ls

# Remove environment variable
vercel env rm VARIABLE_NAME

# Redeploy latest
vercel --prod

# View project info
vercel inspect
```

## Support
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
