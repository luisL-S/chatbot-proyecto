from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials 
from app.config.database import db

# --- IMPORTS DE INFRAESTRUCTURA ---
from app.infrastructure.database.mongo.user_repository_impl import MongoUserRepository
from app.infrastructure.database.mongo.conversation_repository_impl import MongoConversationRepository
from app.infrastructure.database.mongo.quiz_repository_impl import MongoQuizRepository
from app.infrastructure.security.jwt_handler import JWTHandler
from app.infrastructure.ai.gemini_client import GeminiClient

# --- IMPORTS DE CASOS DE USO ---
from app.application.use_cases.auth.register_user import RegisterUser
from app.application.use_cases.auth.login_user import LoginUser
from app.application.use_cases.chat.send_message import SendMessage
from app.application.use_cases.chat.get_history import GetHistory
from app.application.use_cases.reading.generate_questions import GenerateQuestions

# --- IMPORTS DE DOMINIO ---
from app.domain.entities.user import User

security = HTTPBearer() 

# ==========================================
# 1. HERRAMIENTAS BASE
# ==========================================
def get_db():
    return db.get_db()

def get_jwt_handler():
    return JWTHandler()

def get_gemini_client() -> GeminiClient:
    return GeminiClient()

# ==========================================
# 2. REPOSITORIOS
# ==========================================
def get_user_repository(db=Depends(get_db)):
    return MongoUserRepository(db)

def get_conversation_repository(db=Depends(get_db)):
    return MongoConversationRepository(db)

def get_quiz_repository(db=Depends(get_db)):
    return MongoQuizRepository(db)

# ==========================================
# 3. MIDDLEWARE DE SEGURIDAD (CRÍTICO)
# ==========================================
async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security), 
    jwt_handler: JWTHandler = Depends(get_jwt_handler),
    user_repo: MongoUserRepository = Depends(get_user_repository)
) -> User:
    try:
        token = creds.credentials 
        payload = jwt_handler.decode_token(token)
        email: str = payload.get("sub")
        
        if email is None:
            raise ValueError("Token inválido: falta 'sub'")
            
    except Exception as e:
        print(f"ERROR AUTH: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas o expiradas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await user_repo.get_by_email(email)
    if user is None:
         raise HTTPException(status_code=401, detail="Usuario no encontrado")
    
    return user

# ==========================================
# 4. CASOS DE USO (FÁBRICAS)
# ==========================================
def get_register_user_use_case(repo=Depends(get_user_repository)):
    from app.infrastructure.security.password_hasher import PasswordHasher
    return RegisterUser(repo, PasswordHasher())

def get_login_user_use_case(repo=Depends(get_user_repository), jwt=Depends(get_jwt_handler)):
    from app.infrastructure.security.password_hasher import PasswordHasher
    return LoginUser(repo, PasswordHasher(), jwt)

def get_send_message_use_case(chat_repo=Depends(get_conversation_repository), ai_service=Depends(get_gemini_client)):
    return SendMessage(chat_repo, ai_service)

def get_history_use_case(chat_repo=Depends(get_conversation_repository)):
    return GetHistory(chat_repo)

def get_generate_questions_use_case(
    ai_client=Depends(get_gemini_client),
    quiz_repo=Depends(get_quiz_repository)
):
    return GenerateQuestions(ai_client, quiz_repo)