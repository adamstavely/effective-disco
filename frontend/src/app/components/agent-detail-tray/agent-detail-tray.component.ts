import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { map, switchMap, startWith, catchError } from 'rxjs/operators';
import { SupabaseService } from '../../services/supabase.service';
import { Agent, Task, Activity, AgentStatus, AgentLevel } from '../../models/types';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { LevelBadgeComponent } from '../level-badge/level-badge.component';
import { LucideAngularModule } from 'lucide-angular';

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
    LevelBadgeComponent,
    LucideAngularModule
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
  agentPerformance$: Observable<any>;
  agentWorkload$: Observable<any>;
  dailyNotes$: Observable<string[]>;
  workingMemory$: Observable<string>;
  longTermMemory$: Observable<string>;

  activeTab: 'overview' | 'performance' | 'workload' | 'memory' = 'overview';
  activeMemoryFile: 'WORKING' | 'MEMORY' | string = 'WORKING';
  memoryContent: string = '';
  isEditingMemory: boolean = false;
  isLoadingMemory: boolean = false;

  agentStatuses: AgentStatus[] = ['idle', 'active', 'blocked'];
  agentLevels: AgentLevel[] = ['intern', 'specialist', 'lead'];

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {
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

    // Agent performance metrics observable
    this.agentPerformance$ = this.agent$.pipe(
      switchMap(agent =>
        agent ? this.supabaseService.getAgentPerformanceMetrics(agent._id, 30).pipe(
          startWith(null),
          catchError(() => of(null))
        ) : of(null)
      )
    );

    // Agent workload observable
    this.agentWorkload$ = this.agent$.pipe(
      switchMap(agent =>
        agent ? this.supabaseService.getAgentWorkload(agent._id).pipe(
          startWith(null),
          catchError(() => of(null))
        ) : of(null)
      )
    );

    // Daily notes observable
    this.dailyNotes$ = this.agent$.pipe(
      switchMap(agent =>
        agent ? this.supabaseService.getAgentDailyNotes(agent._id).pipe(
          startWith([]),
          catchError(() => of([]))
        ) : of([])
      )
    );

    // Working memory observable
    this.workingMemory$ = this.agent$.pipe(
      switchMap(agent =>
        agent ? this.supabaseService.getAgentMemoryFile(agent._id, 'WORKING').pipe(
          startWith(''),
          catchError(() => of(''))
        ) : of('')
      )
    );

    // Long-term memory observable
    this.longTermMemory$ = this.agent$.pipe(
      switchMap(agent =>
        agent ? this.supabaseService.getAgentMemoryFile(agent._id, 'MEMORY').pipe(
          startWith(''),
          catchError(() => of(''))
        ) : of('')
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

  formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  getCostTrendHeight(cost: number, costTrend: number[]): number {
    if (!costTrend || costTrend.length === 0 || cost <= 0) return 0;
    const maxCost = Math.max(...costTrend);
    if (maxCost === 0) return 0;
    return Math.min((cost / maxCost) * 100, 100);
  }

  setTab(tab: 'overview' | 'performance' | 'workload' | 'memory') {
    this.activeTab = tab;
    if (tab === 'memory' && !this.isEditingMemory) {
      this.loadMemoryFile();
    }
  }

  loadMemoryFile() {
    if (!this.agent) return;
    this.isLoadingMemory = true;
    this.supabaseService.getAgentMemoryFile(this.agent._id, this.activeMemoryFile)
      .subscribe({
        next: (content) => {
          this.memoryContent = content;
          this.isLoadingMemory = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.memoryContent = '';
          this.isLoadingMemory = false;
          this.cdr.markForCheck();
        }
      });
  }

  selectMemoryFile(fileType: 'WORKING' | 'MEMORY' | string) {
    this.activeMemoryFile = fileType;
    this.loadMemoryFile();
  }

  startEditingMemory() {
    this.isEditingMemory = true;
  }

  cancelEditingMemory() {
    this.isEditingMemory = false;
    this.loadMemoryFile(); // Reload original content
  }

  saveMemoryFile() {
    if (!this.agent) return;
    this.isLoadingMemory = true;
    this.supabaseService.updateAgentMemoryFile(this.agent._id, this.activeMemoryFile, this.memoryContent)
      .then(() => {
        this.isEditingMemory = false;
        this.isLoadingMemory = false;
        this.cdr.markForCheck();
      })
      .catch(error => {
        console.error('Error saving memory file:', error);
        alert('Failed to save memory file');
        this.isLoadingMemory = false;
        this.cdr.markForCheck();
      });
  }
}
