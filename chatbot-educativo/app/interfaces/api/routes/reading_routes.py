import os
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

# Importamos la base de datos segura
from app.infrastructure.database.mongo_connection import get_database
from app.infrastructure.ai.gemini_client import GeminiClient, get_gemini_client
from app.interfaces.api.routes.auth_routes import get_current_user
from app.utils.file_processing import extract_text_from_pdf, extract_text_from_docx

router = APIRouter()
db = get_database()

# --- MODELOS DE DATOS ---
class TextRequest(BaseModel):
    text: str
    num_questions: int = 5
    difficulty: str = "Medio"
    assign_to: Optional[str] = None

class TopicRequest(BaseModel):
    topic: str
    num_questions: int = 5
    difficulty: str = "Medio"
    assign_to: Optional[str] = None

class FeedbackRequest(BaseModel):
    score: int
    total: int
    topic: str
    lesson_id: Optional[str] = None

class TutorRequest(BaseModel):
    question: str
    context: str # El contenido de la lección actual
    
class PromotionRequest(BaseModel):
    code: str

def get_user_id(user_dict: dict) -> str:
    return user_dict.get("sub") or user_dict.get("email") or user_dict.get("username") or "anonymous"

# --- SEGURIDAD: VERIFICADOR DE ROL (CORREGIDO) ---
async def is_teacher(user_dict: dict) -> bool:
    try:
        email = user_dict.get("sub") or user_dict.get("email")
        # Buscamos al usuario en la BD
        user = await db["users"].find_one({"email": email})
        
        # AQUI ESTABA EL BLOQUEO:
        # Antes solo verificaba "teacher". Ahora verificamos ambos.
        if user and user.get("role") in ["teacher", "admin"]: 
            return True
            
        return False
    except:
        return False

# --- HELPER: ASIGNACIÓN INTELIGENTE (MEJORADO) ---
async def distribute_lesson_to_users(content: str, quiz: list, topic: str, creator_id: str, assign_string: Optional[str] = None, is_creator_teacher: bool = False):
    
    report = {"assigned": [], "not_found": []}
    recipients_set = {creator_id} # El creador siempre tiene una copia

    # Solo si es profesor validamos los correos de destino
    if is_creator_teacher and assign_string and assign_string.strip():
        raw_emails = [email.strip() for email in assign_string.split(',') if email.strip()]
        
        for email in raw_emails:
            # VERIFICAR SI EL ALUMNO EXISTE EN LA BASE DE DATOS
            student = await db["users"].find_one({"email": email})
            if student:
                recipients_set.add(email)
                report["assigned"].append(email)
            else:
                report["not_found"].append(email)
    
    # Crear los registros en la base de datos
    lesson_id_ref = str(ObjectId())

    for recipient in recipients_set:
        new_id = str(ObjectId())
        # Si el destinatario NO es el creador, entonces fue asignado por el creador
        assigned_by = creator_id if recipient != creator_id else None
        
        await db["conversations"].insert_one({
            "_id": ObjectId(new_id),
            "user_id": recipient,
            "assigned_by": assigned_by,
            "topic": topic,
            "content": content,
            "quiz": quiz,
            "score": None,
            "status": "pending",
            "timestamp": datetime.utcnow()
        })
        if recipient == creator_id: lesson_id_ref = new_id
    
    return lesson_id_ref, report

# --- RUTA PARA OBTENER ROL ---
@router.get("/user/role")
async def get_my_role(current_user: dict = Depends(get_current_user)):
    # Buscamos el rol real en la base de datos
    email = current_user.get("sub") or current_user.get("email")
    user = await db["users"].find_one({"email": email})
    
    if user:
        # Devuelve EXACTAMENTE lo que está en la BD ("admin", "teacher", "student")
        return {"role": user.get("role", "student")}
    
    return {"role": "student"}  

# --- SEGURIDAD: PROMOCIÓN DOCENTE ---
@router.post("/admin/verify-teacher-code")
async def verify_teacher_code(request: PromotionRequest, current_user: dict = Depends(get_current_user)):
    INSTITUTION_SECRET_CODE = os.getenv("TEACHER_SECRET_CODE", "EDUBOT-2026-TESIS-SECURE")
    
    if request.code != INSTITUTION_SECRET_CODE:
        raise HTTPException(status_code=401, detail="Código institucional inválido.")
    
    email = current_user.get("sub") or current_user.get("email")
    result = await db["users"].update_one({"email": email}, {"$set": {"role": "teacher"}})
    
    if result.modified_count == 0:
        return {"message": "Ya tienes este rol o hubo un error."}
    return {"message": "✅ Credenciales validadas. Bienvenido al Claustro Docente."}

# --- DASHBOARD DOCENTE ---
@router.get("/teacher/dashboard")
async def teacher_dashboard(current_user: dict = Depends(get_current_user)):
    if not await is_teacher(current_user):
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo para docentes.")
    
    uid = get_user_id(current_user)
    try:
        cursor = db["conversations"].find({"assigned_by": uid}).sort("timestamp", -1)
        results = await cursor.to_list(100)
        dashboard_data = []
        for item in results:
            dashboard_data.append({
                "id": str(item["_id"]),
                "student": item["user_id"],
                "topic": item["topic"],
                "score": item.get("score", "-"),
                "total": len(item.get("quiz", [])),
                "status": item.get("status", "pending"),
                "date": item["timestamp"]
            })
        return dashboard_data
    except Exception as e:
        print(f"Error dashboard: {e}")
        return []

# --- 1. UPLOAD ---
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    num_questions: int = Form(5),
    difficulty: str = Form("Medio"),
    assign_to: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    ai_client: GeminiClient = Depends(get_gemini_client)
):
    try:
        filename = file.filename.lower()
        content = ""
        quiz = []
        
        if filename.endswith((".png", ".jpg", ".jpeg")):
            img_bytes = await file.read()
            quiz = await ai_client.generate_quiz_from_image(img_bytes, file.content_type, num_questions, difficulty)
            content = "[Imagen analizada]"
        elif filename.endswith((".pdf", ".docx")):
            if filename.endswith(".pdf"): content = extract_text_from_pdf(file.file)
            elif filename.endswith(".docx"): content = extract_text_from_docx(file.file)
            if not content or len(content.strip()) < 10: raise HTTPException(400, "Documento vacío.")
            quiz = await ai_client.generate_quiz(content, num_questions, difficulty)
        else: raise HTTPException(400, "Formato no soportado.")

        if not quiz: raise HTTPException(500, "Error IA.")

        is_docente = await is_teacher(current_user)
        lid, report = await distribute_lesson_to_users(content, quiz, f"Archivo: {file.filename}", get_user_id(current_user), assign_to, is_docente)
        
        # MENSAJE DE REPORTE
        msg = "Archivo procesado."
        if report["assigned"]: msg = f"¡Asignado a {len(report['assigned'])} alumnos!"
        if report["not_found"]: msg += f" (OJO: No se encontró a: {', '.join(report['not_found'])})"

        return {"filename": file.filename, "quiz": quiz, "lesson_id": lid, "text": content, "message": msg}
    except Exception as e: raise HTTPException(500, str(e))

# --- 2. TEXTO ---
@router.post("/analyze-text")
async def analyze_text(req: TextRequest, user: dict = Depends(get_current_user), ai: GeminiClient = Depends(get_gemini_client)):
    try:
        if len(req.text) < 10: raise HTTPException(400, "Texto muy corto.")
        quiz = await ai.generate_quiz(req.text, req.num_questions, req.difficulty)
        
        is_docente = await is_teacher(user)
        lid, report = await distribute_lesson_to_users(req.text, quiz, "Texto Pegado", get_user_id(user), req.assign_to, is_docente)
        
        msg = "Texto analizado."
        if report["assigned"]: msg = f"¡Asignado a {len(report['assigned'])} alumnos!"
        if report["not_found"]: msg += f" (OJO: No se encontró a: {', '.join(report['not_found'])})"

        return {"quiz": quiz, "lesson_id": lid, "message": msg}
    except Exception as e: raise HTTPException(500, str(e))

# --- 3. CREAR LECCIÓN ---
@router.post("/create-lesson")
async def create_lesson(req: TopicRequest, user: dict = Depends(get_current_user), ai: GeminiClient = Depends(get_gemini_client)):
    try:
        text = await ai.generate_lesson_content(req.topic, req.difficulty)
        quiz = await ai.generate_quiz(text, req.num_questions, req.difficulty)
        
        is_docente = await is_teacher(user)
        lid, report = await distribute_lesson_to_users(text, quiz, req.topic.title(), get_user_id(user), req.assign_to, is_docente)
        
        msg = "Lección creada."
        if report["assigned"]: msg = f"¡Asignado a {len(report['assigned'])} alumnos!"
        if report["not_found"]: msg += f" (OJO: No se encontró a: {', '.join(report['not_found'])})"

        return {"quiz": quiz, "text": text, "lesson_id": lid, "message": msg}
    except Exception as e: raise HTTPException(500, str(e))

# --- NUEVO: ENDPOINT TUTOR IA ---
@router.post("/ask-tutor")
async def ask_tutor(req: TutorRequest, user: dict = Depends(get_current_user), ai: GeminiClient = Depends(get_gemini_client)):
    try:
        # Prompt de ingeniería para que actúe como profesor
        prompt = f"""
        Actúa como un profesor experto y amable. 
        El alumno tiene una duda sobre la siguiente lección:
        
        --- CONTENIDO DE LA LECCIÓN ---
        {req.context[:4000]} 
        -------------------------------
        
        PREGUNTA DEL ALUMNO: {req.question}
        
        Instrucciones:
        1. Responde brevemente (máximo 3 frases).
        2. Usa un tono motivador.
        3. Basa tu respuesta SOLO en el contenido de la lección proporcionada.
        """
        
        response = await ai.generate_content(prompt)
        return {"answer": response}
    except Exception as e:
        raise HTTPException(500, "El profesor está ocupado (Error IA).")

# --- 4. HISTORIAL ---
@router.get("/history")
async def get_history(user: dict = Depends(get_current_user)):
    try:
        uid = get_user_id(user)
        cursor = db["conversations"].find({"user_id": uid}, {"content": 0, "quiz": 0}).sort("timestamp", -1).limit(20)
        items = await cursor.to_list(20)
        for i in items:
            i["id"] = str(i["_id"])
            if i.get("assigned_by"): i["is_assignment"] = True
            if i.get("score") is not None: i["score"] = i["score"] 
            del i["_id"]
        return items
    except: return []

# --- 5. RECUPERAR ---
@router.get("/history/{item_id}")
async def get_history_item(item_id: str, user: dict = Depends(get_current_user)):
    try:
        uid = get_user_id(user)
        item = await db["conversations"].find_one({"_id": ObjectId(item_id), "user_id": uid})
        if not item: raise HTTPException(404, "No encontrado")
        item["id"] = str(item["_id"]); del item["_id"]
        return item
    except Exception as e: raise HTTPException(500, str(e))

# --- 6. BORRAR ---
@router.delete("/history/{item_id}")
async def delete_item(item_id: str, user: dict = Depends(get_current_user)):
    try:
        await db["conversations"].delete_one({"_id": ObjectId(item_id), "user_id": get_user_id(user)})
        return {"msg": "Borrado"}
    except: raise HTTPException(500, "Error")

# --- 7. FEEDBACK ---
@router.post("/feedback-analysis")
async def feedback(req: FeedbackRequest, user: dict = Depends(get_current_user), ai_client: GeminiClient = Depends(get_gemini_client)):
    try:
        msg = await ai_client.generate_final_feedback(req.score, req.total, req.topic)
        if req.lesson_id:
            uid = get_user_id(user)
            await db["conversations"].update_one(
                {"_id": ObjectId(req.lesson_id), "user_id": uid},
                {"$set": {"score": req.score, "status": "completed", "feedback": msg}}
            )
        return {"feedback": msg}
    except: return {"feedback": "Sigue practicando."}

# --- BUSCADOR ---
@router.get("/users/search")
async def search_users(q: str, current_user: dict = Depends(get_current_user)):
    if not q or len(q) < 2: return []
    try:
        if not await is_teacher(current_user): return []
        users = await db["users"].find({
            "$or": [{"email": {"$regex": q, "$options": "i"}}, {"username": {"$regex": q, "$options": "i"}}]
        }).limit(5).to_list(5)
        return [{"email": u["email"], "name": u.get("username", "Usuario")} for u in users if "email" in u]
    except: return []