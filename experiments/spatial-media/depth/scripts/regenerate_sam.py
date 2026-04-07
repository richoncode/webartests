import os
import json
import subprocess
import sys

# standalone regenerate_sam.py
# This script focuses purely on regenerating the 'segment' (SAM) depth strategy
# from the existing 'predicted' ground truth.

def main():
    # 1. Resolve Paths
    scripts_dir = os.path.dirname(os.path.abspath(__file__)) # /experiments/spatial-media/depth/scripts
    base_dir = os.path.dirname(os.path.dirname(scripts_dir)) # /experiments/spatial-media
    catalog_path = os.path.join(base_dir, "catalog.json")
    pred_dir = os.path.join(base_dir, "depth", "strategies", "predicted")
    output_dir = os.path.join(base_dir, "depth", "strategies", "segment")
    
    # Python executable from venv
    venv_python = os.path.join(base_dir, "venv", "bin", "python3")
    if not os.path.exists(venv_python):
        venv_python = "python3" # Fallback to system
        
    generator_script = os.path.join(scripts_dir, "depth_generator.py")

    if not os.path.exists(catalog_path):
        print(f"[ERROR] Catalog not found at: {catalog_path}")
        return

    # 2. Ingest Catalog
    with open(catalog_path, "r") as f:
        catalog = json.load(f)

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print("########################################")
    print("# LUMINA SAM REGENERATION PIPELINE     #")
    print("########################################")
    print(f"Targeting {len(catalog)} images...")
    print(f"Using Adaptive Segment Thresholding...")

    # 3. Process Batch
    success_count = 0
    for i, item in enumerate(catalog):
        filename_base = os.path.splitext(item['filename'])[0]
        source_path = os.path.join(pred_dir, f"{filename_base}.png")
        output_path = os.path.join(output_dir, f"{filename_base}.png")
        
        if not os.path.exists(source_path):
            print(f"  [SKIP] Ground truth missing for: {filename_base}")
            continue

        print(f"  [{i+1}/{len(catalog)}] Processing SAM for: {filename_base}...")
        
        # Run the generator specifically for 'segment' mode
        cmd = [venv_python, generator_script, "segment", source_path, output_path]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            if result.stdout:
                print(result.stdout.strip())
            success_count += 1
        except subprocess.CalledProcessError as e:
            print(f"  [ERROR] Failed to process {filename_base}: {e.stderr}")

    print("\n########################################")
    print(f"# COMPLETED: {success_count}/{len(catalog)} assets updated. #")
    print("########################################")
    print("\nPlease Hard Refresh (Cmd+Shift+R) in your browser to see changes.")

if __name__ == "__main__":
    main()
