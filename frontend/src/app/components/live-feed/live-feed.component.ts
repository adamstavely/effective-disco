import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { ActivityType } from '../../models/types';
import { ActivityItemComponent } from '../activity-item/activity-item.component';
import { PanelHeaderComponent } from '../../shared/components/panel-header/panel-header.component';
import { FilterButtonComponent } from '../../shared/components/filter-button/filter-button.component';
import { ACTIVITY_TYPE_LABELS } from '../../shared/constants/app.constants';
import { map, BehaviorSubject, combineLatest, Observable } from 'rxjs';

const ACTIVITY_TYPES: (ActivityType | 'all')[] = [
  'all',
  'task_created',
  'message_sent',
  'document_created',
  'task_assigned',
  'status_changed'
];

@Component({
  selector: 'app-live-feed',
  standalone: true,
  imports: [
    CommonModule,
    ActivityItemComponent,
    PanelHeaderComponent,
    FilterButtonComponent
  ],
  templateUrl: './live-feed.component.html',
  styleUrl: './live-feed.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveFeedComponent {
  activities$: Observable<any[]>;
  selectedFilter$ = new BehaviorSubject<ActivityType | 'all'>('all');
  activityTypes = ACTIVITY_TYPES;
  filteredActivities$: Observable<any[]>;

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {
    this.activities$ = this.supabaseService.getActivityFeed(50);
    
    this.filteredActivities$ = combineLatest([
      this.activities$,
      this.selectedFilter$
    ]).pipe(
      map(([activities, filter]) => {
        if (filter === 'all') return activities;
        return activities.filter(a => a.type === filter);
      })
    );
  }

  setFilter(filter: ActivityType | 'all'): void {
    this.selectedFilter$.next(filter);
    this.cdr.markForCheck();
  }

  getFilterCount(activities: any[], filter: ActivityType | 'all'): number {
    if (filter === 'all') return activities.length;
    return activities.filter(a => a.type === filter).length;
  }

  getFilterLabel(filter: ActivityType | 'all'): string {
    return ACTIVITY_TYPE_LABELS[filter] || filter;
  }
}
