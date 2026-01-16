from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Question(BaseModel):
    id: int
    question: str

class Quiz(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    original_text: str
    difficulty: str
    questions: List[Question]
    created_at: datetime = Field(default_factory=datetime.utcnow)