import json

def get_text_objs(filename):
    with open(filename, 'r') as f:
        data = json.load(f)
    return [d for d in data['canvas'][0]['displays'] if d.get('type') == 'TEXT']

objs_orig = get_text_objs('../../Downloads/GradientMar14-1222.xcs')
objs_fix = get_text_objs('../../Downloads/GradientMar14-1222FontFix.xcs')

print("--- ORIGINAL TEXT OBJECTS ---")
for o in objs_orig:
    # Remove fontData for brevity
    o_small = {k: v for k, v in o.items() if k != 'fontData'}
    print(json.dumps(o_small, indent=2))

print("\n--- FIXED TEXT OBJECTS ---")
for o in objs_fix:
    o_small = {k: v for k, v in o.items() if k != 'fontData'}
    print(json.dumps(o_small, indent=2))
