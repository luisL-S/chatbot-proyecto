from typing import Optional
from pydantic import BaseModel
import uuid

# --- ENTIDADES Y REPOSITORIOS ---
from app.domain.entities.conversation import Conversation, Message
from app.domain.repositories.conversation_repository import ConversationRepository
from app.infrastructure.ai.gemini_client import GeminiClient

# --- DEFINICIÓN DE CHATRESPONSE (Aquí estaba el error, faltaba esto) ---
class ChatResponse(BaseModel):
    response: str
    session_id: str

class SendMessage:
    def __init__(self, conversation_repository: ConversationRepository, ai_client: GeminiClient):
        self.conversation_repository = conversation_repository
        self.ai_client = ai_client

    async def execute(self, message: str, user_id: str, session_id: str = None) -> ChatResponse:
        
        conversation = None
        
        # 1. Si nos dan un ID, buscamos si ya existe el chat
        if session_id:
            conversation = await self.conversation_repository.get_by_id(session_id)
        
        # 2. Si no existe (o no nos dieron ID), creamos una NUEVA conversación
        if not conversation:
            # Generamos un ID nuevo si no venía uno
            new_id = session_id if session_id else str(uuid.uuid4())
            
            # Generamos un título automático con las primeras palabras
            auto_title = message[:40] + "..." if len(message) > 40 else message
            
            conversation = Conversation(
                id=new_id, 
                user_id=user_id,
                title=auto_title 
            )

        # 3. Agregamos el mensaje del usuario a la memoria de la conversación
        user_msg = Message(role="user", content=message)
        conversation.add_message(user_msg)

        # 4. Construimos el historial para enviárselo a la IA
        # (Así la IA recuerda de qué estaban hablando)
        history_context = ""
        for msg in conversation.messages:
            history_context += f"{msg.role}: {msg.content}\n"

        # 5. Llamamos a Gemini
        ai_response_text = await self.ai_client.generate_response(prompt=history_context)

        # 6. Agregamos la respuesta de la IA a la memoria
        bot_msg = Message(role="model", content=ai_response_text)
        conversation.add_message(bot_msg)

        # 7. GUARDAMOS TODO EN LA BASE DE DATOS
        await self.conversation_repository.save(conversation)

        # 8. Devolvemos la respuesta y el ID (CRÍTICO para el Frontend)
        return ChatResponse(
            response=ai_response_text,
            session_id=conversation.id 
        )