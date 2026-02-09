---
name: Missing Features Analysis
overview: Analyze screenshots from another Mission Control system and create a plan documenting features present in those screenshots but missing from our current codebase.
todos: []
isProject: false
---

# Missing Features Analysis

Based on the screenshots provided, here are the features present in the reference Mission Control system that are **not currently implemented** in our codebase:

## 1. Proposal Management System

**Current State:** No proposal system exists. Tasks are created directly.

**Missing Features:**

- **Proposals Table** - Database schema for proposals with fields:
- Title, description, source (agent/system), priority
- Status (pending, approved, rejected)
- Proposed steps/phases
- Timestamps
- **Proposal List View** - Dedicated "Proposals" page with:
- Tabbed filtering (All, Pending, Approved, Rejected) with counts
- Rich proposal cards showing title, description, status badges
- Structured "PROPOSED STEPS" list
- Metadata (source, priority, timestamp)
- **Proposal Approval UI** - Interactive approve/reject buttons in the dashboard
- **Proposal-to-Mission Workflow** - Converting approved proposals into missions/tasks

**Files to Create/Modify:**

- `backend/supabase/schema.sql` - Add `proposals` table
- `backend/supabase/functions/proposals.ts` - CRUD operations
- `frontend/src/app/components/proposals/` - New component directory
- `frontend/src/app/models/types.ts` - Add Proposal interface

## 2. Real-Time Chat System

**Current State:** Messages exist only within task threads. No direct user-to-agent or agent-to-agent chat.

**Missing Features:**

- **Chat Interface** - "Chat" button in top nav that opens a chat panel
- **Direct Messaging** - User can chat with any agent directly (not tied to tasks)
- **Agent-to-Agent Messaging** - Agents can message each other through Mission Control
- **Chat Messages Table** - Separate from task messages, with:
- Sender/receiver (agent or user)
- Chat thread/conversation ID
- Real-time updates via SSE or WebSocket
- **Connection Status Indicator** - "Connected" status with green dot in top nav

**Files to Create/Modify:**

- `backend/supabase/schema.sql` - Add `chat_messages` or extend `messages` table
- `backend/supabase/functions/chat.ts` - Chat-specific functions
- `frontend/src/app/components/chat/` - Chat component
- `frontend/src/app/components/top-nav/top-nav.component.html` - Add Chat button

## 3. Quick Stats Dashboard

**Current State:** Top nav shows only "AGENTS ACTIVE" and "TASKS IN QUEUE".

**Missing Features:**

- **Right Sidebar Stats Panel** - "QUICK STATS" section showing:
- PROPOSALS TODAY (count)
- MISSIONS COMPLETED (total count)
- SUCCESS RATE (percentage)
- COST TODAY (dollar amount)
- BUDGET REMAINING (dollar amount)
- **Cost Tracking System** - Database and logic to track:
- Per-agent costs (from LLM API usage)
- Daily aggregated costs
- Budget limits and remaining budget
- **Success Rate Calculation** - Logic to compute success rate based on completed vs failed missions

**Files to Create/Modify:**

- `backend/supabase/schema.sql` - Add `costs` or `budget` table
- `backend/supabase/functions/stats.ts` - Statistics aggregation functions
- `frontend/src/app/components/quick-stats/` - New component
- `frontend/src/app/dashboard/dashboard.component.html` - Add quick-stats panel

## 4. Agent Detail View

**Current State:** Agent cards show basic info. Clicking an agent doesn't show detailed view.

**Missing Features:**

- **Agent Detail Page/Modal** - Clicking an agent shows:
- Agent profile (name, avatar, role, description, status)
- Agent-specific metrics cards:
- MISSIONS (count)
- STEPS DONE (count)
- COST TODAY (dollar amount)
- EVENTS (count)
- "RECENT MISSIONS" section (list of missions for this agent)
- "RECENT STEPS" section (chronological list with:
- Task title and description
- Status (SUCCEEDED/FAILED) with visual indicators
- Relative timestamps ("1h ago", "2h ago")
- Expandable details
- **Back Navigation** - "<< Back" button to return to agent list

**Files to Create/Modify:**

- `frontend/src/app/components/agent-detail/` - New component directory
- `frontend/src/app/components/agents-panel/agents-panel.component.ts` - Handle agent selection
- `backend/supabase/functions/stats.ts` - Add agent-specific stats queries

## 5. Mission Progress Workflow Visualization

**Current State:** Mission queue shows Kanban board. No workflow visualization.

**Missing Features:**

- **Workflow Flow Diagram** - Horizontal flow showing:
- PROPOSALS (with "X pending" count)
- MISSIONS (with "X running" count)
- STEPS (with "X in progress" count)
- COMPLETED (with "X today" count)
- **Visual Flow Arrows** - Connecting boxes to show progression
- **Real-time Counts** - Each stage shows current counts

**Files to Create/Modify:**

- `frontend/src/app/components/workflow-visualization/` - New component
- `frontend/src/app/dashboard/dashboard.component.html` - Add workflow section

## 6. Enhanced Agent Roster

**Current State:** Basic agent cards with name, role, level, status.

**Missing Features:**

- **Role Tags** - Short role identifiers (e.g., "builder", "comms", "creative")
- **Detailed Role Descriptions** - More descriptive role titles (e.g., "Builder & Executor", "Communications")
- **Agent Avatars** - Visual identifiers (colored squares/dots or icons) for each agent
- **Enhanced Status Display** - More prominent idle/active status with color coding

**Files to Modify:**

- `frontend/src/app/components/agent-card/agent-card.component.html` - Enhance display
- `backend/supabase/schema.sql` - Add `role_tag` and `avatar_color` fields to agents table

## 7. Enhanced Live Event Stream

**Current State:** Live feed shows activities with basic filtering.

**Missing Features:**

- **Event Type Indicators** - Visual bullets (green for completed/claimed, grey for new/created)
- **Event Tags** - Small labels on right edge (e.g., "proposal_created", "mission_created", "step_completed", "step_claimed")
- **Rich Event Descriptions** - More detailed event messages with context
- **Originator Display** - Shows if event was from "System" or specific agent name

**Files to Modify:**

- `frontend/src/app/components/activity-item/activity-item.component.html` - Enhance display
- `backend/supabase/schema.sql` - Add `event_tag` and `originator` fields to activities table

## 8. Database Schema Additions

**New Tables Needed:**

- `proposals` - Proposal management
- `costs` or `budget` - Financial tracking
- `chat_messages` (or extend `messages`) - Direct messaging

**Schema Modifications:**

- `agents` table - Add `role_tag`, `avatar_color`, `description` fields
- `activities` table - Add `event_tag`, `originator` fields
- `tasks` table - Consider adding `proposal_id` foreign key for linking

## 9. Backend Functions Needed

**New Function Files:**

- `backend/supabase/functions/proposals.ts` - Proposal CRUD and approval
- `backend/supabase/functions/chat.ts` - Chat messaging
- `backend/supabase/functions/stats.ts` - Statistics aggregation (costs, success rates, agent metrics)
- `backend/supabase/functions/costs.ts` - Cost tracking and budget management

## 10. Frontend Components Needed

**New Component Directories:**

- `frontend/src/app/components/proposals/` - Proposal list and detail views
- `frontend/src/app/components/chat/` - Chat interface
- `frontend/src/app/components/quick-stats/` - Statistics panel
- `frontend/src/app/components/agent-detail/` - Agent detail view
- `frontend/src/app/components/workflow-visualization/` - Workflow diagram

## Implementation Priority Recommendations

1. **High Priority:**

- Proposal Management System (core workflow feature)
- Quick Stats Dashboard (key metrics visibility)
- Agent Detail View (enhanced agent insights)

2. **Medium Priority:**

- Real-Time Chat System (user-agent communication)
- Mission Progress Workflow Visualization (visual overview)
- Enhanced Agent Roster (better UX)

3. **Low Priority:**

- Enhanced Live Event Stream (polish existing feature)
- Cost Tracking System (if budget management is needed)