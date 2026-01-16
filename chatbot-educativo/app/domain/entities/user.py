from pydantic import BaseModel, Field
from typing import Optional
import uuid

class User(BaseModel):
    # Usamos alias="_id" para que se lleve bien con MongoDB
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    email: str
    hashed_password: str # <--- CAMBIO IMPORTANTE: Antes se llamaba 'password'

    class Config:
        populate_by_name = True