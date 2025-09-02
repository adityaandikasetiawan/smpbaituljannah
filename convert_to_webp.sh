#!/bin/bash

# Script untuk mengkonversi semua gambar PNG/JPG ke WebP
# dengan kualitas 80% untuk keseimbangan ukuran dan kualitas

echo "Memulai konversi gambar ke format WebP..."
echo "Total gambar yang akan dikonversi: $(find public/img -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) | wc -l)"

# Counter untuk tracking progress
count=0
total=$(find public/img -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) | wc -l)

# Konversi semua file PNG
find public/img -type f -iname "*.png" | while read file; do
    count=$((count + 1))
    webp_file="${file%.*}.webp"
    echo "[$count/$total] Mengkonversi: $file -> $webp_file"
    cwebp -q 80 "$file" -o "$webp_file"
done

# Konversi semua file JPG/JPEG
find public/img -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) | while read file; do
    count=$((count + 1))
    webp_file="${file%.*}.webp"
    echo "[$count/$total] Mengkonversi: $file -> $webp_file"
    cwebp -q 80 "$file" -o "$webp_file"
done

echo "Konversi selesai!"
echo "Ukuran sebelum konversi:"
find public/img -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) -exec du -ch {} + | tail -1
echo "Ukuran setelah konversi (WebP):"
find public/img -type f -iname "*.webp" -exec du -ch {} + | tail -1