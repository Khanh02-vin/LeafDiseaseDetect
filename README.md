# Leaf Disease Checker — React Native + TensorFlow Lite

Ứng dụng React Native phát hiện bệnh trên lá cây sử dụng CNN và TensorFlow Lite.

## Overview

- **Camera** — chụp ảnh hoặc chọn từ thư viện
- **ML Inference** — TensorFlow Lite on-device (không cần internet)
- **Kết quả** — 3 lớp: Healthy / Diseased / Moldy
- **Lịch sử** — lưu và xem lại các lần quét
- **Dark/Light theme** — giao diện tối/sáng
- **Vị trí** — tag GPS cho mỗi lần quét

## Classes

| ID | Class | Description |
|----|-------|-------------|
| 0 | `Healthy` | Lá cây khỏe mạnh |
| 1 | `Diseased` | Lá cây bị bệnh |
| 2 | `Moldy` | Lá cây bị nấm mốc |

## Model Architecture

**Training (`n-l-c-y.py`):**
- CNN: Conv2D + BatchNorm + MaxPool + Dropout + GlobalAveragePooling + Dense
- Input: 224×224×3
- Data augmentation: rotation, shift, shear, zoom, flip
- Optimizer: Adam | Loss: categorical_crossentropy
- Callbacks: EarlyStopping, ReduceLROnPlateau
- Format conversion: Keras → TensorFlow Lite

**On-device inference:**
- `assets/model/plant_disease_model.tflite`
- `assets/model/labels.txt` → [Healthy, Diseased, Moldy]
- Library: `react-native-fast-tflite`

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Mobile app | React Native (Expo) |
| ML model | TensorFlow Lite (on-device) |
| Camera | expo-camera |
| State | Zustand |
| UI | React Native Paper |
| Navigation | React Navigation |

## Setup

```bash
# Clone
git clone <repo-url>
cd LeafDiseaseDetect

# Install dependencies
npm install

# Start dev server
npm start

# Run on platform
npm run ios    # macOS
npm run android  # Android
```

## Project Structure

```
LeafDiseaseDetect/
├── assets/
│   └── model/
│       ├── plant_disease_model.tflite   # TFLite inference model
│       └── labels.txt                   # Class labels
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # App screens
│   ├── services/        # ML inference & business logic
│   ├── models/           # Data models
│   ├── utils/            # Utilities
│   ├── constants/        # Theme, colors
│   ├── hooks/            # Custom React hooks
│   ├── store/            # Zustand state management
│   └── navigation/       # Navigation setup
├── n-l-c-y.py            # CNN training script (Python)
└── README.md
```

## App Screens

1. **Home/Detector** — chụp ảnh, chạy inference, hiển thị kết quả
2. **History** — danh sách các lần quét, tap xem chi tiết
3. **Settings** — theme, notifications, quản lý dữ liệu
