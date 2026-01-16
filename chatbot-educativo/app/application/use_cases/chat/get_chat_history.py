from typing import List, Dict, Any
from app.domain.repositories.conversation_repository import ConversationRepository

class GetChatHistory:
    def __init__(self, conversation_repository: ConversationRepository):
        self.conversation_repository = conversation_repository

    async def execute(self, session_id: str) -> List[Dict[str, Any]]:
        # 1. Buscamos la conversación por ID
        conversation = await self.conversation_repository.get_by_id(session_id)
        
        # 2. Si no existe, devolvemos lista vacía (o lanzamos error 404 si prefieres)
        if not conversation:
            return []

        # 3. Devolvemos solo la lista de mensajes
        # Convertimos los objetos mensaje a diccionarios si es necesario
        return conversation.messages