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
    taskId: activity.task_id
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
    taskId: activity.task_id
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
    taskId: activity.task_id
  })) || [];
}
