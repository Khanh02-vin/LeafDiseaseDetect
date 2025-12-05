"""
修改训练代码，确保类别顺序与后端一致
在训练代码的最后，转换 TFLite 之前添加这段代码
"""

# 在你的训练代码中，在转换 TFLite 之前添加：

# ===== 添加这段代码 =====
print("\n" + "="*60)
print("⚠️  检查类别顺序:")
print("="*60)
print("Training class indices:", traing.class_indices)
print("Test class indices:", testg.class_indices)
print("\n⚠️  确保顺序是:")
print("  0: Lá gỉ sắt")
print("  1: Lá phấn trắng") 
print("  2: Lá bình thường")
print("="*60)

# 如果顺序不对，需要重新映射或重新训练
# ===== 结束添加 =====

# 然后继续你的 TFLite 转换代码：
# import tensorflow as tf
# converter = tf.lite.TFLiteConverter.from_keras_model(model)
# ...

