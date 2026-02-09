import { getSupabaseClient } from '../client';
import * as messagesFunctions from './messages';
import * as agentsFunctions from './agents';
import * as notificationsFunctions from './notifications';

const supabase = getSupabaseClient();

export async function getAllTasks(status?: string, tenantId?: string) {
  let query = supabase.from('tasks').select(`
    *,
    task_assignments (
      agent_id
    )
  `);
  
  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  
  // Transform to match expected format
  return data?.map(task => ({
    ...task,
    _id: task.id,
    _creationTime: task.created_at,
    assigneeIds: task.task_assignments?.map((ta: any) => ta.agent_id) || []
  })) || [];
}

export async function getTaskById(taskId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_assignments (
        agent_id
      )
    `)
    .eq('id', taskId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  
  if (!data) return null;
  
  return {
    ...data,
    _id: data.id,
    _creationTime: data.created_at,
    assigneeIds: data.task_assignments?.map((ta: any) => ta.agent_id) || []
  };
}

export async function getTasksByAssignee(agentId: string) {
  const { data, error } = await supabase
    .from('task_assignments')
    .select(`
      task_id,
      tasks (*)
    `)
    .eq('agent_id', agentId);
  
  if (error) throw error;
  
  return data?.map((ta: any) => ({
    ...ta.tasks,
    _id: ta.tasks.id,
    _creationTime: ta.tasks.created_at,
    assigneeIds: [agentId]
  })) || [];
}

export async function createTask(params: {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assigneeIds?: string[];
  tenantId: string;
}) {
  const now = Date.now();
  
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      title: params.title,
      description: params.description,
      status: params.assigneeIds && params.assigneeIds.length > 0 ? 'assigned' : 'inbox',
      priority: params.priority,
      created_at: now,
      updated_at: now,
      tenant_id: params.tenantId
    })
    .select()
    .single();
  
  if (taskError) throw taskError;
  
  // Create assignments if provided
  if (params.assigneeIds && params.assigneeIds.length > 0) {
    const assignments = params.assigneeIds.map(agentId => ({
      task_id: task.id,
      agent_id: agentId,
      tenant_id: params.tenantId
    }));
    
    const { error: assignError } = await supabase
      .from('task_assignments')
      .insert(assignments);
    
    if (assignError) throw assignError;
  }
  
  return {
    ...task,
    _id: task.id,
    _creationTime: task.created_at,
    assigneeIds: params.assigneeIds || []
  };
}

export async function updateTask(
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    status?: 'inbox' | 'assigned' | 'in_progress' | 'review' | 'done' | 'blocked' | 'archived';
    priority?: 'low' | 'medium' | 'high';
    assigneeIds?: string[];
    tags?: string[];
    borderColor?: string;
    startedAt?: number;
  }
) {
  const updateData: any = {
    updated_at: Date.now()
  };
  
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.borderColor !== undefined) updateData.border_color = updates.borderColor;
  if (updates.startedAt !== undefined) updateData.started_at = updates.startedAt;
  
  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId);
  
  if (error) throw error;
  
  // Update assignments if provided
  if (updates.assigneeIds !== undefined) {
    // Delete existing assignments
    await supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', taskId);
    
    // Insert new assignments
    if (updates.assigneeIds.length > 0) {
      const assignments = updates.assigneeIds.map(agentId => ({
        task_id: taskId,
        agent_id: agentId
      }));
      
      await supabase
        .from('task_assignments')
        .insert(assignments);
    }
    
    // Update task status based on assignments
    if (updates.assigneeIds.length > 0 && !updates.status) {
      await supabase
        .from('tasks')
        .update({ status: 'assigned' })
        .eq('id', taskId);
    }
  }
}

export async function assignTask(taskId: string, assigneeIds: string[]) {
  // Delete existing assignments
  await supabase
    .from('task_assignments')
    .delete()
    .eq('task_id', taskId);
  
  // Insert new assignments
  if (assigneeIds.length > 0) {
    const assignments = assigneeIds.map(agentId => ({
      task_id: taskId,
      agent_id: agentId
    }));
    
    await supabase
      .from('task_assignments')
      .insert(assignments);
  }
  
  // Update task status
  await supabase
    .from('tasks')
    .update({
      status: assigneeIds.length > 0 ? 'assigned' : 'inbox',
      updated_at: Date.now()
    })
    .eq('id', taskId);
  
  // Create activity (handled by trigger, but we can add custom message)
  await supabase
    .from('activities')
    .insert({
      type: 'task_assigned',
      agent_id: null,
      task_id: taskId,
      message: `Task assigned to ${assigneeIds.length} agent(s)`,
      created_at: Date.now()
    });
}

/**
 * Resume a task by building a comprehensive prompt and notifying the assigned agent
 * This function fetches task details, messages, and agent information to build
 * a prompt that helps the agent resume work on the task.
 */
export async function resumeTask(taskId: string) {
  // Fetch task details
  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  // Get assignees
  const assigneeIds = task.assigneeIds || [];
  if (assigneeIds.length === 0) {
    throw new Error(`Task ${taskId} has no assignees`);
  }

  // Use the first assignee (primary agent)
  const primaryAgentId = assigneeIds[0];

  // Fetch agent details
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', primaryAgentId)
    .single();

  if (agentError || !agent) {
    throw new Error(`Agent ${primaryAgentId} not found`);
  }

  // Fetch messages/thread
  const messages = await messagesFunctions.getMessagesByTask(taskId);

  // Build comprehensive prompt
  let prompt = `RESUME TASK: ${task.title}\n\n`;
  
  // Add agent context
  if (agent.system_prompt) {
    prompt += `System Prompt: ${agent.system_prompt}\n\n`;
  }
  
  if (agent.character) {
    prompt += `Character: ${agent.character}\n\n`;
  }
  
  if (agent.lore) {
    prompt += `Lore/Background: ${agent.lore}\n\n`;
  }

  // Add task details
  prompt += `Task Title: ${task.title}\n`;
  prompt += `Task Description: ${task.description || 'No description'}\n`;
  prompt += `Task Status: ${task.status}\n`;
  prompt += `Task Priority: ${task.priority}\n`;
  
  if (task.tags && task.tags.length > 0) {
    prompt += `Tags: ${task.tags.join(', ')}\n`;
  }
  
  prompt += `\n`;

  // Add conversation thread
  if (messages.length > 0) {
    prompt += `Conversation Thread:\n`;
    prompt += `---\n`;
    
    // Sort messages by creation time (oldest first)
    const sortedMessages = [...messages].sort((a, b) => 
      (a.created_at || a._creationTime) - (b.created_at || b._creationTime)
    );
    
    for (const message of sortedMessages) {
      const agentName = agent.name || 'Agent';
      prompt += `${agentName}: ${message.content}\n\n`;
    }
    
    prompt += `---\n\n`;
  }

  // Add resume instruction
  prompt += `Please resume work on this task. Review the conversation thread above and continue from where you left off. `;
  prompt += `Update the task status and create any necessary documents or messages as you progress.`;

  // Create notification for the agent
  await supabase
    .from('notifications')
    .insert({
      mentioned_agent_id: primaryAgentId,
      content: prompt,
      task_id: taskId,
      delivered: false,
      created_at: Date.now()
    });

  // Update task status to "in_progress"
  await updateTask(taskId, {
    status: 'in_progress'
  });

  // Create activity
  await supabase
    .from('activities')
    .insert({
      type: 'status_changed',
      agent_id: primaryAgentId,
      task_id: taskId,
      message: `Task "${task.title}" resumed - agent ${agent.name} notified to continue work`,
      created_at: Date.now()
    });

  return {
    success: true,
    agentId: primaryAgentId,
    agentName: agent.name,
    prompt
  };
}
