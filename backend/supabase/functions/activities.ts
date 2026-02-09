import { getSupabaseClient } from '../client';

const supabase = getSupabaseClient();

export async function getActivityFeed(limit: number = 50) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return data?.map(activity => ({
    ...activity,
    _id: activity.id,
    _creationTime: activity.created_at,
    agentId: activity.agent_id,
    taskId: activity.task_id,
    eventTag: activity.event_tag,
    originator: activity.originator
  })) || [];
}

export async function getActivitiesByType(type: string, limit: number = 50) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return data?.map(activity => ({
    ...activity,
    _id: activity.id,
    _creationTime: activity.created_at,
    agentId: activity.agent_id,
    taskId: activity.task_id,
    eventTag: activity.event_tag,
    originator: activity.originator
  })) || [];
}

export async function getActivitiesByAgent(agentId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return data?.map(activity => ({
    ...activity,
    _id: activity.id,
    _creationTime: activity.created_at,
    agentId: activity.agent_id,
    taskId: activity.task_id,
    eventTag: activity.event_tag,
    originator: activity.originator
  })) || [];
}

export async function getActivitiesByTask(taskId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
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

export async function getExecutionStepsByTask(taskId: string) {
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
