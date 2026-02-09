import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { map, switchMap, startWith, catchError } from 'rxjs/operators';
import { SupabaseService } from '../../services/supabase.service';
import { Agent, Task, Activity, AgentStatus, AgentLevel } from '../../models/types';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { LevelBadgeComponent } from '../level-badge/level-badge.component';

interface AgentStats {
  missions: number;
  stepsDone: number;
  costToday: number;
  events: number;
}

@Component({
  selector: 'app-agent-detail-tray',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TimeAgoPipe,
    StatusBadgeComponent,
    LevelBadgeComponent
  ],
  templateUrl: './agent-detail-tray.component.html',
  styleUrl: './agent-detail-tray.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentDetailTrayComponent implements OnInit, OnDestroy, OnChanges {
  @Input() agent: Agent | null = null;
  @Output() close = new EventEmitter<void>();

  isEditMode = false;
  editedAgent: Partial<Agent> = {};

  agent$ = new BehaviorSubject<Agent | null>(null);
  agentStats$: Observable<AgentStats>;
  agentTasks$: Observable<Task[]>;
  agentActivities$: Observable<Activity[]>;

  agentStatuses: AgentStatus[] = ['idle', 'active', 'blocked'];
  agentLevels: AgentLevel[] = ['intern', 'specialist', 'lead'];

  constructor(private supabaseService: SupabaseService) {
    // Agent stats observable
    this.agentStats$ = this.agent$.pipe(
      switchMap(agent => 
        agent ? this.supabaseService.getAgentStats(agent._id).pipe(
          startWith({ missions: 0, stepsDone: 0, costToday: 0, events: 0 }),
          catchError(() => of({ missions: 0, stepsDone: 0, costToday: 0, events: 0 }))
        ) : of({ missions: 0, stepsDone: 0, costToday: 0, events: 0 })
      )
    );

    // Agent tasks observable
    this.agentTasks$ = this.agent$.pipe(
      switchMap(agent => 
        agent ? this.supabaseService.getAgentTasks(agent._id, 10).pipe(
          startWith([]),
          catchError(() => of([]))
        ) : of([])
      )
    );

    // Agent activities observable
    this.agentActivities$ = this.agent$.pipe(
      switchMap(agent => 
        agent ? this.supabaseService.getAgentActivities(agent._id, 20).pipe(
          startWith([]),
          catchError(() => of([]))
        ) : of([])
      )
    );
  }

  ngOnInit() {
    this.agent$.next(this.agent);
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['agent'] && this.agent) {
      this.agent$.next(this.agent);
      this.editedAgent = { ...this.agent };
    }
  }

  toggleEditMode() {
    if (this.isEditMode) {
      // Cancel edit - reset to original
      this.editedAgent = this.agent ? { ...this.agent } : {};
    }
    this.isEditMode = !this.isEditMode;
  }

  saveAgent() {
    if (!this.agent) return;

    this.supabaseService.updateAgent(this.agent._id, this.editedAgent)
      .then(() => {
        this.isEditMode = false;
        // The agent will be updated via real-time subscription
      })
      .catch(error => {
        console.error('Error updating agent:', error);
      });
  }

  onClose() {
    this.close.emit();
  }

  getStatusColor(status: AgentStatus): string {
    switch (status) {
      case 'active':
        return 'var(--color-status-success)';
      case 'blocked':
        return 'var(--color-status-error)';
      default:
        return 'var(--color-neutral-500)';
    }
  }

  getActivityStatusColor(type: string): string {
    if (type?.includes('completed') || type?.includes('succeeded')) {
      return 'var(--color-status-success)';
    }
    if (type?.includes('failed') || type?.includes('error')) {
      return 'var(--color-status-error)';
    }
    return 'var(--color-neutral-500)';
  }

  formatCost(cost: number): string {
    return `$${cost.toFixed(2)}`;
  }
}
