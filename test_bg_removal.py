import os
from PIL import Image
import numpy as np

def remove_black_background(img_path, out_path):
    print(f"Processing {img_path}...")
    img = Image.open(img_path).convert("RGBA")
    
    # Convert image to numpy array
    data = np.array(img)
    
    # Extract RGB channels
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    
    # Calculate luminance or max color value to determine alpha
    # max_c is the maximum of R, G, B channels
    max_c = np.maximum(np.maximum(r, g), b)
    
    # We want to identify the core object vs the background.
    # If the user specifically said "damit nurnoch die Items mit dem blauen Schleier zu sehen sind",
    # maybe the blue aura has some brightness.
    # Let's try to set the alpha channel to be based on how bright the pixel is for the dark regions.
    
    # Create a mask of "pure" black or very dark pixels
    # E.g., if max_c is very low, it's background.
    
    # Actually, a common technique to extract glow from black background:
    # Alpha = max(R,G,B). If Alpha is 0, it's completely transparent.
    # Then we un-premultiply the RGB values: R = R / Alpha.
    # But this assumes the glow is purely additive. For the core object, we want it to be opaque.
    
    # So we can create a threshold. If brightness > 100, alpha = 255 (opaque).
    # If brightness <= 100, alpha = brightness * (255 / 100), smoothly fading out.
    
    # Let's refine: 
    # Find background using a simple flood fill from the edges, or just assume black is background.
    # Let's try rembg first, but the user said rembg failed.
    # If rembg left black, maybe we can just turn pure black (0,0,0) and near-black into transparent.
    
    # Calculate distance from black
    dist = np.sqrt(r**2 + g**2 + b**2)
    
    # Mask for near black
    mask = dist < 20 # adjust this threshold
    
    # We also want to smooth the edges. 
    # Let's write a python script to test a few methods and save them.
    pass

if __name__ == '__main__':
    # Test on GameIcon
    img_path = r"f:\Max_Projekte\archiv-des-vergessens\public\icons\GameIcon.png"
    # We will just write a script that does rembg with different models or alpha matting.
    pass
