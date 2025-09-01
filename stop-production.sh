#!/bin/bash

# Script untuk menghentikan aplikasi SMPTI Baituljannah
echo "Stopping SMPTI Baituljannah Application..."

# Stop PM2 process
pm2 stop smpbaituljannah
pm2 delete smpbaituljannah

echo "Application stopped successfully!"
