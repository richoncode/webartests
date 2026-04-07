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

    cwd = os.getcwd()
    python_cmd = os.path.join(cwd, "experiments", "spatial-media", "venv", "bin", "python3")

    with open(catalog_path, "r") as f:
        catalog = json.load(f)

    # Pass 1: Ensure Predicted (ML) maps exist
    print("PHASE 1: Synchronizing Predicted (ML) Ground Truth...")
    pred_dir = "experiments/spatial-media/depth/strategies/predicted/"
    if not os.path.exists(pred_dir): os.makedirs(pred_dir)
    
    for item in catalog:
        filename_base = item['filename'].split('.')[0]
        output_path = os.path.join(pred_dir, f"{filename_base}.png")
        if not os.path.exists(output_path):
            print(f"  [ML] Generating Initial Predicted Depth for: {filename_base}")
            image_path = os.path.join("experiments/spatial-media/images/", item['filename'])
            os.system(f"{python_cmd} experiments/spatial-media/depth_service.py {image_path} {output_path}")

    # Pass 2: Generate all derivative research modes
    print("\nPHASE 2: Orchestrating Derivative Research Filters...")
    modes = [
        "radial", "linear", "subject", 
        "semantic", "mpi", "lidar",
        "diffusion", "metric", "segment", "fusion"
    ]
    
    for mode in modes:
        output_dir = f"experiments/spatial-media/depth/strategies/{mode}/"
        if not os.path.exists(output_dir): os.makedirs(output_dir)
        
        print(f"Applying {mode.upper()} filter batch...")
        for item in catalog:
            filename_base = item['filename'].split('.')[0]
            source_path = os.path.join(pred_dir, f"{filename_base}.png")
            output_path = os.path.join(output_dir, f"{filename_base}.png")
            
            # For this fidelity refactor, we FORCE re-generation of derivatives
            # to ensure they use the new PIL-based ML filtering logic
            os.system(f"{python_cmd} experiments/spatial-media/depth/scripts/depth_generator.py {mode} {source_path} {output_path}")

if __name__ == "__main__":
    main()
