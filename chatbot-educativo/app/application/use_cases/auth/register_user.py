import uuid
from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.security.password_hasher import PasswordHasher

class RegisterUser:
    def __init__(self, user_repository: UserRepository, password_hasher: PasswordHasher):
        self.user_repository = user_repository
        self.password_hasher = password_hasher

    async def execute(self, email: str, password: str) -> User:
        # 1. Verificar si el usuario ya existe
        existing_user = await self.user_repository.get_by_email(email)
        if existing_user:
            raise ValueError("El correo electrónico ya está registrado")

        # 2. Hashear la contraseña
        hashed_pw = self.password_hasher.hash(password)

        # 3. Crear la entidad usuario
        # OJO AQUÍ: Asignamos a 'hashed_password', no a 'password'
        new_user = User(
            id=str(uuid.uuid4()),
            email=email,
            hashed_password=hashed_pw 
        )

        # 4. Guardar en base de datos
        await self.user_repository.save(new_user)

        return new_user