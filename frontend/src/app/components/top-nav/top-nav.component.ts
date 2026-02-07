import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConvexService } from '../../services/convex.service';
import { Agent, Task } from '../../models/types';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-nav.component.html',
  styleUrl: './top-nav.component.scss'
})
export class TopNavComponent implements OnInit, OnDestroy {
  agentsActive = 0;
  tasksInQueue = 0;
  currentTime = new Date();
  private subscriptions = new Subscription();
  private timeInterval?: number;

  constructor(private convexService: ConvexService) {}

  ngOnInit(): void {
    // Update time every second
    this.timeInterval = window.setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

    // Get agent and task counts
    const agentsSub = this.convexService.getAgents().subscribe(agents => {
      this.agentsActive = agents.filter(a => a.status === 'active').length;
    });

    const tasksSub = combineLatest([
      this.convexService.getTasks('inbox'),
      this.convexService.getTasks('assigned')
    ]).subscribe(([inbox, assigned]) => {
      this.tasksInQueue = inbox.length + assigned.length;
    });

    this.subscriptions.add(agentsSub);
    this.subscriptions.add(tasksSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  formatTime(): string {
    return this.currentTime.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatDate(): string {
    return this.currentTime.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).toUpperCase();
  }
}
