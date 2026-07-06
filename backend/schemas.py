from pydantic import BaseModel
from typing import List, Optional

class HistoryItem(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[HistoryItem] = []
    # Using default values to integrate easily without full auth yet
    user_id: int = 1 
    session_id: str = "default"

class ChatResponse(BaseModel):
    reply: str
    emotion: str
    emoji: str

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    theme: str
    
    class Config:
        from_attributes = True

from datetime import datetime

class ConversationResponse(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    emotion: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id: int
    session_id: str
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: int
    
    class Config:
        from_attributes = True
