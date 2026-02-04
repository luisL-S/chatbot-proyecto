import os
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

class JWTHandler:
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY")
        # Si no encuentra la clave en el .env, usa esta por defecto para evitar errores
        if not self.secret_key:
            self.secret_key = "CLAVE_ULTRA_SECRETA_EDUBOT_2026"
            
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 1440 # 24 horas

    def create_token(self, data) -> str:
        """
        Crea un token nuevo.
        Es inteligente: Detecta si le envías solo un email (str) o datos completos (dict).
        """
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        # LÓGICA DE COMPATIBILIDAD
        if isinstance(data, dict):
            # Si es el nuevo sistema (Login con roles), usamos los datos tal cual
            to_encode = data.copy()
        else:
            # Si es el sistema viejo (solo email), lo convertimos al formato nuevo
            to_encode = {"sub": str(data), "email": str(data)}
            
        to_encode.update({"exp": expire})
        
        # Generamos el token
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str):
        """Verifica si el token que envía el frontend es real"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            print("❌ El Token ha expirado.")
            return None
        except jwt.InvalidTokenError as e:
            print(f"❌ Token inválido: {e}")
            return None
        except Exception as e:
            print(f"❌ Error decodificando token: {e}")
            return None