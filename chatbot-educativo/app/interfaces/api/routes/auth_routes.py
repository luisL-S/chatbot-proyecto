from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional

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

# --- MODELOS ---
class UserCreate(BaseModel):
    email: str
    password: str
    username: str

class RoleUpdate(BaseModel):
    email: str
    new_role: str # 'student', 'teacher', 'admin'

# --- DEPENDENCIA: OBTENER USUARIO ACTUAL ---
async def get_current_user(token: str = Depends(oauth2_scheme)):
    # Usamos TU método verify_token
    payload = jwt_handler.verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return payload

# --- 1. REGISTRO ---
@router.post("/register")
async def register(user: UserCreate):
    existing_user = await db["users"].find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    # Usamos TU método hash
    hashed_password = pwd_hasher.hash(user.password)
    
    new_user = {
        "email": user.email,
        "username": user.username,
        "hashed_password": hashed_password,
        "role": "student" # Por defecto
    }
    
    result = await db["users"].insert_one(new_user)
    return {"message": "Usuario creado exitosamente", "id": str(result.inserted_id)}

# --- 2. LOGIN ---
@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Nota: form_data.username trae el email
    user = await db["users"].find_one({"email": form_data.username})
    
    # Usamos TU método verify
    if not user or not pwd_hasher.verify(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    # Preparamos los datos para el token
    token_data = {
        "sub": user["email"], 
        "email": user["email"],
        "role": user.get("role", "student"),
        "username": user.get("username", "Usuario")
    }
    
    # Usamos TU método create_token
    access_token = jwt_handler.create_token(token_data)
    
    return {"access_token": access_token, "token_type": "bearer", "role": user.get("role", "student")}

# --- 3. ADMIN: VER TODOS LOS USUARIOS ---
@router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Requiere privilegios de Administrador")
    
    cursor = db["users"].find({}, {"_id": 1, "email": 1, "username": 1, "role": 1})
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