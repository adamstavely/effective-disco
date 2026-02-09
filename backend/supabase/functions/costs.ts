import { getSupabaseClient } from '../client';

const supabase = getSupabaseClient();

export interface CostEntry {
  id: string;
  agentId: string | null;
  amount: number;
  source: string;
  metadata?: any;
  createdAt: number;
}

// Record a cost entry
export async function recordCost(params: {
  agentId?: string | null;
  amount: number;
  source: string;
  metadata?: any;
}): Promise<string> {
  const { data, error } = await supabase
    .from('costs')
    .insert({
      agent_id: params.agentId || null,
      amount: params.amount,
      source: params.source,
      metadata: params.metadata || null,
      created_at: Date.now()
    })
    .select('id')
    .single();
  
  if (error) throw error;
  
  // Update budget if it exists
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();
    
    // Check if we're still in the same day
    const { data: budget, error: budgetError } = await supabase
      .from('budget')
      .select('*')
      .limit(1)
      .single();
    
    if (!budgetError && budget) {
      // Check if updated_at is today
      const updatedAt = new Date(budget.updated_at);
      const isToday = updatedAt >= todayStart;
      
      if (isToday) {
        // Add to current daily spend
        const newDailySpend = (parseFloat(budget.current_daily_spend) || 0) + params.amount;
        await supabase
          .from('budget')
          .update({
            current_daily_spend: newDailySpend,
            updated_at: new Date().toISOString()
          })
          .eq('id', budget.id);
      } else {
        // Reset daily spend for new day
        await supabase
          .from('budget')
          .update({
            current_daily_spend: params.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', budget.id);
      }
    }
  } catch (e) {
    // Budget table might not exist yet, that's okay
    console.warn('Could not update budget:', e);
  }
  
  return data.id;
}

// Get costs for a specific agent
export async function getAgentCosts(agentId: string, startDate?: number, endDate?: number): Promise<CostEntry[]> {
  let query = supabase
    .from('costs')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  
  if (endDate) {
    query = query.lte('created_at', endDate);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map(cost => ({
    id: cost.id,
    agentId: cost.agent_id,
    amount: parseFloat(cost.amount),
    source: cost.source,
    metadata: cost.metadata,
    createdAt: cost.created_at
  }));
}

// Get total cost for a date range
export async function getTotalCost(startDate?: number, endDate?: number): Promise<number> {
  let query = supabase
    .from('costs')
    .select('amount');
  
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  
  if (endDate) {
    query = query.lte('created_at', endDate);
  }
  
  const { data, error } = await query;
  
  if (error && error.code !== '42P01') throw error; // 42P01 = table doesn't exist
  
  if (!data) return 0;
  
  return data.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0);
}
