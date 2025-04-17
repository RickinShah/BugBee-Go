import os
from transformers import pipeline, logging
from PIL import Image
import sys
from fastapi import FastAPI, Request
import requests
from io import BytesIO

app = FastAPI()
model_directory = "./nsfw-detector-model"

def download_model(model_directory):
    required_files = ['config.json', 'model.safetensors', 'preprocessor_config.json']

    for file_name in required_files:
        if not os.path.exists(os.path.join(model_directory, file_name)):
            print("Downloading model...")
            predict = pipeline("image-classification", model="AdamCodd/vit-base-nsfw-detector")
            predict.save_pretrained(model_directory)
            return predict
        else:
            return pipeline("image-classification", model="./fastapi/nsfw-detector-model")

predict = download_model(model_directory)

def fetch_image(image_url: str, cookies: dict = None):
    response = requests.get(image_url, cookies=cookies, stream=True, timeout=30, verify = False)
    if response.status_code == 200:
        return Image.open(BytesIO(response.content))
    else:
        raise Exception(f"Failed to download image from {image_url}")

@app.get("/api/posts/check-nsfw")
async def check_nsfw(image_url: str, request: Request):
    cookies = {key: value for key, value in request.cookies.items()}
    try:
        img = fetch_image(image_url, cookies)
        prediction = predict(img)

        is_nsfw = 1 if prediction[0]['label'] == 'nsfw' else 0

        return {'nsfw': is_nsfw}
    except Exception as e:
        return {"error": str(e)}
