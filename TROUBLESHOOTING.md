# Vercel Deployment Troubleshooting Guide

## Common Errors & Solutions

### 1. "MONGODB_URI does not exist" or "MONGODB API does not exist"

**Cause**: Environment variables not set in Vercel dashboard

**Solution**:
1. Go to https://vercel.com → Your Project → Settings → Environment Variables
2. Add these variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Your JWT secret (min 32 chars)
   - `AUTH_COOKIE_NAME`: session_token
   - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
   - `CLOUDINARY_API_KEY`: Your Cloudinary API key
   - `CLOUDINARY_API_SECRET`: Your Cloudinary API secret
3. Redeploy: `git push` to trigger new deployment

### 2. "Cannot find module" errors

**Cause**: Dependencies not installed or missing from package.json

**Solution**:
```bash
npm install
npm run build
# Verify all imports are correct
```

### 3. Connection Timeout

**Cause**: MongoDB connection taking too long

**Solution**:
- In vercel.json, the function timeout is set to 60 seconds
- Check MongoDB network access whitelist includes Vercel IPs (0.0.0.0/0)
- Use MongoDB Atlas: Settings → Network Access → Allow from anywhere

### 4. Static Files Not Loading (CSS, JS, Images)

**Cause**: Incorrect path configuration

**Solution**:
- Ensure all files are in `/public` directory
- Update paths in HTML files if needed
- Check vercel.json routes configuration

### 5. Uploads Not Working

**Cause**: `/uploads` directory not writable in serverless

**Solution**:
- Use Cloudinary for image uploads (already integrated)
- Uploads folder won't persist in serverless
- All images should go through `/api/upload` → Cloudinary

### 6. CORS Errors

**Cause**: Frontend and backend on different domains

**Solution**:
1. Update your fetch calls to use absolute URLs:
   ```javascript
   // Instead of: fetch('/api/users')
   fetch('https://your-vercel-domain.vercel.app/api/users')
   ```

2. Or add CORS headers in middleware:
   ```javascript
   app.use((req, res, next) => {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     next();
   });
   ```

## Deployment Checklist

Before deploying:

- [ ] All environment variables added to Vercel dashboard
- [ ] MongoDB connection string is correct and accessible
- [ ] JWT_SECRET is set (min 32 characters for security)
- [ ] Cloudinary credentials are valid
- [ ] All dependencies in package.json
- [ ] No references to local file uploads
- [ ] Frontend code updated for correct API URLs
- [ ] Git repository is clean and pushed
- [ ] .env.example has been created

## Monitoring

After deployment:

1. Check Vercel Logs: Project → Deployments → [Your Deployment] → Logs
2. Use `/api/health` endpoint to verify MongoDB connection
3. Monitor database connections in MongoDB Atlas
4. Check function execution time and errors in Vercel Dashboard

## Local Testing Before Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Run locally (emulates serverless)
vercel dev

# Check logs while running
# Your app will be at http://localhost:3000
```

## Debugging Tips

1. Check function logs in Vercel dashboard
2. Add console.log statements for debugging (visible in logs)
3. Use `/api/health` endpoint to test database connection
4. Test API endpoints with curl or Postman
5. Check network requests in browser DevTools

## Getting Help

- Check Vercel docs: https://vercel.com/docs
- Check MongoDB Atlas docs: https://docs.mongodb.com
- Review full deployment guide: See VERCEL_DEPLOYMENT.md
