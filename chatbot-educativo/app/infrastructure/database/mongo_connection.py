import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

class Database:
    client: AsyncIOMotorClient = None

db = Database()

def get_database():
    """
    Retorna la instancia de la base de datos.
    Si no está conectada, intenta conectar usando las variables de entorno.
    """
    if db.client is None:
        mongo_uri = os.getenv("MONGODB_URI")
        if not mongo_uri:
            # Si no hay URI en el .env, usamos local por defecto
            mongo_uri = "mongodb://localhost:27017"
            print("⚠️ Advertencia: MONGODB_URI no encontrado en .env, usando localhost.")
        
        try:
            db.client = AsyncIOMotorClient(mongo_uri)
            print("✅ Conexión a MongoDB establecida exitosamente.")
        except Exception as e:
            print(f"❌ Error conectando a MongoDB: {e}")
            raise e

    # Nombre de la base de datos (por defecto ChatbotDB si no está en .env)
    db_name = os.getenv("MONGODB_DB_NAME", "ChatbotDB")
    return db.client[db_name]
