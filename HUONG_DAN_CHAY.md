# 📱 Hướng dẫn chạy ứng dụng Leaf Disease Detector

## 📋 Yêu cầu hệ thống

### Phần mềm cần thiết:
- **Node.js 18+** - [Tải tại đây](https://nodejs.org/)
- **npm** hoặc **yarn** (đã có sẵn với Node.js)
- **Python 3.8+** (cho backend service)
- **Git** (để clone repository)

### Cho Android:
- **Android Studio** - [Tải tại đây](https://developer.android.com/studio)
- Android SDK (tự động cài với Android Studio)
- Android Emulator hoặc thiết bị Android thật

### Cho iOS (chỉ macOS):
- **Xcode** - [Tải từ App Store](https://apps.apple.com/app/xcode/id497799835)
- iOS Simulator (tự động cài với Xcode)

---

## 🚀 Cách 1: Chạy trên Expo Go (Đơn giản nhất - Khuyến nghị)

> ✅ **Ưu điểm**: Không cần build, chạy ngay trên điện thoại thật
> 
> ⚠️ **Lưu ý**: Ứng dụng sẽ sử dụng Remote API (backend service) để phân tích ảnh

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Khởi động Backend Service

Mở terminal mới và chạy:

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend sẽ chạy tại `http://192.168.1.5:8000` (hoặc IP của máy tính bạn)

**Kiểm tra IP của máy tính:**
- Windows: `ipconfig`
- Mac/Linux: `ifconfig`

**Cập nhật IP trong `app.json`:**
```json
"extra": {
  "classifierApiUrl": "http://YOUR_IP:8000"
}
```

### Bước 3: Khởi động Expo Development Server

**Windows PowerShell:**
```powershell
$env:BROWSER="none"; npx expo start
```

**Mac/Linux:**
```bash
BROWSER=none npx expo start
```

Hoặc đơn giản:
```bash
npx expo start --go
```

### Bước 4: Mở ứng dụng trên điện thoại

1. **Tải Expo Go app:**
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Quét QR code:**
   - Mở Expo Go app
   - Quét QR code hiển thị trong terminal
   - Ứng dụng sẽ tự động tải và chạy

**Hoặc nhấn phím trong terminal:**
- `a` - Mở trên Android emulator/thiết bị
- `i` - Mở trên iOS simulator (chỉ macOS)

---

## 🔧 Cách 2: Development Build (Cho native modules)

> ✅ **Ưu điểm**: Có thể sử dụng native TFLite model trực tiếp trên thiết bị
> 
> ⚠️ **Lưu ý**: Lần đầu build sẽ mất vài phút

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Tạo native project

```bash
npx expo prebuild --clean
```

### Bước 3: Chạy trên Android

```bash
npx expo run:android
```

Lần đầu sẽ tự động:
- Build native Android project
- Cài đặt app trên emulator/thiết bị
- Khởi động Metro bundler

### Bước 4: Chạy trên iOS (chỉ macOS)

```bash
npx expo run:ios
```

---

## 🌐 Cách 3: Chạy trên Web

```bash
npx expo start --web
```

Hoặc:
```bash
npm run web
```

> ⚠️ **Lưu ý**: Một số tính năng có thể không hoạt động trên web (như camera, native modules)

---

## 🔥 Các lệnh hữu ích

### Khởi động với các tùy chọn:

```bash
# Xóa cache và khởi động lại
npx expo start --clear

# Sử dụng tunnel mode (cho thiết bị khác mạng)
npx expo start --tunnel

# Chỉ dùng LAN (mặc định)
npx expo start --lan

# Chỉ dùng localhost
npx expo start --localhost

# Expo Go mode
npx expo start --go
```

### Build và chạy:

```bash
# Android
npm run android
# hoặc
npx expo run:android

# iOS (chỉ macOS)
npm run ios
# hoặc
npx expo run:ios

# Web
npm run web
```

---

## 🛠️ Troubleshooting (Xử lý lỗi)

### 1. Lỗi "Cannot connect to Metro"

```bash
# Xóa cache và chạy lại
npx expo start --clear
```

### 2. Lỗi "Port already in use"

**Windows:**
```powershell
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:8081 | xargs kill
```

### 3. Lỗi Safari HTTPS-Only (Windows)

Bỏ qua lỗi này - không ảnh hưởng đến ứng dụng. Hoặc:

```powershell
$env:BROWSER="none"; npx expo start
```

### 4. Không kết nối được Backend

**Kiểm tra:**
1. Backend có đang chạy không: `python backend/main.py`
2. IP trong `app.json` có đúng không
3. Firewall có chặn port 8000 không

**Windows - Mở Firewall:**
```powershell
.\fix-firewall.ps1
```

Hoặc thủ công:
- Mở Windows Defender Firewall
- Cho phép Python qua firewall
- Cho phép port 8000

**Kiểm tra kết nối:**
- Mở `http://YOUR_IP:8000` trong browser trên điện thoại
- Nếu không mở được → kiểm tra firewall và IP

### 5. Android build fails

**Kiểm tra:**
- Android Studio đã cài đặt chưa
- Android SDK đã cấu hình chưa
- `ANDROID_HOME` environment variable đã set chưa

**Cài đặt Android SDK:**
1. Mở Android Studio
2. Tools → SDK Manager
3. Cài đặt Android SDK Platform (API 33+)
4. Cài đặt Android SDK Build-Tools

**Set environment variable (Windows):**
```powershell
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\YourName\AppData\Local\Android\Sdk', 'User')
```

### 6. iOS build fails (macOS)

**Kiểm tra:**
- Xcode đã cài đặt chưa
- Xcode Command Line Tools: `xcode-select --install`
- CocoaPods: `sudo gem install cocoapods`

**Cài đặt pods:**
```bash
cd ios
pod install
cd ..
```

### 7. Module not found errors

```bash
# Xóa node_modules và cài lại
rm -rf node_modules
npm install

# Xóa cache
npx expo start --clear
```

### 8. Backend không nhận diện được ảnh

**Kiểm tra:**
- Model file có tồn tại: `assets/model/plant_disease_model.tflite`
- Backend logs có lỗi gì không
- Ảnh có đúng format không (JPEG/PNG)

---

## 📱 Sử dụng ứng dụng

### Chụp ảnh và phân tích:

1. Mở ứng dụng
2. Nhấn nút "Chụp ảnh" hoặc "Chọn từ thư viện"
3. Chọn/chụp ảnh lá cây
4. Ứng dụng sẽ tự động phân tích
5. Xem kết quả:
   - Nhãn bệnh (Lá gỉ sắt, Lá phấn trắng, Lá bình thường)
   - Độ tin cậy (%)
   - Khuyến nghị xử lý

### Xem lịch sử:

1. Chuyển sang tab "Lịch sử"
2. Xem tất cả các lần quét trước đó
3. Nhấn vào item để xem chi tiết

---

## 🔧 Cấu hình

### Thay đổi Backend URL:

Sửa file `app.json`:
```json
"extra": {
  "classifierApiUrl": "http://YOUR_IP:8000"
}
```

### Thay đổi port:

**Backend:**
Sửa file `backend/main.py`:
```python
uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Expo:**
```bash
npx expo start --port 8081
```

---

## 📚 Tài liệu tham khảo

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [TensorFlow Lite](https://www.tensorflow.org/lite)

---

## 💡 Mẹo và Best Practices

1. **Luôn chạy backend trước khi test ứng dụng**
2. **Sử dụng Expo Go cho development nhanh**
3. **Sử dụng Development Build cho testing native modules**
4. **Kiểm tra logs trong terminal để debug**
5. **Sử dụng tunnel mode nếu thiết bị và máy tính khác mạng**

---

## ❓ Câu hỏi thường gặp

**Q: Có thể chạy trên Expo Go không?**  
A: Có! Ứng dụng sẽ tự động sử dụng Remote API khi chạy trên Expo Go.

**Q: Tại sao cần backend service?**  
A: Backend service xử lý TFLite model và trả về kết quả phân tích. Cần thiết khi chạy trên Expo Go.

**Q: Làm sao để chạy offline?**  
A: Cần tạo Development Build và sử dụng native TFLite model.

**Q: Model file ở đâu?**  
A: `assets/model/plant_disease_model.tflite`

**Q: Có thể thay đổi model không?**  
A: Có, thay thế file `.tflite` và đảm bảo labels khớp với model mới.

---

## 🆘 Cần giúp đỡ?

Nếu gặp vấn đề:
1. Kiểm tra phần Troubleshooting ở trên
2. Xem logs trong terminal
3. Kiểm tra backend logs
4. Đảm bảo tất cả dependencies đã cài đặt đúng

---

**Chúc bạn code vui vẻ! 🎉**

