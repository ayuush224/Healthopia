#!/bin/bash

echo "🔍 Vercel Deployment Pre-Check"
echo "======================================="
echo ""

# Check Node version
NODE_VERSION=$(node -v)
echo "✓ Node version: $NODE_VERSION"

# Check npm version
NPM_VERSION=$(npm -v)
echo "✓ npm version: $NPM_VERSION"

# Check if .env file exists
if [ -f .env ]; then
  echo "✓ .env file found"
else
  echo "✗ .env file NOT found - create from .env.example"
fi

# Check MONGODB_URI
if grep -q "MONGODB_URI=" .env; then
  echo "✓ MONGODB_URI configured"
else
  echo "✗ MONGODB_URI NOT configured"
fi

# Check JWT_SECRET
if grep -q "JWT_SECRET=" .env; then
  echo "✓ JWT_SECRET configured"
else
  echo "✗ JWT_SECRET NOT configured"
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
  echo "✓ node_modules directory found"
else
  echo "⚠ node_modules NOT found - run 'npm install'"
fi

# Check api/index.js
if [ -f "api/index.js" ]; then
  echo "✓ api/index.js found"
else
  echo "✗ api/index.js NOT found"
fi

# Check vercel.json
if [ -f "vercel.json" ]; then
  echo "✓ vercel.json found"
else
  echo "✗ vercel.json NOT found"
fi

echo ""
echo "======================================="
echo "Pre-check complete! Ready to deploy to Vercel."
