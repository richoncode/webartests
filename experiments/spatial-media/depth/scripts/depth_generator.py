import os
import sys
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
import numpy as np

def filter_diffusion(img):
    """Simulates Diffusion Refinement: Sharpness + Micro-Tactile Jitter."""
    # 1. Enhance Sharpening
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(3.0)
    # 2. Add subtle high-frequency noise
    arr = np.array(img).astype(np.int16)
    noise = np.random.randint(-12, 12, arr.shape)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

def filter_metric(img):
    """Simulates Metric-Absolute Depth: Non-linear distancing."""
    arr = np.array(img).astype(np.float32) / 255.0
    # Apply a Power-law (Gamma) to simulate binned focal metrics
    arr = np.power(arr, 1.4) * 255.0
    return Image.fromarray(arr.astype(np.uint8))

def filter_segment(img):
    """Simulates SAM-Segmentation: Zero-bleed instance silhouettes."""
    arr = np.array(img)
    # High-contrast threshold to isolate the primary subject from the background
    # (Otsu-style simplistic implementation)
    pivot = 127
    arr[arr < pivot] = 40 # Background depth
    arr[arr >= pivot] = 255 # Foreground subject
    return Image.fromarray(arr)

def filter_mpi(img):
    """Simulates MPI (Layers): Discrete depth-slices."""
    arr = np.array(img)
    # Posterize the ML map into 8 discrete depth planes
    layers = 8
    arr = (np.floor(arr / (256/layers)) * (256/layers)).astype(np.uint8)
    return Image.fromarray(arr)

def filter_fusion(img):
    """Simulates Tile-Fusion: High-resolution detail stitching."""
    # Find edges in the ML map and overlay them to simulate high-precision reconstruction
    edges = img.filter(ImageFilter.FIND_EDGES)
    arr = np.array(img).astype(np.int16)
    edge_arr = np.array(edges).astype(np.int16)
    arr = np.clip(arr + edge_arr, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

def filter_semantic(img):
    """Subject-Aware Semantic Mask: Anchored in predicted ground truth."""
    # Dilated thresholding to provide a slightly softer subject pop
    arr = np.array(img)
    pivot = 140
    arr[arr < pivot] = 0
    arr[arr >= pivot] = 255
    return Image.fromarray(arr).filter(ImageFilter.GaussianBlur(radius=4))

def filter_radial(img):
    """Radial Hybrid: ML Base + Depth Falloff."""
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape
    cx, cy = w/2, h/2
    y, x = np.ogrid[:h, :w]
    mask = 1.0 - (np.sqrt((x-cx)**2 + (y-cy)**2) / (w*0.7))
    arr = np.clip(arr * mask, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

def filter_linear(img):
    """Linear Hybrid: ML Base + Horizon Gradient."""
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape
    # Blend the ML prediction with a vertical horizon gradient
    gradient = np.linspace(0.2, 1.0, h).reshape(h, 1)
    arr = np.clip(arr * gradient, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

def filter_subject(img):
    """Subject-Aware Pop: ML Base + Gaussian Center Boost."""
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape
    cx, cy = w/2, h/2
    y, x = np.ogrid[:h, :w]
    # Multiply ML depth by a Gaussian spread to simulate portrait-mode pop
    sigma = w / 2.5
    gaussian = np.exp(-((x-cx)**2 + (y-cy)**2)/(2*sigma**2))
    arr = np.clip(arr * (0.5 + 0.5 * gaussian), 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

def main():
    if len(sys.argv) < 4:
        print("Usage: python3 depth_generator.py [mode] [source_predicted_path] [output_path]")
        return

    mode = sys.argv[1]
    source_path = sys.argv[2]
    output_path = sys.argv[3]

    if not os.path.exists(source_path):
        print(f"Error: Base predicted asset not found: {source_path}")
        return

    # Ingest the ML ground truth
    img = Image.open(source_path).convert('L') # Ensure grayscale

    if mode == 'diffusion': img = filter_diffusion(img)
    elif mode == 'metric': img = filter_metric(img)
    elif mode == 'segment': img = filter_segment(img)
    elif mode == 'mpi': img = filter_mpi(img)
    elif mode == 'fusion': img = filter_fusion(img)
    elif mode == 'semantic': img = filter_semantic(img)
    elif mode == 'radial': img = filter_radial(img)
    elif mode == 'linear': img = filter_linear(img)
    elif mode == 'subject': img = filter_subject(img)
    elif mode == 'lidar': 
        # LiDAR mock: Low-pass filter to simulate sensor blur
        img = img.filter(ImageFilter.BoxBlur(1))
    
    img.save(output_path)
    print(f"Applied {mode} filter to depth: {output_path}")

if __name__ == "__main__":
    main()
