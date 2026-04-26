# Vercel Dashboard Setup Quick Reference

## Step 1: Connect Repository
1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Select "Import Git Repository"
4. Choose your GitHub repository
5. Click "Import"

## Step 2: Configure Project Settings
1. Project Name: `health-wellness-community` (or your preferred name)
2. Framework Preset: `Other`
3. Root Directory: `./`
4. Build Command: `npm run vercel-build`
5. Output Directory: (leave empty)
6. Install Command: `npm install`
7. Click "Continue"

## Step 3: Set Environment Variables ⭐ CRITICAL

**In Vercel Dashboard:**
1. Go to Settings → Environment Variables
2. Add EACH variable individually:

| Variable | Value | Source |
|----------|-------|--------|
| `MONGODB_URI` | Your MongoDB connection string | MongoDB Atlas |
| `JWT_SECRET` | A strong secret (32+ chars) | Create new or use yours |
| `AUTH_COOKIE_NAME` | `session_token` | Use this value |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key | Cloudinary Dashboard |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret | Cloudinary Dashboard |
| `NODE_ENV` | `production` | Use this value |

3. Verify each variable is set for:
   - Production
   - Preview
   - Development (optional)

## Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Check Logs for any errors
4. Get your deployment URL

## Step 5: Verify Deployment

1. Visit: `https://your-deployment-url.vercel.app/api/health`
2. Should return:
   ```json
   {
     "status": "ok",
     "mongodb": "connected"
   }
   ```

3. If MongoDB shows "disconnected", check:
   - MONGODB_URI is correct
   - MongoDB allows connections from Vercel IPs
   - Connection string credentials are valid

## Troubleshooting Dashboard

If deployment fails:
1. Click on the failed deployment
2. View "Logs" tab for error messages
3. Common issues:
   - Missing environment variables
   - MongoDB connection timeout
   - Missing dependencies in package.json

## Redeployment

To redeploy after code changes:
- Push to main/master branch: `git push origin main`
- Vercel automatically deploys new commits
- Monitor progress in Deployments tab

## Production URLs

After deployment:
- Frontend: `https://your-deployment-url.vercel.app`
- API: `https://your-deployment-url.vercel.app/api/*`
- Health Check: `https://your-deployment-url.vercel.app/api/health`

## Need to Rebuild?

1. Go to Deployments
2. Click the three dots on your deployment
3. Select "Redeploy"
4. Confirm "Redeploy to production"

---

**IMPORTANT**: Never commit `.env` file to Git. Use Vercel environment variables instead.
