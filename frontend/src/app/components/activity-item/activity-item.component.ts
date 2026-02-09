import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity } from '../../models/types';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-activity-item',
  standalone: true,
  imports: [CommonModule, TimeAgoPipe],
  templateUrl: './activity-item.component.html',
  styleUrl: './activity-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityItemComponent {
  @Input() activity!: Activity;

  getBulletColor(): string {
    const eventTag = this.activity.eventTag?.toLowerCase();
    
    // Green for successful/completion events
    if (eventTag === 'completion' || eventTag === 'success' || 
        this.activity.type?.includes('completed') || 
        this.activity.type?.includes('done')) {
      return 'var(--color-status-success)';
    }
    
    // Green for creation events
    if (eventTag === 'creation' || this.activity.type?.includes('created')) {
      return 'var(--color-status-success)';
    }
    
    // Grey for other events (messages, updates, etc.)
    return 'var(--color-neutral-500)';
  }

  getEventTagLabel(): string | null {
    if (!this.activity.eventTag) return null;
    
    // Capitalize first letter
    return this.activity.eventTag.charAt(0).toUpperCase() + 
           this.activity.eventTag.slice(1).toLowerCase();
  }
}
