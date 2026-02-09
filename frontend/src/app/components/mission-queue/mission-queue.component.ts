import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { SupabaseService } from '../../services/supabase.service';
import { TaskStatus, Task } from '../../models/types';
import { TaskCardComponent } from '../task-card/task-card.component';
import { TaskDetailPanelComponent } from '../task-detail-panel/task-detail-panel.component';
import { PanelHeaderComponent } from '../../shared/components/panel-header/panel-header.component';
import { KANBAN_STATUSES, TASK_STATUS_LABELS } from '../../shared/constants/app.constants';
import { combineLatest, map, Observable, of, catchError, startWith, BehaviorSubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-mission-queue',
  standalone: true,
  imports: [CommonModule, DragDropModule, TaskCardComponent, TaskDetailPanelComponent, PanelHeaderComponent],
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

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {
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
}
