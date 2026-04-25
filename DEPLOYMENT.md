# Deployment Guide

## Backend on Render

Use the repository root as the backend service root.

Required environment variables:

- `MONGO_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Recommended values:

- `PORT=5000`
- `AUTH_COOKIE_NAME=hw_session`

Render settings:

- Build command: `npm install`
- Start command: `npm start`

## Frontend on Vercel

This repository now includes:

- `vercel.json` for dynamic route rewrites
- `scripts/build-frontend.js` to generate a deployable static frontend in `dist`

Vercel settings:

- Framework preset: `Other`
- Build command: `npm run build:frontend`
- Output directory: `dist`
- Install command: `npm install`

Required frontend environment variable:

- `FRONTEND_API_URL=https://your-render-backend-url.onrender.com`

## Important

- Do not upload `.env`
- Set environment variables in the Render and Vercel dashboards
- After Render gives you the backend URL, update `FRONTEND_API_URL` in Vercel and redeploy
