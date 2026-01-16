from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

# --- 1. DEFINICIÓN DE MENSAJE (Independiente) ---
class Message(BaseModel):
    role: str  # 'user' (usuario) o 'model' (bot)
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# --- 2. DEFINICIÓN DE CONVERSACIÓN ---
class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: Optional[str] = None
    messages: List[Message] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def add_message(self, message: Message):
        self.messages.append(message)
        self.updated_at = datetime.utcnow()