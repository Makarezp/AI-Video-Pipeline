import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

try:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    print("Listing models...")
    # The SDK method might vary, trying a common pattern or fallback
    for m in client.models.list(config={"page_size": 100}):
        if "flash" in m.name.lower():
            print(f"ID: {m.name}")
except Exception as e:
    print(f"Error: {e}")
