# simple_convert.py
import os
import torch
import json
import onnx
from transformers import AutoFeatureExtractor, AutoModelForImageClassification
from onnxsim import simplify
from onnxruntime.quantization import quantize_dynamic, QuantType

# Set environment variables to reduce memory usage
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["OMP_NUM_THREADS"] = "1"

def convert_to_onnx():
    # model_name = "Falconsai/nsfw_image_detection"
    model_name = "AdamCodd/vit-base-nsfw-detector"
    output_path = "./fastapi/onnx_model/nsfw_model.onnx"
    quantized_path = "./fastapi/onnx_model/nsfw_model_quantized.onnx"
    
    print("Loading model...")
    model = AutoModelForImageClassification.from_pretrained(model_name)
    feature_extractor = AutoFeatureExtractor.from_pretrained(model_name)
    model.eval()

    dummy_input = torch.randn(1, 3, 384, 384, dtype=torch.float32)

    print("Exporting to ONNX...")
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        opset_version=14
    )

    print("Simplifying ONNX model...")
    simplified_model, check = simplify(onnx.load(output_path))
    assert check, "Simplification failed"
    onnx.save(simplified_model, output_path)

    print("Quantizing model to INT8...")
    quantize_dynamic(
        model_input=output_path,
        model_output=quantized_path,
        weight_type=QuantType.QInt8
    )

    print(f"Model quantized and saved to {quantized_path}")

    print("Saving metadata...")
    metadata = {
        "labels": model.config.id2label,
        "input_size": [384, 384],
        "mean": feature_extractor.image_mean,
        "std": feature_extractor.image_std
    }

    with open("nsfw_model_metadata.json", "w") as f:
        json.dump(metadata, f)

    print("Done!")

if __name__ == "__main__":
    convert_to_onnx()
