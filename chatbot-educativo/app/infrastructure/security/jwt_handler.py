import os
from datetime import datetime, timedelta
from jose import jwt, JWTError

class JWTHandler:
    def __init__(self):
        # Configuración: Clave secreta y Algoritmo
        # Si no hay variable de entorno, usa la clave por defecto
        self.SECRET_KEY = os.getenv("SECRET_KEY", "tu_clave_secreta_super_segura")
        self.ALGORITHM = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 horas de validez

    # --- 1. FUNCIÓN PARA CREAR TOKEN (La que faltaba) ---
    def create_token(self, email: str) -> str:
        # El token necesita una fecha de expiración
        expire = datetime.utcnow() + timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        # El 'sub' (subject) es el estándar para guardar el ID o Email del usuario
        to_encode = {
            "sub": email,
            "exp": expire
        }
        
        # Creamos el string encriptado
        encoded_jwt = jwt.encode(to_encode, self.SECRET_KEY, algorithm=self.ALGORITHM)
        return encoded_jwt

    # --- 2. FUNCIÓN PARA LEER/DECODIFICAR TOKEN ---
    def decode_token(self, token: str):
        try:
            payload = jwt.decode(token, self.SECRET_KEY, algorithms=[self.ALGORITHM])
            return payload
        except JWTError:
            return None