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

def otsu_threshold(arr):
    """Calculates the optimal Otsu threshold for a 1-channel image array."""
    # Ensure it's 8-bit for histogram
    arr = arr.astype(np.uint8)
    size = arr.size
    bins = np.arange(257)
    hist, _ = np.histogram(arr, bins=bins)
    
    current_max = -1
    threshold = 0
    
    sum_all = np.sum(np.arange(256) * hist)
    sum_b = 0
    w_b = 0
    
    for t in range(256):
        w_b += hist[t]
        if w_b == 0: continue
        w_f = size - w_b
        if w_f == 0: break
        
        sum_b += float(t * hist[t])
        m_b = sum_b / w_b
        m_f = (sum_all - sum_b) / w_f
        
        # Calculate between-class variance
        between_var = float(w_b) * float(w_f) * (m_b - m_f) ** 2
        
        if between_var > current_max:
            current_max = between_var
            threshold = t
            
    return threshold

def filter_segment(img):
    """Simulates SAM-Segmentation: Zero-bleed instance silhouettes using adaptive percentile-based thresholding."""
    arr = np.array(img)
    
    # 1. Diagnostic Stats
    min_val, max_val = arr.min(), arr.max()
    median_val = np.median(arr)
    mean_val = np.mean(arr)
    
    # Histogram summary for saturation analysis
    low_intensity = np.sum(arr < 50)
    high_intensity = np.sum(arr > 200)
    total_pixels = arr.size
    low_pct = (low_intensity / total_pixels) * 100
    high_pct = (high_intensity / total_pixels) * 100
    
    # 2. Adaptive Threshold: Using Otsu's Method (Optimal Global Thresholding)
    # This replaces fixed percentiles with a variance-minimization algorithm
    pivot = otsu_threshold(arr)
    
    # Check if Otsu is too liberal (sometimes happens with very flat images)
    # Fallback to 85th percentile if Otsu picks a value that considers >70% of the image as foreground
    if np.sum(arr >= pivot) / total_pixels > 0.7:
        pivot = np.percentile(arr, 85)
        print(f"  [SAM DEBUG] Otsu too liberal, falling back to 85th percentile.")

    print(f"  [SAM DEBUG] Min: {min_val}, Max: {max_val}, Mean: {mean_val:.1f}, Median: {median_val}")
    print(f"  [SAM DEBUG] Histogram: Low (<50): {low_pct:.1f}%, High (>200): {high_pct:.1f}%")
    print(f"  [SAM DEBUG] Selected Pivot (Otsu): {pivot:.1f}")
    
    # 3. Binary separation
    out_arr = np.zeros_like(arr)
    out_arr[arr < pivot] = 40 # Background depth (normalized)
    out_arr[arr >= pivot] = 255 # Foreground subject (normalized)
    
    # 4. Saturation Check
    white_ratio = np.sum(out_arr == 255) / total_pixels
    if white_ratio > 0.90:
        print(f"  [WARNING] Saturated Output: {white_ratio*100:.1f}% of image is white. Ground truth may be degenerate.")

    return Image.fromarray(out_arr)

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
    """Subject-Aware Semantic Mask: Anchored in predicted ground truth with an adaptive 70th percentile threshold."""
    arr = np.array(img)
    # Using a higher percentile (70th) for semantic masking to favor the most prominent subject matter
    pivot = np.percentile(arr, 70)
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
    img = Image.open(source_path)
    if img.mode.startswith('I'):
        # PIL's convert('L') fundamentally corrupts 16-bit images by clamping or truncating.
        # We must properly scale it down manually.
        arr16 = np.array(img).astype(np.float32)
        arr8 = (arr16 / 65535.0 * 255.0).astype(np.uint8)
        img = Image.fromarray(arr8, mode='L')
    else:
        img = img.convert('L') # Fallback for 8-bit or RGB

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
