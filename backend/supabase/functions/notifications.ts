import { getSupabaseClient } from '../client';

const supabase = getSupabaseClient();

export async function getUndeliveredNotifications(agentId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('mentioned_agent_id', agentId)
    .eq('delivered', false)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  return data?.map(notif => ({
    ...notif,
    _id: notif.id,
    _creationTime: notif.created_at,
    mentionedAgentId: notif.mentioned_agent_id,
    taskId: notif.task_id
  })) || [];
}

export async function markNotificationDelivered(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ delivered: true })
    .eq('id', notificationId);
  
  if (error) throw error;
}

export async function markAllNotificationsDelivered(agentId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ delivered: true })
    .eq('mentioned_agent_id', agentId)
    .eq('delivered', false);
  
  if (error) throw error;
}
