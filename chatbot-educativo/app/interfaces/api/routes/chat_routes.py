from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

# --- DEPENDENCIAS ---
from app.interfaces.api.dependencies import get_gemini_client, get_conversation_repository
from app.interfaces.api.dependencies import get_current_user
from app.application.use_cases.chat.send_message import SendMessage

router = APIRouter()

# --- MODELO PARA RECIBIR MENSAJES ---
class MessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    model: str = "gemini-1.5-flash"

# --- 1. RUTA: ENVIAR MENSAJE (POST) ---
@router.post("/send")
async def send_message(
    request: MessageRequest,
    current_user = Depends(get_current_user), # Verifica quién eres
    repo = Depends(get_conversation_repository),
    client = Depends(get_gemini_client)
):
    use_case = SendMessage(repo, client)
    # Ejecutamos el caso de uso que arreglamos antes
    response = await use_case.execute(request.message, current_user.id, request.session_id)
    return response

# --- 2. RUTA: OBTENER HISTORIAL COMPLETO (GET) ---
@router.get("/history")
async def get_all_sessions(
    current_user = Depends(get_current_user),
    repo = Depends(get_conversation_repository)
):
    # Usamos la función del repositorio que devuelve la lista
    sessions = await repo.get_all_by_user(current_user.id)
    return sessions

# --- 3. RUTA: OBTENER DETALLE DE UN CHAT (GET) ---
@router.get("/history/{session_id}")
async def get_session_detail(
    session_id: str,
    current_user = Depends(get_current_user),
    repo = Depends(get_conversation_repository)
):
    # Buscamos la conversación por ID
    conversation = await repo.get_by_id(session_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    
    # Seguridad: Verificamos que el chat sea tuyo
    if conversation.user_id != current_user.id:
         raise HTTPException(status_code=403, detail="No tienes permiso para ver este chat")
         
    # Devolvemos solo los mensajes para pintar el chat
    return conversation.messages

# --- 4. RUTA: BORRAR UN CHAT (DELETE) ---
@router.delete("/history/{session_id}")
async def delete_conversation(
    session_id: str,
    current_user = Depends(get_current_user),
    repo = Depends(get_conversation_repository)
):
    success = await repo.delete(session_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Chat no encontrado o no tienes permiso")
        
    return {"message": "Conversación eliminada correctamente"}