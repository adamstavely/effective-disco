import { Component, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConvexService } from '../../services/convex.service';
import { AgentCardComponent } from '../agent-card/agent-card.component';
import { PanelHeaderComponent } from '../../shared/components/panel-header/panel-header.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-agents-panel',
  standalone: true,
  imports: [CommonModule, AgentCardComponent, PanelHeaderComponent],
  templateUrl: './agents-panel.component.html',
  styleUrl: './agents-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentsPanelComponent {
  agents$: Observable<any[]>;
  selectedAgentId: string | null = null;
  @Output() agentSelected = new EventEmitter<string | null>();

  constructor(private convexService: ConvexService) {
    this.agents$ = this.convexService.getAgents();
  }

  selectAgent(agentId: string | null): void {
    this.selectedAgentId = agentId;
    this.agentSelected.emit(agentId);
  }
}
