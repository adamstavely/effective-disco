import { getSupabaseClient } from '../client';
import * as agentsFunctions from './agents';

const supabase = getSupabaseClient();

export interface ExecutionStepData {
  toolName?: string;
  input?: any;
  output?: any;
  duration?: number;
  error?: string;
  message?: string;
}

/**
 * Log an execution step to the activities table
 */
export async function logExecutionStep(
  taskId: string,
  agentId: string | null,
  stepData: ExecutionStepData,
  stepStatus: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' = 'running'
): Promise<string> {
  // Get task to retrieve tenant_id
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('tenant_id')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    throw new Error(`Task ${taskId} not found`);
  }

  // Get next step order
  const { data: stepOrderData, error: stepOrderError } = await supabase
    .rpc('get_next_step_order', { p_task_id: taskId });

  if (stepOrderError) {
    throw stepOrderError;
  }

  const stepOrder = stepOrderData || 1;

  // Get agent name for originator
  let agentName = 'System';
  if (agentId) {
    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('name')
        .eq('id', agentId)
        .single();
      agentName = agent?.name || 'Unknown Agent';
    } catch (e) {
      // Ignore error, use default
    }
  }

  // Create activity entry
  const message = stepData.message || `${stepData.toolName || 'Step'} ${stepStatus}`;
  
  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      type: 'execution_step',
      agent_id: agentId,
      task_id: taskId,
      tenant_id: task.tenant_id,
      message,
      event_tag: 'execution',
      originator: agentName,
      step_details: stepData,
      step_status: stepStatus,
      step_order: stepOrder,
      created_at: Date.now()
    })
    .select('id')
    .single();

  if (error) throw error;

  // Update task's current_step_id if this is the running step
  if (stepStatus === 'running' && activity?.id) {
    await supabase
      .from('tasks')
      .update({ current_step_id: activity.id })
      .eq('id', taskId);
  }

  return activity.id;
}

/**
 * Get all execution steps for a task
 */
export async function getTaskExecutionSteps(taskId: string) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('task_id', taskId)
    .eq('type', 'execution_step')
    .order('step_order', { ascending: true });

  if (error) throw error;

  return data?.map(activity => ({
    ...activity,
    _id: activity.id,
    _creationTime: activity.created_at,
    agentId: activity.agent_id,
    taskId: activity.task_id,
    eventTag: activity.event_tag,
    originator: activity.originator,
    stepDetails: activity.step_details,
    stepStatus: activity.step_status,
    stepOrder: activity.step_order
  })) || [];
}

/**
 * Pause task execution
 */
export async function pauseTaskExecution(taskId: string): Promise<void> {
  // Update execution state
  const { error } = await supabase.rpc('update_task_execution_state', {
    p_task_id: taskId,
    p_execution_state: 'paused'
  });

  if (error) throw error;

  // Log pause activity
  const { data: task } = await supabase
    .from('tasks')
    .select('tenant_id')
    .eq('id', taskId)
    .single();

  if (task) {
    await supabase
      .from('activities')
      .insert({
        type: 'execution_paused',
        agent_id: null,
        task_id: taskId,
        tenant_id: task.tenant_id,
        message: 'Task execution paused',
        event_tag: 'execution',
        originator: 'User',
        created_at: Date.now()
      });
  }
}

/**
 * Resume task execution
 */
export async function resumeTaskExecution(taskId: string): Promise<void> {
  // Update execution state
  const { error } = await supabase.rpc('update_task_execution_state', {
    p_task_id: taskId,
    p_execution_state: 'running'
  });

  if (error) throw error;

  // Log resume activity
  const { data: task } = await supabase
    .from('tasks')
    .select('tenant_id')
    .eq('id', taskId)
    .single();

  if (task) {
    await supabase
      .from('activities')
      .insert({
        type: 'execution_resumed',
        agent_id: null,
        task_id: taskId,
        tenant_id: task.tenant_id,
        message: 'Task execution resumed',
        event_tag: 'execution',
        originator: 'User',
        created_at: Date.now()
      });
  }
}

/**
 * Interrupt task execution
 */
export async function interruptTaskExecution(taskId: string, reason?: string): Promise<void> {
  // Update execution state
  const { error } = await supabase.rpc('update_task_execution_state', {
    p_task_id: taskId,
    p_execution_state: 'idle'
  });

  if (error) throw error;

  // Log interrupt activity
  const { data: task } = await supabase
    .from('tasks')
    .select('tenant_id')
    .eq('id', taskId)
    .single();

  if (task) {
    await supabase
      .from('activities')
      .insert({
        type: 'execution_interrupted',
        agent_id: null,
        task_id: taskId,
        tenant_id: task.tenant_id,
        message: reason || 'Task execution interrupted',
        event_tag: 'execution',
        originator: 'User',
        created_at: Date.now()
      });
  }
}

/**
 * Check current execution state of a task
 */
export async function checkTaskExecutionState(taskId: string): Promise<string> {
  const { data, error } = await supabase
    .from('tasks')
    .select('execution_state')
    .eq('id', taskId)
    .single();

  if (error) throw error;

  return data?.execution_state || 'idle';
}

/**
 * Update step status
 */
export async function updateStepStatus(
  stepId: string,
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
  stepData?: Partial<ExecutionStepData>
): Promise<void> {
  const updateData: any = {
    step_status: status
  };

  if (stepData) {
    // Merge step_details
    const { data: existing } = await supabase
      .from('activities')
      .select('step_details')
      .eq('id', stepId)
      .single();

    const existingDetails = existing?.step_details || {};
    updateData.step_details = { ...existingDetails, ...stepData };
  }

  const { error } = await supabase
    .from('activities')
    .update(updateData)
    .eq('id', stepId);

  if (error) throw error;
}
