"""Pydantic 数据模型（请求/响应）。"""
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class SpaceIn(BaseModel):
    name: str
    emoji: str = "📁"
    color: str = "#6366F1"
    sort_order: int = 0


class AreaIn(BaseModel):
    space_id: str
    name: str
    color: Optional[str] = None
    sort_order: int = 0


class ProjectIn(BaseModel):
    space_id: str
    area_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    color: str = "#6366F1"
    status: str = "active"
    due_date: Optional[str] = None


class CollaboratorIn(BaseModel):
    name: str
    email: Optional[str] = None
    role: Optional[str] = None
    institution: Optional[str] = None
    avatar_color: Optional[str] = None
    notes: Optional[str] = None


class TagIn(BaseModel):
    name: str
    color: str = "#94A3B8"


class SubtaskItem(BaseModel):
    id: str
    title: str
    done: bool = False


class TaskIn(BaseModel):
    title: str
    description: Optional[str] = None
    space_id: str
    area_id: Optional[str] = None
    project_id: Optional[str] = None
    paper_id: Optional[str] = None
    priority: str = "medium"          # urgent/high/medium/low
    status: str = "todo"              # inbox/todo/in_progress/done/cancelled
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    subtasks: List[Dict[str, Any]] = Field(default_factory=list)
    tag_ids: List[str] = Field(default_factory=list)
    collaborator_ids: List[str] = Field(default_factory=list)
    dependency_ids: List[str] = Field(default_factory=list)
    recurrence: Optional[Dict[str, Any]] = None
    reminder_days: List[int] = Field(default_factory=list)
    is_inbox: int = 0
    raw_input: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    space_id: Optional[str] = None
    area_id: Optional[str] = None
    project_id: Optional[str] = None
    paper_id: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    subtasks: Optional[List[Dict[str, Any]]] = None
    tag_ids: Optional[List[str]] = None
    collaborator_ids: Optional[List[str]] = None
    dependency_ids: Optional[List[str]] = None
    recurrence: Optional[Dict[str, Any]] = None
    reminder_days: Optional[List[int]] = None
    is_inbox: Optional[int] = None


class PaperIn(BaseModel):
    title: str
    project_id: Optional[str] = None
    overleaf_url: Optional[str] = None
    overleaf_project_id: Optional[str] = None
    target_journal_ids: List[str] = Field(default_factory=list)
    submission_status: str = "preparing"
    submission_deadline: Optional[str] = None
    collaborator_ids: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class MeetingIn(BaseModel):
    title: str
    space_id: Optional[str] = None
    project_id: Optional[str] = None
    scheduled_at: str
    duration_minutes: int = 60
    attendee_ids: List[str] = Field(default_factory=list)
    agenda: Optional[str] = None
    notes: Optional[str] = None
    action_items: List[Dict[str, Any]] = Field(default_factory=list)


class AIParseIn(BaseModel):
    text: str
    auto_create: bool = False


class AIBreakdownIn(BaseModel):
    goal: str
    deadline: Optional[str] = None


class AIDayPlanIn(BaseModel):
    available_hours: float = 8
    date: Optional[str] = None
