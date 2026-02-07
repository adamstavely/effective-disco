import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConvexService } from '../../services/convex.service';
import { Activity, ActivityType } from '../../models/types';
import { ActivityItemComponent } from '../activity-item/activity-item.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-live-feed',
  standalone: true,
  imports: [CommonModule, ActivityItemComponent],
  templateUrl: './live-feed.component.html',
  styleUrl: './live-feed.component.scss'
})
export class LiveFeedComponent implements OnInit, OnDestroy {
  activities: Activity[] = [];
  selectedFilter: ActivityType | 'all' = 'all';
  private subscription?: Subscription;

  activityTypes: (ActivityType | 'all')[] = ['all', 'task_created', 'message_sent', 'document_created', 'task_assigned', 'status_changed'];

  constructor(private convexService: ConvexService) {}

  ngOnInit(): void {
    this.subscription = this.convexService.getActivityFeed(50).subscribe(activities => {
      this.activities = activities;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  setFilter(filter: ActivityType | 'all'): void {
    this.selectedFilter = filter;
  }

  getFilteredActivities(): Activity[] {
    if (this.selectedFilter === 'all') return this.activities;
    return this.activities.filter(a => a.type === this.selectedFilter);
  }

  getFilterCount(filter: ActivityType | 'all'): number {
    if (filter === 'all') return this.activities.length;
    return this.activities.filter(a => a.type === filter).length;
  }

  getFilterLabel(filter: ActivityType | 'all'): string {
    const labels: Record<string, string> = {
      all: 'All',
      task_created: 'Tasks',
      message_sent: 'Comments',
      document_created: 'Docs',
      task_assigned: 'Status',
      status_changed: 'Status'
    };
    return labels[filter] || filter;
  }
}
