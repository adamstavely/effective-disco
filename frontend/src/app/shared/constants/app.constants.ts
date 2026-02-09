import { TaskStatus, ActivityType } from '../../models/types';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: 'INBOX',
  assigned: 'ASSIGNED',
  in_progress: 'IN PROGRESS',
  review: 'REVIEW',
  done: 'DONE',
  blocked: 'BLOCKED',
  archived: 'ARCHIVED'
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType | 'all', string> = {
  all: 'All',
  task_created: 'Tasks',
  message_sent: 'Comments',
  document_created: 'Docs',
  task_assigned: 'Status',
  status_changed: 'Status',
  proposal_created: 'Proposals',
  proposal_approved: 'Proposals',
  proposal_rejected: 'Proposals',
  proposal_converted: 'Proposals',
  execution_step: 'Execution',
  execution_paused: 'Execution',
  execution_resumed: 'Execution',
  execution_interrupted: 'Execution'
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  inbox: 'warning',
  assigned: 'warning',
  in_progress: 'success',
  review: 'warning',
  done: 'success',
  blocked: 'error',
  archived: 'default'
};

export const TASK_STATUSES: TaskStatus[] = [
  'inbox',
  'assigned',
  'in_progress',
  'review',
  'done',
  'blocked',
  'archived'
];

export const KANBAN_STATUSES: TaskStatus[] = [
  'inbox',
  'assigned',
  'in_progress',
  'review',
  'done'
];
