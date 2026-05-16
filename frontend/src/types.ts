export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'inbox' | 'todo' | 'in_progress' | 'done' | 'cancelled';

export interface Space {
  id: string;
  name: string;
  emoji: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface Area {
  id: string;
  space_id: string;
  name: string;
  color?: string;
  sort_order: number;
}

export interface Project {
  id: string;
  space_id: string;
  area_id?: string;
  name: string;
  description?: string;
  color: string;
  status: string;
  due_date?: string;
  created_at: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  role?: string;
  institution?: string;
  avatar_color: string;
  notes?: string;
  last_sync_at?: string;
  created_at: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  space_id: string;
  area_id?: string;
  project_id?: string;
  paper_id?: string;
  priority: Priority;
  status: TaskStatus;
  start_date?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours: number;
  subtasks: Subtask[];
  tag_ids: string[];
  collaborator_ids: string[];
  dependency_ids: string[];
  recurrence?: any;
  reminder_days: number[];
  is_inbox: number;
  raw_input?: string;
  ai_parsed: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Paper {
  id: string;
  project_id?: string;
  title: string;
  overleaf_url?: string;
  overleaf_project_id?: string;
  target_journal_ids: string[];
  submission_status: string;
  submission_deadline?: string;
  collaborator_ids: string[];
  current_word_count: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaperSnapshot {
  id: string;
  paper_id: string;
  version_label: string;
  snapshot_at: string;
  word_count: number;
  diff_summary: string;
  file_path: string;
}

export interface Meeting {
  id: string;
  title: string;
  space_id?: string;
  project_id?: string;
  scheduled_at: string;
  duration_minutes: number;
  attendee_ids: string[];
  agenda?: string;
  notes?: string;
  action_items: any[];
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  related_id?: string;
  related_type?: string;
  is_read: number;
  created_at: string;
}

export interface AIParsed {
  title: string;
  space_id: string;
  priority: Priority;
  due_date?: string;
  start_date?: string;
  estimated_hours?: number;
  collaborators: string[];
  subtasks: string[];
  tags: string[];
  description?: string;
  is_meeting: boolean;
}

export type ViewName =
  | 'kanban' | 'gantt' | 'calendar' | 'stats'
  | 'eisenhower' | 'capacity' | 'heatmap'
  | 'collaborator' | 'paper' | 'focus';
