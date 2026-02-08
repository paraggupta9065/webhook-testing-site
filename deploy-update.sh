#!/bin/bash

# Update and deploy script for Hook-Test application
# This script pulls the latest changes, rebuilds the app, and ensures PM2 is running

set -e  # Exit on any error

echo "Pulling latest changes from git..."
git pull origin main  # Change 'main' to your default branch if different

echo "Installing/updating dependencies..."
npm install

echo "Running database migrations..."
npm run db:push

echo "Building the application..."
npm run build

echo "Checking PM2 status..."
if pm2 describe hook-test > /dev/null 2>&1; then
  echo "Restarting existing PM2 process..."
  pm2 restart hook-test
else
  echo "Starting new PM2 process..."
  pm2 start ecosystem.config.js
fi

echo "Saving PM2 configuration..."
pm2 save

echo "Deployment complete! App should be running."