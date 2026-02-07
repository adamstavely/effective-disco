import { Injectable } from '@angular/core';
import { ConvexHttpClient } from 'convex/browser';
import { Observable, interval, of } from 'rxjs';
import { switchMap, startWith, catchError } from 'rxjs/operators';
import { Agent, Task, Message, Activity, Document, Notification } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class ConvexService {
  private client: ConvexHttpClient | null = null;
  private pollInterval = 2000; // Poll every 2 seconds

  constructor() {
    // Convex URL should be set via environment or config
    const convexUrl = (window as any).CONVEX_URL || '';
    if (convexUrl) {
      this.client = new ConvexHttpClient(convexUrl);
    }
  }

  private query(queryName: string, args: any): Promise<any> {
    if (!this.client) {
      return Promise.resolve([]);
    }
    return (this.client.query as any)(queryName, args);
  }

  private mutation(mutationName: string, args: any): Promise<any> {
    if (!this.client) {
      return Promise.resolve(null);
    }
    return (this.client.mutation as any)(mutationName, args);
  }

  // Agents
  getAgents(): Observable<Agent[]> {
    return interval(this.pollInterval).pipe(
      startWith(0),
      switchMap(() => this.query('agents:getAll', {}).catch(() => [])),
      catchError(() => of([]))
    );
  }

  // Tasks
  getTasks(status?: string): Observable<Task[]> {
    return interval(this.pollInterval).pipe(
      startWith(0),
      switchMap(() => this.query('tasks:getAll', { status }).catch(() => [])),
      catchError(() => of([]))
    );
  }

  getTask(id: string): Observable<Task | null> {
    return interval(this.pollInterval).pipe(
      startWith(0),
      switchMap(() => this.query('tasks:getById', { id }).catch(() => null)),
      catchError(() => of(null))
    );
  }

  createTask(title: string, description: string, priority: 'low' | 'medium' | 'high'): Promise<string> {
    return this.mutation('tasks:create', { title, description, priority });
  }

  updateTask(id: string, updates: Partial<Task>): Promise<void> {
    return this.mutation('tasks:update', { id, ...updates });
  }

  // Messages
  getMessages(taskId: string): Observable<Message[]> {
    return interval(this.pollInterval).pipe(
      startWith(0),
      switchMap(() => this.query('messages:getByTask', { taskId }).catch(() => [])),
      catchError(() => of([]))
    );
  }

  createMessage(taskId: string, fromAgentId: string, content: string, mentions?: string[]): Promise<string> {
    return this.mutation('messages:create', { taskId, fromAgentId, content, mentions });
  }

  // Activities
  getActivityFeed(limit?: number): Observable<Activity[]> {
    return interval(this.pollInterval).pipe(
      startWith(0),
      switchMap(() => this.query('activities:getFeed', { limit }).catch(() => [])),
      catchError(() => of([]))
    );
  }

  // Documents
  getDocuments(taskId: string): Observable<Document[]> {
    return interval(this.pollInterval).pipe(
      startWith(0),
      switchMap(() => this.query('documents:getByTask', { taskId }).catch(() => [])),
      catchError(() => of([]))
    );
  }

  createDocument(title: string, content: string, type: Document['type'], createdBy: string, taskId?: string): Promise<string> {
    return this.mutation('documents:create', { title, content, type, createdBy, taskId: taskId || null });
  }

  // Notifications
  getNotifications(agentId: string): Observable<Notification[]> {
    return interval(this.pollInterval).pipe(
      startWith(0),
      switchMap(() => this.query('notifications:getUndelivered', { agentId }).catch(() => [])),
      catchError(() => of([]))
    );
  }
}
