from PIL import Image
import os

# Open the image you provided
img = Image.open('icons/icon.png')

# Create icons folder if it doesn't exist
os.makedirs('icons', exist_ok=True)

# Resize to the three required sizes
sizes = [16, 48, 128]

for size in sizes:
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(f'icons/icon-{size}.png')
    print(f'Created icon-{size}.png')

print('Done! All icons created in the icons/ folder')
