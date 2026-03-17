import json
from collections import Counter

def count_types(filename):
    with open(filename, 'r') as f:
        data = json.load(f)
    types = [d.get('type') for d in data['canvas'][0]['displays']]
    return Counter(types)

print("Original:", count_types('../../Downloads/GradientMar14-1222.xcs'))
print("Fixed:   ", count_types('../../Downloads/GradientMar14-1222FontFix.xcs'))
