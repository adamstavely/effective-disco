import { getSupabaseClient } from '../client';

const supabase = getSupabaseClient();

export async function getMessagesByTask(taskId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      from_agent:agents!messages_from_agent_id_fkey (*)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  // Get attachments and mentions
  const messageIds = data?.map(m => m.id) || [];
  
  const [attachmentsResult, mentionsResult] = await Promise.all([
    supabase
      .from('message_attachments')
      .select('message_id, document_id')
      .in('message_id', messageIds),
    supabase
      .from('message_mentions')
      .select('message_id, agent_id')
      .in('message_id', messageIds)
  ]);
  
  return data?.map(message => ({
    ...message,
    _id: message.id,
    _creationTime: message.created_at,
    fromAgentId: message.from_agent_id,
    attachments: attachmentsResult.data
      ?.filter(a => a.message_id === message.id)
      .map(a => a.document_id) || [],
    mentions: mentionsResult.data
      ?.filter(m => m.message_id === message.id)
      .map(m => m.agent_id) || []
  })) || [];
}

export async function createMessage(params: {
  taskId: string;
  fromAgentId: string;
  content: string;
  attachments?: string[];
  mentions?: string[];
}) {
  const now = Date.now();
  
  // Insert message
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({
      task_id: params.taskId,
      from_agent_id: params.fromAgentId,
      content: params.content,
      created_at: now
    })
    .select()
    .single();
  
  if (messageError) throw messageError;
  
  // Insert attachments if provided
  if (params.attachments && params.attachments.length > 0) {
    const attachments = params.attachments.map(docId => ({
      message_id: message.id,
      document_id: docId
    }));
    
    await supabase
      .from('message_attachments')
      .insert(attachments);
  }
  
  // Insert mentions if provided
  if (params.mentions && params.mentions.length > 0) {
    const mentions = params.mentions.map(agentId => ({
      message_id: message.id,
      agent_id: agentId
    }));
    
    await supabase
      .from('message_mentions')
      .insert(mentions);
  }
  
  return {
    ...message,
    _id: message.id,
    _creationTime: message.created_at,
    attachments: params.attachments || [],
    mentions: params.mentions || []
  };
}
