from pydantic import BaseModel, Field
from datetime import datetime

class Message(BaseModel):
    role: str  # Puede ser "user" o "assistant" (o "bot")
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)