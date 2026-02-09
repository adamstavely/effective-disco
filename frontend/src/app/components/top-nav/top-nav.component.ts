import { Component, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { TenantSelectorComponent } from '../tenant-selector/tenant-selector.component';
import { combineLatest, map, timer, Observable } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [CommonModule, TenantSelectorComponent, LucideAngularModule],
  templateUrl: './top-nav.component.html',
  styleUrl: './top-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopNavComponent {
  @Output() chatClick = new EventEmitter<void>();
  
  currentTime$: Observable<Date>;
  agentsActive$: Observable<number>;
  tasksInQueue$: Observable<number>;
  proposalsToday$: Observable<number>;
  missionsCompleted$: Observable<number>;
  successRate$: Observable<number>;

  constructor(private supabaseService: SupabaseService) {
    this.currentTime$ = timer(0, 1000).pipe(
      map(() => new Date())
    );

    this.agentsActive$ = this.supabaseService.getAgents().pipe(
      map(agents => agents.filter(a => a.status === 'active').length)
    );

    this.tasksInQueue$ = combineLatest([
      this.supabaseService.getTasks('inbox'),
      this.supabaseService.getTasks('assigned')
    ]).pipe(
      map(([inbox, assigned]) => inbox.length + assigned.length)
    );

    this.proposalsToday$ = this.supabaseService.getProposalsToday().pipe(
      catchError((error) => {
        console.error('Error loading proposals today:', error);
        return of(0);
      })
    );

    this.missionsCompleted$ = this.supabaseService.getCompletedMissions().pipe(
      catchError((error) => {
        console.error('Error loading completed missions:', error);
        return of(0);
      })
    );

    this.successRate$ = this.supabaseService.getSuccessRate().pipe(
      catchError((error) => {
        console.error('Error loading success rate:', error);
        return of(0);
      })
    );
  }

  onChatClick(): void {
    this.chatClick.emit();
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).toUpperCase();
  }
}
