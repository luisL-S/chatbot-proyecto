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
    "http://localhost:5173",                       # Tu entorno local
    "http://127.0.0.1:5173",                       # Tu entorno local (alternativo)
    "https://edubot.academiasantamariani.com",     # 👈 TU DOMINIO REAL (Frontend)
    "https://backend-proyect-j2u2.onrender.com",   # Tu dominio del Backend
    "https://aula.academiasantamariani.com"        # (Por si acaso usaste 'aula')
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Lista específica de dominios permitidos
    allow_credentials=True,      # Permite cookies/headers de autenticación
    allow_methods=["*"],         # Permite GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],         # Permite todos los headers
)

# Registrar Rutas
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(chat_routes.router, prefix="/api/chat", tags=["Chat"])
app.include_router(reading_routes.router, prefix="/api/reading", tags=["Comprensión Lectora"])

@app.get("/")
def read_root():
    return {"message": "Chatbot Educativo Backend Corriendo!"}