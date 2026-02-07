import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConvexService } from '../../services/convex.service';
import { Agent } from '../../models/types';
import { AgentCardComponent } from '../agent-card/agent-card.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-agents-panel',
  standalone: true,
  imports: [CommonModule, AgentCardComponent],
  templateUrl: './agents-panel.component.html',
  styleUrl: './agents-panel.component.scss'
})
export class AgentsPanelComponent implements OnInit, OnDestroy {
  agents: Agent[] = [];
  selectedAgentId: string | null = null;
  @Output() agentSelected = new EventEmitter<string | null>();
  private subscription?: Subscription;

  constructor(private convexService: ConvexService) {}

  ngOnInit(): void {
    this.subscription = this.convexService.getAgents().subscribe(agents => {
      this.agents = agents;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  selectAgent(agentId: string | null): void {
    this.selectedAgentId = agentId;
    this.agentSelected.emit(agentId);
  }
}
