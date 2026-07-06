from sqlalchemy import Column, Integer, String, Boolean, Text, Float, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(100), nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    is_admin = Column(Boolean, default=False)
    last_login = Column(TIMESTAMP, nullable=True)
    is_active = Column(Boolean, default=True)
    theme = Column(String(20), default="dark")
    notification_enabled = Column(Boolean, default=True)

    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True, index=True)
    message_count = Column(Integer, default=0)

    __table_args__ = (UniqueConstraint('user_id', 'session_id', name='unique_user_session'),)

    user = relationship("User", back_populates="chat_sessions")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(50), nullable=False, index=True)
    role = Column(String(20), nullable=False, default="user")
    content = Column(Text, nullable=False)
    emotion = Column(String(100), nullable=True)
    confidence = Column(Float, nullable=True)
    model_used = Column(String(50), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="conversations")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    text = Column(Text, nullable=False)
    emotion = Column(String(50), nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="predictions")
