import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/types';
import { TagComponent } from '../tag/tag.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, TagComponent, TimeAgoPipe],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCardComponent {
  @Input() task!: Task;

  getDescriptionSnippet(): string {
    if (this.task.description.length <= 100) return this.task.description;
    return this.task.description.substring(0, 100) + '...';
  }
}
