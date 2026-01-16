from pydantic import BaseModel
from typing import List, Optional

class ChatRequestSchema(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatResponseSchema(BaseModel):
    reply: str
    conversation_id: str

class MessageSchema(BaseModel):
    sender: str 
    content: str
    timestamp: str

class ConversationHistorySchema(BaseModel):
    conversation_id: str
    messages: List[MessageSchema]

