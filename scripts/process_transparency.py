from PIL import Image
import os

def remove_white_background(input_path, output_path, threshold=230):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # If the pixel is mostly white (r, g, b > threshold)
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            # Set alpha to 0
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")

# Paths
brain_dir = '/Users/sfasttrans/.gemini/antigravity/brain/d30cbdb4-88e4-4067-8224-941f120a3895'
public_icons_dir = '/Users/sfasttrans/Documents/BPI-AeroPath/public/icons'

# Horizontal Logo
remove_white_background(
    os.path.join(brain_dir, 'bpi_horizontal_white_bg_1769742585104.png'),
    os.path.join(public_icons_dir, 'logo.png')
)

# Icon Mark
remove_white_background(
    os.path.join(brain_dir, 'bpi_mark_white_bg_1769742606344.png'),
    os.path.join(public_icons_dir, 'logo-mark.png')
)

# Favicon (copy from logo-mark)
img_mark = Image.open(os.path.join(public_icons_dir, 'logo-mark.png'))
img_mark.save(os.path.join('/Users/sfasttrans/Documents/BPI-AeroPath/src/app/(main)', 'favicon.ico'))

print("Transparency processing complete. Files saved to public/icons/ and src/app/(main)/favicon.ico")
