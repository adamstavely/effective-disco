import { getSupabaseClient } from '../client';

const supabase = getSupabaseClient();

export interface ChatMessage {
  id: string;
  chat_thread_id: string;
  from_agent_id: string | null;
  content: string;
  created_at: number;
  tenant_id: string;
}

export interface ChatThread {
  id: string;
  agent_id: string | null;
  participant_agent_ids: string[] | null;
  tenant_id: string;
  title: string | null;
}

/**
 * Get unprocessed chat messages for a specific agent
 * This includes:
 * 1. User messages (from_agent_id IS NULL) in user-to-agent threads
 * 2. Agent messages (from_agent_id IS NOT NULL) in agent-to-agent threads
 */
export async function getUnprocessedChatMessages(agentId: string, tenantId: string): Promise<ChatMessage[]> {
  // Get user-to-agent threads for this agent
  const { data: userThreads, error: userThreadsError } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId);
  
  if (userThreadsError) throw userThreadsError;
  
  // Get agent-to-agent threads where this agent is a participant
  const { data: agentThreads, error: agentThreadsError } = await supabase
    .from('chat_threads')
    .select('id')
    .not('participant_agent_ids', 'is', null)
    .contains('participant_agent_ids', [agentId])
    .eq('tenant_id', tenantId);
  
  if (agentThreadsError) throw agentThreadsError;
  
  const allThreadIds = [
    ...(userThreads || []).map(t => t.id),
    ...(agentThreads || []).map(t => t.id)
  ];
  
  if (allThreadIds.length === 0) return [];
  
  // Get unprocessed messages from these threads
  // For user-to-agent: user messages (from_agent_id IS NULL)
  // For agent-to-agent: agent messages (from_agent_id IS NOT NULL AND != agentId)
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .in('chat_thread_id', allThreadIds)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });
  
  if (messagesError) throw messagesError;
  
  // Filter messages:
  // - User messages in user-to-agent threads
  // - Agent messages in agent-to-agent threads (from other agents)
  const relevantMessages = (messages || []).filter(msg => {
    const isUserThread = userThreads?.some(t => t.id === msg.chat_thread_id);
    const isAgentThread = agentThreads?.some(t => t.id === msg.chat_thread_id);
    
    if (isUserThread && msg.from_agent_id === null) {
      return true; // User message in user-to-agent thread
    }
    if (isAgentThread && msg.from_agent_id !== null && msg.from_agent_id !== agentId) {
      return true; // Agent message from another agent in agent-to-agent thread
    }
    return false;
  });
  
  // Filter to only messages that have undelivered notifications for this agent
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('content, created_at')
    .eq('mentioned_agent_id', agentId)
    .eq('delivered', false)
    .is('task_id', null) // Chat notifications only
    .eq('tenant_id', tenantId);
  
  if (notifError) throw notifError;
  
  // Match messages to notifications (by content and timestamp)
  const unprocessedMessages: ChatMessage[] = [];
  for (const message of relevantMessages) {
    const hasUndeliveredNotif = notifications?.some(
      n => n.content === message.content && 
           Math.abs(n.created_at - message.created_at) < 1000 // Within 1 second
    );
    
    if (hasUndeliveredNotif) {
      unprocessedMessages.push({
        id: message.id,
        chat_thread_id: message.chat_thread_id,
        from_agent_id: message.from_agent_id,
        content: message.content,
        created_at: message.created_at,
        tenant_id: message.tenant_id
      });
    }
  }
  
  return unprocessedMessages;
}

/**
 * Get chat history for a thread (all messages in order)
 */
export async function getChatHistory(threadId: string, tenantId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_thread_id', threadId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  return (data || []).map(msg => ({
    id: msg.id,
    chat_thread_id: msg.chat_thread_id,
    from_agent_id: msg.from_agent_id,
    content: msg.content,
    created_at: msg.created_at,
    tenant_id: msg.tenant_id
  }));
}

/**
 * Get chat thread details
 */
export async function getChatThread(threadId: string, tenantId: string): Promise<ChatThread | null> {
  const { data, error } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('id', threadId)
    .eq('tenant_id', tenantId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data ? {
    id: data.id,
    agent_id: data.agent_id,
    participant_agent_ids: data.participant_agent_ids,
    tenant_id: data.tenant_id,
    title: data.title
  } : null;
}

/**
 * Create agent response message in chat thread
 */
export async function createAgentChatMessage(
  threadId: string,
  agentId: string,
  content: string,
  tenantId: string
): Promise<string> {
  const now = Date.now();
  
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_thread_id: threadId,
      from_agent_id: agentId,
      content: content,
      created_at: now,
      tenant_id: tenantId
    })
    .select('id')
    .single();
  
  if (error) throw error;
  if (!data) throw new Error('Failed to create agent chat message');
  
  return data.id;
}

/**
 * Mark notification as delivered (after agent responds)
 */
export async function markChatNotificationDelivered(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ delivered: true })
    .eq('id', notificationId);
  
  if (error) throw error;
}

/**
 * Get all agents for a tenant (for broadcast)
 */
export async function getAllAgentsForTenant(tenantId: string) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'idle'); // Only active agents
  
  if (error) throw error;
  
  return (data || []).map(agent => ({
    id: agent.id,
    name: agent.name,
    session_key: agent.session_key,
    tenant_id: agent.tenant_id
  }));
}

/**
 * Create an agent-to-agent chat thread
 */
export async function createAgentToAgentThread(
  participantAgentIds: string[],
  tenantId: string,
  title?: string | null
): Promise<string> {
  if (participantAgentIds.length < 2) {
    throw new Error('Agent-to-agent threads require at least 2 participants');
  }
  
  const now = Date.now();
  
  const { data, error } = await supabase
    .from('chat_threads')
    .insert({
      participant_agent_ids: participantAgentIds,
      agent_id: null, // NULL for agent-to-agent threads
      created_by: participantAgentIds[0], // Use first participant as creator
      tenant_id: tenantId,
      title: title || null,
      created_at: now,
      updated_at: now
    })
    .select('id')
    .single();
  
  if (error) throw error;
  if (!data) throw new Error('Failed to create agent-to-agent thread');
  
  return data.id;
}

/**
 * Get agent-to-agent threads for a specific agent
 */
export async function getAgentToAgentThreads(agentId: string, tenantId: string): Promise<ChatThread[]> {
  const { data, error } = await supabase
    .from('chat_threads')
    .select('*')
    .not('participant_agent_ids', 'is', null)
    .contains('participant_agent_ids', [agentId])
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(thread => ({
    id: thread.id,
    agent_id: thread.agent_id,
    participant_agent_ids: thread.participant_agent_ids,
    tenant_id: thread.tenant_id,
    title: thread.title
  }));
}
