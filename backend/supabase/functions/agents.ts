import { getSupabaseClient } from '../client';

const supabase = getSupabaseClient();

export async function getAllAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

export async function getAgentBySessionKey(sessionKey: string) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('session_key', sessionKey)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createAgent(params: {
  name: string;
  role: string;
  sessionKey: string;
  level: 'intern' | 'specialist' | 'lead';
}) {
  const { data, error } = await supabase
    .from('agents')
    .insert({
      name: params.name,
      role: params.role,
      session_key: params.sessionKey,
      level: params.level,
      status: 'idle',
      last_heartbeat: Date.now()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateAgentStatus(
  agentId: string,
  status: 'idle' | 'active' | 'blocked',
  currentTaskId?: string | null
) {
  const { data, error } = await supabase
    .from('agents')
    .update({
      status,
      current_task_id: currentTaskId || null,
      last_heartbeat: Date.now()
    })
    .eq('id', agentId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateAgent(
  agentId: string,
  updates: {
    name?: string;
    role?: string;
    status?: 'idle' | 'active' | 'blocked';
    level?: 'intern' | 'specialist' | 'lead';
    avatar?: string | null;
    role_tag?: string | null;
    system_prompt?: string | null;
    character?: string | null;
    lore?: string | null;
    current_task_id?: string | null;
  }
) {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.level !== undefined) updateData.level = updates.level;
  if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
  if (updates.role_tag !== undefined) updateData.role_tag = updates.role_tag;
  if (updates.system_prompt !== undefined) updateData.system_prompt = updates.system_prompt;
  if (updates.character !== undefined) updateData.character = updates.character;
  if (updates.lore !== undefined) updateData.lore = updates.lore;
  if (updates.current_task_id !== undefined) updateData.current_task_id = updates.current_task_id;
  
  const { data, error } = await supabase
    .from('agents')
    .update(updateData)
    .eq('id', agentId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
