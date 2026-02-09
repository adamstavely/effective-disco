import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { SupabaseService } from '../../services/supabase.service';
import { TaskStatus, Task, Agent } from '../../models/types';
import { TaskCardComponent } from '../task-card/task-card.component';
import { TaskDetailPanelComponent } from '../task-detail-panel/task-detail-panel.component';
import { PanelHeaderComponent } from '../../shared/components/panel-header/panel-header.component';
import { KANBAN_STATUSES, TASK_STATUS_LABELS } from '../../shared/constants/app.constants';
import { combineLatest, map, Observable, of, catchError, startWith, BehaviorSubject, firstValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-mission-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, TaskCardComponent, TaskDetailPanelComponent, PanelHeaderComponent],
  templateUrl: './mission-queue.component.html',
  styleUrl: './mission-queue.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MissionQueueComponent {
  statuses = KANBAN_STATUSES;
  tasks$: Observable<Record<TaskStatus, Task[]>>;
  selectedTask: Task | null = null;
  showArchived = false;
  private showArchived$ = new BehaviorSubject<boolean>(false);
  
  // Bulk selection
  selectedTaskIds = new Set<string>();
  isBulkMode = false;

  // Create task dialog
  showCreateTaskDialog = false;
  newTaskTitle = '';
  newTaskDescription = '';
  newTaskPriority: 'low' | 'medium' | 'high' = 'medium';
  selectedAssigneeIds: string[] = [];
  isCreatingTask = false;
  agents$: Observable<Agent[]>;

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {
    this.agents$ = this.supabaseService.getAgents().pipe(
      catchError(error => {
        console.error('Error loading agents:', error);
        return of([]);
      }),
      startWith([])
    );
    this.tasks$ = this.showArchived$.pipe(
      switchMap(showArchived => 
        combineLatest(
          KANBAN_STATUSES.map(status => 
            this.supabaseService.getTasks(status).pipe(
              catchError(error => {
                console.error(`Error loading tasks for status ${status}:`, error);
                return of([]);
              }),
              map(tasks => {
                // Filter out archived tasks unless showArchived is true
                const filteredTasks = showArchived 
                  ? tasks 
                  : tasks.filter(t => t.status !== 'archived');
                return { status, tasks: filteredTasks };
              })
            )
          )
        ).pipe(
          map(results => {
            const tasks: Record<TaskStatus, Task[]> = {
              inbox: [],
              assigned: [],
              in_progress: [],
              review: [],
              done: [],
              blocked: [],
              archived: []
            };
            results.forEach(({ status, tasks: taskList }) => {
              tasks[status] = taskList || [];
            });
            return tasks;
          }),
          startWith({
            inbox: [],
            assigned: [],
            in_progress: [],
            review: [],
            done: [],
            blocked: [],
            archived: []
          } as Record<TaskStatus, Task[]>),
          catchError(error => {
            console.error('Error loading tasks:', error);
            return of({
              inbox: [],
              assigned: [],
              in_progress: [],
              review: [],
              done: [],
              blocked: [],
              archived: []
            } as Record<TaskStatus, Task[]>);
          })
        )
      )
    );
  }

  getTaskCount(tasks: Record<TaskStatus, Task[]>, status: TaskStatus): number {
    return tasks[status]?.length || 0;
  }

  getStatusLabel(status: TaskStatus): string {
    return TASK_STATUS_LABELS[status];
  }

  onTaskDropped(event: CdkDragDrop<Task[]>, newStatus: TaskStatus): void {
    if (event.previousContainer === event.container) {
      // Reordering within the same column - just update the order
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      // Trigger change detection for OnPush
      this.cdr.markForCheck();
    } else {
      // Moving to a different column - update both visual state and database
      const task = event.previousContainer.data[event.previousIndex];
      
      // Update visual state immediately for better UX
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      
      // Trigger change detection for OnPush
      this.cdr.markForCheck();
      
      // Update the task status in the database
      // The real-time subscription will confirm/update the change
      this.supabaseService.updateTask(task._id, { status: newStatus })
        .catch(error => {
          console.error('Error updating task status:', error);
          // On error, the real-time subscription will revert the change
        });
    }
  }

  getConnectedDropLists(): string[] {
    return this.statuses.map(status => `kanban-column-${status}`);
  }

  selectTask(task: Task | null): void {
    this.selectedTask = task;
  }

  closePanel(): void {
    this.selectedTask = null;
  }

  toggleArchived(): void {
    this.showArchived = !this.showArchived;
    this.showArchived$.next(this.showArchived);
    this.cdr.markForCheck();
  }

  // Bulk operations
  toggleBulkMode(): void {
    this.isBulkMode = !this.isBulkMode;
    if (!this.isBulkMode) {
      this.selectedTaskIds.clear();
    }
    this.cdr.markForCheck();
  }

  toggleTaskSelection(taskId: string): void {
    if (this.selectedTaskIds.has(taskId)) {
      this.selectedTaskIds.delete(taskId);
    } else {
      this.selectedTaskIds.add(taskId);
    }
    this.cdr.markForCheck();
  }

  isTaskSelected(taskId: string): boolean {
    return this.selectedTaskIds.has(taskId);
  }

  getSelectedCount(): number {
    return this.selectedTaskIds.size;
  }

  selectAllInColumn(tasks: Task[]): void {
    tasks.forEach(task => this.selectedTaskIds.add(task._id));
    this.cdr.markForCheck();
  }

  deselectAll(): void {
    this.selectedTaskIds.clear();
    this.cdr.markForCheck();
  }

  areAllTasksSelectedInColumn(tasks: Task[]): boolean {
    if (tasks.length === 0) return false;
    return tasks.every(task => this.selectedTaskIds.has(task._id));
  }

  toggleSelectAllInColumn(tasks: Task[]): void {
    if (this.areAllTasksSelectedInColumn(tasks)) {
      this.deselectAll();
    } else {
      this.selectAllInColumn(tasks);
    }
  }

  async bulkUpdateStatus(newStatus: TaskStatus): Promise<void> {
    const taskIds = Array.from(this.selectedTaskIds);
    if (taskIds.length === 0) return;

    try {
      await Promise.all(
        taskIds.map(taskId => 
          this.supabaseService.updateTask(taskId, { status: newStatus })
        )
      );
      this.deselectAll();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error updating tasks:', error);
      alert('Error updating some tasks. Please try again.');
    }
  }

  async bulkArchive(): Promise<void> {
    await this.bulkUpdateStatus('archived');
  }

  async bulkDelete(): Promise<void> {
    const taskIds = Array.from(this.selectedTaskIds);
    if (taskIds.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${taskIds.length} task(s)? This cannot be undone.`)) {
      return;
    }

    try {
      await Promise.all(
        taskIds.map(taskId => this.supabaseService.deleteTask(taskId))
      );
      this.deselectAll();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error deleting tasks:', error);
      alert('Error deleting some tasks. Please try again.');
    }
  }

  async bulkAssignAgents(agentIds: string[]): Promise<void> {
    const taskIds = Array.from(this.selectedTaskIds);
    if (taskIds.length === 0) return;

    try {
      await Promise.all(
        taskIds.map(taskId => 
          this.supabaseService.updateTaskAssignments(taskId, agentIds)
        )
      );
      this.deselectAll();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error assigning agents:', error);
      alert('Error assigning agents to some tasks. Please try again.');
    }
  }

  async bulkAddTags(tags: string[]): Promise<void> {
    const taskIds = Array.from(this.selectedTaskIds);
    if (taskIds.length === 0) return;

    try {
      // Get current tasks to merge tags
      const tasks = await Promise.all(
        taskIds.map(taskId => 
          firstValueFrom(
            this.supabaseService.getTask(taskId).pipe(
              catchError(() => of(null))
            )
          )
        )
      );

      await Promise.all(
        tasks.map((task, index) => {
          if (!task) return Promise.resolve();
          const currentTags = task.tags || [];
          const newTags = [...new Set([...currentTags, ...tags])];
          return this.supabaseService.updateTask(taskIds[index], { tags: newTags });
        })
      );
      this.deselectAll();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error adding tags:', error);
      alert('Error adding tags to some tasks. Please try again.');
    }
  }

  openCreateTaskDialog(): void {
    this.showCreateTaskDialog = true;
    this.cdr.markForCheck();
  }

  closeCreateTaskDialog(): void {
    this.showCreateTaskDialog = false;
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.newTaskPriority = 'medium';
    this.selectedAssigneeIds = [];
    this.cdr.markForCheck();
  }

  async onCreateTask(): Promise<void> {
    if (!this.newTaskTitle.trim() || !this.newTaskDescription.trim()) {
      return;
    }
    
    this.isCreatingTask = true;
    this.cdr.markForCheck();
    
    try {
      await this.supabaseService.createTask(
        this.newTaskTitle.trim(),
        this.newTaskDescription.trim(),
        this.newTaskPriority,
        this.selectedAssigneeIds.length > 0 ? this.selectedAssigneeIds : undefined
      );
      this.closeCreateTaskDialog();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      this.isCreatingTask = false;
      this.cdr.markForCheck();
    }
  }

  toggleAssignee(agentId: string): void {
    const index = this.selectedAssigneeIds.indexOf(agentId);
    if (index > -1) {
      this.selectedAssigneeIds.splice(index, 1);
    } else {
      this.selectedAssigneeIds.push(agentId);
    }
    this.cdr.markForCheck();
  }

  isAssigneeSelected(agentId: string): boolean {
    return this.selectedAssigneeIds.includes(agentId);
  }
}
