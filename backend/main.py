from __future__ import annotations

import base64
import io
import os
import time
from typing import List

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# Ưu tiên dùng tflite-runtime (nhẹ và ổn định hơn trên nhiều môi trường).
# Nếu không có thì fallback sang TensorFlow full với tf.lite.Interpreter.
try:
    import tflite_runtime.interpreter as tflite
    USE_TFL_RUNTIME = True
except ImportError:  # pragma: no cover
    try:
        import tensorflow as tf
        USE_TFL_RUNTIME = False
    except ImportError:
        raise RuntimeError(
            "TensorFlow / TFLite runtime is required. Install with "
            "`pip install tflite-runtime` hoặc `pip install tensorflow==2.17.0`."
        )


MODEL_PATH = os.getenv(
    "TFLITE_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "..", "assets", "model", "plant_disease_model.tflite"),
)

DISEASE_LABELS: List[str] = [
    "Lá gỉ sắt",
    "Lá phấn trắng",
    "Lá bình thường",
]

CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))


class LeafClassifier:
    def __init__(self, model_path: str) -> None:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"TFLite model not found at {model_path}")

        if USE_TFL_RUNTIME:
            self.interpreter = tflite.Interpreter(model_path=model_path)
        else:
            self.interpreter = tf.lite.Interpreter(model_path=model_path)
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()

        # Expecting [1, height, width, channels]
        input_shape = self.input_details[0]["shape"]
        self.height = int(input_shape[-3]) if input_shape.size >= 3 else 224
        self.width = int(input_shape[-2]) if input_shape.size >= 2 else 224
        self.channels = int(input_shape[-1]) if input_shape.size >= 1 else 3

    def preprocess(self, image_base64: str) -> np.ndarray:
        try:
            image_data = base64.b64decode(image_base64)
        except base64.binascii.Error as exc:  # pragma: no cover
            raise ValueError("Invalid base64 image") from exc

        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        image = image.resize((self.width, self.height))

        # Normalize to [0, 1] float32
        array = np.asarray(image, dtype=np.float32) / 255.0
        array = np.expand_dims(array, axis=0)
        return array

    def infer(self, input_tensor: np.ndarray) -> List[float]:
        self.interpreter.set_tensor(self.input_details[0]["index"], input_tensor)
        self.interpreter.invoke()
        output = self.interpreter.get_tensor(self.output_details[0]["index"])
        return output[0].tolist()

    def classify(self, image_base64: str) -> dict:
        input_tensor = self.preprocess(image_base64)
        scores = self.infer(input_tensor)

        # ⚠️ REMAP SCORES: Nếu kết quả bị đảo ngược, có thể train với thứ tự khác
        # 
        # Nếu "Lá phấn trắng" bị nhận thành "Lá gỉ sắt" và ngược lại → remap sai
        # Thử không remap (giữ nguyên scores) để test
        # Nếu vẫn sai → cần kiểm tra traing.class_indices trong Kaggle notebook
        
        max_index = int(np.argmax(scores))
        confidence = float(scores[max_index])

        # Debug log để kiểm tra phân bố điểm
        print("[Classifier] scores:", scores, "-> max_index:", max_index, "confidence:", confidence)

        label = DISEASE_LABELS[max_index] if max_index < len(DISEASE_LABELS) else "Không xác định"

        return {
            "label": label,
            "confidence": float(scores[max_index]),
            "scores": scores,
        }


classifier = LeafClassifier(MODEL_PATH)


def reload_classifier() -> None:
    global classifier
    classifier = LeafClassifier(MODEL_PATH)

app = FastAPI(title="Leaf Disease Classifier API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def healthcheck() -> dict:
    return {
        "status": "ok",
        "model_path": MODEL_PATH,
        "labels": DISEASE_LABELS,
    }


@app.post("/classify")
def classify(payload: dict) -> dict:
    image_base64 = payload.get("image")
    if not image_base64:
        raise HTTPException(status_code=400, detail="Missing 'image' field (base64 string)")

    metadata = payload.get("metadata", {})

    start = time.perf_counter()
    try:
        result = classifier.classify(image_base64)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    duration_ms = (time.perf_counter() - start) * 1000.0

    is_confident = result["confidence"] >= CONFIDENCE_THRESHOLD

    return {
        "label": result["label"],
        "confidence": result["confidence"],
        "scores": result["scores"],
        "is_confident": is_confident,
        "duration_ms": duration_ms,
        "metadata": metadata,
    }


@app.post("/reload")
def reload_model() -> dict:
    try:
        reload_classifier()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"status": "reloaded", "model_path": MODEL_PATH}


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
