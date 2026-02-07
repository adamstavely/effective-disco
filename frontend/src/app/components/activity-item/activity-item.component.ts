import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity } from '../../models/types';

@Component({
  selector: 'app-activity-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-item.component.html',
  styleUrl: './activity-item.component.scss'
})
export class ActivityItemComponent {
  @Input() activity!: Activity;

  getTimeAgo(): string {
    const now = Date.now();
    const diff = now - this.activity.createdAt;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `about ${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `about ${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  }
}
