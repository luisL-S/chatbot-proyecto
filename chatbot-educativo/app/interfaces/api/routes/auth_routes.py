import re
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.infrastructure.database.mongo_connection import get_database

# --- IMPORTAMOS TUS CLASES EXISTENTES ---
from app.infrastructure.security.jwt_handler import JWTHandler
from app.infrastructure.security.password_hasher import PasswordHasher

router = APIRouter()
db = get_database()

# Instanciamos tus clases de seguridad
jwt_handler = JWTHandler()
pwd_hasher = PasswordHasher()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# --- MODELOS ACTUALIZADOS ---
class UserCreate(BaseModel):
    email: str
    password: str
    username: str
    # 👇 NUEVOS CAMPOS (Con valores por defecto para evitar errores)
    grade: str = "1er Año"
    section: str = "A"

class RoleUpdate(BaseModel):
    email: str
    new_role: str # 'student', 'teacher', 'admin'

# --- DEPENDENCIA: OBTENER USUARIO ACTUAL ---
async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = jwt_handler.verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return payload

# --- 1. REGISTRO (CON VALIDACIÓN ROBUSTA DE DUPLICADOS) ---
@router.post("/register")
async def register(user: UserCreate):
    # 1. Limpieza de datos (Quitamos espacios al inicio y final)
    email_clean = user.email.strip().lower() # Convertimos email a minúsculas
    name_clean = user.username.strip()       # Quitamos espacios al nombre

    print(f"--- INTENTO DE REGISTRO ---")
    print(f"Buscando correo: {email_clean}")
    print(f"Buscando nombre: {name_clean}")

    # 2. Validar si el CORREO ya existe
    existing_email = await db["users"].find_one({"email": email_clean})
    if existing_email:
        print("❌ Error: Correo duplicado encontrado.")
        raise HTTPException(status_code=400, detail="El correo ya está registrado.")

    # 3. Validar si el NOMBRE ya existe (Insensible a mayúsculas/minúsculas)
    # Usamos regex con 're.escape' por si el nombre tiene símbolos raros
    regex_pattern = f"^{re.escape(name_clean)}$"
    
    existing_username = await db["users"].find_one({
        "username": {"$regex": regex_pattern, "$options": "i"}
    })
    
    if existing_username:
        print(f"❌ Error: Usuario duplicado encontrado: {existing_username.get('username')}")
        raise HTTPException(
            status_code=400, 
            detail=f"El nombre '{name_clean}' ya existe. Por favor usa tu segundo nombre o apellido."
        )

    # Si pasa las validaciones, creamos el usuario
    hashed_password = pwd_hasher.hash(user.password)
    
    new_user = {
        "email": email_clean,
        "username": name_clean, # Guardamos el nombre limpio
        "hashed_password": hashed_password,
        "role": "student", 
        "grade": user.grade,
        "section": user.section,
        "created_at": datetime.utcnow()
    }
    
    result = await db["users"].insert_one(new_user)
    print("✅ Usuario creado exitosamente.")
    
    return {
        "message": "Usuario creado exitosamente", 
        "id": str(result.inserted_id)
    }

# --- 2. LOGIN ---
@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Nota: form_data.username trae el email
    user = await db["users"].find_one({"email": form_data.username})
    
    if not user or not pwd_hasher.verify(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    # Preparamos los datos para el token
    token_data = {
        "sub": user["email"], 
        "email": user["email"],
        "role": user.get("role", "student"),
        "username": user.get("username", "Usuario")
    }
    
    access_token = jwt_handler.create_token(token_data)
    
    return {"access_token": access_token, "token_type": "bearer", "role": user.get("role", "student")}

# --- 3. ADMIN: VER TODOS LOS USUARIOS ---
@router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Requiere privilegios de Administrador")
    
    cursor = db["users"].find({}, {"_id": 1, "email": 1, "username": 1, "role": 1, "grade": 1, "section": 1})
    users = await cursor.to_list(100)
    
    for u in users:
        u["id"] = str(u["_id"])
        del u["_id"]
    return users

# --- 4. ADMIN: CAMBIAR ROL ---
@router.put("/admin/change-role")
async def change_role(data: RoleUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Requiere privilegios de Administrador")
    
    result = await db["users"].update_one(
        {"email": data.email},
        {"$set": {"role": data.new_role}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    return {"message": f"Rol de {data.email} actualizado a {data.new_role}"}

# ---5. ADMIN: BORRAR USUARIO ---
@router.delete("/admin/delete-user")
async def delete_user(email: str, current_user: dict = Depends(get_current_user)):
    # 1. Verificar si es Administrador
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Requiere privilegios de Administrador")
    
    # 2. Evitar que el admin se borre a sí mismo
    if email == current_user.get("email"):
        raise HTTPException(status_code=400, detail="No puedes borrar tu propia cuenta de administrador.")

    # 3. Ejecutar borrado
    result = await db["users"].delete_one({"email": email})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    return {"message": f"Usuario {email} eliminado correctamente"}