import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Task } from '../../models/types';
import { TagComponent } from '../tag/tag.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { SupabaseService } from '../../services/supabase.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, DragDropModule, TagComponent, TimeAgoPipe, TitleCasePipe, LucideAngularModule],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCardComponent {
  @Input() task!: Task;
  @Input() selected: boolean = false;
  @Input() isBulkMode: boolean = false;
  @Input() isSelected: boolean = false;
  @Output() play = new EventEmitter<Task>();
  @Output() archive = new EventEmitter<Task>();
  @Output() selectionChange = new EventEmitter<void>();

  readonly MAX_VISIBLE_TAGS = 2;

  constructor(private supabaseService: SupabaseService) {}

  getDescriptionSnippet(): string {
    if (this.task.description.length <= 100) return this.task.description;
    return this.task.description.substring(0, 100) + '...';
  }

  getVisibleTags(): string[] {
    const tags = this.task.tags || [];
    return tags.slice(0, this.MAX_VISIBLE_TAGS);
  }

  getRemainingTagsCount(): number {
    const tags = this.task.tags || [];
    return Math.max(0, tags.length - this.MAX_VISIBLE_TAGS);
  }

  hasTags(): boolean {
    return (this.task.tags || []).length > 0;
  }


  hasLastMessage(): boolean {
    return !!this.task.lastMessageAt;
  }

  onPlayClick(event: Event): void {
    event.stopPropagation();
    if (this.task && this.canResumeTask()) {
      this.supabaseService.resumeTask(this.task._id)
        .then(() => {
          this.play.emit(this.task);
        })
        .catch(error => {
          console.error('Error resuming task:', error);
        });
    }
  }

  canResumeTask(): boolean {
    return this.task.status === 'review' && (this.task.assigneeIds?.length || 0) > 0;
  }

  onArchiveClick(event: Event): void {
    event.stopPropagation();
    this.supabaseService.updateTask(this.task._id, { status: 'archived' })
      .catch(error => {
        console.error('Error archiving task:', error);
      });
    this.archive.emit(this.task);
  }
}
