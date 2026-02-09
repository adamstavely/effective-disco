-- Migration: Add Task Dependencies System
-- Phase 3: Task Management Enhancements

-- Create task_dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_tenant ON task_dependencies(tenant_id);

-- Add RLS policies (if RLS is enabled)
-- Note: Adjust policies based on your tenant isolation strategy
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view dependencies for tasks in their tenant
CREATE POLICY "Users can view task dependencies in their tenant"
    ON task_dependencies FOR SELECT
    USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE id = (SELECT current_setting('app.current_tenant_id', true)::UUID)
        )
    );

-- Policy: Users can create dependencies for tasks in their tenant
CREATE POLICY "Users can create task dependencies in their tenant"
    ON task_dependencies FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants WHERE id = (SELECT current_setting('app.current_tenant_id', true)::UUID)
        )
    );

-- Policy: Users can delete dependencies for tasks in their tenant
CREATE POLICY "Users can delete task dependencies in their tenant"
    ON task_dependencies FOR DELETE
    USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE id = (SELECT current_setting('app.current_tenant_id', true)::UUID)
        )
    );

-- Function to check for circular dependencies before insert
CREATE OR REPLACE FUNCTION check_circular_dependency()
RETURNS TRIGGER AS $$
DECLARE
    visited_tasks UUID[] := ARRAY[NEW.task_id];
    current_task UUID;
    dependency_task UUID;
BEGIN
    -- Check if creating this dependency would create a cycle
    -- Start from the task we're depending on
    current_task := NEW.depends_on_task_id;
    
    WHILE current_task IS NOT NULL LOOP
        -- If we've visited this task before, we have a cycle
        IF current_task = ANY(visited_tasks) THEN
            RAISE EXCEPTION 'Circular dependency detected: Cannot create dependency that would form a cycle';
        END IF;
        
        -- Add current task to visited list
        visited_tasks := array_append(visited_tasks, current_task);
        
        -- Find the next dependency
        SELECT depends_on_task_id INTO dependency_task
        FROM task_dependencies
        WHERE task_id = current_task
        LIMIT 1;
        
        current_task := dependency_task;
        
        -- If no more dependencies, we're done
        IF current_task IS NULL THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check for circular dependencies
CREATE TRIGGER check_circular_dependency_trigger
    BEFORE INSERT ON task_dependencies
    FOR EACH ROW
    EXECUTE FUNCTION check_circular_dependency();

-- Function to auto-update blocked tasks when dependencies complete
CREATE OR REPLACE FUNCTION update_blocked_tasks_on_dependency_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- When a task is marked as 'done', check if any blocked tasks depend on it
    IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
        -- Update tasks that depend on this completed task
        UPDATE tasks
        SET status = 'assigned'
        WHERE id IN (
            SELECT task_id
            FROM task_dependencies
            WHERE depends_on_task_id = NEW.id
        )
        AND status = 'blocked';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update blocked tasks
CREATE TRIGGER update_blocked_tasks_trigger
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN (NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done'))
    EXECUTE FUNCTION update_blocked_tasks_on_dependency_completion();

-- Function to automatically set task status to 'blocked' if it has incomplete dependencies
CREATE OR REPLACE FUNCTION check_task_dependencies()
RETURNS TRIGGER AS $$
BEGIN
    -- If task has dependencies that aren't done, set status to blocked
    IF EXISTS (
        SELECT 1
        FROM task_dependencies td
        JOIN tasks t ON t.id = td.depends_on_task_id
        WHERE td.task_id = NEW.id
        AND t.status != 'done'
    ) THEN
        -- Only set to blocked if it's not already done or archived
        IF NEW.status NOT IN ('done', 'archived') THEN
            NEW.status := 'blocked';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check dependencies when task status changes
CREATE TRIGGER check_task_dependencies_trigger
    BEFORE INSERT OR UPDATE OF status ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION check_task_dependencies();
