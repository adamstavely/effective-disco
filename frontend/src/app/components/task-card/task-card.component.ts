import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/types';
import { TagComponent } from '../tag/tag.component';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, TagComponent],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss'
})
export class TaskCardComponent {
  @Input() task!: Task;

  getTimeAgo(): string {
    const now = Date.now();
    const diff = now - this.task.createdAt;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  getDescriptionSnippet(): string {
    if (this.task.description.length <= 100) return this.task.description;
    return this.task.description.substring(0, 100) + '...';
  }
}
