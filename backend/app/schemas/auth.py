import uuid
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


UserRole = Literal["agent", "supervisor", "admin"]


class UserRegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="Unique email address for internal support user")
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="Password meeting complexity standards (min 8 chars)",
    )
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Full name of the user",
    )
    role: UserRole = Field(
        default="agent",
        description="Role assigned to user: agent, supervisor, or admin",
    )
    organization_id: uuid.UUID = Field(
        ...,
        description="Organization UUID to which the user belongs",
    )

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class UserLoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered user email")
    password: str = Field(..., min_length=1, max_length=100, description="User password")


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1, description="Supabase refresh token")


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    organization_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT bearer access token")
    refresh_token: Optional[str] = Field(None, description="Refresh token for token renewal")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(default=3600, description="Expiration time in seconds")
    user: UserResponse = Field(..., description="User profile details")
