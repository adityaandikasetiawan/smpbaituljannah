#!/bin/bash

# Script untuk menjalankan aplikasi SMPTI Baituljannah di production
echo "Starting SMPTI Baituljannah Application..."

# Set working directory
cd /var/www/html/smpbaituljannah

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v "^#" | xargs)
    echo "Environment variables loaded from .env"
else
    echo "Warning: .env file not found!"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --production
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop existing PM2 process if running
pm2 stop smpbaituljannah 2>/dev/null || true
pm2 delete smpbaituljannah 2>/dev/null || true

# Start application with PM2
echo "Starting application with PM2..."
pm2 start app.js --name "smpbaituljannah" --env production --time

# Save PM2 configuration
pm2 save

echo "Application started successfully!"
echo "You can check status with: pm2 status"
echo "You can view logs with: pm2 logs smpbaituljannah"
echo "You can restart with: pm2 restart smpbaituljannah"
