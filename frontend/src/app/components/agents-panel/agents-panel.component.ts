import { Component, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { AgentCardComponent } from '../agent-card/agent-card.component';
import { PanelHeaderComponent } from '../../shared/components/panel-header/panel-header.component';
import { AgentDetailTrayComponent } from '../agent-detail-tray/agent-detail-tray.component';
import { Agent } from '../../models/types';
import { Observable, map, combineLatest, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-agents-panel',
  standalone: true,
  imports: [CommonModule, AgentCardComponent, PanelHeaderComponent, AgentDetailTrayComponent],
  templateUrl: './agents-panel.component.html',
  styleUrl: './agents-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentsPanelComponent {
  agents$: Observable<Agent[]>;
  selectedAgentId$ = new BehaviorSubject<string | null>(null);
  selectedAgent$: Observable<Agent | null>;
  @Output() agentSelected = new EventEmitter<string | null>();

  constructor(private supabaseService: SupabaseService) {
    this.agents$ = this.supabaseService.getAgents();
    
    // Create observable that updates when selectedAgentId changes
    this.selectedAgent$ = combineLatest([
      this.agents$,
      this.selectedAgentId$
    ]).pipe(
      map(([agents, selectedId]) => {
        if (selectedId) {
          return agents.find(a => a._id === selectedId) || null;
        }
        return null;
      })
    );
  }

  get selectedAgentId(): string | null {
    return this.selectedAgentId$.value;
  }

  selectAgent(agentId: string | null): void {
    // Toggle selection - if clicking the same agent, deselect
    const currentId = this.selectedAgentId$.value;
    if (currentId === agentId) {
      this.selectedAgentId$.next(null);
      this.agentSelected.emit(null);
    } else {
      this.selectedAgentId$.next(agentId);
      this.agentSelected.emit(agentId);
    }
  }

  closeTray(): void {
    this.selectedAgentId$.next(null);
    this.agentSelected.emit(null);
  }
}
