from PIL import Image

def resize_logo():
    input_path = "logo.png"
    try:
        with Image.open(input_path) as img:
            print(f"Original size: {img.size}, Format: {img.format}")
            
            # Target width of 600px for high-density displays (navbar usually 200-300px wide)
            target_width = 600
            if img.width > target_width:
                wpercent = (target_width / float(img.width))
                hsize = int((float(img.height) * float(wpercent)))
                img = img.resize((target_width, hsize), Image.Resampling.LANCZOS)
            
            # Save optimized
            img.save(input_path, format="PNG", optimize=True)
            print(f"Successfully resized to {img.size} and optimized.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    resize_logo()
