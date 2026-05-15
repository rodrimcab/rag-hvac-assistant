import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.demo_owner import get_demo_owner_id
from app.db.models import Conversation, Message
from app.db.session import get_db
from app.schemas.chat import RetrievedSourceChunk
from app.schemas.conversation import (
    ConversationCreate,
    ConversationRead,
    ConversationUpdate,
    MessageListResponse,
    StoredMessageRead,
)
from app.util.conversation_text import truncate_conversation_title

router = APIRouter(tags=["conversations"])


def _get_owned_conversation(
    db: Session,
    conversation_id: str,
    owner_id: str,
) -> Conversation:
    conv = db.get(Conversation, conversation_id)
    if not conv or conv.owner_id != owner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


@router.post("/conversations", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_demo_owner_id),
) -> Conversation:
    now = datetime.now(timezone.utc)
    conv = Conversation(
        id=str(uuid.uuid4()),
        owner_id=owner_id,
        title=truncate_conversation_title(payload.title),
        created_at=now,
        updated_at=now,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


@router.get("/conversations", response_model=list[ConversationRead])
def list_conversations(
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_demo_owner_id),
) -> list[Conversation]:
    rows = db.scalars(
        select(Conversation)
        .where(Conversation.owner_id == owner_id)
        .order_by(Conversation.updated_at.desc()),
    ).all()
    return list(rows)


@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse)
def list_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_demo_owner_id),
) -> MessageListResponse:
    _get_owned_conversation(db, conversation_id, owner_id)
    msgs = db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc()),
    ).all()
    out: list[StoredMessageRead] = []
    for m in msgs:
        sources: list[RetrievedSourceChunk] | None = None
        if m.sources_json:
            try:
                raw_list = json.loads(m.sources_json)
                if isinstance(raw_list, list):
                    sources = [RetrievedSourceChunk.model_validate(x) for x in raw_list]
            except (json.JSONDecodeError, ValueError, TypeError):
                sources = None
        role_out: str = "assistant" if m.role == "assistant" else "user"
        out.append(
            StoredMessageRead(
                id=m.id,
                role=role_out,  # type: ignore[arg-type]
                content=m.content,
                created_at=m.created_at,
                sources=sources,
            ),
        )
    return MessageListResponse(messages=out)


@router.patch("/conversations/{conversation_id}", response_model=ConversationRead)
def patch_conversation(
    conversation_id: str,
    payload: ConversationUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_demo_owner_id),
) -> Conversation:
    conv = _get_owned_conversation(db, conversation_id, owner_id)
    conv.title = truncate_conversation_title(payload.title)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conv)
    return conv


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_demo_owner_id),
) -> None:
    conv = _get_owned_conversation(db, conversation_id, owner_id)
    db.delete(conv)
    db.commit()
