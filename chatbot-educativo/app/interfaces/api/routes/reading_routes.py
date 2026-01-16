from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from pydantic import BaseModel
import shutil
import os
import json
import uuid

# --- IMPORTS IMPORTANTES (AQUÍ FALTABA GEMINICLIENT) ---
from app.infrastructure.services.document_processor import DocumentProcessor
from app.infrastructure.ai.gemini_client import GeminiClient # <--- ¡ESTA LÍNEA FALTABA!
from app.interfaces.api.dependencies import (
    get_gemini_client, 
    get_quiz_repository, 
    get_conversation_repository,
    get_current_user
)
from app.domain.entities.conversation import Conversation, Message

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- MODELOS ---
class TextRequest(BaseModel):
    text: str
    session_id: str | None = None

class TopicRequest(BaseModel):
    topic: str
    session_id: str | None = None

# --- HELPER: LIMPIADOR DE JSON ---
def extract_json(text_response: str):
    try:
        clean_text = text_response.replace("```json", "").replace("```", "").strip()
        start_index = clean_text.find("{")
        end_index = clean_text.rfind("}")
        if start_index != -1 and end_index != -1:
            clean_text = clean_text[start_index : end_index + 1]
        return json.loads(clean_text)
    except Exception:
        return {"title": "Error", "questions": []}

# --- RUTA 1: SUBIR ARCHIVO (CORREGIDA) ---
@router.post("/upload-quiz")
async def generate_quiz_from_file(
    file: UploadFile = File(...),
    session_id: str = Form(None),
    # Aquí es donde fallaba antes si no importabas GeminiClient
    ai_client: GeminiClient = Depends(get_gemini_client), 
    current_user = Depends(get_current_user),
    chat_repo = Depends(get_conversation_repository)
):
    try:
        print(f"🚀 Iniciando carga: {file.filename}")

        # 1. Extraer texto DIRECTAMENTE con el procesador nuevo
        # (Asegúrate de haber actualizado document_processor.py también)
        text_content = await DocumentProcessor.extract_text(file)
        
        # 2. Generar Quiz con el cliente corregido
        quiz_json = await ai_client.generate_quiz(text_content)
        
        if not quiz_json:
            raise HTTPException(status_code=500, detail="La IA no pudo generar preguntas válidas.")

        # 3. Guardar historial
        final_session_id = session_id or str(uuid.uuid4())
        conversation = await _get_or_create_conversation(chat_repo, final_session_id, current_user.id, f"Archivo: {file.filename}")
        
        conversation.add_message(Message(role="user", content=f"Analiza este archivo: {file.filename}"))
        conversation.add_message(Message(role="model", content=json.dumps(quiz_json)))
        
        await chat_repo.save(conversation)

        return {"quiz": quiz_json, "session_id": conversation.id}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"ERROR CRÍTICO EN UPLOAD: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")

# --- RUTA 2: QUIZ DESDE TEXTO ---
@router.post("/text-quiz")
async def generate_quiz_from_text(
    request: TextRequest,
    current_user = Depends(get_current_user),
    chat_repo = Depends(get_conversation_repository),
    ai_client: GeminiClient = Depends(get_gemini_client)
):
    try:
        print(f"Procesando texto pegado ({len(request.text)} caracteres)...")

        # 1. Validación de seguridad
        if len(request.text) < 50:
             raise HTTPException(status_code=400, detail="El texto es muy corto. Escribe al menos un párrafo.")

        # 2. USAMOS LA FUNCIÓN BLINDADA (La misma que usas en Upload)
        # Antes aquí tenías un prompt manual, eso era lo que fallaba.
        quiz_json = await ai_client.generate_quiz(request.text)

        if not quiz_json:
             raise HTTPException(status_code=500, detail="La IA no pudo generar el examen. Intenta con otro texto.")

        # 3. Guardar en historial
        final_session_id = request.session_id or str(uuid.uuid4())
        conversation = await _get_or_create_conversation(
            chat_repo, final_session_id, current_user.id, "Examen: Texto Pegado"
        )
        
        # Guardamos el mensaje del usuario (recortado para no llenar la BD)
        conversation.add_message(Message(role="user", content=f"Texto: {request.text[:100]}..."))
        conversation.add_message(Message(role="model", content=json.dumps(quiz_json)))
        
        await chat_repo.save(conversation)
        
        return {"quiz": quiz_json, "session_id": conversation.id}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"🔥 ERROR CRÍTICO EN TEXT-QUIZ: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando texto: {str(e)}")

# --- RUTA 3: GENERAR LECTURA + QUIZ ---
@router.post("/generate-reading")
async def create_reading_and_quiz(
    request: TopicRequest,
    current_user = Depends(get_current_user),
    chat_repo = Depends(get_conversation_repository),
    ai_client: GeminiClient = Depends(get_gemini_client)
):
    try:
        print(f"Generando lectura sobre: {request.topic}")

        # 1. Generar la lectura (Chat normal)
        prompt_reading = f"Escribe un texto educativo, claro y detallado (aprox 300 palabras) sobre el tema: '{request.topic}'."
        reading_text = await ai_client.generate_response(prompt_reading)

        # 2. Generar el Quiz (Función especializada)
        quiz_json = await ai_client.generate_quiz(reading_text)

        # 3. Guardar
        final_session_id = request.session_id or str(uuid.uuid4())
        conversation = await _get_or_create_conversation(chat_repo, final_session_id, current_user.id, f"Tema: {request.topic}")
        
        conversation.add_message(Message(role="user", content=f"Quiero aprender sobre: {request.topic}"))
        conversation.add_message(Message(role="model", content=f"📚 **Lectura Generada:**\n\n{reading_text}"))
        conversation.add_message(Message(role="model", content=json.dumps(quiz_json)))
        
        await chat_repo.save(conversation)

        return {
            "reading": reading_text,
            "quiz": quiz_json,
            "session_id": conversation.id
        }

    except Exception as e:
        print(f"ERROR GENERATE-READING: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error en el servidor: {str(e)}")

# --- HELPERS ---
async def _get_or_create_conversation(repo, session_id, user_id, title):
    conversation = None
    if session_id:
        conversation = await repo.get_by_id(session_id)
    
    if not conversation:
        conversation = Conversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title
        )
    return conversation