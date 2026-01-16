from app.domain.repositories.conversation_repository import ConversationRepository

class GetHistory:
    def __init__(self, repository: ConversationRepository):
        self.repository = repository

    async def execute(self, user_id: str) -> list:
        # 1. Recuperamos la conversación completa del repositorio
        conversation = await self.repository.get_by_user(user_id)
        
        # 2. Si no hay mensajes, devolvemos lista vacía
        if not conversation or not conversation.messages:
            return []

        # 3. CONVERSIÓN CRÍTICA:
        # Extraemos solo la lista de mensajes y la convertimos a diccionarios
        # para que FastAPI pueda enviarla como JSON sin errores.
        return [message.model_dump() for message in conversation.messages]