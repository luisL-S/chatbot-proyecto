from app.domain.entities.user import User
from app.infrastructure.security.password_hasher import PasswordHasher
from app.infrastructure.security.jwt_handler import JWTHandler

class LoginUser:
    def __init__(self, user_repository, password_hasher: PasswordHasher, jwt_handler: JWTHandler):
        self.user_repository = user_repository
        self.password_hasher = password_hasher
        self.jwt_handler = jwt_handler

    async def execute(self, email, password):
        # 1. Buscar usuario
        user = await self.user_repository.get_by_email(email)
        if not user:
            return None # O lanzar excepción

        # 2. Verificar contraseña
        if not self.password_hasher.verify(password, user.hashed_password):
            return None # O lanzar excepción

        # 3. Generar Token
        token = self.jwt_handler.create_token(user.email)

        # 4. RETORNAR LA RESPUESTA (Aquí estaba el fallo seguramente)
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email
            }
        }