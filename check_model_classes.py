"""
脚本检查模型输出的类别顺序
运行这个脚本来确认模型输出的索引对应哪个类别
"""

import tensorflow as tf
import numpy as np
from PIL import Image

# 1. 加载 TFLite 模型
interpreter = tf.lite.Interpreter(model_path="plant_disease_model.tflite")
interpreter.allocate_tensors()

# 2. 获取输入和输出详情
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

print("=" * 60)
print("模型信息:")
print(f"输入形状: {input_details[0]['shape']}")
print(f"输出形状: {output_details[0]['shape']}")
print("=" * 60)

# 3. 创建测试图像（全零或随机值）
# 注意：这只是为了测试输出顺序，不是真实预测
test_image = np.zeros((1, 224, 224, 3), dtype=np.float32)

# 4. 运行推理
interpreter.set_tensor(input_details[0]['index'], test_image)
interpreter.invoke()
output = interpreter.get_tensor(output_details[0]['index'])

print("\n模型输出形状:", output.shape)
print("输出值（softmax 概率）:", output[0])
print("\n" + "=" * 60)
print("⚠️  重要：这个脚本只检查模型结构，不进行真实预测")
print("=" * 60)
print("\n请检查你的训练代码中打印的类别顺序：")
print("  - traing.class_indices")
print("  - testg.class_indices")
print("\n确保后端代码中的 DISEASE_LABELS 顺序与训练时一致！")
print("=" * 60)

