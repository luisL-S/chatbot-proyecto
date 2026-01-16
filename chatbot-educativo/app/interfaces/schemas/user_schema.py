from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# Schema para recibir datos de REGISTRO
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=70)

# Schema para recibir datos de LOGIN
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Schema para RESPUESTA de usuario (sin password)
class UserResponse(BaseModel):
    id: str = Field(..., alias="id") # Mapeamos _id a id
    username: str
    email: EmailStr
    created_at: datetime

    class Config:
        populate_by_name = True
        from_attributes = True

# Schema para RESPUESTA del Token
class TokenResponse(BaseModel):
    access_token: str
    token_type: str