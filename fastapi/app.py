import os
import gc
import json
import numpy as np
from PIL import Image
import requests
from io import BytesIO
import onnxruntime as ort
from fastapi import FastAPI, Request

app = FastAPI()

session = None
metadata = None

def load_model():
    global session, metadata
    if session is None:
        model_path = "./fastapi/onnx_model/nsfw_model.onnx"

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file {model_path} not found. Please run the conversion script first.")

        # Load metadata
        if os.path.exists("nsfw_model_metadata.json"):
            with open("nsfw_model_metadata.json", "r") as f:
                metadata = json.load(f)
        else:
            metadata = {"labels": {0: "normal", 1: "nsfw"}}

        # Create minimal session with extreme memory optimization
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1
        options.inter_op_num_threads = 1
        options.enable_mem_pattern = False
        options.enable_cpu_mem_arena = False
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        # Load session with CPU provider only
        session = ort.InferenceSession(
            model_path, 
            sess_options=options,
            providers=['CPUExecutionProvider']
        )

        print("Model loaded successfully")

    return session

def preprocess_image(image):
    # Resize image to model input size
    if image.mode != "RGB":
        image = image.convert("RGB")

    # Resize to 224x224 (typical ViT/mobile model input size)
    image = image.resize((384, 384), Image.LANCZOS)

    # Convert to numpy array and normalize
    img_array = np.array(image).astype(np.float32)
    img_array /= 255.0

    # Apply normalization using ImageNet mean and std
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    img_array = (img_array - mean) / std

    # Transpose from HWC to CHW format
    img_array = img_array.transpose(2, 0, 1)

    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0).astype(np.float32)

    return img_array

def fetch_image(image_url, cookies=None):
    response = requests.get(image_url, cookies=cookies, stream=True, timeout=30, verify=False)
    if response.status_code == 200:
        return Image.open(BytesIO(response.content))
    else:
        raise Exception(f"Failed to download image from {image_url}")

@app.get("/api/posts/check-nsfw")
async def check_nsfw(image_url: str, request: Request):
    # Force garbage collection before processing
    gc.collect()

    cookies = {key: value for key, value in request.cookies.items()}

    try:
        # Load model if not already loaded
        session = load_model()

        # Fetch and preprocess image
        img = fetch_image(image_url, cookies)
        input_data = preprocess_image(img)

        # Run inference
        input_name = session.get_inputs()[0].name
        output = session.run(None, {input_name: input_data})[0]

        # Get prediction
        prediction_idx = np.argmax(output[0])

        # Convert string ID to int if needed
        if metadata and "labels" in metadata:
            labels = metadata["labels"]
            # Handle both string and int keys
            label_keys = list(labels.keys())
            if label_keys and isinstance(label_keys[0], str):
                # Convert keys to int
                prediction_idx_str = str(prediction_idx)
                label = labels.get(prediction_idx_str, "unknown")
            else:
                label = labels.get(prediction_idx, "unknown")
        else:
            label = "nsfw" if prediction_idx == 1 else "normal"

        is_nsfw = 1 if "nsfw" in str(label).lower() else 0

        # Free memory
        del img, input_data, output
        gc.collect()

        return {"nsfw": is_nsfw}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    pass
