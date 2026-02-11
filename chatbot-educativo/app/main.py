from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config.database import db
from app.interfaces.api.routes import auth_routes, chat_routes, reading_routes 

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Conectar a la DB
    db.connect()
    yield
    # Shutdown: Desconectar
    db.close()

app = FastAPI(
    title="Chatbot Educativo API",
    version="1.0.0",
    lifespan=lifespan
)

origins = [
    "http://localhost:5173",    # La dirección de tu frontend
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", # Para cuando trabajas en tu PC
        "https://edubot.academiasantamariani.com", # 👈 ¡TU NUEVO DOMINIO!
        "https://aula.academiasantamariani.com", # (Por si acaso usas 'aula')
        "*" # Comodín para permitir todo lo demás
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar Rutas
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(chat_routes.router, prefix="/api/chat", tags=["Chat"])
app.include_router(reading_routes.router, prefix="/api/reading", tags=["Comprensión Lectora"])

@app.get("/")
def read_root():
    return {"message": "Chatbot Educativo Backend Corriendo!"}