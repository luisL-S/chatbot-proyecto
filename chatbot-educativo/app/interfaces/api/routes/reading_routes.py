from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId

# Imports
from app.infrastructure.database.mongo_connection import get_database
from app.infrastructure.ai.gemini_client import GeminiClient, get_gemini_client
from app.interfaces.api.routes.auth_routes import get_current_user
from app.utils.file_processing import extract_text_from_pdf, extract_text_from_docx

router = APIRouter()
db = get_database()

# Modelos
class TextRequest(BaseModel):
    text: str
class TopicRequest(BaseModel):
    topic: str
class FeedbackRequest(BaseModel):
    score: int
    total: int
    topic: str

def get_user_id(user_dict: dict) -> str:
    return user_dict.get("sub") or user_dict.get("email") or user_dict.get("username") or "anonymous"

# --- 1. SUBIR ARCHIVO ---
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    ai_client: GeminiClient = Depends(get_gemini_client)
):
    try:
        filename = file.filename.lower()
        content = ""
        quiz = []
        
        # A) IMAGEN (Directo a Gemini Vision)
        if filename.endswith((".png", ".jpg", ".jpeg")):
            print(f"🖼️ Imagen: {filename}")
            img_bytes = await file.read()
            quiz = await ai_client.generate_quiz_from_image(img_bytes, file.content_type or "image/jpeg")
            content = "[Imagen analizada]"

        # B) PDF / WORD (Extracción de texto)
        elif filename.endswith((".pdf", ".docx")):
            print(f"📄 Documento: {filename}")
            
            if filename.endswith(".pdf"):
                content = extract_text_from_pdf(file.file)
            elif filename.endswith(".docx"):
                content = extract_text_from_docx(file.file)
            
            # Validación
            if not content or len(content.strip()) < 10:
                raise HTTPException(400, "El documento está vacío o no se pudo leer el texto.")
                
            quiz = await ai_client.generate_quiz(content)

        else:
            raise HTTPException(400, "Formato no soportado.")

        if not quiz:
            raise HTTPException(500, "La IA no pudo generar preguntas.")

        # Guardar (CON AWAIT)
        lesson_id = str(ObjectId())
        await db["conversations"].insert_one({
            "_id": ObjectId(lesson_id),
            "user_id": get_user_id(current_user),
            "topic": f"Archivo: {file.filename}",
            "content": content,
            "quiz": quiz,
            "timestamp": datetime.utcnow()
        })

        return {"filename": file.filename, "quiz": quiz, "lesson_id": lesson_id, "text": content}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Error Upload: {e}")
        raise HTTPException(500, detail=str(e))

# --- 2. PEGAR TEXTO ---
@router.post("/analyze-text")
async def analyze_text(request: TextRequest, current_user: dict = Depends(get_current_user), ai_client: GeminiClient = Depends(get_gemini_client)):
    try:
        if len(request.text) < 10: raise HTTPException(400, "Texto muy corto.")
        quiz = await ai_client.generate_quiz(request.text)
        
        lid = str(ObjectId())
        await db["conversations"].insert_one({
            "_id": ObjectId(lid), "user_id": get_user_id(current_user), "topic": "Texto Pegado",
            "content": request.text, "quiz": quiz, "timestamp": datetime.utcnow()
        })
        return {"quiz": quiz, "lesson_id": lid}
    except Exception as e: raise HTTPException(500, str(e))

# --- 3. CREAR LECCIÓN ---
@router.post("/create-lesson")
async def create_lesson(request: TopicRequest, current_user: dict = Depends(get_current_user), ai_client: GeminiClient = Depends(get_gemini_client)):
    try:
        text = await ai_client.generate_lesson_content(request.topic)
        quiz = await ai_client.generate_quiz(text)
        
        lid = str(ObjectId())
        await db["conversations"].insert_one({
            "_id": ObjectId(lid), "user_id": get_user_id(current_user), "topic": request.topic.title(),
            "content": text, "quiz": quiz, "timestamp": datetime.utcnow()
        })
        return {"quiz": quiz, "text": text, "lesson_id": lid}
    except Exception as e: raise HTTPException(500, str(e))

# --- 4. LISTAR HISTORIAL ---
@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    try:
        uid = get_user_id(current_user)
        # Solo traemos ID y Tópico para ahorrar datos
        cursor = db["conversations"].find({"user_id": uid}, {"content": 0, "quiz": 0}).sort("timestamp", -1).limit(20)
        items = await cursor.to_list(20)
        for i in items:
            i["id"] = str(i["_id"])
            del i["_id"]
        return items
    except Exception: return []

# --- 5. RECUPERAR LECCIÓN (CORREGIDO EL ERROR 500) ---
@router.get("/history/{item_id}")
async def get_history_item(item_id: str, current_user: dict = Depends(get_current_user)):
    try:
        uid = get_user_id(current_user)
        
        # 🔥 AQUÍ ESTABA EL ERROR: Faltaba el 'await' antes de db...find_one
        item = await db["conversations"].find_one({"_id": ObjectId(item_id), "user_id": uid})
        
        if not item:
            raise HTTPException(404, "Lección no encontrada")
        
        item["id"] = str(item["_id"])
        del item["_id"]
        return item
    except Exception as e:
        print(f"❌ Error recuperando item historial: {e}")
        raise HTTPException(500, "Error interno recuperando datos")

# --- 6. BORRAR LECCIÓN ---
@router.delete("/history/{item_id}")
async def delete_item(item_id: str, current_user: dict = Depends(get_current_user)):
    try:
        uid = get_user_id(current_user)
        res = await db["conversations"].delete_one({"_id": ObjectId(item_id), "user_id": uid})
        if res.deleted_count == 0: raise HTTPException(404, "No encontrado")
        return {"msg": "Borrado"}
    except Exception: raise HTTPException(500, "Error borrando")

# --- 7. FEEDBACK ---
@router.post("/feedback-analysis")
async def feedback(request: FeedbackRequest, ai_client: GeminiClient = Depends(get_gemini_client)):
    try:
        msg = await ai_client.generate_final_feedback(request.score, request.total, request.topic)
        return {"feedback": msg}
    except Exception: return {"feedback": "Sigue practicando."}