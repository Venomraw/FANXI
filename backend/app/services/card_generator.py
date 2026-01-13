from PIL import Image, ImageDraw, ImageFont
import os

# Create a folder to save your generated cards
OUTPUT_DIR = "generated_cards"
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def generate_player_card(player_name: str, rank: str = "Scout"):
    """
    The 'Viral Engine': Draws a player name and user rank on an image.
    """
    # 1. Create a green 'Pitch' background (Width: 400, Height: 600)
    img = Image.new('RGB', (400, 600), color=(34, 139, 34)) # Forest Green
    canvas = ImageDraw.Draw(img)

    # 2. Draw 'Pitch Lines' (Cyber-Design)
    canvas.rectangle([20, 20, 380, 580], outline="white", width=3)
    canvas.ellipse([100, 200, 300, 400], outline="white", width=3)

    # 3. Add Text (Player Name and Rank)
    # Note: For custom fonts, you can load a .ttf file later
    try:
        # Drawing the Player Name
        canvas.text((120, 450), f"PLAYER: {player_name}", fill="white")
        # Drawing your Football Rank
        canvas.text((120, 480), f"RANK: {rank}", fill="yellow")
    except Exception as e:
        print(f"Text error: {e}")

    # 4. Save the Card to your 'Vault'
    file_path = os.path.join(OUTPUT_DIR, f"{player_name.replace(' ', '_')}_card.png")
    img.save(file_path)
    
    print(f"✅ Viral Card Generated: {file_path}")
    return file_path