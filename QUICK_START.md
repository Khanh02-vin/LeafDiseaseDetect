# 🚀 Hướng dẫn chạy nhanh trên Expo

## Yêu cầu
- Node.js 18+
- npm hoặc yarn
- Android Studio (cho Android) hoặc Xcode (cho iOS - chỉ macOS)

## Các bước chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Khởi động Expo Development Server
```bash
npm start
```

Bạn sẽ thấy QR code và menu trong terminal.

### 3. Chạy trên thiết bị/emulator

#### Android (Khuyến nghị)
```bash
# Trong terminal khác, hoặc nhấn 'a' trong Expo menu
npm run android
```

Lần đầu tiên sẽ mất vài phút để build. Sau đó app sẽ tự động mở trên emulator hoặc thiết bị đã kết nối.

#### iOS (chỉ macOS)
```bash
npm run ios
```

#### Web
```bash
npm run web
```

### 4. Chạy Backend (Nếu cần dùng API)

Mở terminal mới:
```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend sẽ chạy tại `http://192.168.1.4:8000` (hoặc IP của bạn).

## Lưu ý quan trọng

⚠️ **Không thể dùng Expo Go**: Dự án này sử dụng native modules (`react-native-fast-tflite`), nên phải tạo development build.

✅ **Development Build**: Lần đầu chạy `npm run android` hoặc `npm run ios` sẽ tự động tạo development build.

## Troubleshooting

### Lỗi "Cannot connect to Metro"
```bash
# Xóa cache và chạy lại
npx expo start --clear
```

### Lỗi "Port already in use"
```bash
# Tìm và kill process đang dùng port
# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8081 | xargs kill
```

### Android build fails
- Đảm bảo Android Studio đã cài đặt và Android SDK đã cấu hình
- Kiểm tra `ANDROID_HOME` environment variable

### Không kết nối được backend
- Kiểm tra firewall: chạy `.\fix-firewall.ps1` (Windows)
- Đảm bảo backend đang chạy: `python backend/main.py`
- Kiểm tra IP trong `app.json` khớp với IP máy tính

## Các lệnh hữu ích

```bash
# Khởi động với tunnel (cho thiết bị khác mạng)
npx expo start --tunnel

# Xóa cache
npx expo start --clear

# Chạy trên web
npm run web

# Build production (cần EAS)
eas build --platform android
```

