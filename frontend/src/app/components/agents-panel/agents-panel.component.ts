import { Component, ChangeDetectionStrategy, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { AgentCardComponent } from '../agent-card/agent-card.component';
import { PanelHeaderComponent } from '../../shared/components/panel-header/panel-header.component';
import { AgentDetailTrayComponent } from '../agent-detail-tray/agent-detail-tray.component';
import { Agent, AgentLevel } from '../../models/types';
import { Observable, map, combineLatest, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-agents-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, AgentCardComponent, PanelHeaderComponent, AgentDetailTrayComponent],
  templateUrl: './agents-panel.component.html',
  styleUrl: './agents-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentsPanelComponent {
  agents$: Observable<Agent[]>;
  selectedAgentId$ = new BehaviorSubject<string | null>(null);
  selectedAgent$: Observable<Agent | null>;
  @Output() agentSelected = new EventEmitter<string | null>();

  // Create agent dialog
  showCreateAgentDialog = false;
  newAgentName = '';
  newAgentRole = '';
  newAgentLevel: AgentLevel = 'specialist';
  newAgentSessionKey = '';
  newAgentAvatar = '';
  newAgentRoleTag = '';
  newAgentSystemPrompt = '';
  newAgentCharacter = '';
  newAgentLore = '';
  isCreatingAgent = false;

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {
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

  openCreateAgentDialog(): void {
    this.showCreateAgentDialog = true;
    this.cdr.markForCheck();
  }

  closeCreateAgentDialog(): void {
    this.showCreateAgentDialog = false;
    this.newAgentName = '';
    this.newAgentRole = '';
    this.newAgentLevel = 'specialist';
    this.newAgentSessionKey = '';
    this.newAgentAvatar = '';
    this.newAgentRoleTag = '';
    this.newAgentSystemPrompt = '';
    this.newAgentCharacter = '';
    this.newAgentLore = '';
    this.cdr.markForCheck();
  }

  /**
   * Generate session key from role name
   * Format: agent:{role-slug}:main
   */
  private generateSessionKey(role: string): string {
    const slug = role
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `agent:${slug}:main`;
  }

  async onCreateAgent(): Promise<void> {
    if (!this.newAgentName.trim() || !this.newAgentRole.trim()) {
      return;
    }
    
    this.isCreatingAgent = true;
    this.cdr.markForCheck();
    
    try {
      // Use provided sessionKey or generate from role
      const sessionKey = this.newAgentSessionKey.trim() || this.generateSessionKey(this.newAgentRole);
      
      await this.supabaseService.createAgent(
        this.newAgentName.trim(),
        this.newAgentRole.trim(),
        sessionKey,
        this.newAgentLevel,
        {
          avatar: this.newAgentAvatar.trim() || null,
          roleTag: this.newAgentRoleTag.trim() || null,
          systemPrompt: this.newAgentSystemPrompt.trim() || null,
          character: this.newAgentCharacter.trim() || null,
          lore: this.newAgentLore.trim() || null
        }
      );
      this.closeCreateAgentDialog();
    } catch (error: any) {
      console.error('Error creating agent:', error);
      const errorMessage = error?.message?.includes('duplicate') || error?.code === '23505'
        ? 'An agent with this session key already exists. Please use a different session key.'
        : 'Failed to create agent. Please try again.';
      alert(errorMessage);
    } finally {
      this.isCreatingAgent = false;
      this.cdr.markForCheck();
    }
  }
}
