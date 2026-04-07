import os
import sys

def write_pgm(filename, width, height, data):
    """Writes a P5 grayscale PGM file."""
    with open(filename, 'wb') as f:
        f.write(f"P5\n{width} {height}\n255\n".encode())
        f.write(bytearray(data))

def generate_radial(width, height):
    """Radial gradient: White center, Black edges."""
    data = []
    cx, cy = width / 2, height / 2
    max_dist = (cx**2 + cy**2)**0.5
    for y in range(height):
        for x in range(width):
            dist = ((x - cx)**2 + (y - cy)**2)**0.5
            val = int(255 * (1 - dist / max_dist))
            data.append(max(0, min(255, val)))
    return data

def generate_linear(width, height):
    """Linear vertical gradient: Black (top) to White (bottom)."""
    data = []
    for y in range(height):
        val = int(255 * (y / height))
        for x in range(width):
            data.append(val)
    return data

def generate_subject(width, height):
    """Subject-Aware: Gaussian-ish center. High center-pop."""
    data = []
    cx, cy = width / 2, height / 2
    for y in range(height):
        for x in range(width):
            dist_sq = (x - cx)**2 + (y - cy)**2
            sigma_sq = (width / 3)**2
            val = int(255 * (2.71828 ** (-dist_sq / (2 * sigma_sq))))
            data.append(max(0, min(255, val)))
    return data

def generate_semantic(width, height):
    """Semantic Segmentation Mock: Ultra-sharp subject mask."""
    data = []
    cx, cy = width / 2, height / 2
    for y in range(height):
        for x in range(width):
            dist = ((x - cx)**2 + (y - cy)**2)**0.5
            # Sharp cutoff to simulate SAM object isolation
            val = 255 if dist < (width / 4) else 0
            data.append(val)
    return data

def generate_mpi(width, height):
    """MPI (Multi-Plane Image): Posterized depth slices."""
    data = []
    layers = 8
    for y in range(height):
        # Quantize the linear gradient into discrete depth planes
        linear_val = y / height
        quantized = int(linear_val * layers) / layers
        val = int(255 * quantized)
        for x in range(width):
            data.append(val)
    return data

def generate_lidar(width, height):
    """LiDAR Sensor Mock: High-precision with simulated hardware noise."""
    import random
    data = []
    cx, cy = width / 2, height / 2
    for y in range(height):
        for x in range(width):
            dist = ((x - cx)**2 + (y - cy)**2)**0.5
            base_val = int(255 * (1 - dist / (width * 0.7)))
            # Add sensor noise (simulating point cloud artifacts)
            noise = random.randint(-5, 5)
            data.append(max(0, min(255, base_val + noise)))
    return data

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 depth_generator.py [mode] [output_path]")
        return

    mode = sys.argv[1]
    output_path = sys.argv[2]
    width, height = 1024, 1024

    if mode == 'radial':
        data = generate_radial(width, height)
    elif mode == 'linear':
        data = generate_linear(width, height)
    elif mode == 'subject':
        data = generate_subject(width, height)
    elif mode == 'semantic':
        data = generate_semantic(width, height)
    elif mode == 'mpi':
        data = generate_mpi(width, height)
    elif mode == 'lidar':
        data = generate_lidar(width, height)
    else:
        print(f"Unknown mode: {mode}")
        return

    temp_pgm = output_path + ".pgm"
    write_pgm(temp_pgm, width, height, data)
    
    # Convert to PNG using macOS 'sips'
    os.system(f"sips -s format png {temp_pgm} --out {output_path} > /dev/null 2>&1")
    os.remove(temp_pgm)
    print(f"Generated {mode} depth: {output_path}")

if __name__ == "__main__":
    main()
