import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConvexService } from '../../services/convex.service';
import { TaskStatus } from '../../models/types';
import { TaskCardComponent } from '../task-card/task-card.component';
import { PanelHeaderComponent } from '../../shared/components/panel-header/panel-header.component';
import { KANBAN_STATUSES, TASK_STATUS_LABELS } from '../../shared/constants/app.constants';
import { combineLatest, map, Observable } from 'rxjs';

@Component({
  selector: 'app-mission-queue',
  standalone: true,
  imports: [CommonModule, TaskCardComponent, PanelHeaderComponent],
  templateUrl: './mission-queue.component.html',
  styleUrl: './mission-queue.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MissionQueueComponent {
  statuses = KANBAN_STATUSES;
  tasks$: Observable<Record<TaskStatus, any[]>>;

  constructor(private convexService: ConvexService) {
    this.tasks$ = combineLatest(
      KANBAN_STATUSES.map(status => 
        this.convexService.getTasks(status).pipe(
          map(tasks => ({ status, tasks }))
        )
      )
    ).pipe(
      map(results => {
        const tasks: Record<TaskStatus, any[]> = {
          inbox: [],
          assigned: [],
          in_progress: [],
          review: [],
          done: [],
          blocked: []
        };
        results.forEach(({ status, tasks: taskList }) => {
          tasks[status] = taskList;
        });
        return tasks;
      })
    );
  }

  getTaskCount(tasks: Record<TaskStatus, any[]>, status: TaskStatus): number {
    return tasks[status]?.length || 0;
  }

  getStatusLabel(status: TaskStatus): string {
    return TASK_STATUS_LABELS[status];
  }
}
