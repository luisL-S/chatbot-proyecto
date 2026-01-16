from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel # <--- ¡ESTA ERA LA LÍNEA QUE FALTABA!
from typing import Optional

# --- IMPORTS DE DEPENDENCIAS Y CASOS DE USO ---
from app.interfaces.api.dependencies import get_login_user_use_case, get_register_user_use_case
from app.application.use_cases.auth.login_user import LoginUser
from app.application.use_cases.auth.register_user import RegisterUser

router = APIRouter()

# --- MODELO PARA REGISTRO (JSON) ---
class RegisterRequest(BaseModel):
    email: str
    password: str

# --- RUTA DE REGISTRO ---
@router.post("/register")
async def register(
    request: RegisterRequest,
    use_case: RegisterUser = Depends(get_register_user_use_case)
):
    try:
        user = await use_case.execute(request.email, request.password)
        return {"id": user.id, "email": user.email}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- RUTA DE LOGIN ---
@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), # Lee username/password del form data
    use_case: LoginUser = Depends(get_login_user_use_case)
):
    # Nota: OAuth2 usa 'username', pero nosotros lo tratamos como email
    result = await use_case.execute(form_data.username, form_data.password)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Devolvemos el token que generó el caso de uso
    return result