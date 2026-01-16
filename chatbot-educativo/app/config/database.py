import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

class Database:
    client: AsyncIOMotorClient = None

    def connect(self):
        # MONGODB_URI definido en tu .env [cite: 1]
        self.client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
        print("Conectado a MongoDB")

    def close(self):
        if self.client:
            self.client.close()
            print("Desconectado de MongoDB")

    def get_db(self):
        # MONGODB_DB_NAME definido en tu .env [cite: 1]
        return self.client[os.getenv("MONGODB_DB_NAME", "ChatbotDB")]

db = Database()