from pydantic import BaseModel
from typing import Optional

# Este es el formato de los datos que envía el Frontend
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

# Este es el formato de la respuesta que enviamos de vuelta
class ChatResponse(BaseModel):
    response: str
    session_id: str