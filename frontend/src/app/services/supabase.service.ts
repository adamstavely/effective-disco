import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Observable, from, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith, catchError, switchMap } from 'rxjs/operators';
import { Agent, Task, Message, Activity, Document, Notification, Proposal, ProposedStep, ChatThread, Tenant, ProposalStatus } from '../models/types';
import { TenantContextService } from './tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private client: SupabaseClient | null = null;
  private channels: Map<string, RealtimeChannel> = new Map();

  constructor(private tenantContext: TenantContextService) {
    // For local development, use Supabase CLI default URL and anon key
    // These are the default values when running `supabase start`
    const supabaseUrl = (window as any).SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseAnonKey = (window as any).SUPABASE_ANON_KEY || 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'; // Default local anon key
    
    this.client = createClient(supabaseUrl, supabaseAnonKey);
  }
  
  /**
   * Get current tenant ID
   */
  private getTenantId(): string {
    return this.tenantContext.getCurrentTenantIdSync();
  }

  // Agents
  getAgents(): Observable<Agent[]> {
    if (!this.client) return new BehaviorSubject<Agent[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`agents-${tenantId}`);
    
    return new Observable(observer => {
      // Initial fetch
      Promise.resolve(this.client!.from('agents')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name'))
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching agents:', error);
            observer.next([]); // Emit empty array instead of error
            return;
          }
          observer.next(this.transformAgents(data || []));
        })
        .catch(err => {
          console.error('Error in agents query:', err);
          observer.next([]);
        });
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'agents', filter: `tenant_id=eq.${tenantId}` },
          () => {
            // Refetch on change
            Promise.resolve(this.client!.from('agents')
              .select('*')
              .eq('tenant_id', tenantId)
              .order('name'))
              .then(({ data, error }) => {
                if (error) {
                  console.error('Error refetching agents:', error);
                  return;
                }
                if (data) observer.next(this.transformAgents(data));
              })
              .catch(err => {
                console.error('Error in agents refetch:', err);
              });
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  createAgent(
    name: string,
    role: string,
    sessionKey: string,
    level: 'intern' | 'specialist' | 'lead',
    options?: {
      avatar?: string | null;
      roleTag?: string | null;
      systemPrompt?: string | null;
      character?: string | null;
      lore?: string | null;
    }
  ): Promise<string> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const now = Date.now();
    
    const insertData: any = {
      name,
      role,
      session_key: sessionKey,
      level,
      status: 'idle',
      last_heartbeat: now,
      tenant_id: tenantId
    };

    // Add optional fields if provided
    if (options) {
      if (options.avatar !== undefined) insertData.avatar = options.avatar;
      if (options.roleTag !== undefined) insertData.role_tag = options.roleTag;
      if (options.systemPrompt !== undefined) insertData.system_prompt = options.systemPrompt;
      if (options.character !== undefined) insertData.character = options.character;
      if (options.lore !== undefined) insertData.lore = options.lore;
    }
    
    return Promise.resolve(this.client.from('agents')
      .insert(insertData)
      .select('id')
      .single())
      .then(({ data: agent, error }) => {
        if (error) throw error;
        if (!agent) throw new Error('Agent creation failed');
        return agent.id;
      });
  }

  // Tasks
  getTasks(status?: string): Observable<Task[]> {
    if (!this.client) {
      return new BehaviorSubject<Task[]>([]).asObservable();
    }
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`tasks-${tenantId}-${status || 'all'}`);
    
    return new Observable<Task[]>(observer => {
      // Initial fetch with joins
      let query = this.client!.from('tasks')
        .select(`
          *,
          task_assignments (
            agent_id
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      Promise.resolve(query).then(({ data, error }) => {
        if (error) {
          console.error('Error fetching tasks:', error);
          observer.next([]); // Emit empty array instead of error
          return;
        }
        observer.next(this.transformTasks(data || []));
      }).catch(err => {
        console.error('Error in tasks query:', err);
        observer.next([]); // Emit empty array on error
      });
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'tasks', filter: `tenant_id=eq.${tenantId}` },
          () => {
            let refetchQuery = this.client!.from('tasks')
              .select(`
                *,
                task_assignments (
                  agent_id
                )
              `)
              .eq('tenant_id', tenantId)
              .order('created_at', { ascending: false });
            
            if (status) {
              refetchQuery = refetchQuery.eq('status', status);
            }
            
            Promise.resolve(refetchQuery).then(({ data, error }) => {
              if (error) {
                console.error('Error refetching tasks:', error);
                return;
              }
              if (data) observer.next(this.transformTasks(data));
            }).catch(err => {
              console.error('Error in tasks refetch:', err);
            });
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    }).pipe(
      startWith([] as Task[]),
      catchError((err): Observable<Task[]> => {
        console.error('Observable error in getTasks:', err);
        return new BehaviorSubject<Task[]>([]).asObservable();
      })
    );
  }

  getTask(id: string): Observable<Task | null> {
    if (!this.client) return new BehaviorSubject<Task | null>(null).asObservable();
    
    const tenantId = this.getTenantId();
    
    return from(
      Promise.resolve(this.client.from('tasks')
        .select(`
          *,
          task_assignments (
            agent_id
          )
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single())
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116') throw error;
          return data ? this.transformTask(data) : null;
        })
    );
  }

  createTask(title: string, description: string, priority: 'low' | 'medium' | 'high', assigneeIds?: string[]): Promise<string> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const now = Date.now();
    
    // Create task directly since RPC might not support tenant_id yet
    return Promise.resolve(this.client.from('tasks')
      .insert({
        title,
        description,
        priority,
        status: assigneeIds && assigneeIds.length > 0 ? 'assigned' : 'inbox',
        tenant_id: tenantId,
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single())
      .then(async ({ data: task, error: taskError }) => {
        if (taskError) throw taskError;
        if (!task) throw new Error('Task creation failed');
        
        // Create assignments if provided
        if (assigneeIds && assigneeIds.length > 0) {
          const assignments = assigneeIds.map(agentId => ({
            task_id: task.id,
            agent_id: agentId,
            tenant_id: tenantId
          }));
          
          const { error: assignError } = await this.client!.from('task_assignments')
            .insert(assignments);
          
          if (assignError) throw assignError;
        }
        
        return task.id;
      });
  }

  updateTask(id: string, updates: Partial<Task>): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const updateData: any = {
      updated_at: Date.now()
    };
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.borderColor !== undefined) updateData.border_color = updates.borderColor;
    if (updates.startedAt !== undefined) updateData.started_at = updates.startedAt;
    
    return Promise.resolve(this.client.from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId))
      .then(({ error }) => {
        if (error) throw error;
      });
  }

  deleteTask(id: string): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    
    return Promise.resolve(this.client.from('tasks')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId))
      .then(({ error }) => {
        if (error) throw error;
      });
  }

  updateTaskAssignments(taskId: string, agentIds: string[]): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    
    return Promise.resolve(
      // First, delete existing assignments
      this.client.from('task_assignments')
        .delete()
        .eq('task_id', taskId)
        .eq('tenant_id', tenantId)
    ).then(() => {
      // Then, create new assignments
      if (agentIds.length > 0) {
        const assignments = agentIds.map(agentId => ({
          task_id: taskId,
          agent_id: agentId,
          tenant_id: tenantId
        }));
        
        return Promise.resolve(this.client!.from('task_assignments')
          .insert(assignments))
          .then(({ error }) => {
            if (error) throw error;
          });
      }
      // Return void promise when no agents to assign
      return Promise.resolve();
    });
  }

  // Task Dependencies
  getTaskDependencies(taskId: string): Observable<import('../models/types').TaskDependency[]> {
    if (!this.client) return new BehaviorSubject<import('../models/types').TaskDependency[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    
    return from(
      Promise.resolve(this.client.from('task_dependencies')
        .select('*')
        .eq('task_id', taskId)
        .eq('tenant_id', tenantId))
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching task dependencies:', error);
            return [];
          }
          return (data || []).map((dep: any) => ({
            _id: dep.id,
            _creationTime: new Date(dep.created_at).getTime(),
            taskId: dep.task_id,
            dependsOnTaskId: dep.depends_on_task_id,
            createdAt: new Date(dep.created_at).getTime()
          }));
        })
    );
  }

  getDependentTasks(taskId: string): Observable<Task[]> {
    if (!this.client) return new BehaviorSubject<Task[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    
    return from(
      Promise.resolve(this.client.from('task_dependencies')
        .select(`
          task_id,
          tasks!task_dependencies_task_id_fkey (
            *,
            task_assignments (agent_id)
          )
        `)
        .eq('depends_on_task_id', taskId)
        .eq('tenant_id', tenantId))
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching dependent tasks:', error);
            return [];
          }
          return (data || []).map((item: any) => this.transformTask(item.tasks));
        })
    );
  }

  getTasksThisDependsOn(taskId: string): Observable<Task[]> {
    if (!this.client) return new BehaviorSubject<Task[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    
    return from(
      Promise.resolve(this.client.from('task_dependencies')
        .select(`
          depends_on_task_id,
          tasks!task_dependencies_depends_on_task_id_fkey (
            *,
            task_assignments (agent_id)
          )
        `)
        .eq('task_id', taskId)
        .eq('tenant_id', tenantId))
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching tasks this depends on:', error);
            return [];
          }
          return (data || []).map((item: any) => this.transformTask(item.tasks));
        })
    );
  }

  addTaskDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    
    return Promise.resolve(this.client.from('task_dependencies')
      .insert({
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
        tenant_id: tenantId
      }))
      .then(({ error }) => {
        if (error) throw error;
      });
  }

  removeTaskDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    
    return Promise.resolve(this.client.from('task_dependencies')
      .delete()
      .eq('task_id', taskId)
      .eq('depends_on_task_id', dependsOnTaskId)
      .eq('tenant_id', tenantId))
      .then(({ error }) => {
        if (error) throw error;
      });
  }

  // Messages
  getMessages(taskId: string): Observable<Message[]> {
    if (!this.client) return new BehaviorSubject<Message[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`messages-${tenantId}-${taskId}`);
    
    return new Observable(observer => {
      // Initial fetch
      Promise.resolve(this.client!.from('messages')
        .select(`
          *,
          message_attachments (document_id),
          message_mentions (agent_id)
        `)
        .eq('task_id', taskId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }))
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching messages:', error);
            observer.next([]);
            return;
          }
          observer.next(this.transformMessages(data || []));
        })
        .catch(err => {
          console.error('Error in messages query:', err);
          observer.next([]);
        });
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `task_id=eq.${taskId}` },
          () => {
            Promise.resolve(this.client!.from('messages')
              .select(`
                *,
                message_attachments (document_id),
                message_mentions (agent_id)
              `)
              .eq('task_id', taskId)
              .eq('tenant_id', tenantId)
              .order('created_at', { ascending: false }))
              .then(({ data, error }) => {
                if (error) {
                  console.error('Error refetching messages:', error);
                  return;
                }
                if (data) observer.next(this.transformMessages(data));
              })
              .catch(err => {
                console.error('Error in messages refetch:', err);
              });
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  createMessage(taskId: string, fromAgentId: string | null, content: string, mentions?: string[]): Promise<string> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const now = Date.now();
    
    // Create message directly
    return Promise.resolve(this.client.from('messages')
      .insert({
        task_id: taskId,
        from_agent_id: fromAgentId,
        content,
        tenant_id: tenantId,
        created_at: now
      })
      .select('id')
      .single())
      .then(async ({ data: message, error: messageError }) => {
        if (messageError) throw messageError;
        if (!message) throw new Error('Message creation failed');
        
        // Create mentions if provided
        if (mentions && mentions.length > 0) {
          const mentionRecords = mentions.map(agentId => ({
            message_id: message.id,
            agent_id: agentId,
            tenant_id: tenantId
          }));
          
          const { error: mentionError } = await this.client!.from('message_mentions')
            .insert(mentionRecords);
          
          if (mentionError) throw mentionError;
        }
        
        return message.id;
      });
  }

  // Activities
  getActivityFeed(limit: number = 50): Observable<Activity[]> {
    if (!this.client) return new BehaviorSubject<Activity[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`activities-${tenantId}`);
    
    return new Observable(observer => {
      // Initial fetch
      Promise.resolve(this.client!.from('activities')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit))
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching activities:', error);
            observer.next([]);
            return;
          }
          observer.next(this.transformActivities(data || []));
        })
        .catch(err => {
          console.error('Error in activities query:', err);
          observer.next([]);
        });
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'activities', filter: `tenant_id=eq.${tenantId}` },
          () => {
            Promise.resolve(this.client!.from('activities')
              .select('*')
              .eq('tenant_id', tenantId)
              .order('created_at', { ascending: false })
              .limit(limit))
              .then(({ data, error }) => {
                if (error) {
                  console.error('Error refetching activities:', error);
                  return;
                }
                if (data) observer.next(this.transformActivities(data));
              })
              .catch(err => {
                console.error('Error in activities refetch:', err);
              });
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  // Documents
  getDocuments(taskId: string): Observable<Document[]> {
    if (!this.client) return new BehaviorSubject<Document[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    
    return from(
      Promise.resolve(this.client.from('documents')
        .select('*')
        .eq('task_id', taskId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }))
        .then(({ data, error }) => {
          if (error) throw error;
          return this.transformDocuments(data || []);
        })
    );
  }

  createDocument(title: string, content: string, type: Document['type'], createdBy: string, taskId?: string): Promise<string> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    
    return Promise.resolve(this.client.from('documents')
      .insert({
        title,
        content,
        type,
        created_by: createdBy,
        task_id: taskId || null,
        tenant_id: tenantId
      })
      .select('id')
      .single())
      .then(({ data, error }) => {
        if (error) throw error;
        return data.id;
      });
  }

  getDocumentById(documentId: string): Observable<Document | null> {
    if (!this.client) return new BehaviorSubject<Document | null>(null).asObservable();
    
    const tenantId = this.getTenantId();
    
    return from(
      Promise.resolve(this.client.from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('tenant_id', tenantId)
        .single())
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116') throw error;
          return data ? this.transformDocuments([data])[0] : null;
        })
    );
  }

  getDocumentMessages(documentId: string): Observable<Message[]> {
    if (!this.client) return new BehaviorSubject<Message[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`document-messages-${tenantId}-${documentId}`);
    
    return new Observable(observer => {
      // Fetch messages that reference this document:
      // 1. Messages with this document attached (via message_attachments)
      // 2. Messages where message_id directly references this document
      Promise.all([
        // Get document to check message_id field
        Promise.resolve(this.client!.from('documents')
          .select('message_id')
          .eq('id', documentId)
          .eq('tenant_id', tenantId)
          .single())
          .then(({ data: docData }) => docData?.message_id || null)
          .catch(() => null),
        // Get messages with this document attached
        Promise.resolve(this.client!.from('message_attachments')
          .select('message_id')
          .eq('document_id', documentId)
          .eq('tenant_id', tenantId))
          .then(({ data }) => (data || []).map((ma: any) => ma.message_id))
          .catch(() => [])
      ]).then(([directMessageId, attachmentMessageIds]) => {
        const messageIds = [
          ...(directMessageId ? [directMessageId] : []),
          ...attachmentMessageIds
        ].filter(Boolean);
        
        if (messageIds.length === 0) {
          observer.next([]);
          return;
        }
        
        // Fetch all related messages
        Promise.resolve(this.client!.from('messages')
          .select(`
            *,
            message_attachments (document_id),
            message_mentions (agent_id)
          `)
          .in('id', messageIds)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }))
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching document messages:', error);
              observer.next([]);
              return;
            }
            observer.next(this.transformMessages(data || []));
          })
          .catch(err => {
            console.error('Error in document messages query:', err);
            observer.next([]);
          });
      });
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'message_attachments', filter: `tenant_id=eq.${tenantId}` },
          () => {
            // Refetch on change
            Promise.all([
              Promise.resolve(this.client!.from('documents')
                .select('message_id')
                .eq('id', documentId)
                .eq('tenant_id', tenantId)
                .single())
                .then(({ data: docData }) => docData?.message_id || null)
                .catch(() => null),
              Promise.resolve(this.client!.from('message_attachments')
                .select('message_id')
                .eq('document_id', documentId)
                .eq('tenant_id', tenantId))
                .then(({ data }) => (data || []).map((ma: any) => ma.message_id))
                .catch(() => [])
            ]).then(([directMessageId, attachmentMessageIds]) => {
              const messageIds = [
                ...(directMessageId ? [directMessageId] : []),
                ...attachmentMessageIds
              ].filter(Boolean);
              
              if (messageIds.length === 0) {
                observer.next([]);
                return;
              }
              
              Promise.resolve(this.client!.from('messages')
                .select(`
                  *,
                  message_attachments (document_id),
                  message_mentions (agent_id)
                `)
                .in('id', messageIds)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false }))
                .then(({ data, error }) => {
                  if (error) {
                    console.error('Error refetching document messages:', error);
                    return;
                  }
                  if (data) observer.next(this.transformMessages(data));
                })
                .catch(err => {
                  console.error('Error in document messages refetch:', err);
                });
            });
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  // Agent Stats
  getAgentStats(agentId: string): Observable<{ missions: number; stepsDone: number; costToday: number; events: number }> {
    if (!this.client) return new BehaviorSubject({ missions: 0, stepsDone: 0, costToday: 0, events: 0 }).asObservable();
    
    const tenantId = this.getTenantId();
    
    return from(
      Promise.all([
        // Get tasks assigned to agent
        Promise.resolve(this.client.from('task_assignments')
          .select('task_id')
          .eq('agent_id', agentId)
          .eq('tenant_id', tenantId))
          .then(({ data }) => ({ count: data?.length || 0 })),
        
        // Get activities for agent
        Promise.resolve(this.client.from('activities')
          .select('type, created_at')
          .eq('agent_id', agentId)
          .eq('tenant_id', tenantId))
          .then(({ data }) => {
            const activities = data || [];
            const stepsDone = activities.filter((a: any) => 
              a.type === 'step_completed' || 
              a.type?.includes('step') || 
              a.type?.includes('completed')
            ).length;
            return { activities, stepsDone };
          }),
        
        // Get cost today (if costs table exists)
        Promise.resolve(this.client.from('costs')
          .select('amount')
          .eq('agent_id', agentId)
          .eq('tenant_id', tenantId)
          .gte('created_at', new Date().setHours(0, 0, 0, 0)))
          .then(({ data, error }) => {
            if (error && error.code !== '42P01') throw error; // 42P01 = table doesn't exist
            const costs = data || [];
            return costs.reduce((sum: number, cost: any) => sum + (parseFloat(cost.amount) || 0), 0);
          })
          .catch(() => 0) // Return 0 if costs table doesn't exist
      ]).then(([tasksResult, activitiesResult, costToday]) => ({
        missions: tasksResult.count,
        stepsDone: activitiesResult.stepsDone,
        costToday,
        events: activitiesResult.activities.length
      }))
    );
  }

  getAgentTasks(agentId: string, limit: number = 10): Observable<Task[]> {
    if (!this.client) return new BehaviorSubject<Task[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    
    return from(
      Promise.resolve(this.client.from('task_assignments')
        .select(`
          task_id,
          tasks (
            id,
            title,
            description,
            status,
            priority,
            created_at,
            updated_at,
            task_assignments (
              agent_id
            )
          )
        `)
        .eq('agent_id', agentId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit))
        .then(({ data, error }) => {
          if (error) throw error;
          const tasks = (data || [])
            .map((ta: any) => ta.tasks)
            .filter(Boolean);
          return this.transformTasks(tasks);
        })
    );
  }

  getAgentActivities(agentId: string, limit: number = 20): Observable<Activity[]> {
    if (!this.client) return new BehaviorSubject<Activity[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    
    return from(
      Promise.resolve(this.client.from('activities')
        .select(`
          *,
          tasks (
            id,
            title,
            description
          )
        `)
        .eq('agent_id', agentId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit))
        .then(({ data, error }) => {
          if (error) throw error;
          return this.transformActivities(data || []);
        })
    );
  }

  // Agent Performance Analytics
  getAgentPerformanceMetrics(agentId: string, days: number = 30): Observable<{
    agentId: string;
    agentName: string;
    successRate: number;
    averageCompletionTime: number;
    costPerTask: number;
    responseTime: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    totalCost: number;
    tasksLast30Days: number;
    successRateTrend: number[];
    costTrend: number[];
  }> {
    if (!this.client) {
      return new BehaviorSubject({
        agentId: '',
        agentName: '',
        successRate: 0,
        averageCompletionTime: 0,
        costPerTask: 0,
        responseTime: 0,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        totalCost: 0,
        tasksLast30Days: 0,
        successRateTrend: [],
        costTrend: []
      }).asObservable();
    }
    
    const tenantId = this.getTenantId();
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    const daysAgoTimestamp = daysAgo.getTime();
    
    return from(
      Promise.all([
        // Get agent info
        Promise.resolve(this.client.from('agents')
          .select('id, name')
          .eq('id', agentId)
          .eq('tenant_id', tenantId)
          .single())
          .then(({ data, error }) => {
            if (error) throw error;
            return data;
          }),
        
        // Get all task assignments
        Promise.resolve(this.client.from('task_assignments')
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
          .eq('agent_id', agentId)
          .eq('tenant_id', tenantId))
          .then(({ data, error }) => {
            if (error) throw error;
            return (data || []).map((ta: any) => ta.tasks).filter(Boolean);
          }),
        
        // Get costs
        Promise.resolve(this.client.from('costs')
          .select('amount, created_at')
          .eq('agent_id', agentId)
          .eq('tenant_id', tenantId))
          .then(({ data, error }) => {
            if (error) return [];
            return data || [];
          })
          .catch(() => []),
        
        // Get activities for response time
        Promise.resolve(this.client.from('activities')
          .select('created_at, task_id')
          .eq('agent_id', agentId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true }))
          .then(({ data, error }) => {
            if (error) return [];
            return data || [];
          })
          .catch(() => [])
      ]).then(([agent, tasks, costs, activities]) => {
        const completedTasks = tasks.filter((t: any) => t.status === 'done');
        const failedTasks = tasks.filter((t: any) => t.status === 'blocked');
        const recentTasks = tasks.filter((t: any) => t.created_at >= daysAgoTimestamp);
        
        // Calculate success rate
        const successRate = tasks.length > 0 
          ? Math.round((completedTasks.length / tasks.length) * 100) 
          : 0;
        
        // Calculate average completion time
        let averageCompletionTime = 0;
        if (completedTasks.length > 0) {
          const completionTimes = completedTasks
            .filter((t: any) => t.started_at && t.updated_at)
            .map((t: any) => t.updated_at - t.started_at);
          if (completionTimes.length > 0) {
            averageCompletionTime = completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length;
          }
        }
        
        // Calculate cost metrics
        const totalCost = costs.reduce((sum: number, cost: any) => 
          sum + (parseFloat(cost.amount) || 0), 0
        );
        const costPerTask = completedTasks.length > 0 ? totalCost / completedTasks.length : 0;
        
        // Calculate response time
        let responseTime = 0;
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
        
        // Calculate trends
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
          
          const dayCost = costs
            .filter((c: any) => c.created_at >= dayStartTimestamp && c.created_at <= dayEndTimestamp)
            .reduce((sum: number, cost: any) => sum + (parseFloat(cost.amount) || 0), 0);
          costTrend.push(dayCost);
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
      })
    );
  }

  // Agent Workload
  getAgentWorkload(agentId: string): Observable<{
    agentId: string;
    agentName: string;
    activeTasks: number;
    assignedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    capacity: number;
    utilization: number;
  }> {
    if (!this.client) {
      return new BehaviorSubject({
        agentId: '',
        agentName: '',
        activeTasks: 0,
        assignedTasks: 0,
        inProgressTasks: 0,
        blockedTasks: 0,
        capacity: 5,
        utilization: 0
      }).asObservable();
    }
    
    const tenantId = this.getTenantId();
    
    return from(
      Promise.all([
        Promise.resolve(this.client.from('agents')
          .select('id, name')
          .eq('id', agentId)
          .eq('tenant_id', tenantId)
          .single())
          .then(({ data, error }) => {
            if (error) throw error;
            return data;
          }),
        
        Promise.resolve(this.client.from('task_assignments')
          .select(`
            task_id,
            tasks (
              id,
              status
            )
          `)
          .eq('agent_id', agentId)
          .eq('tenant_id', tenantId))
          .then(({ data, error }) => {
            if (error) throw error;
            return (data || []).map((a: any) => a.tasks).filter(Boolean);
          })
      ]).then(([agent, tasks]) => {
        const activeTasks = tasks.filter((t: any) => 
          t.status === 'assigned' || t.status === 'in_progress'
        ).length;
        const assignedTasks = tasks.filter((t: any) => t.status === 'assigned').length;
        const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length;
        const blockedTasks = tasks.filter((t: any) => t.status === 'blocked').length;
        
        const capacity = 5; // Default capacity
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
      })
    );
  }

  getAllAgentsWorkload(): Observable<Array<{
    agentId: string;
    agentName: string;
    activeTasks: number;
    assignedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    capacity: number;
    utilization: number;
  }>> {
    if (!this.client) return new BehaviorSubject([]).asObservable();
    
    const tenantId = this.getTenantId();
    
    return from(
      Promise.resolve(this.client.from('agents')
        .select('id, name')
        .eq('tenant_id', tenantId))
        .then(({ data: agents, error }) => {
          if (error) throw error;
          
          return Promise.all(
            (agents || []).map(agent => 
              this.getAgentWorkload(agent.id).pipe(
                map(workload => workload)
              ).toPromise()
            )
          );
        })
        .then(workloads => workloads.filter(Boolean) as any[])
    );
  }

  // Automated Task Assignment
  suggestTaskAssignment(taskId: string, rules: Array<{type: string; priority: number}> = []): Observable<string[]> {
    if (!this.client) return new BehaviorSubject<string[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    
    // Default rules if none provided
    if (rules.length === 0) {
      rules = [
        { type: 'workload', priority: 1 },
        { type: 'role', priority: 2 },
        { type: 'round_robin', priority: 3 }
      ];
    }
    
    rules.sort((a, b) => a.priority - b.priority);
    
    return from(
      Promise.resolve(this.client.from('agents')
        .select('id, name, role, status, level')
        .eq('tenant_id', tenantId))
        .then(async ({ data: agents, error }) => {
          if (error) throw error;
          
          // Filter to idle/active agents
          let candidates = (agents || []).filter((a: any) => 
            a.status === 'idle' || a.status === 'active'
          );
          
          // Apply workload rule first
          if (rules.some(r => r.type === 'workload')) {
            const workloads = await Promise.all(
              candidates.map((a: any) => 
                this.getAgentWorkload(a.id).pipe(
                  map(w => w)
                ).toPromise()
              )
            );
            
            workloads.sort((a: any, b: any) => 
              (a?.utilization || 0) - (b?.utilization || 0)
            );
            const minUtilization = workloads[0]?.utilization || 0;
            candidates = candidates.filter((_, i) => 
              workloads[i]?.utilization === minUtilization
            );
          }
          
          // Round-robin: select agent with least recent assignment
          if (candidates.length > 1 && rules.some(r => r.type === 'round_robin')) {
            const { data: recentAssignments } = await this.client!.from('task_assignments')
              .select('agent_id, created_at')
              .in('agent_id', candidates.map((a: any) => a.id))
              .eq('tenant_id', tenantId)
              .order('created_at', { ascending: false });
            
            if (recentAssignments && recentAssignments.length > 0) {
              const agentLastAssignment = new Map<string, number>();
              recentAssignments.forEach((a: any) => {
                if (!agentLastAssignment.has(a.agent_id) || 
                    agentLastAssignment.get(a.agent_id)! < a.created_at) {
                  agentLastAssignment.set(a.agent_id, a.created_at);
                }
              });
              
              let oldestAgent = candidates[0].id;
              let oldestTime = agentLastAssignment.get(oldestAgent) || 0;
              
              candidates.forEach((c: any) => {
                const time = agentLastAssignment.get(c.id) || 0;
                if (time < oldestTime) {
                  oldestTime = time;
                  oldestAgent = c.id;
                }
              });
              
              candidates = candidates.filter((c: any) => c.id === oldestAgent);
            }
          }
          
          return candidates.slice(0, 1).map((a: any) => a.id);
        })
    );
  }

  // Stats methods for Quick Stats Dashboard
  getProposalsToday(): Observable<number> {
    if (!this.client) return new BehaviorSubject<number>(0).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`stats-proposals-${tenantId}`);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();
    
    return new Observable(observer => {
      const fetchCount = () => {
        Promise.resolve(this.client!.from('proposals')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .gte('created_at', todayStartTimestamp))
          .then(({ count, error }) => {
            if (error) {
              console.error('Error fetching proposals today:', error);
              observer.next(0);
              return;
            }
            observer.next(count || 0);
          })
          .catch(() => observer.next(0));
      };
      
      // Initial fetch
      fetchCount();
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'proposals', filter: `tenant_id=eq.${tenantId}` },
          () => fetchCount()
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  getCompletedMissions(): Observable<number> {
    if (!this.client) return new BehaviorSubject<number>(0).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`stats-missions-${tenantId}`);
    
    return new Observable(observer => {
      const fetchCount = () => {
        Promise.resolve(this.client!.from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'done'))
          .then(({ count, error }) => {
            if (error) {
              console.error('Error fetching completed missions:', error);
              observer.next(0);
              return;
            }
            observer.next(count || 0);
          })
          .catch(() => observer.next(0));
      };
      
      // Initial fetch
      fetchCount();
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'tasks', filter: `tenant_id=eq.${tenantId}` },
          () => fetchCount()
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  getSuccessRate(): Observable<number> {
    if (!this.client) return new BehaviorSubject<number>(0).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`stats-success-rate-${tenantId}`);
    
    return new Observable(observer => {
      const fetchRate = () => {
        Promise.resolve(this.client!.from('tasks')
          .select('status')
          .eq('tenant_id', tenantId))
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching success rate:', error);
              observer.next(0);
              return;
            }
            const tasks = data || [];
            if (tasks.length === 0) {
              observer.next(0);
              return;
            }
            
            const completed = tasks.filter((t: any) => t.status === 'done').length;
            observer.next(Math.round((completed / tasks.length) * 100));
          })
          .catch(() => observer.next(0));
      };
      
      // Initial fetch
      fetchRate();
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'tasks', filter: `tenant_id=eq.${tenantId}` },
          () => fetchRate()
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  getCostToday(): Observable<number> {
    if (!this.client) return new BehaviorSubject<number>(0).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`stats-costs-${tenantId}`);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();
    
    return new Observable(observer => {
      const fetchCost = () => {
        Promise.resolve(this.client!.from('costs')
          .select('amount')
          .eq('tenant_id', tenantId)
          .gte('created_at', todayStartTimestamp))
          .then(({ data, error }) => {
            if (error && error.code !== '42P01') {
              console.error('Error fetching cost today:', error);
              observer.next(0);
              return;
            }
            const costs = data || [];
            const total = costs.reduce((sum: number, cost: any) => sum + (parseFloat(cost.amount) || 0), 0);
            observer.next(total);
          })
          .catch(() => observer.next(0)); // Return 0 if costs table doesn't exist
      };
      
      // Initial fetch
      fetchCost();
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'costs', filter: `tenant_id=eq.${tenantId}` },
          () => fetchCost()
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  getBudgetRemaining(): Observable<number> {
    if (!this.client) return new BehaviorSubject<number>(0).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`stats-budget-${tenantId}`);
    
    return new Observable(observer => {
      const fetchBudget = () => {
        Promise.resolve(this.client!.from('budget')
          .select('daily_limit, current_daily_spend')
          .eq('tenant_id', tenantId)
          .limit(1)
          .single())
          .then(({ data, error }) => {
            if (error && error.code !== '42P01' && error.code !== 'PGRST116') {
              console.error('Error fetching budget remaining:', error);
              observer.next(0);
              return;
            }
            if (!data || !data.daily_limit) {
              observer.next(0);
              return;
            }
            
            const remaining = parseFloat(data.daily_limit) - (parseFloat(data.current_daily_spend) || 0);
            observer.next(Math.max(0, remaining));
          })
          .catch(() => observer.next(0)); // Return 0 if budget table doesn't exist
      };
      
      // Initial fetch
      fetchBudget();
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'budget', filter: `tenant_id=eq.${tenantId}` },
          () => fetchBudget()
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  updateAgent(agentId: string, updates: Partial<Agent>): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.level !== undefined) updateData.level = updates.level;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.roleTag !== undefined) updateData.role_tag = updates.roleTag;
    if (updates.systemPrompt !== undefined) updateData.system_prompt = updates.systemPrompt;
    if (updates.character !== undefined) updateData.character = updates.character;
    if (updates.lore !== undefined) updateData.lore = updates.lore;
    if (updates.currentTaskId !== undefined) updateData.current_task_id = updates.currentTaskId;
    
    return Promise.resolve(this.client.from('agents')
      .update(updateData)
      .eq('id', agentId)
      .eq('tenant_id', tenantId))
      .then(({ error }) => {
        if (error) throw error;
      });
  }

  // Proposals
  getProposals(status?: 'pending' | 'approved' | 'rejected'): Observable<Proposal[]> {
    if (!this.client) return new BehaviorSubject<Proposal[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`proposals-${tenantId}-${status || 'all'}`);
    
    return new Observable<Proposal[]>(observer => {
      // Initial fetch
      let query = this.client!.from('proposals')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      Promise.resolve(query).then(({ data, error }) => {
        if (error) {
          console.error('Error fetching proposals:', error);
          observer.next([]);
          return;
        }
        observer.next(this.transformProposals(data || []));
      }).catch(err => {
        console.error('Error in proposals query:', err);
        observer.next([]);
      });
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'proposals', filter: `tenant_id=eq.${tenantId}` },
          () => {
            let refetchQuery = this.client!.from('proposals')
              .select('*')
              .eq('tenant_id', tenantId)
              .order('created_at', { ascending: false });
            
            if (status) {
              refetchQuery = refetchQuery.eq('status', status);
            }
            
            Promise.resolve(refetchQuery).then(({ data, error }) => {
              if (error) {
                console.error('Error refetching proposals:', error);
                return;
              }
              if (data) observer.next(this.transformProposals(data));
            }).catch(err => {
              console.error('Error in proposals refetch:', err);
            });
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    }).pipe(
      startWith([] as Proposal[]),
      catchError((err): Observable<Proposal[]> => {
        console.error('Observable error in getProposals:', err);
        return new BehaviorSubject<Proposal[]>([]).asObservable();
      })
    );
  }

  getProposal(id: string): Observable<Proposal | null> {
    if (!this.client) return new BehaviorSubject<Proposal | null>(null).asObservable();
    
    return from(
      Promise.resolve(this.client.from('proposals')
        .select('*')
        .eq('id', id)
        .single())
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116') throw error;
          return data ? this.transformProposal(data) : null;
        })
    );
  }

  createProposal(
    title: string,
    description: string,
    source: string,
    priority: 'low' | 'medium' | 'high',
    proposedSteps?: ProposedStep[]
  ): Promise<string> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const now = Date.now();
    
    return Promise.resolve(this.client.from('proposals')
      .insert({
        title,
        description,
        source,
        priority,
        status: 'pending',
        proposed_steps: proposedSteps || [],
        tenant_id: tenantId,
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single())
      .then(({ data, error }) => {
        if (error) throw error;
        return data.id;
      });
  }

  updateProposal(id: string, updates: Partial<Proposal>): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const updateData: any = {
      updated_at: Date.now()
    };
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.proposedSteps !== undefined) updateData.proposed_steps = updates.proposedSteps;
    
    return Promise.resolve(this.client.from('proposals')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId))
      .then(({ error }) => {
        if (error) throw error;
      });
  }

  approveProposal(id: string): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const now = Date.now();
    
    return Promise.resolve(this.client.from('proposals')
      .update({
        status: 'approved',
        approved_at: now,
        updated_at: now
      })
      .eq('id', id)
      .eq('tenant_id', tenantId))
      .then(({ error }) => {
        if (error) throw error;
      });
  }

  rejectProposal(id: string): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const now = Date.now();
    
    return Promise.resolve(this.client.from('proposals')
      .update({
        status: 'rejected',
        rejected_at: now,
        updated_at: now
      })
      .eq('id', id)
      .eq('tenant_id', tenantId))
      .then(({ error }) => {
        if (error) throw error;
      });
  }

  convertProposalToTask(proposalId: string, assigneeIds?: string[]): Promise<string> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    
    // Get proposal first
    return Promise.resolve(this.client.from('proposals')
      .select('*')
      .eq('id', proposalId)
      .eq('tenant_id', tenantId)
      .single())
      .then(({ data: proposal, error }) => {
        if (error) throw error;
        if (!proposal) throw new Error('Proposal not found');
        if (proposal.status !== 'approved') {
          throw new Error('Only approved proposals can be converted to tasks');
        }
        
        // Create task from proposal (createTask will use current tenant context)
        return this.createTask(
          proposal.title,
          proposal.description,
          proposal.priority,
          assigneeIds
        );
      });
  }

  resumeTask(taskId: string): Promise<{ success: boolean; agentId: string; agentName: string }> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    return Promise.resolve(this.client.rpc('resume_task', {
      p_task_id: taskId
    })).then(({ data, error }) => {
      if (error) throw error;
      return {
        success: data.success,
        agentId: data.agent_id,
        agentName: data.agent_name
      };
    });
  }

  // Notifications
  getNotifications(agentId: string): Observable<Notification[]> {
    if (!this.client) return new BehaviorSubject<Notification[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`notifications-${tenantId}-${agentId}`);
    
    return new Observable(observer => {
      // Initial fetch
      Promise.resolve(this.client!.from('notifications')
        .select('*')
        .eq('mentioned_agent_id', agentId)
        .eq('tenant_id', tenantId)
        .eq('delivered', false)
        .order('created_at', { ascending: true }))
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching notifications:', error);
            observer.next([]);
            return;
          }
          observer.next(this.transformNotifications(data || []));
        })
        .catch(err => {
          console.error('Error in notifications query:', err);
          observer.next([]);
        });
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `mentioned_agent_id=eq.${agentId}` },
          () => {
            Promise.resolve(this.client!.from('notifications')
              .select('*')
              .eq('mentioned_agent_id', agentId)
              .eq('tenant_id', tenantId)
              .eq('delivered', false)
              .order('created_at', { ascending: true }))
              .then(({ data, error }) => {
                if (error) {
                  console.error('Error refetching notifications:', error);
                  return;
                }
                if (data) observer.next(this.transformNotifications(data));
              })
              .catch(err => {
                console.error('Error in notifications refetch:', err);
              });
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  // Chat Threads
  getChatThreads(): Observable<ChatThread[]> {
    if (!this.client) return new BehaviorSubject<ChatThread[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`chat-threads-${tenantId}`);
    
    return new Observable(observer => {
      // Initial fetch
      Promise.resolve(this.client!.from('chat_threads')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false }))
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching chat threads:', error);
            observer.next([]);
            return;
          }
          observer.next(this.transformChatThreads(data || []));
        })
        .catch(err => {
          console.error('Error in chat threads query:', err);
          observer.next([]);
        });
      
      // Subscribe to changes (filtered by tenant_id)
      const subscription = channel
        .on('postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'chat_threads',
            filter: `tenant_id=eq.${tenantId}`
          },
          () => {
            Promise.resolve(this.client!.from('chat_threads')
              .select('*')
              .eq('tenant_id', tenantId)
              .order('updated_at', { ascending: false }))
              .then(({ data, error }) => {
                if (error) {
                  console.error('Error refetching chat threads:', error);
                  return;
                }
                if (data) observer.next(this.transformChatThreads(data));
              })
              .catch(err => {
                console.error('Error in chat threads refetch:', err);
              });
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  getChatMessages(chatThreadId: string): Observable<Message[]> {
    if (!this.client) return new BehaviorSubject<Message[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`chat-messages-${chatThreadId}`);
    
    return new Observable(observer => {
      // Initial fetch - filter out deleted messages
      Promise.resolve(this.client!.from('messages')
        .select(`
          *,
          message_attachments (document_id),
          message_mentions (agent_id)
        `)
        .eq('chat_thread_id', chatThreadId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null) // Only get non-deleted messages
        .order('created_at', { ascending: true }))
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching chat messages:', error);
            observer.next([]);
            return;
          }
          observer.next(this.transformMessages(data || []));
        })
        .catch(err => {
          console.error('Error in chat messages query:', err);
          observer.next([]);
        });
      
      // Subscribe to changes (filtered by tenant_id)
      const subscription = channel
        .on('postgres_changes',
          { 
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public', 
            table: 'messages', 
            filter: `chat_thread_id=eq.${chatThreadId}`
          },
          () => {
            Promise.resolve(this.client!.from('messages')
              .select(`
                *,
                message_attachments (document_id),
                message_mentions (agent_id)
              `)
              .eq('chat_thread_id', chatThreadId)
              .eq('tenant_id', tenantId)
              .is('deleted_at', null) // Only get non-deleted messages
              .order('created_at', { ascending: true }))
              .then(({ data, error }) => {
                if (error) {
                  console.error('Error refetching chat messages:', error);
                  return;
                }
                if (data) observer.next(this.transformMessages(data));
              })
              .catch(err => {
                console.error('Error in chat messages refetch:', err);
              });
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  createChatThread(agentId: string, title?: string): Promise<string> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const now = Date.now();
    
    // For backward compatibility, we'll use the first agent as created_by
    // but agent_id is the primary field for user-to-agent chat
    return Promise.resolve(this.client.from('chat_threads')
      .insert({
        agent_id: agentId,
        created_by: agentId, // kept for backward compatibility
        title: title || null,
        created_at: now,
        updated_at: now,
        tenant_id: tenantId // Include tenant_id for multi-tenant support
      })
      .select('id')
      .single())
      .then(({ data, error }) => {
        if (error) {
          console.error('Error creating chat thread:', error);
          throw error;
        }
        if (!data) {
          throw new Error('Chat thread creation failed: no data returned');
        }
        return data.id;
      });
  }

  createAgentToAgentThread(participantAgentIds: string[], title?: string): Promise<string> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    if (participantAgentIds.length < 2) {
      return Promise.reject(new Error('Agent-to-agent threads require at least 2 participants'));
    }
    
    const tenantId = this.getTenantId();
    const now = Date.now();
    
    return Promise.resolve(this.client.from('chat_threads')
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
      .single())
      .then(({ data, error }) => {
        if (error) {
          console.error('Error creating agent-to-agent thread:', error);
          throw error;
        }
        if (!data) {
          throw new Error('Agent-to-agent thread creation failed: no data returned');
        }
        return data.id;
      });
  }

  createChatMessage(chatThreadId: string, content: string, fromAgentId?: string | null, mentions?: string[]): Promise<string> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    // fromAgentId is optional: null/undefined = user message, UUID = agent message
    return Promise.resolve(this.client.rpc('create_chat_message', {
      p_chat_thread_id: chatThreadId,
      p_content: content,
      p_from_agent_id: fromAgentId || null,
      p_mentions: mentions || [],
      p_attachments: [] // Empty array for now, can be extended later
    })).then(({ data, error }) => {
      if (error) {
        console.error('Error creating chat message:', error);
        throw new Error(error.message || 'Failed to create chat message');
      }
      if (!data) {
        throw new Error('Chat message creation failed: no data returned');
      }
      return data as string;
    });
  }

  updateChatMessage(messageId: string, newContent: string): Promise<string> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    
    return Promise.resolve(this.client.rpc('update_chat_message', {
      p_message_id: messageId,
      p_new_content: newContent,
      p_tenant_id: tenantId
    })).then(({ data, error }) => {
      if (error) {
        console.error('Error updating chat message:', error);
        throw new Error(error.message || 'Failed to update chat message');
      }
      if (!data) {
        throw new Error('Chat message update failed: no data returned');
      }
      return data as string;
    });
  }

  deleteChatMessage(messageId: string): Promise<string> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    
    return Promise.resolve(this.client.rpc('delete_chat_message', {
      p_message_id: messageId,
      p_tenant_id: tenantId
    })).then(({ data, error }) => {
      if (error) {
        console.error('Error deleting chat message:', error);
        throw new Error(error.message || 'Failed to delete chat message');
      }
      if (!data) {
        throw new Error('Chat message deletion failed: no data returned');
      }
      return data as string;
    });
  }

  updateChatThreadTitle(threadId: string, title: string): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    
    return Promise.resolve(this.client.from('chat_threads')
      .update({ title, updated_at: Date.now() })
      .eq('id', threadId)
      .eq('tenant_id', tenantId))
      .then(({ error }) => {
        if (error) {
          console.error('Error updating chat thread title:', error);
          throw new Error(error.message || 'Failed to update thread title');
        }
      });
  }

  // Tenants
  getTenants(): Observable<Tenant[]> {
    if (!this.client) return new BehaviorSubject<Tenant[]>([]).asObservable();
    
    return from(
      Promise.resolve(this.client.from('tenants')
        .select('*')
        .order('name'))
        .then(({ data, error }) => {
          if (error) throw error;
          return (data || []).map((tenant: any) => ({
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            createdAt: tenant.created_at,
            updatedAt: tenant.updated_at
          }));
        })
    );
  }

  // Helper methods for transformation
  private transformAgents(data: any[]): Agent[] {
    return data.map(agent => ({
      _id: agent.id,
      _creationTime: new Date(agent.created_at).getTime(),
      name: agent.name,
      role: agent.role,
      status: agent.status,
      currentTaskId: agent.current_task_id,
      sessionKey: agent.session_key,
      level: agent.level,
      lastHeartbeat: agent.last_heartbeat,
      avatar: agent.avatar,
      roleTag: agent.role_tag,
      systemPrompt: agent.system_prompt,
      character: agent.character,
      lore: agent.lore
    }));
  }

  private transformTasks(data: any[]): Task[] {
    return data.map(task => ({
      _id: task.id,
      _creationTime: task.created_at,
      title: task.title,
      description: task.description,
      status: task.status,
      assigneeIds: task.task_assignments?.map((ta: any) => ta.agent_id) || [],
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      priority: task.priority,
      tags: task.tags || [],
      borderColor: task.border_color,
      startedAt: task.started_at,
      lastMessageAt: task.last_message_at,
      executionState: task.execution_state || 'idle',
      executionPausedAt: task.execution_paused_at,
      executionResumedAt: task.execution_resumed_at,
      currentStepId: task.current_step_id
    }));
  }

  private transformTask(task: any): Task {
    return {
      _id: task.id,
      _creationTime: task.created_at,
      title: task.title,
      description: task.description,
      status: task.status,
      assigneeIds: task.task_assignments?.map((ta: any) => ta.agent_id) || [],
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      priority: task.priority,
      tags: task.tags || [],
      borderColor: task.border_color,
      startedAt: task.started_at,
      lastMessageAt: task.last_message_at,
      executionState: task.execution_state || 'idle',
      executionPausedAt: task.execution_paused_at,
      executionResumedAt: task.execution_resumed_at,
      currentStepId: task.current_step_id
    };
  }

  private transformMessages(data: any[]): Message[] {
    return data.map(msg => ({
      _id: msg.id,
      _creationTime: msg.created_at,
      taskId: msg.task_id,
      chatThreadId: msg.chat_thread_id,
      fromAgentId: msg.from_agent_id || null, // null for user messages
      content: msg.content,
      attachments: msg.message_attachments?.map((a: any) => a.document_id) || [],
      createdAt: msg.created_at,
      mentions: msg.message_mentions?.map((m: any) => m.agent_id) || [],
      editedAt: msg.edited_at || null,
      deletedAt: msg.deleted_at || null,
      originalContent: msg.original_content || null
    }));
  }

  private transformActivities(data: any[]): Activity[] {
    return data.map(activity => ({
      _id: activity.id,
      _creationTime: activity.created_at,
      type: activity.type,
      agentId: activity.agent_id,
      taskId: activity.task_id,
      message: activity.message,
      eventTag: activity.event_tag,
      originator: activity.originator,
      createdAt: activity.created_at,
      stepDetails: activity.step_details,
      stepStatus: activity.step_status,
      stepOrder: activity.step_order
    }));
  }

  private transformDocuments(data: any[]): Document[] {
    return data.map(doc => ({
      _id: doc.id,
      _creationTime: doc.created_at,
      title: doc.title,
      content: doc.content,
      type: doc.type,
      taskId: doc.task_id,
      createdBy: doc.created_by,
      createdAt: doc.created_at,
      path: doc.path,
      messageId: doc.message_id
    }));
  }

  private transformNotifications(data: any[]): Notification[] {
    return data.map(notif => ({
      _id: notif.id,
      _creationTime: notif.created_at,
      mentionedAgentId: notif.mentioned_agent_id,
      content: notif.content,
      taskId: notif.task_id,
      delivered: notif.delivered,
      createdAt: notif.created_at
    }));
  }

  private transformProposals(data: any[]): Proposal[] {
    return data.map(proposal => ({
      _id: proposal.id,
      _creationTime: proposal.created_at,
      title: proposal.title,
      description: proposal.description,
      source: proposal.source,
      priority: proposal.priority,
      status: (proposal.status || 'pending').toLowerCase() as ProposalStatus, // Normalize status
      proposedSteps: proposal.proposed_steps || [],
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      approvedAt: proposal.approved_at,
      rejectedAt: proposal.rejected_at
    }));
  }

  private transformProposal(proposal: any): Proposal {
    return {
      _id: proposal.id,
      _creationTime: proposal.created_at,
      title: proposal.title,
      description: proposal.description,
      source: proposal.source,
      priority: proposal.priority,
      status: (proposal.status || 'pending').toLowerCase() as ProposalStatus, // Normalize status
      proposedSteps: proposal.proposed_steps || [],
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      approvedAt: proposal.approved_at,
      rejectedAt: proposal.rejected_at
    };
  }

  private transformChatThreads(data: any[]): ChatThread[] {
    return data.map(thread => ({
      _id: thread.id,
      _creationTime: thread.created_at,
      title: thread.title,
      createdBy: thread.created_by || thread.agent_id, // fallback for backward compatibility
      agentId: thread.agent_id, // null for agent-to-agent threads
      participantAgentIds: thread.participant_agent_ids, // array for agent-to-agent threads
      createdAt: thread.created_at,
      updatedAt: thread.updated_at
    }));
  }

  private getChannel(name: string): RealtimeChannel {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }
    
    if (!this.channels.has(name)) {
      const channel = this.client.channel(name);
      this.channels.set(name, channel);
    }
    
    return this.channels.get(name)!;
  }

  // Agent Memory Management
  private getMemoryApiUrl(): string {
    return (window as any).MEMORY_API_URL || 'http://localhost:3002';
  }

  getAgentMemoryFile(agentId: string, fileType: 'WORKING' | 'MEMORY' | string): Observable<string> {
    const url = `${this.getMemoryApiUrl()}/api/agents/${agentId}/memory/${fileType}`;
    return from(
      fetch(url)
        .then(res => res.json())
        .then(data => data.content || '')
        .catch(() => '')
    );
  }

  updateAgentMemoryFile(agentId: string, fileType: 'WORKING' | 'MEMORY' | string, content: string): Promise<void> {
    const url = `${this.getMemoryApiUrl()}/api/agents/${agentId}/memory/${fileType}`;
    return fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update memory file');
        return res.json();
      })
      .then(() => undefined);
  }

  getAgentDailyNotes(agentId: string): Observable<string[]> {
    const url = `${this.getMemoryApiUrl()}/api/agents/${agentId}/memory/daily-notes`;
    return from(
      fetch(url)
        .then(res => res.json())
        .then(data => data.files || [])
        .catch(() => [])
    );
  }

  // Execution tracking methods
  getTaskExecutionSteps(taskId: string): Observable<Activity[]> {
    if (!this.client) return new BehaviorSubject<Activity[]>([]).asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`execution-steps-${tenantId}-${taskId}`);
    
    return new Observable(observer => {
      // Initial fetch
      Promise.resolve(this.client!.from('activities')
        .select('*')
        .eq('task_id', taskId)
        .eq('type', 'execution_step')
        .eq('tenant_id', tenantId)
        .order('step_order', { ascending: true }))
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching execution steps:', error);
            observer.next([]);
            return;
          }
          observer.next(this.transformActivities(data || []));
        })
        .catch(err => {
          console.error('Error in execution steps query:', err);
          observer.next([]);
        });
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'activities', 
            filter: `task_id=eq.${taskId} AND type=eq.execution_step AND tenant_id=eq.${tenantId}` 
          },
          () => {
            Promise.resolve(this.client!.from('activities')
              .select('*')
              .eq('task_id', taskId)
              .eq('type', 'execution_step')
              .eq('tenant_id', tenantId)
              .order('step_order', { ascending: true }))
              .then(({ data, error }) => {
                if (error) {
                  console.error('Error refetching execution steps:', error);
                  return;
                }
                if (data) observer.next(this.transformActivities(data));
              })
              .catch(err => {
                console.error('Error in execution steps refetch:', err);
              });
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  getTaskExecutionState(taskId: string): Observable<string> {
    if (!this.client) return new BehaviorSubject<string>('idle').asObservable();
    
    const tenantId = this.getTenantId();
    const channel = this.getChannel(`execution-state-${tenantId}-${taskId}`);
    
    return new Observable(observer => {
      // Initial fetch
      Promise.resolve(this.client!.from('tasks')
        .select('execution_state')
        .eq('id', taskId)
        .eq('tenant_id', tenantId)
        .single())
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching execution state:', error);
            observer.next('idle');
            return;
          }
          observer.next(data?.execution_state || 'idle');
        })
        .catch(err => {
          console.error('Error in execution state query:', err);
          observer.next('idle');
        });
      
      // Subscribe to changes
      const subscription = channel
        .on('postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'tasks', 
            filter: `id=eq.${taskId} AND tenant_id=eq.${tenantId}` 
          },
          (payload: any) => {
            if (payload.new?.execution_state) {
              observer.next(payload.new.execution_state);
            }
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  pauseTaskExecution(taskId: string): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const now = Date.now();
    
    return Promise.resolve(
      this.client.from('tasks')
        .update({ execution_state: 'paused', execution_paused_at: now })
        .eq('id', taskId)
        .eq('tenant_id', tenantId)
        .then(({ error }) => {
          if (error) throw error;
          // Create activity entry
          return this.client!.from('activities').insert({
            type: 'execution_paused',
            agent_id: null,
            task_id: taskId,
            tenant_id: tenantId,
            message: 'Task execution paused',
            event_tag: 'execution',
            originator: 'User',
            created_at: now
          });
        })
        .then(({ error }) => {
          if (error) console.error('Error creating pause activity:', error);
        })
    );
  }

  resumeTaskExecution(taskId: string): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const now = Date.now();
    
    return Promise.resolve(
      this.client.from('tasks')
        .update({ execution_state: 'running', execution_resumed_at: now })
        .eq('id', taskId)
        .eq('tenant_id', tenantId)
        .then(({ error }) => {
          if (error) throw error;
          // Create activity entry
          return this.client!.from('activities').insert({
            type: 'execution_resumed',
            agent_id: null,
            task_id: taskId,
            tenant_id: tenantId,
            message: 'Task execution resumed',
            event_tag: 'execution',
            originator: 'User',
            created_at: now
          });
        })
        .then(({ error }) => {
          if (error) console.error('Error creating resume activity:', error);
        })
    );
  }

  interruptTaskExecution(taskId: string, reason?: string): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Supabase client not initialized'));
    
    const tenantId = this.getTenantId();
    const now = Date.now();
    
    return Promise.resolve(
      this.client.from('tasks')
        .update({ execution_state: 'idle' })
        .eq('id', taskId)
        .eq('tenant_id', tenantId)
        .then(({ error }) => {
          if (error) throw error;
          // Create activity entry
          return this.client!.from('activities').insert({
            type: 'execution_interrupted',
            agent_id: null,
            task_id: taskId,
            tenant_id: tenantId,
            message: reason || 'Task execution interrupted',
            event_tag: 'execution',
            originator: 'User',
            created_at: now
          });
        })
        .then(({ error }) => {
          if (error) console.error('Error creating interrupt activity:', error);
        })
    );
  }
}
