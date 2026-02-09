# Implementation Plan: Missing Features

This document provides a detailed implementation plan for adding missing features to the Mission Control codebase, following existing coding paradigms and architectural patterns.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Implementation Principles](#implementation-principles)
3. [Phase 1: High Priority Features](#phase-1-high-priority-features)
4. [Phase 2: Medium Priority Features](#phase-2-medium-priority-features)
5. [Phase 3: Lower Priority Features](#phase-3-lower-priority-features)
6. [Database Schema Changes](#database-schema-changes)
7. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### Current Stack
- **Backend**: Supabase (PostgreSQL) with TypeScript functions
- **Frontend**: Angular 17+ with standalone components
- **State Management**: RxJS Observables with Supabase real-time subscriptions
- **Styling**: SCSS with shared design tokens

### Key Patterns
- **Components**: Standalone, OnPush change detection, async pipes
- **Services**: Injectable services with Observable-based APIs
- **Database**: PostgreSQL with triggers, RLS policies, real-time subscriptions
- **Code Organization**: Domain-driven structure (agents, tasks, messages, etc.)

---

## Implementation Principles

### 1. Follow Existing Patterns
- ✅ Use standalone Angular components with `ChangeDetectionStrategy.OnPush`
- ✅ Use `async` pipe for all subscriptions (no manual subscription management)
- ✅ Use RxJS `combineLatest`, `map`, `catchError` for data transformations
- ✅ Create shared components for reusable UI patterns
- ✅ Use SupabaseService for all database operations
- ✅ Follow existing file structure and naming conventions

### 2. Database Schema
- ✅ Add proper foreign keys and indexes
- ✅ Use UUID primary keys
- ✅ Add triggers for automatic activity creation
- ✅ Enable RLS policies
- ✅ Use PostgreSQL arrays for tags (e.g., `tags TEXT[]`)

### 3. Component Structure
- ✅ Separate `.ts`, `.html`, `.scss` files
- ✅ Use shared components (`PanelHeaderComponent`, `FilterButtonComponent`)
- ✅ Use shared pipes (`TimeAgoPipe`)
- ✅ Use shared constants (`TASK_STATUS_LABELS`, etc.)

### 4. Error Handling
- ✅ Use `catchError` with `of([])` or `startWith` for graceful degradation
- ✅ Log errors to console
- ✅ Show empty states when data fails to load

---

## Phase 1: High Priority Features

### 1.1 Drag-and-Drop Kanban Board

**Priority**: High  
**Estimated Effort**: 4-6 hours

#### Database Changes
- None required (tasks already have status field)

#### Backend Changes
- None required

#### Frontend Changes

**Files to Modify:**
- `frontend/package.json` - Add dependencies
- `frontend/src/app/components/mission-queue/mission-queue.component.ts` - Add DndContext
- `frontend/src/app/components/task-card/task-card.component.ts` - Make draggable
- `frontend/src/app/components/task-card/task-card.component.html` - Add drag handle

**Implementation Steps:**

1. **Install Dependencies**
   ```bash
   npm install @dnd-kit/core @dnd-kit/utilities @dnd-kit/sortable
   ```

2. **Update MissionQueueComponent**
   - Import `DndContext`, `DragOverlay`, `closestCenter`
   - Add drag state management
   - Handle `onDragEnd` to update task status via SupabaseService
   - Use `useSensor`, `useSensors`, `PointerSensor` with 8px activation distance

3. **Update TaskCardComponent**
   - Import `useDraggable` from `@dnd-kit/core`
   - Wrap card content with draggable
   - Add visual feedback during drag

4. **Add Drag Handle**
   - Add drag handle icon/button to task card
   - Style with cursor: grab/grabbing

**Code Pattern:**
```typescript
// mission-queue.component.ts
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { closestCenter } from '@dnd-kit/sortable';

export class MissionQueueComponent {
  activeId: string | null = null;
  sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  onDragStart(event: DragStartEvent) {
    this.activeId = event.active.id as string;
  }

  onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const newStatus = over.id as TaskStatus;
      this.supabaseService.updateTaskStatus(active.id as string, newStatus).subscribe();
    }
    this.activeId = null;
  }
}
```

---

### 1.2 Task Detail Panel (Side Panel)

**Priority**: High  
**Estimated Effort**: 8-10 hours

#### Database Changes
- Add `tags TEXT[]` to tasks table
- Add `borderColor VARCHAR(7)` to tasks table (hex color)
- Add `startedAt BIGINT` to tasks table (optional timestamp)
- Add `lastMessageAt BIGINT` to tasks table (updated via trigger)

#### Backend Changes

**Files to Create/Modify:**
- `backend/supabase/functions/tasks.ts` - Add update functions for tags, borderColor, description
- `backend/supabase/schema.sql` - Add columns and trigger for lastMessageAt

#### Frontend Changes

**Files to Create:**
- `frontend/src/app/components/task-detail-panel/task-detail-panel.component.ts`
- `frontend/src/app/components/task-detail-panel/task-detail-panel.component.html`
- `frontend/src/app/components/task-detail-panel/task-detail-panel.component.scss`

**Files to Modify:**
- `frontend/src/app/components/mission-queue/mission-queue.component.ts` - Handle task selection
- `frontend/src/app/components/mission-queue/mission-queue.component.html` - Add panel container
- `frontend/src/app/components/mission-queue/mission-queue.component.scss` - Panel styles
- `frontend/src/app/models/types.ts` - Add Task interface fields

**Implementation Steps:**

1. **Create TaskDetailPanelComponent**
   - Standalone component with OnPush change detection
   - Input: `task: Task | null`
   - Output: `close` event
   - Fixed width: 380px, right-side panel

2. **Panel Sections:**
   - **Header**: Title, status dropdown, close button
   - **Description**: Editable textarea (inline editing)
   - **Tags**: Tag display with add/remove functionality
   - **Assignees**: List with add/remove dropdown
   - **Resources/Deliverables**: Linked documents list
   - **Comments**: Messages list with markdown rendering
   - **Quick Actions**: "Mark as Done", "Archive" buttons
   - **Metadata**: Created/updated dates, task ID (copyable)

3. **Inline Editing**
   - Use `*ngIf` to toggle between view/edit modes
   - Save on blur or Enter key
   - Use SupabaseService to update

4. **Markdown Rendering**
   - Install `marked` or `markdown-it` for Angular
   - Create `MarkdownPipe` or use component to render comments

5. **Document Attachments**
   - Show documents linked to task
   - Add "Attach Document" button
   - Use SupabaseService to link documents

**Code Pattern:**
```typescript
// task-detail-panel.component.ts
@Component({
  selector: 'app-task-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskDetailPanelComponent {
  @Input() task: Task | null = null;
  @Output() close = new EventEmitter<void>();
  
  isEditingDescription = false;
  editedDescription = '';

  updateDescription() {
    if (this.task && this.editedDescription !== this.task.description) {
      this.supabaseService.updateTask(this.task.id, { description: this.editedDescription })
        .subscribe(() => {
          this.isEditingDescription = false;
        });
    }
  }
}
```

---

### 1.3 Agent Detail View (Comprehensive)

**Priority**: High  
**Estimated Effort**: 10-12 hours

#### Database Changes
- Add `avatar VARCHAR(255)` to agents table (emoji or URL)
- Add `role_tag VARCHAR(50)` to agents table (short identifier)
- Add `system_prompt TEXT` to agents table
- Add `character TEXT` to agents table
- Add `lore TEXT` to agents table

#### Backend Changes

**Files to Create/Modify:**
- `backend/supabase/functions/agents.ts` - Add update function for all fields
- `backend/supabase/functions/stats.ts` - Add agent-specific stats queries

#### Frontend Changes

**Files to Create:**
- `frontend/src/app/components/agent-detail-tray/agent-detail-tray.component.ts`
- `frontend/src/app/components/agent-detail-tray/agent-detail-tray.component.html`
- `frontend/src/app/components/agent-detail-tray/agent-detail-tray.component.scss`

**Files to Modify:**
- `frontend/src/app/components/agents-panel/agents-panel.component.ts` - Handle agent selection
- `frontend/src/app/components/agents-panel/agents-panel.component.html` - Add tray container
- `frontend/src/app/models/types.ts` - Update Agent interface

**Implementation Steps:**

1. **Create AgentDetailTrayComponent**
   - Slide-out tray or overlay panel
   - Input: `agent: Agent | null`
   - Output: `close` event

2. **Agent Profile Section:**
   - Avatar input (emoji picker or URL input)
   - Name input (editable)
   - Role dropdown (editable)
   - Level dropdown (editable)
   - Status dropdown (editable)
   - System Prompt textarea (editable)
   - Character textarea (editable)
   - Lore textarea (editable)

3. **Agent Metrics Cards:**
   - MISSIONS count (from tasks where agent is assigned)
   - STEPS DONE count (from activities where agent completed steps)
   - COST TODAY (from costs table, if implemented)
   - EVENTS count (from activities where agent is involved)

4. **Activity Sections:**
   - **Recent Missions**: List of tasks assigned to agent
   - **Recent Steps**: Chronological list of activities with:
     - Task title and description
     - Status (SUCCEEDED/FAILED) with visual indicators
     - Relative timestamps using `TimeAgoPipe`
     - Expandable details

5. **Edit Mode:**
   - Toggle between view/edit modes
   - Save/Cancel buttons
   - Use SupabaseService to update agent

**Code Pattern:**
```typescript
// agent-detail-tray.component.ts
export class AgentDetailTrayComponent {
  @Input() agent: Agent | null = null;
  @Output() close = new EventEmitter<void>();
  
  isEditMode = false;
  agentStats$: Observable<AgentStats>;
  
  constructor(private supabaseService: SupabaseService) {
    this.agentStats$ = this.agent$.pipe(
      switchMap(agent => agent ? 
        combineLatest([
          this.supabaseService.getAgentTasks(agent.id),
          this.supabaseService.getAgentActivities(agent.id),
          this.supabaseService.getAgentCostToday(agent.id)
        ]).pipe(
          map(([tasks, activities, cost]) => ({
            missions: tasks.length,
            stepsDone: activities.filter(a => a.type === 'step_completed').length,
            costToday: cost,
            events: activities.length
          }))
        ) : of({ missions: 0, stepsDone: 0, costToday: 0, events: 0 })
      )
    );
  }
}
```

---

### 1.4 Task Tags System

**Priority**: High  
**Estimated Effort**: 3-4 hours

#### Database Changes
- Add `tags TEXT[]` to tasks table (already covered in 1.2)
- Add `borderColor VARCHAR(7)` to tasks table (already covered in 1.2)

#### Backend Changes
- Already covered in 1.2

#### Frontend Changes

**Files to Modify:**
- `frontend/src/app/components/task-card/task-card.component.html` - Display tags
- `frontend/src/app/components/task-card/task-card.component.scss` - Tag styles
- `frontend/src/app/components/task-detail-panel/task-detail-panel.component.html` - Tag management UI
- `frontend/src/app/components/task-detail-panel/task-detail-panel.component.ts` - Tag add/remove logic

**Implementation Steps:**

1. **Display Tags on Task Cards**
   - Show tags as small badges
   - Limit to 2-3 tags with "+N more" if needed
   - Use `TagComponent` if it exists, or create inline tags

2. **Tag Management in Detail Panel**
   - Display all tags
   - Add tag input (comma-separated or multi-select)
   - Remove tag button (X icon)
   - Update via SupabaseService

3. **Tag Styling**
   - Use shared tag styles
   - Optional: Use `borderColor` for tag border color

**Code Pattern:**
```typescript
// task-detail-panel.component.ts
addTag(tag: string) {
  if (this.task && tag.trim()) {
    const tags = [...(this.task.tags || []), tag.trim()];
    this.supabaseService.updateTask(this.task.id, { tags }).subscribe();
  }
}

removeTag(tag: string) {
  if (this.task) {
    const tags = (this.task.tags || []).filter(t => t !== tag);
    this.supabaseService.updateTask(this.task.id, { tags }).subscribe();
  }
}
```

---

### 1.5 Task Archiving

**Priority**: High  
**Estimated Effort**: 2-3 hours

#### Database Changes
- Add "archived" to task status enum in schema.sql

#### Backend Changes

**Files to Modify:**
- `backend/supabase/functions/tasks.ts` - Add `archiveTask` function

#### Frontend Changes

**Files to Modify:**
- `frontend/src/app/components/mission-queue/mission-queue.component.ts` - Add archive toggle
- `frontend/src/app/components/mission-queue/mission-queue.component.html` - Add toggle UI
- `frontend/src/app/components/task-detail-panel/task-detail-panel.component.ts` - Add archive button
- `frontend/src/app/shared/constants/app.constants.ts` - Add "archived" to status arrays

**Implementation Steps:**

1. **Update Schema**
   - Modify status CHECK constraint to include "archived"

2. **Add Archive Function**
   - Create `archiveTask(id: string)` in SupabaseService
   - Updates task status to "archived"

3. **Add Archive Toggle**
   - Add "Show Archived" toggle in MissionQueueComponent
   - Filter archived tasks based on toggle state

4. **Add Archive Button**
   - Add "Archive" button in TaskDetailPanel
   - Add quick archive action on task cards (optional)

**Code Pattern:**
```typescript
// mission-queue.component.ts
showArchived = false;

getTasks(status: TaskStatus): Observable<Task[]> {
  return this.supabaseService.getTasks(status).pipe(
    map(tasks => this.showArchived ? tasks : tasks.filter(t => t.status !== 'archived'))
  );
}
```

---

## Phase 2: Medium Priority Features

### 2.1 Proposal Management System

**Priority**: Medium  
**Estimated Effort**: 12-15 hours

#### Database Changes

**New Table: `proposals`**
```sql
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(255) NOT NULL, -- 'agent' or 'system' or agent name
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    proposed_steps JSONB, -- Array of step objects
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    approved_at BIGINT,
    rejected_at BIGINT
);
```

#### Backend Changes

**Files to Create:**
- `backend/supabase/functions/proposals.ts` - CRUD operations

**Files to Modify:**
- `backend/supabase/schema.sql` - Add proposals table and triggers

#### Frontend Changes

**Files to Create:**
- `frontend/src/app/components/proposals/proposals.component.ts`
- `frontend/src/app/components/proposals/proposals.component.html`
- `frontend/src/app/components/proposals/proposals.component.scss`
- `frontend/src/app/components/proposal-card/proposal-card.component.ts`
- `frontend/src/app/components/proposal-card/proposal-card.component.html`
- `frontend/src/app/components/proposal-card/proposal-card.component.scss`

**Files to Modify:**
- `frontend/src/app/services/supabase.service.ts` - Add proposal methods
- `frontend/src/app/models/types.ts` - Add Proposal interface
- `frontend/src/app/dashboard/dashboard.component.html` - Add proposals route/panel

**Implementation Steps:**

1. **Create Proposals Component**
   - Tabbed interface: All, Pending, Approved, Rejected
   - Count badges on tabs
   - List of proposal cards

2. **Create ProposalCard Component**
   - Display title, description, status badge
   - Show proposed steps list
   - Show metadata (source, priority, timestamp)
   - Approve/Reject buttons (for pending proposals)

3. **Add Proposal-to-Mission Workflow**
   - "Convert to Mission" button on approved proposals
   - Creates task from proposal
   - Links proposal to created task

**Code Pattern:**
```typescript
// proposals.component.ts
export class ProposalsComponent {
  selectedTab: 'all' | 'pending' | 'approved' | 'rejected' = 'all';
  
  proposals$ = this.supabaseService.getProposals().pipe(
    map(proposals => {
      if (this.selectedTab === 'all') return proposals;
      return proposals.filter(p => p.status === this.selectedTab);
    })
  );
  
  pendingCount$ = this.supabaseService.getProposals('pending').pipe(
    map(p => p.length)
  );
}
```

---

### 2.2 Quick Stats Dashboard

**Priority**: Medium  
**Estimated Effort**: 6-8 hours

#### Database Changes

**New Table: `costs`**
```sql
CREATE TABLE costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    amount DECIMAL(10, 4) NOT NULL, -- Cost in dollars
    source VARCHAR(100) NOT NULL, -- 'llm_api', 'tool_usage', etc.
    metadata JSONB, -- Additional context
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX idx_costs_agent_date ON costs(agent_id, created_at DESC);
```

**New Table: `budget`**
```sql
CREATE TABLE budget (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_limit DECIMAL(10, 2), -- Daily budget limit
    monthly_limit DECIMAL(10, 2), -- Monthly budget limit
    current_daily_spend DECIMAL(10, 2) DEFAULT 0,
    current_monthly_spend DECIMAL(10, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Backend Changes

**Files to Create/Modify:**
- `backend/supabase/functions/stats.ts` - Statistics aggregation functions
- `backend/supabase/functions/costs.ts` - Cost tracking functions

#### Frontend Changes

**Files to Create:**
- `frontend/src/app/components/quick-stats/quick-stats.component.ts`
- `frontend/src/app/components/quick-stats/quick-stats.component.html`
- `frontend/src/app/components/quick-stats/quick-stats.component.scss`

**Files to Modify:**
- `frontend/src/app/dashboard/dashboard.component.html` - Add quick-stats panel
- `frontend/src/app/services/supabase.service.ts` - Add stats methods

**Implementation Steps:**

1. **Create QuickStatsComponent**
   - Right sidebar panel
   - Display cards for:
     - PROPOSALS TODAY (count)
     - MISSIONS COMPLETED (total count)
     - SUCCESS RATE (percentage)
     - COST TODAY (dollar amount)
     - BUDGET REMAINING (dollar amount)

2. **Add Stats Queries**
   - Create aggregation queries in SupabaseService
   - Use PostgreSQL aggregation functions (COUNT, SUM, etc.)

3. **Real-time Updates**
   - Subscribe to relevant tables for real-time updates

**Code Pattern:**
```typescript
// quick-stats.component.ts
export class QuickStatsComponent {
  stats$ = combineLatest([
    this.supabaseService.getProposalsToday(),
    this.supabaseService.getCompletedMissions(),
    this.supabaseService.getSuccessRate(),
    this.supabaseService.getCostToday(),
    this.supabaseService.getBudgetRemaining()
  ]).pipe(
    map(([proposals, missions, successRate, cost, budget]) => ({
      proposalsToday: proposals.length,
      missionsCompleted: missions.length,
      successRate: successRate,
      costToday: cost,
      budgetRemaining: budget
    }))
  );
}
```

---

### 2.3 Document Preview Tray System

**Priority**: Medium  
**Estimated Effort**: 8-10 hours

#### Database Changes
- Add `path VARCHAR(500)` to documents table
- Add `message_id UUID` to documents table (foreign key to messages)

#### Backend Changes
- None required (schema update only)

#### Frontend Changes

**Files to Create:**
- `frontend/src/app/components/document-trays/document-trays.component.ts`
- `frontend/src/app/components/document-trays/document-trays.component.html`
- `frontend/src/app/components/document-trays/document-trays.component.scss`
- `frontend/src/app/components/document-preview-tray/document-preview-tray.component.ts`
- `frontend/src/app/components/document-conversation-tray/document-conversation-tray.component.ts`

**Files to Modify:**
- `frontend/src/app/components/task-detail-panel/task-detail-panel.component.ts` - Trigger document selection

**Implementation Steps:**

1. **Create DocumentTraysComponent**
   - Container for two side-by-side trays
   - Manages selected document state

2. **Create DocumentPreviewTrayComponent**
   - Displays document content
   - Renders markdown
   - Shows metadata (type, path, creation info)

3. **Create DocumentConversationTrayComponent**
   - Shows messages/comments related to document
   - Filters messages by document_id or message_id

4. **Document Selection**
   - Click document to open both trays
   - Independent close controls

**Code Pattern:**
```typescript
// document-trays.component.ts
export class DocumentTraysComponent {
  @Input() selectedDocument: Document | null = null;
  @Output() close = new EventEmitter<void>();
  
  showPreview = true;
  showConversation = true;
  
  documentMessages$ = this.selectedDocument$.pipe(
    switchMap(doc => doc ? 
      this.supabaseService.getDocumentMessages(doc.id) : of([])
    )
  );
}
```

---

### 2.4 Task Resume/Play Functionality

**Priority**: Medium  
**Estimated Effort**: 4-5 hours

#### Database Changes
- None required

#### Backend Changes

**Files to Modify:**
- `backend/supabase/functions/tasks.ts` - Add `resumeTask` helper function

#### Frontend Changes

**Files to Modify:**
- `frontend/src/app/components/task-detail-panel/task-detail-panel.component.ts` - Add resume handler
- `frontend/src/app/components/task-card/task-card.component.ts` - Add play button

**Implementation Steps:**

1. **Add Resume Button**
   - Show "Resume" button on tasks in "review" status
   - Quick play button on task cards

2. **Build Agent Prompt**
   - Fetch agent system prompt, character, lore
   - Fetch task title, description
   - Fetch full conversation thread
   - Combine into prompt

3. **Trigger Agent**
   - Call agent API/webhook to resume work
   - Update task status to "in_progress"

**Code Pattern:**
```typescript
// task-detail-panel.component.ts
resumeTask() {
  if (this.task) {
    combineLatest([
      this.supabaseService.getTask(this.task.id),
      this.supabaseService.getTaskMessages(this.task.id),
      this.supabaseService.getTaskAssignees(this.task.id).pipe(
        switchMap(assignees => 
          combineLatest(assignees.map(a => 
            this.supabaseService.getAgent(a.agent_id)
          ))
        )
      )
    ]).pipe(
      switchMap(([task, messages, agents]) => {
        const prompt = this.buildAgentPrompt(task, messages, agents[0]);
        return this.supabaseService.resumeTask(this.task!.id, prompt);
      })
    ).subscribe();
  }
}
```

---

### 2.5 Enhanced Task Cards

**Priority**: Medium  
**Estimated Effort**: 3-4 hours

#### Database Changes
- Add `lastMessageAt BIGINT` to tasks table (updated via trigger)

#### Backend Changes
- Add trigger to update `lastMessageAt` when message is created

#### Frontend Changes

**Files to Modify:**
- `frontend/src/app/components/task-card/task-card.component.ts` - Enhance with new features
- `frontend/src/app/components/task-card/task-card.component.html` - Add UI elements
- `frontend/src/app/components/task-card/task-card.component.scss` - Add styles

**Implementation Steps:**

1. **Relative Time Display**
   - Use existing `TimeAgoPipe` for timestamps
   - Show "2h ago", "1d ago" format

2. **Last Message Time**
   - Display `lastMessageAt` using `TimeAgoPipe`
   - Show "Last message: 2h ago"

3. **Play Button**
   - Add play icon button for review status tasks
   - Calls resume functionality

4. **Archive Button**
   - Add archive icon button
   - Quick archive action

5. **Tag Display**
   - Show tags as badges (limit to 2-3)

6. **Border Colors**
   - Apply `borderColor` if present

7. **Selected State**
   - Add visual indication when task is selected
   - Use CSS class binding

---

### 2.6 Enhanced Agent Roster

**Priority**: Medium  
**Estimated Effort**: 2-3 hours

#### Database Changes
- Already covered in 1.3 (avatar, role_tag)

#### Backend Changes
- Already covered in 1.3

#### Frontend Changes

**Files to Modify:**
- `frontend/src/app/components/agent-card/agent-card.component.html` - Enhance display
- `frontend/src/app/components/agent-card/agent-card.component.scss` - Add styles

**Implementation Steps:**

1. **Role Tags**
   - Display `role_tag` as small badge
   - Fallback to role if role_tag not set

2. **Detailed Role Descriptions**
   - Show full role name
   - Use role_tag as secondary identifier

3. **Agent Avatars**
   - Display avatar (emoji or image)
   - Fallback to initials if no avatar

4. **Enhanced Status Display**
   - More prominent status indicator
   - Color coding (green for active, grey for idle)

---

## Phase 3: Lower Priority Features

### 3.1 Multi-Tenant Support

**Priority**: Lower  
**Estimated Effort**: 15-20 hours

#### Database Changes
- Add `tenant_id UUID` to all tables
- Add indexes on `tenant_id`
- Create `tenant_settings` table
- Create `api_tokens` table
- Create `rate_limits` table

#### Backend Changes
- Add `tenantId` parameter to all Supabase functions
- Add tenant filtering to all queries

#### Frontend Changes
- Add tenant context service
- Add tenant selection UI

**Note**: This is a significant architectural change. Only implement if multi-tenancy is required.

---

### 3.2 Authentication System

**Priority**: Lower  
**Estimated Effort**: 10-12 hours

#### Implementation
- Use Supabase Auth (built-in)
- Create sign-in/sign-out components
- Add protected routes
- Map authenticated users to agents

**Note**: Only implement if authentication is required.

---

### 3.3 Real-Time Chat System

**Priority**: Lower  
**Estimated Effort**: 12-15 hours

#### Database Changes
- Create `chat_messages` table or extend `messages` table
- Add `chat_thread_id UUID` for conversation grouping

#### Frontend Changes
- Create chat component
- Add chat button to top nav
- Real-time message updates

---

### 3.4 Enhanced Live Event Stream

**Priority**: Lower  
**Estimated Effort**: 3-4 hours

#### Database Changes
- Add `event_tag VARCHAR(100)` to activities table
- Add `originator VARCHAR(255)` to activities table

#### Frontend Changes
- Update `ActivityItemComponent` to show event tags and originator
- Add visual bullets (green/grey)
- Enhance event descriptions

---

## Database Schema Changes Summary

### New Tables
1. `proposals` - Proposal management
2. `costs` - Financial tracking
3. `budget` - Budget limits and tracking
4. `chat_messages` (optional) - Direct messaging
5. `tenant_settings` (optional) - Multi-tenancy
6. `api_tokens` (optional) - Webhook authentication
7. `rate_limits` (optional) - Rate limiting

### Schema Modifications

**agents table:**
- `avatar VARCHAR(255)` - Emoji or image URL
- `role_tag VARCHAR(50)` - Short role identifier
- `system_prompt TEXT` - System prompt
- `character TEXT` - Character description
- `lore TEXT` - Lore/background

**tasks table:**
- `tags TEXT[]` - Array of tag strings
- `borderColor VARCHAR(7)` - Hex color code
- `startedAt BIGINT` - Optional timestamp
- `lastMessageAt BIGINT` - Updated via trigger
- Add "archived" to status enum

**activities table:**
- `event_tag VARCHAR(100)` - Event type tag
- `originator VARCHAR(255)` - "System" or agent name

**documents table:**
- `path VARCHAR(500)` - Optional file path
- `message_id UUID` - Optional foreign key to messages

---

## Testing Strategy

### Unit Tests
- Test SupabaseService methods
- Test component logic (tag management, editing, etc.)
- Test utility functions

### Integration Tests
- Test database triggers
- Test real-time subscriptions
- Test drag-and-drop functionality

### E2E Tests (Optional)
- Test complete workflows (create task, assign, complete)
- Test proposal approval workflow
- Test agent detail editing

### Manual Testing Checklist
- [ ] Drag-and-drop updates task status correctly
- [ ] Task detail panel shows all information
- [ ] Agent detail tray displays metrics correctly
- [ ] Tags can be added/removed
- [ ] Archived tasks can be toggled
- [ ] Proposals can be approved/rejected
- [ ] Quick stats update in real-time
- [ ] Document preview renders correctly

---

## Implementation Order

### Week 1: High Priority Core Features
1. Task Tags System (1.4) - 3-4 hours
2. Task Archiving (1.5) - 2-3 hours
3. Drag-and-Drop Kanban (1.1) - 4-6 hours
4. Task Detail Panel (1.2) - 8-10 hours

### Week 2: Agent Management & Polish
5. Agent Detail View (1.3) - 10-12 hours
6. Enhanced Task Cards (2.5) - 3-4 hours
7. Enhanced Agent Roster (2.6) - 2-3 hours

### Week 3: Workflow Features
8. Proposal Management (2.1) - 12-15 hours
9. Quick Stats Dashboard (2.2) - 6-8 hours

### Week 4: Document Management & Advanced Features
10. Document Preview Tray (2.3) - 8-10 hours
11. Task Resume/Play (2.4) - 4-5 hours
12. Enhanced Live Feed (3.4) - 3-4 hours

### Future (if needed)
13. Multi-Tenant Support (3.1)
14. Authentication (3.2)
15. Real-Time Chat (3.3)

---

## Notes

- All components should follow existing patterns (standalone, OnPush, async pipes)
- All database operations should go through SupabaseService
- Use shared components and utilities where possible
- Follow existing file structure and naming conventions
- Add proper error handling and empty states
- Ensure real-time updates work correctly
- Test on mobile/responsive layouts
