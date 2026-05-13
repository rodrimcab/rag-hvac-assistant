from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from app.schemas.chat import RetrievedSourceChunk
from app.schemas.datetime_json import datetime_to_utc_iso_z


class ConversationCreate(BaseModel):
    title: str | None = Field(default=None, max_length=512)


class ConversationUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)


class ConversationRead(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "updated_at")
    def _ser_conv_ts(self, v: datetime) -> str:
        return datetime_to_utc_iso_z(v)


class StoredMessageRead(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime
    sources: list[RetrievedSourceChunk] | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def _ser_msg_ts(self, v: datetime) -> str:
        return datetime_to_utc_iso_z(v)


class MessageListResponse(BaseModel):
    messages: list[StoredMessageRead]
