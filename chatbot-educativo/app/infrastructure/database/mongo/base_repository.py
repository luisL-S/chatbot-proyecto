from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection

class BaseMongoRepository:
    """
    Clase base para reutilizar la lógica de conexión a la colección.
    No importa la configuración global, recibe la DB por inyección.
    """
    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str):
        self.collection: AsyncIOMotorCollection = db[collection_name]