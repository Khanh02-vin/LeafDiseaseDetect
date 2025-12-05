# Hướng dẫn chạy ứng dụng trên Expo Go

## Vấn đề: Safari HTTPS-Only Error

Khi chạy `npx expo start`，Safari 可能会显示 lỗi về HTTPS-Only mode. Đây là vấn đề của Safari browser，không phải của ứng dụng.

## Giải pháp

### Cách 1: Sử dụng Expo Go App (Khuyến nghị)

1. **Khởi động development server:**
```bash
npx expo start
```

2. **Bỏ qua Safari browser** - Không cần mở trong Safari

3. **Mở Expo Go app trên điện thoại:**
   - Android: Tải [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) từ Play Store
   - iOS: Tải [Expo Go](https://apps.apple.com/app/expo-go/id982107779) từ App Store

4. **Quét QR code:**
   - Trong terminal, bạn sẽ thấy QR code
   - Mở Expo Go app và quét QR code
   - Hoặc nhấn `a` để mở trên Android, `i` để mở trên iOS simulator

### Cách 2: Sử dụng Tunnel Mode (Nếu LAN không hoạt động)

```bash
npx expo start --tunnel
```

Tunnel mode sẽ tạo một URL công khai qua ngrok，có thể truy cập từ bất kỳ đâu.

### Cách 3: Sử dụng LAN Mode (Mặc định)

```bash
npx expo start --lan
```

Đảm bảo điện thoại và máy tính cùng mạng Wi-Fi.

### Cách 4: Tắt tự động mở browser (Windows PowerShell)

**PowerShell:**
```powershell
$env:BROWSER="none"; npx expo start
```

Hoặc sử dụng script có sẵn:
```powershell
.\start-expo.ps1
```

**Hoặc chỉ định Expo Go mode:**
```bash
npx expo start --go
```

### Cách 5: Tắt Safari HTTPS-Only Mode (Chỉ cho development)

**Trên iOS:**
1. Mở Settings > Safari
2. Tắt "Prevent Cross-Site Tracking" (nếu có)
3. Hoặc sử dụng Chrome/Firefox thay vì Safari

**Lưu ý:** Safari HTTPS-Only mode không ảnh hưởng đến ứng dụng React Native. Ứng dụng sẽ tự động xử lý HTTP requests thông qua cấu hình trong `app.json`.

## Kiểm tra Backend Service

Đảm bảo backend service đang chạy:

```bash
cd backend
python main.py
```

Backend sẽ chạy tại `http://192.168.1.5:8000`

## Cấu hình Network

Ứng dụng đã được cấu hình để cho phép HTTP connections:

- **Android:** `usesCleartextTraffic: true` trong `app.json`
- **iOS:** `NSAllowsArbitraryLoads: true` trong `app.json`

## Troubleshooting

### Nếu vẫn gặp lỗi network:

1. **Kiểm tra IP address:**
   - Đảm bảo `classifierApiUrl` trong `app.json` đúng với IP của máy tính
   - Chạy `ipconfig` (Windows) hoặc `ifconfig` (Mac/Linux) để kiểm tra IP

2. **Kiểm tra firewall:**
   - Đảm bảo port 8000 không bị chặn
   - Windows: Kiểm tra Windows Firewall settings

3. **Kiểm tra backend:**
   - Backend phải đang chạy và accessible từ điện thoại
   - Test bằng cách mở `http://192.168.1.5:8000` trong browser trên điện thoại

4. **Sử dụng localhost (chỉ cho emulator):**
   - Nếu chạy trên emulator，có thể dùng `localhost` thay vì IP
   - Cập nhật `app.json`: `"classifierApiUrl": "http://localhost:8000"`

## Chạy trên Android

```bash
# Option 1: Expo Go
npx expo start
# Sau đó quét QR code bằng Expo Go app

# Option 2: Development Build
npx expo prebuild --clean
npx expo run:android
```

## Chạy trên iOS

```bash
# Option 1: Expo Go
npx expo start
# Sau đó quét QR code bằng Expo Go app

# Option 2: Development Build (chỉ macOS)
npx expo prebuild --clean
npx expo run:ios
```

