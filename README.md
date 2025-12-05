# Leaf Disease Detector - React Native

Ứng dụng React Native sử dụng mô hình TensorFlow Lite để phát hiện bệnh trên lá cây.

## Tính năng

- 📷 Chụp ảnh hoặc chọn ảnh lá cây từ thư viện
- 🤖 Phân tích tình trạng bệnh lá bằng mô hình TFLite (chạy local hoặc qua dịch vụ backend)
- 📊 Hiển thị nhãn bệnh, độ tin cậy và khuyến nghị xử lý
- 🗂️ Lưu lịch sử các lần quét để theo dõi
- 🎨 Hỗ trợ Dark/Light theme
- 📍 Tùy chọn lưu vị trí quét
- 🔔 Thông báo nhắc nhở

## 📖 Hướng dẫn chạy

- **[📱 Hướng dẫn chi tiết](./HUONG_DAN_CHAY.md)** - Hướng dẫn đầy đủ từ A-Z
- **[⚡ Chạy nhanh](./CHAY_NHANH.md)** - Quick reference cho người đã quen
- **[🔧 Expo Go Setup](./EXPO_GO_SETUP.md)** - Hướng dẫn chạy trên Expo Go

## 🚀 Quick Start - Chạy trên Expo

### Bước 1: Cài đặt dependencies
```bash
npm install
```

### Bước 2: Khởi động Expo Development Server
```bash
npm start
# hoặc
npx expo start
```

### Bước 3: Chọn cách chạy

**Option A: Development Build (Khuyến nghị - cho native modules)**
```bash
# Android
npm run android

# iOS (chỉ macOS)
npm run ios

# Web
npm run web
```

**Option B: EAS Build (Cloud Build)**
```bash
# Cài đặt EAS CLI
npm install -g eas-cli
eas login

# Build development version
eas build --profile development --platform android
# Sau khi build xong, cài APK và chạy: npx expo start --dev-client
```

**Option C: Chạy trên thiết bị thật**
1. Đảm bảo điện thoại và máy tính cùng Wi-Fi
2. Chạy `npm start`
3. Quét QR code bằng development build app (không dùng Expo Go vì có native modules)

> ⚠️ **Lưu ý**: Dự án này **không thể chạy trên Expo Go** vì sử dụng `react-native-fast-tflite`. Bạn phải tạo development build.

### Bước 4: Chạy Backend (Tùy chọn - nếu dùng API)
```bash
cd backend
pip install -r requirements.txt
python main.py
```

## Cấu trúc dự án

```
src/
├── components/          # UI Components tái sử dụng
├── screens/            # Các màn hình chính
├── services/           # Business logic & ML services
├── models/             # Data models
├── utils/              # Utility functions
├── constants/          # Colors, theme
├── hooks/              # Custom hooks
├── store/              # State management (Zustand)
└── navigation/         # Navigation setup
```

## Machine Learning

### Mô hình sử dụng
- `assets/model/plant_disease_model.tflite`
- Dịch vụ FastAPI (tuỳ chọn) cho phép chạy inference từ backend nếu không thể dùng native module trên thiết bị

### Tích hợp TensorFlow Lite
- React Native + `react-native-fast-tflite` cho bản development build
- Fallback qua dịch vụ FastAPI khi chạy bằng Expo Go
- Caching kết quả theo ảnh để đảm bảo ổn định

## Cài đặt

### Prerequisites:
- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **npm** hoặc **yarn** hoặc **bun** (đã có sẵn với Node.js)
- **Expo CLI** (tùy chọn, có thể dùng `npx expo`)
- **iOS Simulator** (cho iOS) - Cần Xcode trên macOS
- **Android Studio** (cho Android) - Cần cài đặt Android SDK và emulator
- **Expo Go app** (cho thiết bị thật) - [iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)

> ⚠️ **Lưu ý**: Dự án này sử dụng `expo-dev-client` và `react-native-fast-tflite`, nên **không thể chạy trên Expo Go**. Bạn cần tạo development build.

### Installation:

#### Bước 1: Clone và cài đặt dependencies
```bash
# Clone repository (nếu chưa có)
git clone <repository-url>
cd OrangeDetect

# Cài đặt dependencies
npm install
# hoặc
yarn install
# hoặc
bun install
```

#### Bước 2: Chạy dự án với Expo

**Cách 1: Development Build (Khuyến nghị)**

Vì dự án sử dụng native modules (`react-native-fast-tflite`), bạn cần tạo development build:

```bash
# Khởi động Expo development server
npm start
# hoặc
npx expo start

# Trong terminal, bạn sẽ thấy menu với các tùy chọn:
# - Nhấn 'a' để chạy trên Android
# - Nhấn 'i' để chạy trên iOS
# - Nhấn 'w' để chạy trên Web
```

**Tạo Development Build:**

```bash
# Cho Android
npx expo run:android
# hoặc
npm run android

# Cho iOS (chỉ trên macOS)
npx expo run:ios
# hoặc
npm run ios

# Cho Web
npx expo start --web
# hoặc
npm run web
```

**Cách 2: Sử dụng EAS Build (Cloud Build)**

Nếu bạn muốn build trên cloud:

```bash
# Cài đặt EAS CLI
npm install -g eas-cli

# Đăng nhập Expo
eas login

# Tạo development build
eas build --profile development --platform android
# hoặc
eas build --profile development --platform ios
```

Sau khi build xong, tải file APK/IPA về và cài đặt trên thiết bị, rồi chạy `npx expo start --dev-client`.

#### Bước 3: Chạy trên thiết bị thật

1. Đảm bảo điện thoại và máy tính cùng mạng WiFi
2. Chạy `npm start` hoặc `npx expo start`
3. Quét QR code bằng:
   - **Android**: Expo Go app hoặc development build đã cài
   - **iOS**: Camera app (sẽ mở Expo Go) hoặc development build đã cài

#### Bước 4: Chạy Backend (Tùy chọn)

Nếu muốn sử dụng backend API cho inference:

```bash
# Vào thư mục backend
cd backend

# Cài đặt Python dependencies
pip install -r requirements.txt

# Chạy FastAPI server
python main.py

# Server sẽ chạy tại http://localhost:8000
# Cập nhật URL trong app.json nếu cần
```

### Các lệnh thường dùng:

```bash
# Khởi động development server
npm start
# hoặc
npx expo start

# Khởi động với tunnel (cho thiết bị khác mạng)
npx expo start --tunnel

# Xóa cache và khởi động lại
npx expo start --clear

# Chạy trên platform cụ thể
npm run android    # Android
npm run ios        # iOS (chỉ macOS)
npm run web        # Web browser

# Build production
eas build --platform android
eas build --platform ios
```

## Cấu hình

### Cấu hình API URL (Backend)

Dự án đã được cấu hình để sử dụng backend API tại `app.json`. Để thay đổi URL backend:

1. **Kiểm tra IP address của máy tính:**
   ```bash
   # Windows
   ipconfig
   
   # macOS/Linux
   ifconfig
   # hoặc
   ip addr
   ```

2. **Cập nhật IP trong `app.json`:**
   ```json
   {
     "expo": {
       "extra": {
         "classifierApiUrl": "http://192.168.1.4:8000"
       }
     }
   }
   ```
   
   > 💡 **Lưu ý**: Thay `192.168.1.4` bằng IP address Wi-Fi của bạn (không phải Radmin VPN hay ZeroTier)

3. **Đảm bảo thiết bị và máy tính cùng mạng Wi-Fi:**
   - Máy tính: `192.168.1.4` (Wi-Fi adapter)
   - Thiết bị: Phải kết nối cùng mạng `192.168.1.x`

4. **Nếu IP thay đổi:**
   - Mỗi khi IP thay đổi, cần cập nhật `app.json`
   - Sau đó rebuild app: `npm run android` hoặc `npm run ios`

### Environment Variables (Tùy chọn):
```bash
# .env
EXPO_PUBLIC_API_URL=http://192.168.1.4:8000
EXPO_PUBLIC_MODEL_VERSION=1.0.0
```

### App Configuration:
- **Camera permissions**: Đã cấu hình trong `app.json`
- **Location permissions**: Đã cấu hình trong `app.json`
- **Notification settings**: Đã cấu hình trong `app.json`
- **Model loading**: Model TFLite tại `assets/model/plant_disease_model.tflite`

## Sử dụng

### 1. Phân tích lá:
- Mở app và chọn "Leaf Detector"
- Chụp ảnh lá hoặc chọn ảnh có sẵn
- Đợi kết quả phân tích và khuyến nghị

### 2. Xem lịch sử:
- Chọn tab "History"
- Xem danh sách các lần quét
- Tap để xem chi tiết

### 3. Lịch sử và tuỳ chỉnh
- Tab "Scan History" lưu lại các lần chẩn đoán
- Tab tuỳ chỉnh (nếu bật) cho phép thay đổi theme, thông báo, v.v.

## Thay đổi linh hoạt

### State Management:
- **Hiện tại**: Zustand
- **Có thể thay đổi**: Redux Toolkit, Jotai, Context API

### UI Framework:
- **Hiện tại**: React Native Paper
- **Có thể thay đổi**: NativeBase, UI Kitten

### Navigation:
- **Hiện tại**: React Navigation
- **Có thể thay đổi**: React Router Native

### Camera:
- **Hiện tại**: expo-camera
- **Có thể thay đổi**: react-native-vision-camera

Xem [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) để biết chi tiết cách thay đổi.

## Dependencies chính

```json
{
  "expo": "~54.0.13",
  "react": "19.1.0",
  "react-native": "0.81.4",
  "@tensorflow/tfjs": "^4.20.0",
  "@tensorflow/tfjs-react-native": "^0.8.0",
  "expo-camera": "~16.0.12",
  "expo-image-picker": "~16.0.4",
  "zustand": "^5.0.2",
  "react-native-paper": "^5.12.5"
}
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test
npm test -- --testNamePattern="LeafClassifier"
```

## Building

### Development:
```bash
expo start
```

### Production:
```bash
# iOS
expo build:ios

# Android
expo build:android

# Web
expo build:web
```

## Troubleshooting

### Common Issues:

1. **Không kết nối được với Backend API / Quét không hiển thị kết quả**:

   **Kiểm tra cấu hình IP:**
   - ✅ **Quan trọng**: `app.json` phải dùng **IP của máy tính** (không phải IP của điện thoại)
   - Máy tính IP: `192.168.1.4` (từ `ipconfig` - Wi-Fi adapter)
   - Điện thoại IP: `192.168.1.2` (chỉ để kiểm tra cùng mạng)
   - Cả hai phải cùng mạng Wi-Fi (`192.168.1.x`)

   **Kiểm tra kết nối:**
   ```bash
   # Trên điện thoại, mở trình duyệt và thử truy cập:
   http://192.168.1.4:8000/health
   
   # Nếu không truy cập được, kiểm tra:
   ```

   **Giải quyết vấn đề:**

   a) **Firewall chặn kết nối:**
   ```powershell
   # Windows - Mở PowerShell với quyền Admin
   # Cho phép port 8000 qua Windows Firewall
   New-NetFirewallRule -DisplayName "Python Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   ```

   b) **Backend chưa chạy:**
   ```bash
   # Đảm bảo backend đang chạy
   cd backend
   python main.py
   # Phải thấy: "Uvicorn running on http://0.0.0.0:8000"
   ```

   c) **IP đã thay đổi:**
   - Kiểm tra lại IP: `ipconfig` (Windows) hoặc `ifconfig` (macOS/Linux)
   - Cập nhật `app.json` với IP mới
   - Rebuild app: `npm run android` hoặc `npm run ios`

   d) **Khác mạng Wi-Fi:**
   - Đảm bảo điện thoại và máy tính cùng Wi-Fi
   - Không dùng mobile data trên điện thoại
   - Không dùng VPN (Radmin VPN, ZeroTier) - chỉ dùng Wi-Fi adapter IP

   e) **Test kết nối từ điện thoại:**
   - Mở trình duyệt trên điện thoại
   - Truy cập: `http://192.168.1.4:8000/health`
   - Nếu thấy JSON response `{"status":"ok",...}` → Backend hoạt động
   - Nếu không → Kiểm tra firewall hoặc IP

   f) **Lỗi "navigation failed because the request was for an https-only enable":**
   - ⚠️ **Nguyên nhân**: iOS/Android mặc định chặn HTTP, chỉ cho phép HTTPS
   - ✅ **Giải pháp**: Đã cấu hình trong `app.json` để cho phép HTTP:
     - iOS: `NSAppTransportSecurity` với `NSAllowsArbitraryLoads`
     - Android: `usesCleartextTraffic: true`
   - 🔄 **Sau khi cập nhật `app.json`**: Phải rebuild app
     ```bash
     npm run android  # hoặc npm run ios
     ```
   - ⚠️ **Lưu ý**: Nếu vẫn lỗi, kiểm tra `app.json` đã có cấu hình trên chưa

2. **Model loading fails**:
   - Kiểm tra file model có tồn tại tại `assets/model/plant_disease_model.tflite`
   - Kiểm tra permissions
   - Thử dùng backend API thay vì local model

3. **Camera not working**:
   - Kiểm tra permissions trong Settings của app
   - Restart app
   - Kiểm tra `app.json` có cấu hình camera permission

4. **Performance issues**:
   - Giảm image quality khi chụp ảnh
   - Optimize model
   - Sử dụng backend API thay vì local inference

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License - xem [LICENSE](./LICENSE) file.

## Changelog

### v1.0.0
- Initial React Native version
- TensorFlow Lite integration
- Camera functionality
- History tracking
- Dark/Light theme
