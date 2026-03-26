# Leaf Disease Checker - React Native

Ứng dụng React Native để phát hiện bệnh trên lá cây sử dụng Machine Learning.

## Tính năng

- 📷 Chụp ảnh lá cây hoặc chọn từ thư viện
- 🤖 Phân tích bệnh bằng AI (TensorFlow Lite)
- 📊 Hiển thị kết quả chi tiết về sức khỏe lá
- 📱 Lưu lịch sử quét
- 🎨 Dark/Light theme

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
### Dataset: https://huggingface.co/datasets/Khanh510/Plant_disease_recognition
### Model:
- `assets/model/plant_disease_model.tflite` - Model phát hiện bệnh lá cây
- `assets/model/labels.txt` - Labels: Healthy Leaf, Diseased Leaf, Moldy Leaf
### TensorFlow Integration:
- Sử dụng react-native-fast-tflite cho TFLite inference
- Hỗ trợ preprocessing và normalization
- Fallback classification khi confidence thấp

### Thuật toán Computer Vision (từ `n-l-c-y.py`)
- Mô hình CNN huấn luyện phân loại 3 lớp (Healthy/Diseased/Moldy) với input 224x224x3.
- Data augmentation: rotation/shift/shear/zoom/flip và chuẩn hóa pixel về [0,1].
- Kiến trúc: nhiều lớp Conv2D + BatchNorm + MaxPool + Dropout, GlobalAveragePooling, Dense.
- Huấn luyện với Adam, EarlyStopping và ReduceLROnPlateau; đánh giá bằng Accuracy/Precision/Recall/F1.
- Chuyển đổi mô hình Keras sang TensorFlow Lite để chạy on-device.

## Cài đặt

### Prerequisites:
- Node.js 18+
- Expo CLI
- iOS Simulator (cho iOS)
- Android Studio (cho Android)

### Installation:
```bash
# Clone repository
git clone <repository-url>
cd LeafDiseaseDetect

# Install dependencies
npm install

# Start development server
npm start

# Run on specific platform
npm run ios
npm run android
npm run web
```

## Cấu hình

### Environment Variables:
```bash
# .env
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_MODEL_VERSION=1.0.0
```

### App Configuration:
- Camera permissions
- Location permissions
- Notification settings
- Model loading

## Sử dụng

### 1. Chụp ảnh:
- Mở app và chọn "Detector"
- Chụp ảnh lá cây hoặc chọn từ gallery
- Đợi phân tích bệnh hoàn tất

### 2. Xem lịch sử:
- Chọn tab "History"
- Xem danh sách các lần quét
- Tap để xem chi tiết

### 3. Cài đặt:
- Chọn tab "Settings"
- Thay đổi theme, notifications
- Quản lý dữ liệu

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
npm test -- --testNamePattern="OrangeClassifier"
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

1. **Model loading fails**:
   - Kiểm tra file model có tồn tại
   - Kiểm tra permissions

2. **Camera not working**:
   - Kiểm tra permissions
   - Restart app

3. **Performance issues**:
   - Giảm image quality
   - Optimize model

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request


### v1.0.0
- Initial React Native version
- TensorFlow Lite integration
- Camera functionality
- History tracking
- Dark/Light theme
