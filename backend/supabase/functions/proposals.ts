import { getSupabaseClient } from '../client';

const supabase = getSupabaseClient();

export interface ProposedStep {
  title: string;
  description: string;
  order: number;
}

export async function getAllProposals(status?: 'pending' | 'approved' | 'rejected') {
  let query = supabase.from('proposals').select('*');
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return data?.map(proposal => ({
    ...proposal,
    _id: proposal.id,
    _creationTime: proposal.created_at,
    proposedSteps: proposal.proposed_steps || []
  })) || [];
}

export async function getProposalById(proposalId: string) {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  
  if (!data) return null;
  
  return {
    ...data,
    _id: data.id,
    _creationTime: data.created_at,
    proposedSteps: data.proposed_steps || []
  };
}

export async function createProposal(params: {
  title: string;
  description: string;
  source: string;
  priority: 'low' | 'medium' | 'high';
  proposedSteps?: ProposedStep[];
}) {
  const now = Date.now();
  
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      title: params.title,
      description: params.description,
      source: params.source,
      priority: params.priority,
      status: 'pending',
      proposed_steps: params.proposedSteps || [],
      created_at: now,
      updated_at: now
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Create activity
  await supabase
    .from('activities')
    .insert({
      type: 'proposal_created',
      agent_id: null,
      task_id: null,
      message: `Proposal "${params.title}" created by ${params.source}`,
      created_at: now
    });
  
  return {
    ...data,
    _id: data.id,
    _creationTime: data.created_at,
    proposedSteps: data.proposed_steps || []
  };
}

export async function updateProposal(
  proposalId: string,
  updates: {
    title?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    proposedSteps?: ProposedStep[];
  }
) {
  const updateData: any = {
    updated_at: Date.now()
  };
  
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.proposedSteps !== undefined) updateData.proposed_steps = updates.proposedSteps;
  
  const { error } = await supabase
    .from('proposals')
    .update(updateData)
    .eq('id', proposalId);
  
  if (error) throw error;
}

export async function approveProposal(proposalId: string) {
  const now = Date.now();
  
  const { data, error } = await supabase
    .from('proposals')
    .update({
      status: 'approved',
      approved_at: now,
      updated_at: now
    })
    .eq('id', proposalId)
    .select()
    .single();
  
  if (error) throw error;
  
  // Create activity
  await supabase
    .from('activities')
    .insert({
      type: 'proposal_approved',
      agent_id: null,
      task_id: null,
      message: `Proposal "${data.title}" approved`,
      created_at: now
    });
  
  return {
    ...data,
    _id: data.id,
    _creationTime: data.created_at,
    proposedSteps: data.proposed_steps || []
  };
}

export async function rejectProposal(proposalId: string) {
  const now = Date.now();
  
  const { data, error } = await supabase
    .from('proposals')
    .update({
      status: 'rejected',
      rejected_at: now,
      updated_at: now
    })
    .eq('id', proposalId)
    .select()
    .single();
  
  if (error) throw error;
  
  // Create activity
  await supabase
    .from('activities')
    .insert({
      type: 'proposal_rejected',
      agent_id: null,
      task_id: null,
      message: `Proposal "${data.title}" rejected`,
      created_at: now
    });
  
  return {
    ...data,
    _id: data.id,
    _creationTime: data.created_at,
    proposedSteps: data.proposed_steps || []
  };
}

export async function convertProposalToTask(proposalId: string, assigneeIds?: string[]) {
  // Get proposal
  const proposal = await getProposalById(proposalId);
  if (!proposal) throw new Error('Proposal not found');
  
  if (proposal.status !== 'approved') {
    throw new Error('Only approved proposals can be converted to tasks');
  }
  
  // Create task from proposal
  const { createTask } = await import('./tasks');
  const task = await createTask({
    title: proposal.title,
    description: proposal.description,
    priority: proposal.priority,
    assigneeIds: assigneeIds || []
  });
  
  // Create activity linking proposal to task
  await supabase
    .from('activities')
    .insert({
      type: 'proposal_converted',
      agent_id: null,
      task_id: task._id,
      message: `Proposal "${proposal.title}" converted to task`,
      created_at: Date.now()
    });
  
  return task._id;
}
