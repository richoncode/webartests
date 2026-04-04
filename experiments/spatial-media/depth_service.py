import torch
from transformers import pipeline
from PIL import Image
import numpy as np
import sys
import os

def generate_depth(image_path, output_path):
    print(f"Loading Depth Service... (Target: {image_path})")
    
    # Load model (using small for speed/efficiency)
    # Note: DepthAnything V2 is stable and high-performance.
    pipe = pipeline(task="depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device=(0 if torch.cuda.is_available() else -1))
    
    image = Image.open(image_path)
    
    # Run Inference
    print("Executing monocular depth estimation...")
    result = pipe(image)
    
    # Convert to 16-bit to maintain precision as requested (for vertex displacement)
    depth_map = result["depth"]
    
    # Normalize and convert to 16-bit grayscale
    # Note: pipeline output is often a PIL image (8-bit) or a tensor. 
    # Let's ensure we get the full range.
    depth_array = np.array(depth_map)
    depth_array = (depth_array - depth_array.min()) / (depth_array.max() - depth_array.min())
    depth_array = (depth_array * 65535).astype(np.uint16)
    
    depth_img = Image.fromarray(depth_array, mode='I;16')
    depth_img.save(output_path)
    
    print(f"Precision depth map saved to: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python depth_service.py <input_img> <output_depth>")
    else:
        generate_depth(sys.argv[1], sys.argv[2])
