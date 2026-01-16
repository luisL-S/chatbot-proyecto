from passlib.context import CryptContext

# Configuración de la librería de encriptación (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class PasswordHasher:
    
    # Función para encriptar (usada en Registro)
    def hash(self, password: str) -> str:
        return pwd_context.hash(password)

    # Función para verificar (usada en Login) <--- ESTA ES LA QUE FALTABA
    def verify(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)