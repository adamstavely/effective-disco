import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Activity } from '../../models/types';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-execution-steps',
  standalone: true,
  imports: [CommonModule, TimeAgoPipe, LucideAngularModule],
  templateUrl: './execution-steps.component.html',
  styleUrl: './execution-steps.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExecutionStepsComponent {
  @Input() steps$!: Observable<Activity[]>;
  @Input() taskId!: string;

  expandedStepId: string | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  toggleStepDetails(stepId: string): void {
    if (this.expandedStepId === stepId) {
      this.expandedStepId = null;
    } else {
      this.expandedStepId = stepId;
    }
    this.cdr.markForCheck();
  }

  isStepExpanded(stepId: string): boolean {
    return this.expandedStepId === stepId;
  }

  getStepStatusIcon(stepStatus?: string): string {
    switch (stepStatus) {
      case 'completed':
        return 'check-circle';
      case 'running':
        return 'loader';
      case 'failed':
        return 'x-circle';
      case 'pending':
        return 'clock';
      case 'skipped':
        return 'skip-forward';
      default:
        return 'circle';
    }
  }

  getStepStatusColor(stepStatus?: string): string {
    switch (stepStatus) {
      case 'completed':
        return 'var(--color-status-success)';
      case 'running':
        return 'var(--color-status-active)';
      case 'failed':
        return 'var(--color-status-error)';
      case 'pending':
        return 'var(--color-neutral-400)';
      case 'skipped':
        return 'var(--color-neutral-500)';
      default:
        return 'var(--color-neutral-400)';
    }
  }

  getStepStatusLabel(stepStatus?: string): string {
    switch (stepStatus) {
      case 'completed':
        return 'Completed';
      case 'running':
        return 'Running';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      case 'skipped':
        return 'Skipped';
      default:
        return 'Unknown';
    }
  }

  formatStepDetails(details: any): string {
    if (!details) return '';
    
    const parts: string[] = [];
    if (details.toolName) {
      parts.push(`Tool: ${details.toolName}`);
    }
    if (details.duration) {
      parts.push(`Duration: ${details.duration}ms`);
    }
    if (details.error) {
      parts.push(`Error: ${details.error}`);
    }
    
    return parts.join(' • ');
  }

  formatJson(obj: any): string {
    if (!obj) return '';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  trackByStepId(index: number, step: Activity): string {
    return step._id;
  }
}
