from typing import Optional, List
from app.domain.entities.conversation import Conversation
from app.domain.repositories.conversation_repository import ConversationRepository

class MongoConversationRepository(ConversationRepository):
    def __init__(self, db):
        self.collection = db["conversations"]

    # --- 1. FUNCIÓN SAVE (LA QUE FALTABA) ---
    async def save(self, conversation: Conversation) -> None:
        # Convertimos el objeto Conversation a un diccionario de Python
        conversation_dict = conversation.model_dump()
        
        # MongoDB necesita que el ID se llame '_id', así que lo renombramos
        conversation_dict["_id"] = conversation_dict["id"]
        
        # Eliminamos el campo 'id' duplicado para no confundir a Mongo
        if "id" in conversation_dict:
            del conversation_dict["id"]

        # Guardamos en la BD.
        # replace_one con upsert=True significa: 
        # "Si ya existe este ID, actualízalo. Si no existe, créalo."
        await self.collection.replace_one(
            {"_id": conversation_dict["_id"]}, 
            conversation_dict, 
            upsert=True
        )

    # --- 2. FUNCIÓN GET ONE (Ya arreglada) ---
    async def get_by_id(self, id: str) -> Optional[Conversation]:
        # Buscamos usando _id (que es donde guardamos tu UUID)
        doc = await self.collection.find_one({"_id": id})
        
        if doc:
            # Transformamos de vuelta para que Pydantic lo entienda
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            return Conversation(**doc)
        
        return None

    # --- 3. FUNCIÓN GET ALL (Ya arreglada) ---
    async def get_all_by_user(self, user_id: str) -> List[Conversation]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1)
        conversations = []
        async for doc in cursor:
            # Limpieza de datos
            doc["id"] = str(doc["_id"])
            if "_id" in doc:
                del doc["_id"]
            
            conversations.append(Conversation(**doc))
        return conversations
    
    async def delete(self, conversation_id: str, user_id: str) -> bool:
        print(f"Intentando borrar Chat ID: {conversation_id} del Usuario: {user_id}")
        
        # Intentamos borrar buscando por 'id' (nuestro campo manual) O por '_id' (campo de Mongo)
        result = await self.collection.delete_one({
            "$or": [
                {"id": conversation_id},
                {"_id": conversation_id}
            ],
            "user_id": user_id
        })
        
        print(f"✅ Resultado borrado: {result.deleted_count} documentos eliminados.")
        return result.deleted_count > 0