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

// Agent Performance Analytics
export interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  successRate: number; // Percentage of completed tasks
  averageCompletionTime: number; // Milliseconds
  costPerTask: number; // Average cost per completed task
  responseTime: number; // Average time to first response (milliseconds)
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalCost: number;
  tasksLast30Days: number;
  successRateTrend: number[]; // Success rate per day for last 30 days
  costTrend: number[]; // Cost per day for last 30 days
}

export async function getAgentPerformanceMetrics(agentId: string, days: number = 30): Promise<AgentPerformanceMetrics> {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - days);
  const daysAgoTimestamp = daysAgo.getTime();
  
  // Get agent info
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name')
    .eq('id', agentId)
    .single();
  
  if (agentError) throw agentError;
  
  // Get all tasks assigned to agent
  const { data: taskAssignments, error: tasksError } = await supabase
    .from('task_assignments')
    .select(`
      task_id,
      tasks (
        id,
        status,
        created_at,
        updated_at,
        started_at
      )
    `)
    .eq('agent_id', agentId);
  
  if (tasksError) throw tasksError;
  
  const tasks = (taskAssignments || []).map((ta: any) => ta.tasks).filter(Boolean);
  const completedTasks = tasks.filter((t: any) => t.status === 'done');
  const failedTasks = tasks.filter((t: any) => t.status === 'blocked');
  const recentTasks = tasks.filter((t: any) => t.created_at >= daysAgoTimestamp);
  
  // Calculate success rate
  const successRate = tasks.length > 0 
    ? Math.round((completedTasks.length / tasks.length) * 100) 
    : 0;
  
  // Calculate average completion time (for completed tasks)
  let averageCompletionTime = 0;
  if (completedTasks.length > 0) {
    const completionTimes = completedTasks
      .filter((t: any) => t.started_at && t.updated_at)
      .map((t: any) => t.updated_at - t.started_at);
    if (completionTimes.length > 0) {
      averageCompletionTime = completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length;
    }
  }
  
  // Calculate cost per task
  let costPerTask = 0;
  let totalCost = 0;
  try {
    const { data: costs, error: costsError } = await supabase
      .from('costs')
      .select('amount')
      .eq('agent_id', agentId);
    
    if (!costsError && costs) {
      totalCost = costs.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0);
      costPerTask = completedTasks.length > 0 ? totalCost / completedTasks.length : 0;
    }
  } catch (e) {
    // Costs table might not exist
  }
  
  // Calculate average response time (time from task creation to first activity)
  let responseTime = 0;
  try {
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('created_at, task_id')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true });
    
    if (!activitiesError && activities) {
      const taskFirstActivity = new Map<string, number>();
      activities.forEach((a: any) => {
        if (a.task_id && !taskFirstActivity.has(a.task_id)) {
          taskFirstActivity.set(a.task_id, a.created_at);
        }
      });
      
      const responseTimes: number[] = [];
      tasks.forEach((t: any) => {
        const firstActivity = taskFirstActivity.get(t.id);
        if (firstActivity && t.created_at) {
          responseTimes.push(firstActivity - t.created_at);
        }
      });
      
      if (responseTimes.length > 0) {
        responseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }
    }
  } catch (e) {
    // Activities might not have task_id
  }
  
  // Calculate trends (simplified - daily success rate and cost)
  const successRateTrend: number[] = [];
  const costTrend: number[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayStartTimestamp = dayStart.getTime();
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const dayEndTimestamp = dayEnd.getTime();
    
    const dayTasks = tasks.filter((t: any) => 
      t.created_at >= dayStartTimestamp && t.created_at <= dayEndTimestamp
    );
    const dayCompleted = dayTasks.filter((t: any) => t.status === 'done').length;
    const daySuccessRate = dayTasks.length > 0 ? (dayCompleted / dayTasks.length) * 100 : 0;
    successRateTrend.push(Math.round(daySuccessRate));
    
    try {
      const { data: dayCosts } = await supabase
        .from('costs')
        .select('amount')
        .eq('agent_id', agentId)
        .gte('created_at', dayStartTimestamp)
        .lte('created_at', dayEndTimestamp);
      
      const dayCost = dayCosts?.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0) || 0;
      costTrend.push(dayCost);
    } catch (e) {
      costTrend.push(0);
    }
  }
  
  return {
    agentId: agent.id,
    agentName: agent.name,
    successRate,
    averageCompletionTime,
    costPerTask,
    responseTime,
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    failedTasks: failedTasks.length,
    totalCost,
    tasksLast30Days: recentTasks.length,
    successRateTrend,
    costTrend
  };
}

// Agent Workload
export interface AgentWorkload {
  agentId: string;
  agentName: string;
  activeTasks: number;
  assignedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  capacity: number; // Max concurrent tasks (can be configured per agent)
  utilization: number; // Percentage of capacity used
}

export async function getAgentWorkload(agentId: string): Promise<AgentWorkload> {
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name')
    .eq('id', agentId)
    .single();
  
  if (agentError) throw agentError;
  
  // Get all task assignments for this agent
  const { data: assignments, error: assignmentsError } = await supabase
    .from('task_assignments')
    .select(`
      task_id,
      tasks (
        id,
        status
      )
    `)
    .eq('agent_id', agentId);
  
  if (assignmentsError) throw assignmentsError;
  
  const tasks = (assignments || []).map((a: any) => a.tasks).filter(Boolean);
  const activeTasks = tasks.filter((t: any) => 
    t.status === 'assigned' || t.status === 'in_progress'
  ).length;
  const assignedTasks = tasks.filter((t: any) => t.status === 'assigned').length;
  const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length;
  const blockedTasks = tasks.filter((t: any) => t.status === 'blocked').length;
  
  // Default capacity (can be made configurable)
  const capacity = 5; // Max concurrent active tasks
  const utilization = capacity > 0 ? Math.round((activeTasks / capacity) * 100) : 0;
  
  return {
    agentId: agent.id,
    agentName: agent.name,
    activeTasks,
    assignedTasks,
    inProgressTasks,
    blockedTasks,
    capacity,
    utilization
  };
}

export async function getAllAgentsWorkload(): Promise<AgentWorkload[]> {
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, name');
  
  if (agentsError) throw agentsError;
  
  const workloads = await Promise.all(
    (agents || []).map(agent => getAgentWorkload(agent.id))
  );
  
  return workloads;
}

// Automated Task Assignment
export interface AssignmentRule {
  type: 'role' | 'workload' | 'round_robin' | 'skills';
  priority: number; // Lower number = higher priority
  config?: any; // Rule-specific configuration
}

export async function suggestTaskAssignment(
  taskId: string,
  rules: AssignmentRule[] = []
): Promise<string[]> {
  // Default rules if none provided
  if (rules.length === 0) {
    rules = [
      { type: 'workload', priority: 1 },
      { type: 'role', priority: 2 },
      { type: 'round_robin', priority: 3 }
    ];
  }
  
  // Sort rules by priority
  rules.sort((a, b) => a.priority - b.priority);
  
  // Get all agents
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, name, role, status, level');
  
  if (agentsError) throw agentsError;
  
  // Filter to only idle/active agents
  let candidates = (agents || []).filter(a => 
    a.status === 'idle' || a.status === 'active'
  );
  
  // Apply rules in priority order
  for (const rule of rules) {
    if (candidates.length <= 1) break;
    
    switch (rule.type) {
      case 'workload':
        // Prefer agents with lower workload
        const workloads = await Promise.all(
          candidates.map(a => getAgentWorkload(a.id))
        );
        workloads.sort((a, b) => a.utilization - b.utilization);
        const minUtilization = workloads[0]?.utilization || 0;
        candidates = candidates.filter((_, i) => 
          workloads[i]?.utilization === minUtilization
        );
        break;
        
      case 'role':
        // If task has specific role requirements, filter by role
        // For now, just keep all candidates
        break;
        
      case 'round_robin':
        // Select agent with least recent assignment
        const { data: recentAssignments } = await supabase
          .from('task_assignments')
          .select('agent_id, created_at')
          .in('agent_id', candidates.map(a => a.id))
          .order('created_at', { ascending: false });
        
        if (recentAssignments && recentAssignments.length > 0) {
          const agentLastAssignment = new Map<string, number>();
          recentAssignments.forEach((a: any) => {
            if (!agentLastAssignment.has(a.agent_id) || 
                agentLastAssignment.get(a.agent_id)! < a.created_at) {
              agentLastAssignment.set(a.agent_id, a.created_at);
            }
          });
          
          // Find agent with oldest (or no) assignment
          let oldestAgent = candidates[0].id;
          let oldestTime = agentLastAssignment.get(oldestAgent) || 0;
          
          candidates.forEach(c => {
            const time = agentLastAssignment.get(c.id) || 0;
            if (time < oldestTime) {
              oldestTime = time;
              oldestAgent = c.id;
            }
          });
          
          candidates = candidates.filter(c => c.id === oldestAgent);
        }
        break;
    }
  }
  
  // Return top candidate(s)
  return candidates.slice(0, 1).map(a => a.id);
}
