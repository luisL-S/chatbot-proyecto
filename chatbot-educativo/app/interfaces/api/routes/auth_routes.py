from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel # <--- ¡ESTA ERA LA LÍNEA QUE FALTABA!
from typing import Optional

# --- IMPORTS DE DEPENDENCIAS Y CASOS DE USO ---
from app.interfaces.api.dependencies import get_login_user_use_case, get_register_user_use_case
from app.application.use_cases.auth.login_user import LoginUser
from app.application.use_cases.auth.register_user import RegisterUser
from app.infrastructure.security.jwt_handler import JWTHandler
from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter()

# --- MODELO PARA REGISTRO (JSON) ---
class RegisterRequest(BaseModel):
    email: str
    password: str
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Versión con diagnósticos para saber por qué falla el login.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # DIAGNÓSTICO: Imprimir el token que llega
        print(f"🔐 Verificando Token: {token[:15]}...") 
        
        jwt_handler = JWTHandler() 
        payload = jwt_handler.verify_token(token)
        
        if payload is None:
            print("❌ El Handler retornó None (Token inválido o expirado).")
            raise credentials_exception
            
        print(f"✅ Usuario autorizado: {payload.get('sub') or payload.get('email')}")
        return payload
        
    except Exception as e:
        print(f"❌ Error CRÍTICO verificando token: {str(e)}")
        raise credentials_exception
    try:
        # Usamos tu JWTHandler para verificar el token
        jwt_handler = JWTHandler() 
        payload = jwt_handler.verify_token(token)
        
        if payload is None:
            raise credentials_exception
            
        return payload  # Retorna el diccionario con 'username'/'email'
        
    except Exception:
        raise credentials_exception

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