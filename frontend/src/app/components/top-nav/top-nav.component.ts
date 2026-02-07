import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConvexService } from '../../services/convex.service';
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

  constructor(private convexService: ConvexService) {
    this.currentTime$ = timer(0, 1000).pipe(
      map(() => new Date())
    );

    this.agentsActive$ = this.convexService.getAgents().pipe(
      map(agents => agents.filter(a => a.status === 'active').length)
    );

    this.tasksInQueue$ = combineLatest([
      this.convexService.getTasks('inbox'),
      this.convexService.getTasks('assigned')
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
