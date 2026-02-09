export type AgentStatus = "idle" | "active" | "blocked";
export type AgentLevel = "intern" | "specialist" | "lead";
export type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "done" | "blocked" | "archived";
export type TaskPriority = "low" | "medium" | "high";
export type DocumentType = "deliverable" | "research" | "protocol" | "other";
export type ActivityType = "task_created" | "message_sent" | "document_created" | "task_assigned" | "status_changed" | "proposal_created" | "proposal_approved" | "proposal_rejected" | "proposal_converted";
export type ProposalStatus = "pending" | "approved" | "rejected";
export type ProposalPriority = "low" | "medium" | "high";

export interface ProposedStep {
  title: string;
  description: string;
  order: number;
}

export interface Agent {
  _id: string;
  _creationTime: number;
  name: string;
  role: string;
  status: AgentStatus;
  currentTaskId: string | null;
  sessionKey: string;
  level: AgentLevel;
  lastHeartbeat: number;
  avatar?: string | null;
  roleTag?: string | null;
  systemPrompt?: string | null;
  character?: string | null;
  lore?: string | null;
}

export interface Task {
  _id: string;
  _creationTime: number;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeIds: string[];
  createdAt: number;
  updatedAt: number;
  priority: TaskPriority;
  tags?: string[];
  borderColor?: string;
  startedAt?: number;
  lastMessageAt?: number;
}

export interface Message {
  _id: string;
  _creationTime: number;
  taskId: string | null;
  chatThreadId: string | null;
  fromAgentId: string | null; // null = user message, UUID = agent message
  content: string;
  attachments: string[];
  createdAt: number;
  mentions: string[];
  editedAt?: number | null;
  deletedAt?: number | null;
  originalContent?: string | null;
}

export interface ChatThread {
  _id: string;
  _creationTime: number;
  title: string | null;
  createdBy: string; // kept for backward compatibility, but agentId is the primary field
  agentId: string | null; // the agent the user is chatting with (null for agent-to-agent threads)
  participantAgentIds: string[] | null; // array of agent IDs for agent-to-agent threads (null for user-to-agent threads)
  createdAt: number;
  updatedAt: number;
}

export interface Activity {
  _id: string;
  _creationTime: number;
  type: ActivityType | string;
  agentId: string | null;
  taskId: string | null;
  message: string;
  eventTag?: string | null;
  originator?: string | null;
  createdAt: number;
}

export interface Document {
  _id: string;
  _creationTime: number;
  title: string;
  content: string;
  type: DocumentType;
  taskId: string | null;
  createdBy: string;
  createdAt: number;
  path?: string | null;
  messageId?: string | null;
}

export interface Notification {
  _id: string;
  _creationTime: number;
  mentionedAgentId: string;
  content: string;
  taskId: string | null;
  delivered: boolean;
  createdAt: number;
}

export interface Proposal {
  _id: string;
  _creationTime: number;
  title: string;
  description: string;
  source: string;
  priority: ProposalPriority;
  status: ProposalStatus;
  proposedSteps: ProposedStep[];
  createdAt: number;
  updatedAt: number;
  approvedAt?: number;
  rejectedAt?: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependency {
  _id: string;
  _creationTime: number;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: number;
}
