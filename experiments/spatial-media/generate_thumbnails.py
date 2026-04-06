import os
import subprocess
import json

def generate_thumbnails():
    img_dir = 'images'
    thumb_dir = 'thumbnails'
    
    if not os.path.exists(thumb_dir):
        os.makedirs(thumb_dir)
        print(f"Created directory: {thumb_dir}")

    photos = [f for f in os.listdir(img_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    catalog = []

    for photo in photos:
        input_path = os.path.join(img_dir, photo)
        # Use .png for all thumbnails for consistency/alpha support if needed
        thumb_name = os.path.splitext(photo)[0] + '.png'
        thumb_path = os.path.join(thumb_dir, thumb_name)
        
        catalog.append({
            "id": photo,
            "filename": photo,
            "thumbnail": thumb_name
        })

        if not os.path.exists(thumb_path):
            print(f"Generating thumbnail for {photo}...")
            # Scale to 128x128, maintaining aspect ratio then padding/cropping
            # For simplicity: scale to 128:128 forced box
            cmd = [
                'ffmpeg', '-i', input_path,
                '-vf', 'scale=128:128:force_original_aspect_ratio=increase,crop=128:128',
                '-vframes', '1',
                thumb_path,
                '-y'
            ]
            subprocess.run(cmd, capture_output=True)

    # Write catalog.json for the JS to consume
    with open('catalog.json', 'w') as f:
        json.dump(catalog, f, indent=4)
    print("Catalog.json updated.")

if __name__ == "__main__":
    generate_thumbnails()
