import { getSupabaseClient } from '../client';

const supabase = getSupabaseClient();

export async function getDocumentsByTask(taskId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return data?.map(doc => ({
    ...doc,
    _id: doc.id,
    _creationTime: doc.created_at,
    taskId: doc.task_id,
    createdBy: doc.created_by
  })) || [];
}

export async function getDocumentById(documentId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  
  if (!data) return null;
  
  return {
    ...data,
    _id: data.id,
    _creationTime: data.created_at,
    taskId: data.task_id,
    createdBy: data.created_by
  };
}

export async function createDocument(params: {
  title: string;
  content: string;
  type: 'deliverable' | 'research' | 'protocol' | 'other';
  createdBy: string;
  taskId?: string | null;
}) {
  const now = Date.now();
  
  const { data, error } = await supabase
    .from('documents')
    .insert({
      title: params.title,
      content: params.content,
      type: params.type,
      task_id: params.taskId || null,
      created_by: params.createdBy,
      created_at: now
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Get agent name for activity
  const { data: agent } = await supabase
    .from('agents')
    .select('name')
    .eq('id', params.createdBy)
    .single();
  
  // Create activity
  await supabase
    .from('activities')
    .insert({
      type: 'document_created',
      agent_id: params.createdBy,
      task_id: params.taskId || null,
      message: `${agent?.name || 'Agent'} created document "${params.title}"`,
      created_at: now
    });
  
  return {
    ...data,
    _id: data.id,
    _creationTime: data.created_at,
    taskId: data.task_id,
    createdBy: data.created_by
  };
}
