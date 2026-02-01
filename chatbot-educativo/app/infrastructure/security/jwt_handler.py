import os
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

class JWTHandler:
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY")
        if not self.secret_key:
            raise ValueError("JWT_SECRET_KEY no encontrada en .env")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 1440 # 24 horas

    def create_token(self, email: str) -> str:
        """Crea un token nuevo al hacer login"""
        payload = {
            "sub": email,
            "email": email,
            "exp": datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    # --- ESTA ES LA FUNCIÓN QUE FALTABA ---
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