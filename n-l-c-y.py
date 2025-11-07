#!/usr/bin/env python
# coding: utf-8

# ****Cài đặt thư viện****

# In[ ]:


# importing
import os

import pandas as pd
import numpy as np

from PIL import Image
import matplotlib.pyplot as plt
import seaborn as sns
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow import keras
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, BatchNormalization, Activation, GlobalAveragePooling2D, Dropout, Dense, MaxPooling2D
from tensorflow.keras.callbacks import ReduceLROnPlateau, EarlyStopping


from sklearn.metrics import classification_report, confusion_matrix,accuracy_score,precision_score,recall_score,f1_score


# In[2]:


# Storing Dataframe addresses
train=r'/kaggle/input/dataset-lacay/Train/Train'
test=r'/kaggle/input/dataset-lacay/Test/Test'
val=r'/kaggle/input/dataset-lacay/Validation/Validation'


# **Data Augmentation**

# In[3]:


img_size=(224,224)
batch_size=32

# Scaling of Pixel Values for Training data
# Little Augmentation of the Training data for better results :)
trdata=ImageDataGenerator(
    rescale=1.0/255,
    rotation_range=15,
    width_shift_range=0.15,
    height_shift_range=0.15,
    shear_range=0.15,
    zoom_range=0.15,
    horizontal_flip=True,
)

# Scaling of pixel values for Testing and Validation sets
tegen=ImageDataGenerator(rescale=1.0/255)
valgen=ImageDataGenerator(rescale=1.0/255)
traing=trdata.flow_from_directory(
    train,
    target_size=img_size,
    batch_size=batch_size,
    color_mode='rgb',
    class_mode='categorical',
    shuffle=True
)
testg = tegen.flow_from_directory(
    test,
    target_size=img_size,
    batch_size=batch_size,
    color_mode='rgb', 
    class_mode='categorical',
    shuffle=False
)
valg = valgen.flow_from_directory(
    val,
    target_size=img_size,
    batch_size=batch_size,
    color_mode='rgb',  
    class_mode='categorical',
    shuffle=True,
)


# 
# **Displaying Images and Distribution of Classes**
# 

# In[4]:


# Displaying the training and testing datsets
# Only 10 Images from each set

def plot_images_from_generator(generator, title, num_images=10, images_per_row=5):
    images, labels = next(generator)
    images = images[:num_images]
    labels = labels[:num_images]
    num_rows = (num_images + images_per_row - 1) // images_per_row
    fig, axes = plt.subplots(num_rows, images_per_row, figsize=(15, 3 * num_rows))
    fig.suptitle(title, fontsize=16)
    axes = axes.flatten()
    for i in range(num_images):
        img = images[i]
        label = labels[i]
        axes[i].imshow(img)
        axes[i].axis('off')
        axes[i].set_title(f"Label: {list(generator.class_indices.keys())[label.argmax()]}")

    for j in range(num_images, len(axes)):
        axes[j].axis('off')

    plt.tight_layout()
    plt.show()

plot_images_from_generator(traing, "Training Set", num_images=10, images_per_row=5)
plot_images_from_generator(testg, "Testing Set", num_images=10, images_per_row=5)
plot_images_from_generator(valg, "Validation Set", num_images=10, images_per_row=5)


# In[5]:


#class distribution

def plot_class_distribution(directory, title):
    class_names = os.listdir(directory)
    class_counts = []
    for class_name in class_names:
        class_dir = os.path.join(directory, class_name)
        if os.path.isdir(class_dir):
            class_counts.append(len(os.listdir(class_dir)))

    plt.figure(figsize=(15, 6))
    plt.bar(class_names, class_counts)
    plt.title(title)
    plt.xlabel('Emotion')
    plt.ylabel('Number of Images')
    plt.xticks(rotation=45)
    plt.show()

plot_class_distribution(train, "Training Set Emotion Distribution")
plot_class_distribution(test, "Testing Set Emotion Distribution")
plot_class_distribution(val, "Validation Set Emotion Distribution")


# **CNN Model**

# In[6]:


model = Sequential()

# CNN Layer 1
model.add(Conv2D(64, (3,3), padding='same', input_shape=(224, 224, 3)))  
model.add(Activation('relu'))
model.add(BatchNormalization())
model.add(MaxPooling2D(pool_size=(2,2)))
model.add(Dropout(0.25))

#CNN Layer 2
model.add(Conv2D(64, (3,3), padding='same'))
model.add(Activation('relu'))
model.add(BatchNormalization())
model.add(MaxPooling2D(pool_size=(2,2)))
model.add(Dropout(0.25))

#CNN Layer 3
model.add(Conv2D(256, (3,3), padding='same'))
model.add(Activation('relu'))
model.add(BatchNormalization())
model.add(MaxPooling2D(pool_size=(2,2)))
model.add(Dropout(0.25))

#Global Average Pooling layer is used instead of Flatten as it is more effiecient
#Note: There is feature loss when we use GAP
model.add(GlobalAveragePooling2D())

#Dense Layer 1
model.add(Dense(1024))
model.add(Activation('relu'))
model.add(BatchNormalization())
model.add(Dropout(0.5))

#Dense Layer 2
model.add(Dense(512))
model.add(Activation('relu'))
model.add(BatchNormalization())
model.add(Dropout(0.5))

#Dense Layer 3
model.add(Dense(256))
model.add(Activation('relu'))
model.add(BatchNormalization())
model.add(Dropout(0.5))

#Output Layer
model.add(Dense(3, activation='softmax'))

#Adam Optimizer
opt = keras.optimizers.Adam(learning_rate=0.001)
model.compile(optimizer=opt, loss='categorical_crossentropy', metrics=['accuracy'])

model.summary()


# In[7]:


# Some callbacks to help us 
# I will be using EarlyStopping and Reduce Learining Rate
es=EarlyStopping(monitor='val_loss', patience=25, verbose=1, restore_best_weights=True)
lr=ReduceLROnPlateau(monitor='val_loss', factor=0.001, patience=10, verbose=1, min_delta=0.0001)

callbacks_list=[es,lr]


# In[8]:


# Fit the model :)
history = model.fit(
    traing,
    epochs=70,
    validation_data=valg,
    callbacks=callbacks_list
)


# ****Prediction****

# In[9]:


# Predicting
y_pred = np.argmax(model.predict(testg), axis=1)
y_true = testg.classes


# 
# ****Evaluation Metrics****

# In[10]:


print('Accuracy: ',accuracy_score(y_true, y_pred))
print('Recall: ',recall_score(y_true, y_pred,average='weighted'))
print('Precision: ',precision_score(y_true, y_pred,average='weighted'))
print('F1 Score: ',f1_score(y_true, y_pred,average='weighted'))

# Print Classification Report
print("Classification Report:")
print(classification_report(y_true, y_pred))

# Compute Confusion Matrix
conf_matrix = confusion_matrix(y_true, y_pred)

# Plot Confusion Matrix
plt.figure(figsize=(10, 7))
sns.heatmap(conf_matrix, annot=True, fmt='d', cmap='Blues', 
            )
plt.title('Confusion Matrix')
plt.xlabel('Predicted Labels')
plt.ylabel('True Labels')
plt.show()

# Print Training and Test Class Indices
print("Training class indices:", traing.class_indices)
print("Test class indices:", testg.class_indices)


# ****Chuyển đổi sang TensorFlow Lite (.tflite) cho di động****

# In[11]:


import tensorflow as tf

# 1. Tải mô hình Keras (chính là biến 'model' đang có trọng số tốt nhất)
converter = tf.lite.TFLiteConverter.from_keras_model(model)

# 2. (Tùy chọn) Thêm tối ưu hóa để mô hình chạy nhanh hơn và nhẹ hơn
converter.optimizations = [tf.lite.Optimize.DEFAULT]

# 3. Thực hiện chuyển đổi
tflite_model = converter.convert()

# 4. Lưu file .tflite
# Đây CHÍNH LÀ FILE bạn sẽ dùng trong ứng dụng di động
with open('plant_disease_model.tflite', 'wb') as f:
  f.write(tflite_model)

print("Đã lưu mô hình cho di động tại: plant_disease_model.tflite")


# 
