import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { combineLatest, map, timer, Observable } from 'rxjs';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-nav.component.html',
  styleUrl: './top-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopNavComponent {
  currentTime$: Observable<Date>;
  agentsActive$: Observable<number>;
  tasksInQueue$: Observable<number>;

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
