import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopNavComponent } from '../components/top-nav/top-nav.component';
import { AgentsPanelComponent } from '../components/agents-panel/agents-panel.component';
import { MissionQueueComponent } from '../components/mission-queue/mission-queue.component';
import { LiveFeedComponent } from '../components/live-feed/live-feed.component';
import { ConvexService } from '../services/convex.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TopNavComponent,
    AgentsPanelComponent,
    MissionQueueComponent,
    LiveFeedComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  constructor(private convexService: ConvexService) {}

  ngOnInit(): void {
    // Component initialization
  }
}
