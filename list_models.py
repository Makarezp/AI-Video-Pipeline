import os
from google import genai
from dotenv import load_dotenv

load_dotenv()


def list_models():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not found")
        return

    client = genai.Client(api_key=api_key)
    print("Available Gemini Models:")
    print("=" * 50)
    for model in client.models.list():
        print(f"Name: {model.name}")
        print(f"Supported Actions: {model.supported_actions}")
        print("-" * 30)


if __name__ == "__main__":
    list_models()
