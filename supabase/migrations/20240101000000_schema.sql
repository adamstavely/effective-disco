-- Mission Control Database Schema (PostgreSQL)
-- Migration from Convex to Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('idle', 'active', 'blocked')),
    current_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    session_key VARCHAR(255) UNIQUE NOT NULL,
    level VARCHAR(50) NOT NULL CHECK (level IN ('intern', 'specialist', 'lead')),
    last_heartbeat BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    avatar VARCHAR(255),
    role_tag VARCHAR(50),
    system_prompt TEXT,
    character TEXT,
    lore TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_session_key ON agents(session_key);
CREATE INDEX idx_agents_status ON agents(status);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('inbox', 'assigned', 'in_progress', 'review', 'done', 'blocked', 'archived')),
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    tags TEXT[] DEFAULT '{}',
    border_color VARCHAR(7),
    started_at BIGINT,
    last_message_at BIGINT,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Task assignments (many-to-many relationship)
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, agent_id)
);

CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_agent ON task_assignments(agent_id);

-- Chat threads table
-- Users chat WITH agents, not AS agents
CREATE TABLE chat_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500),
    created_by UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE, -- kept for backward compatibility
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE, -- the agent the user is chatting with
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX idx_chat_threads_created_at ON chat_threads(created_at DESC);
CREATE INDEX idx_chat_threads_created_by ON chat_threads(created_by);
CREATE INDEX idx_chat_threads_agent ON chat_threads(agent_id);

-- Messages table
-- from_agent_id can be NULL for user messages in chat threads
-- For task messages, from_agent_id should always be set (agents post to tasks)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    chat_thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
    from_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE, -- NULL = user message, UUID = agent message
    content TEXT NOT NULL,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    CHECK ((task_id IS NOT NULL) OR (chat_thread_id IS NOT NULL)),
    CHECK ((task_id IS NULL) OR (from_agent_id IS NOT NULL)) -- Task messages must have from_agent_id
);

CREATE INDEX idx_messages_task ON messages(task_id);
CREATE INDEX idx_messages_chat_thread ON messages(chat_thread_id);
CREATE INDEX idx_messages_agent ON messages(from_agent_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Message attachments (many-to-many)
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_attachments_message ON message_attachments(message_id);

-- Message mentions (many-to-many)
CREATE TABLE message_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, agent_id)
);

CREATE INDEX idx_message_mentions_message ON message_mentions(message_id);
CREATE INDEX idx_message_mentions_agent ON message_mentions(agent_id);

-- Activities table
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    event_tag VARCHAR(100),
    originator VARCHAR(255),
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_task ON activities(task_id);
CREATE INDEX idx_activities_agent ON activities(agent_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_event_tag ON activities(event_tag);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deliverable', 'research', 'protocol', 'other')),
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    path VARCHAR(500),
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX idx_documents_task ON documents(task_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_message ON documents(message_id);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentioned_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    delivered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX idx_notifications_agent ON notifications(mentioned_agent_id);
CREATE INDEX idx_notifications_undelivered ON notifications(mentioned_agent_id, delivered) WHERE delivered = FALSE;

-- Thread subscriptions table
CREATE TABLE thread_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    subscribed_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    UNIQUE(agent_id, task_id)
);

CREATE INDEX idx_thread_subscriptions_agent ON thread_subscriptions(agent_id);
CREATE INDEX idx_thread_subscriptions_task ON thread_subscriptions(task_id);
CREATE INDEX idx_thread_subscriptions_agent_task ON thread_subscriptions(agent_id, task_id);

-- Proposals table
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

CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX idx_proposals_source ON proposals(source);

-- Costs table
CREATE TABLE costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    amount DECIMAL(10, 4) NOT NULL, -- Cost in dollars
    source VARCHAR(100) NOT NULL, -- 'llm_api', 'tool_usage', etc.
    metadata JSONB, -- Additional context
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX idx_costs_agent_date ON costs(agent_id, created_at DESC);
CREATE INDEX idx_costs_created_at ON costs(created_at DESC);

-- Budget table
CREATE TABLE budget (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_limit DECIMAL(10, 2), -- Daily budget limit
    monthly_limit DECIMAL(10, 2), -- Monthly budget limit
    current_daily_spend DECIMAL(10, 2) DEFAULT 0,
    current_monthly_spend DECIMAL(10, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create activity when task is created
CREATE OR REPLACE FUNCTION create_task_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activities (type, agent_id, task_id, message, created_at, event_tag, originator)
    VALUES ('task_created', NULL, NEW.id, 'Task "' || NEW.title || '" created', NEW.created_at, 'creation', 'System');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER task_created_activity AFTER INSERT ON tasks
    FOR EACH ROW EXECUTE FUNCTION create_task_activity();

-- Function to create activity when message is sent
CREATE OR REPLACE FUNCTION create_message_activity()
RETURNS TRIGGER AS $$
DECLARE
    agent_name VARCHAR(255);
BEGIN
    SELECT name INTO agent_name FROM agents WHERE id = NEW.from_agent_id;
    
    -- Only create activity for task-related messages
    IF NEW.task_id IS NOT NULL THEN
        INSERT INTO activities (type, agent_id, task_id, message, created_at, event_tag, originator)
        VALUES ('message_sent', NEW.from_agent_id, NEW.task_id, 
                COALESCE(agent_name, 'Agent') || ' commented on task', NEW.created_at, 'message', COALESCE(agent_name, 'Agent'));
        
        -- Auto-subscribe agent to thread
        INSERT INTO thread_subscriptions (agent_id, task_id, subscribed_at)
        VALUES (NEW.from_agent_id, NEW.task_id, NEW.created_at)
        ON CONFLICT (agent_id, task_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER message_sent_activity AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION create_message_activity();

-- Function to update last_message_at on tasks when message is created
CREATE OR REPLACE FUNCTION update_task_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.task_id IS NOT NULL THEN
        UPDATE tasks
        SET last_message_at = NEW.created_at
        WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_task_last_message_trigger AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_task_last_message_at();

-- Function to create notifications for mentions
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (mentioned_agent_id, content, task_id, delivered, created_at)
    SELECT 
        agent_id,
        NEW.content,
        NEW.task_id,
        FALSE,
        NEW.created_at
    FROM message_mentions
    WHERE message_id = NEW.id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER mention_notifications AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION create_mention_notifications();

-- Function to notify thread subscribers
CREATE OR REPLACE FUNCTION notify_thread_subscribers()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify for task-related messages
    IF NEW.task_id IS NOT NULL THEN
        INSERT INTO notifications (mentioned_agent_id, content, task_id, delivered, created_at)
        SELECT 
            ts.agent_id,
            NEW.content,
            NEW.task_id,
            FALSE,
            NEW.created_at
        FROM thread_subscriptions ts
        WHERE ts.task_id = NEW.task_id AND ts.agent_id != NEW.from_agent_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER thread_subscriber_notifications AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION notify_thread_subscribers();

-- Function to update chat_thread updated_at
CREATE OR REPLACE FUNCTION update_chat_thread_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.chat_thread_id IS NOT NULL THEN
        UPDATE chat_threads
        SET updated_at = EXTRACT(EPOCH FROM NOW()) * 1000
        WHERE id = NEW.chat_thread_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_thread_updated_at_trigger AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_chat_thread_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now - can be restricted later)
CREATE POLICY "Allow all operations on agents" ON agents FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on messages" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all operations on activities" ON activities FOR ALL USING (true);
CREATE POLICY "Allow all operations on documents" ON documents FOR ALL USING (true);
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow all operations on thread_subscriptions" ON thread_subscriptions FOR ALL USING (true);
CREATE POLICY "Allow all operations on proposals" ON proposals FOR ALL USING (true);
CREATE POLICY "Allow all operations on costs" ON costs FOR ALL USING (true);
CREATE POLICY "Allow all operations on budget" ON budget FOR ALL USING (true);
CREATE POLICY "Allow all operations on chat_threads" ON chat_threads FOR ALL USING (true);
