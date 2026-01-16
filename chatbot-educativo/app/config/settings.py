import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    MONGODB_URI: str = os.getenv("MONGODB_URI")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME")

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")

settings = Settings()
