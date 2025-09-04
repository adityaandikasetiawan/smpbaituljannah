#!/bin/bash

# Script untuk menghentikan aplikasi SMPIT Baituljannah
echo "Stopping SMPIT Baituljannah Application..."

# Stop PM2 process
pm2 stop smpbaituljannah
pm2 delete smpbaituljannah

echo "Application stopped successfully!"
