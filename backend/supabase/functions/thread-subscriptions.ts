import { getSupabaseClient } from '../client';

const supabase = getSupabaseClient();

export async function subscribeToThread(agentId: string, taskId: string) {
  const { error } = await supabase
    .from('thread_subscriptions')
    .insert({
      agent_id: agentId,
      task_id: taskId,
      subscribed_at: Date.now()
    });
  
  // Ignore duplicate key errors
  if (error && error.code !== '23505') throw error;
}

export async function getThreadSubscribers(taskId: string) {
  const { data, error } = await supabase
    .from('thread_subscriptions')
    .select('agent_id')
    .eq('task_id', taskId);
  
  if (error) throw error;
  
  return data?.map(sub => sub.agent_id) || [];
}
