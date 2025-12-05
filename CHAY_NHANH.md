# ⚡ Chạy nhanh - Quick Reference

## 🚀 3 bước chạy nhanh nhất

### 1️⃣ Cài đặt
```bash
npm install
```

### 2️⃣ Chạy Backend (Terminal 1)
```bash
cd backend
python main.py
```

### 3️⃣ Chạy App (Terminal 2)
```bash
# Windows PowerShell
$env:BROWSER="none"; npx expo start

# Mac/Linux
BROWSER=none npx expo start
```

### 4️⃣ Mở trên điện thoại
- Tải **Expo Go** app
- Quét QR code trong terminal
- Xong! ✅

---

## 📋 Checklist trước khi chạy

- [ ] Node.js đã cài (`node --version`)
- [ ] Python đã cài (`python --version`)
- [ ] Backend dependencies đã cài (`pip install -r backend/requirements.txt`)
- [ ] IP trong `app.json` đúng với IP máy tính
- [ ] Firewall cho phép port 8000

---

## 🔥 Lệnh thường dùng

```bash
# Khởi động Expo
npx expo start

# Xóa cache
npx expo start --clear

# Chạy Android
npm run android

# Chạy iOS (macOS)
npm run ios

# Chạy Web
npm run web
```

---

## 🐛 Lỗi thường gặp

| Lỗi | Giải pháp |
|-----|-----------|
| Port đã dùng | `npx expo start --clear` |
| Không kết nối backend | Kiểm tra IP và firewall |
| Safari HTTPS error | Bỏ qua, không ảnh hưởng |
| Module not found | `rm -rf node_modules && npm install` |

---

## 📱 IP Address

**Windows:**
```powershell
ipconfig
```

**Mac/Linux:**
```bash
ifconfig
```

Cập nhật trong `app.json`:
```json
"classifierApiUrl": "http://YOUR_IP:8000"
```

---

Xem hướng dẫn chi tiết: `HUONG_DAN_CHAY.md`

