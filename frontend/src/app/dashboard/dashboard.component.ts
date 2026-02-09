import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopNavComponent } from '../components/top-nav/top-nav.component';
import { AgentsPanelComponent } from '../components/agents-panel/agents-panel.component';
import { MissionQueueComponent } from '../components/mission-queue/mission-queue.component';
import { LiveFeedComponent } from '../components/live-feed/live-feed.component';
import { ProposalsComponent } from '../components/proposals/proposals.component';
import { QuickStatsComponent } from '../components/quick-stats/quick-stats.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TopNavComponent,
    AgentsPanelComponent,
    MissionQueueComponent,
    LiveFeedComponent,
    ProposalsComponent,
    QuickStatsComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {}
