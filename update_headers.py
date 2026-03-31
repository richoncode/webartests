import os
import re

files = [
    ("streams-test.html", "HLS Ingest"),
    ("webgpu-render-test.html", "WebGPU Render"),
    ("slang-wasm-test.html", "Slang Compiler"),
    ("slang-yuv-poc.html", "YUV Separation"),
    ("slang-homography-poc.html", "Homography"),
    ("slang-background-poc.html", "Background"),
    ("slang-stereo-depth.html", "Stereo Depth"),
    ("slang-optical-flow-poc.html", "Optical Flow"),
    ("slang-cnn-upscale.html", "CNN Upscale"),
    ("slang-temporal-accumulation.html", "Temporal"),
    ("slang-ref-sr.html", "Stereo Fusion"),
    ("slang-video-test.html", "Slang Engine")
]

dir_path = "experiments/web-video-super-scaling/"

css_block = """
    <style>
        .nav-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 24px;
            background: #1a1a1a;
            border-bottom: 1px solid #2a2a2a;
            position: relative;
            z-index: 1000;
        }

        .nav-left {
            display: flex;
            align-items: center;
            gap: 16px;
            z-index: 10;
        }

        .nav-center {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            font-weight: bold;
            font-size: 1.1rem;
            color: #fff;
            pointer-events: none;
            white-space: nowrap;
            text-align: center;
        }

        .nav-right {
            display: flex;
            align-items: center;
            gap: 16px;
            z-index: 10;
        }

        .nav-header a {
            color: #5b9bd5;
            text-decoration: none;
            font-size: 14px;
            transition: color 0.2s;
            display: flex;
            align-items: center;
        }

        .nav-header a:hover {
            color: #fff;
        }

        .nav-header a.hub-link {
            color: #3b82f6;
            font-weight: bold;
        }
    </style>
"""

for i, (filename, current_name) in enumerate(files):
    file_path = os.path.join(dir_path, filename)
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue

    with open(file_path, "r") as f:
        content = f.read()

    # Inject CSS before </head>
    if ".nav-header" not in content:
        content = content.replace("</head>", f"{css_block}\n</head>")

    # Determine Prev and Next
    prev_link = ""
    if i > 0:
        prev_file, prev_name = files[i-1]
        prev_link = f'<a href="{prev_file}" class="prev-link">← {prev_name}</a>'
    
    next_link = ""
    if i < len(files) - 1:
        next_file, next_name = files[i+1]
        next_link = f'<a href="{next_file}" class="next-link">{next_name} →</a>'

    new_header = f"""
    <nav class="nav-header">
        <div class="nav-left">
            <a href="index.html" class="hub-link">Return to Hub</a>
            {prev_link}
        </div>
        <div class="nav-center">{current_name}</div>
        <div class="nav-right">
            {next_link}
        </div>
    </nav>
"""

    # Replace existing <header> or <nav class="nav-header">
    # Try to find <header>...</header> or <nav class="nav-header">...</nav>
    
    content = re.sub(r'<header.*?</header>', new_header, content, flags=re.DOTALL)
    content = re.sub(r'<nav class="nav-header".*?</nav>', new_header, content, flags=re.DOTALL)

    # Remove <h1> titles below headers
    # The instruction says "Remove the <h1> titles that are currently below the headers"
    # We'll search for <h1> after the new header.
    # Since we replaced the header, let's just look for any <h1> in the body that might be a title.
    # But only if it's near the top.
    
    # Let's find <h1> and see if they should be removed.
    # From my previous grep, only index.html and plan.html had <h1>.
    # So maybe there's nothing to remove in these 12 files.
    # But just in case:
    content = re.sub(r'<h1>.*?</h1>', '', content, count=1)

    with open(file_path, "w") as f:
        f.write(content)
    print(f"Updated {filename}")
