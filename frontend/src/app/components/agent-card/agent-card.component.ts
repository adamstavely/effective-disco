import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Agent } from '../../models/types';
import { LevelBadgeComponent } from '../level-badge/level-badge.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-agent-card',
  standalone: true,
  imports: [CommonModule, LevelBadgeComponent, StatusBadgeComponent],
  templateUrl: './agent-card.component.html',
  styleUrl: './agent-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentCardComponent {
  @Input() agent!: Agent;
  @Input() selected = false;
}
