import os
import json
import subprocess

def run_generator(mode, filename, output_dir):
    """Run the depth_generator.py or depth_service.py script."""
    output_path = os.path.join(output_dir, filename + ".png")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    cwd = os.getcwd()
    
    if mode == 'predicted':
        # Use Genuine ML Depth-from-Mono (DepthAnything V2) from local venv
        python_exec = os.path.join(cwd, "experiments", "spatial-media", "venv", "bin", "python3")
        service_script = os.path.join(cwd, "experiments", "spatial-media", "depth_service.py")
        image_path = os.path.join(cwd, "experiments", "spatial-media", "images", filename + ".jpg")
        # Handle .png images (like sample.png)
        if not os.path.exists(image_path):
            image_path = os.path.join(cwd, "experiments", "spatial-media", "images", filename + ".png")
            
        print(f"Restoring Genuine ML Depth for: {filename}")
        cmd = [python_exec, service_script, image_path, output_path]
    else:
        # Use Deterministic Mocks (Radial, Linear, Subject)
        python_exec = "python3"
        script = os.path.join(cwd, "experiments", "spatial-media", "depth", "scripts", "depth_generator.py")
        cmd = [python_exec, script, mode, output_path]
        
    subprocess.run(cmd)

def main():
    catalog_path = "experiments/spatial-media/catalog.json"
    if not os.path.exists(catalog_path):
        print(f"Error: {catalog_path} not found.")
        return

    with open(catalog_path, "r") as f:
        catalog = json.load(f)

    modes = ["radial", "linear", "subject", "predicted"]
    
    for mode in modes:
        output_dir = f"experiments/spatial-media/depth/strategies/{mode}/"
        print(f"Orchestrating {mode.upper()} depth strategy batch...")
        for item in catalog:
            filename_base = item['filename'].split('.')[0]
            run_generator(mode, filename_base, output_dir)

if __name__ == "__main__":
    main()
