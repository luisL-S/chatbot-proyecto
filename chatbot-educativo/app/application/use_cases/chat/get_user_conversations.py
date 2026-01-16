from typing import List
from app.domain.entities.conversation import Conversation
from app.domain.repositories.conversation_repository import ConversationRepository

class GetUserConversations:
    def __init__(self, conversation_repository: ConversationRepository):
        self.conversation_repository = conversation_repository

    async def execute(self, user_id: str) -> List[dict]:
        # 1. Obtener conversaciones de la BD
        conversations = await self.conversation_repository.get_all_by_user(user_id)
        
        # 2. Convertir a formato simple para el frontend
        return [
            {
                "id": str(c.id),
                # Si no tiene título, usamos "Conversación + fecha" o lo que tengas
                "title": getattr(c, "title", "Nueva Conversación"),
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in conversations
        ]