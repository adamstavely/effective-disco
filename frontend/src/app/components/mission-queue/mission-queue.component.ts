import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConvexService } from '../../services/convex.service';
import { Task, TaskStatus } from '../../models/types';
import { TaskCardComponent } from '../task-card/task-card.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mission-queue',
  standalone: true,
  imports: [CommonModule, TaskCardComponent],
  templateUrl: './mission-queue.component.html',
  styleUrl: './mission-queue.component.scss'
})
export class MissionQueueComponent implements OnInit, OnDestroy {
  tasks: Record<TaskStatus, Task[]> = {
    inbox: [],
    assigned: [],
    in_progress: [],
    review: [],
    done: [],
    blocked: []
  };
  statuses: TaskStatus[] = ['inbox', 'assigned', 'in_progress', 'review', 'done'];
  private subscriptions: Subscription[] = [];

  constructor(private convexService: ConvexService) {}

  ngOnInit(): void {
    const allStatuses: TaskStatus[] = ['inbox', 'assigned', 'in_progress', 'review', 'done', 'blocked'];
    
    allStatuses.forEach(status => {
      const sub = this.convexService.getTasks(status).subscribe(tasks => {
        this.tasks[status] = tasks;
      });
      this.subscriptions.push(sub);
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getTaskCount(status: TaskStatus): number {
    return this.tasks[status].length;
  }

  getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      inbox: 'INBOX',
      assigned: 'ASSIGNED',
      in_progress: 'IN PROGRESS',
      review: 'REVIEW',
      done: 'DONE',
      blocked: 'BLOCKED'
    };
    return labels[status];
  }
}
