import { getSupabaseClient } from '../client';

const supabase = getSupabaseClient();

export interface AgentStats {
  missions: number;
  stepsDone: number;
  costToday: number;
  events: number;
}

export async function getAgentStats(agentId: string): Promise<AgentStats> {
  // Get tasks assigned to agent
  const { data: tasks, error: tasksError } = await supabase
    .from('task_assignments')
    .select('task_id')
    .eq('agent_id', agentId);
  
  if (tasksError) throw tasksError;
  
  // Get activities for agent
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('type, created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  
  if (activitiesError) throw activitiesError;
  
  // Count steps done (activities with type 'step_completed' or similar)
  const stepsDone = activities?.filter(a => 
    a.type === 'step_completed' || 
    a.type?.includes('step') || 
    a.type?.includes('completed')
  ).length || 0;
  
  // Get cost today (if costs table exists, otherwise return 0)
  let costToday = 0;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();
    
    const { data: costs, error: costsError } = await supabase
      .from('costs')
      .select('amount')
      .eq('agent_id', agentId)
      .gte('created_at', todayStartTimestamp);
    
    if (!costsError && costs) {
      costToday = costs.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0);
    }
  } catch (e) {
    // Costs table might not exist yet, that's okay
    costToday = 0;
  }
  
  return {
    missions: tasks?.length || 0,
    stepsDone,
    costToday,
    events: activities?.length || 0
  };
}

export async function getAgentTasks(agentId: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('task_assignments')
    .select(`
      task_id,
      tasks (
        id,
        title,
        description,
        status,
        priority,
        created_at,
        updated_at
      )
    `)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return data?.map((ta: any) => ta.tasks).filter(Boolean) || [];
}

export async function getAgentActivities(agentId: string, limit: number = 20) {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      tasks (
        id,
        title,
        description
      )
    `)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return data || [];
}

export interface DashboardStats {
  proposalsToday: number;
  missionsCompleted: number;
  successRate: number;
  costToday: number;
  budgetRemaining: number;
}

// Get proposals created today
export async function getProposalsToday(): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTimestamp = todayStart.getTime();
  
  const { count, error } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStartTimestamp);
  
  if (error) throw error;
  
  return count || 0;
}

// Get completed missions (tasks with status 'done')
export async function getCompletedMissions(): Promise<number> {
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'done');
  
  if (error) throw error;
  
  return count || 0;
}

// Calculate success rate (completed tasks / total tasks with status)
export async function getSuccessRate(): Promise<number> {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('status');
  
  if (error) throw error;
  
  if (!tasks || tasks.length === 0) return 0;
  
  const completed = tasks.filter(t => t.status === 'done').length;
  const total = tasks.length;
  
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

// Get total cost today across all agents
export async function getCostToday(): Promise<number> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();
    
    const { data: costs, error } = await supabase
      .from('costs')
      .select('amount')
      .gte('created_at', todayStartTimestamp);
    
    if (error && error.code !== '42P01') throw error; // 42P01 = table doesn't exist
    
    if (!costs) return 0;
    
    return costs.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0);
  } catch (e) {
    // Costs table might not exist yet, that's okay
    return 0;
  }
}

// Get budget remaining (daily limit - current daily spend)
export async function getBudgetRemaining(): Promise<number> {
  try {
    const { data: budget, error } = await supabase
      .from('budget')
      .select('daily_limit, current_daily_spend')
      .limit(1)
      .single();
    
    if (error && error.code !== '42P01' && error.code !== 'PGRST116') {
      throw error;
    }
    
    if (!budget || !budget.daily_limit) return 0;
    
    const remaining = parseFloat(budget.daily_limit) - (parseFloat(budget.current_daily_spend) || 0);
    return Math.max(0, remaining);
  } catch (e) {
    // Budget table might not exist yet, that's okay
    return 0;
  }
}

// Get all dashboard stats at once
export async function getDashboardStats(): Promise<DashboardStats> {
  const [proposalsToday, missionsCompleted, successRate, costToday, budgetRemaining] = await Promise.all([
    getProposalsToday(),
    getCompletedMissions(),
    getSuccessRate(),
    getCostToday(),
    getBudgetRemaining()
  ]);
  
  return {
    proposalsToday,
    missionsCompleted,
    successRate,
    costToday,
    budgetRemaining
  };
}
