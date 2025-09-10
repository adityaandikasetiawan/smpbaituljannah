# Panduan Upload Gambar Berita - SMPIT Baituljannah

## Workflow yang Benar untuk Menambah Berita dengan Gambar

### 1. Akses Halaman Admin
- Login ke admin panel di `http://localhost:3000/admin/login`
- Masuk ke menu **Manajemen Berita** (`/admin/news`)

### 2. Membuat Berita Baru
- Klik tombol **"Tambah Berita Baru"**
- Modal form akan terbuka

### 3. Upload Gambar (PENTING: Lakukan SEBELUM mengisi konten)
- Di bagian **"Gambar Utama"**, klik **"Choose File"**
- Pilih file gambar (JPG, PNG, GIF, WebP - maksimal 5MB)
- Klik tombol **"Upload"**
- Tunggu hingga muncul preview gambar dan pesan sukses
- Gambar akan otomatis dikonversi ke format WebP untuk optimasi

### 4. Isi Data Berita
- **Judul Berita**: Masukkan judul yang menarik
- **Ringkasan**: Isi ringkasan singkat (opsional)
- **Konten Berita**: Tulis konten lengkap menggunakan editor
- **Status**: Pilih Draft/Dipublikasikan/Diarsipkan

### 5. Simpan Berita
- Pastikan gambar sudah terupload (ada preview)
- Klik **"Simpan Berita"**
- Berita akan tersimpan dengan gambar

## ⚠️ Hal Penting yang Harus Diperhatikan

### DO (Yang Harus Dilakukan):
✅ Upload gambar TERLEBIH DAHULU sebelum menyimpan berita
✅ Tunggu hingga proses upload selesai (ada preview gambar)
✅ Gunakan format gambar yang didukung (JPG, PNG, GIF, WebP)
✅ Pastikan ukuran file tidak lebih dari 5MB
✅ Periksa preview gambar sebelum menyimpan

### DON'T (Yang Tidak Boleh Dilakukan):
❌ Menyimpan berita tanpa mengupload gambar terlebih dahulu
❌ Mengupload file yang bukan gambar
❌ Mengupload file berukuran lebih dari 5MB
❌ Menutup modal sebelum proses upload selesai

## 🔧 Fitur Teknis

### Konversi Otomatis
- Semua gambar akan dikonversi ke format **WebP** dengan kualitas 80%
- File asli akan dihapus setelah konversi berhasil
- Path gambar disimpan sebagai `/uploads/news/filename.webp`

### Lokasi Penyimpanan
- Gambar tersimpan di: `C:\src\smp\smpbaituljannah\public\uploads\news\`
- Dapat diakses via URL: `http://localhost:3000/uploads/news/filename.webp`

### Validasi
- Format file: JPG, PNG, GIF, WebP
- Ukuran maksimal: 5MB
- Nama file otomatis: `news-timestamp-random.webp`

## 🐛 Troubleshooting

### Gambar Tidak Muncul di Halaman Berita
**Penyebab**: Admin tidak mengupload gambar sebelum menyimpan berita
**Solusi**: Edit berita → Upload gambar → Simpan ulang

### Error "File terlalu besar"
**Penyebab**: File gambar lebih dari 5MB
**Solusi**: Kompres gambar atau gunakan gambar dengan resolusi lebih kecil

### Error "Format tidak didukung"
**Penyebab**: File bukan format gambar yang valid
**Solusi**: Gunakan file JPG, PNG, GIF, atau WebP

### Gambar Tidak Terupload
**Penyebab**: Koneksi terputus atau server error
**Solusi**: 
1. Refresh halaman
2. Coba upload ulang
3. Periksa koneksi internet
4. Periksa log server untuk error

## 📝 Catatan Tambahan

- Gambar akan otomatis dioptimasi untuk web (format WebP)
- Sistem mendukung multiple upload (bisa upload gambar baru untuk berita yang berbeda)
- Gambar lama akan otomatis terhapus jika diganti dengan gambar baru
- Backup gambar tidak dilakukan otomatis, simpan file asli jika diperlukan

---

**Dibuat**: September 2025  
**Versi**: 1.0  
**Kontak**: Administrator SMPIT Baituljannah