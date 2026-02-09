import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Proposal, ProposalStatus } from '../../models/types';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-proposal-card',
  standalone: true,
  imports: [CommonModule, TimeAgoPipe],
  templateUrl: './proposal-card.component.html',
  styleUrl: './proposal-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProposalCardComponent implements OnInit {
  @Input() proposal!: Proposal;
  @Output() approve = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();
  @Output() convertToTask = new EventEmitter<string>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Force change detection after input is set
    this.cdr.markForCheck();
  }

  getStatusClass(): string {
    return `status-${this.proposal.status}`;
  }

  getPriorityClass(): string {
    return `priority-${this.proposal.priority}`;
  }

  getDescriptionSnippet(): string {
    if (this.proposal.description.length <= 150) return this.proposal.description;
    return this.proposal.description.substring(0, 150) + '...';
  }

  onApprove(): void {
    this.approve.emit(this.proposal._id);
  }

  onReject(): void {
    this.reject.emit(this.proposal._id);
  }

  onConvertToTask(): void {
    this.convertToTask.emit(this.proposal._id);
  }

  getStatusLabel(status: ProposalStatus): string {
    const labels: Record<ProposalStatus, string> = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected'
    };
    return labels[status];
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High'
    };
    return labels[priority] || priority;
  }

  isPending(): boolean {
    const status = this.proposal?.status;
    if (!status) {
      return false;
    }
    
    // Normalize status to lowercase string for comparison
    const normalizedStatus = String(status).toLowerCase().trim();
    return normalizedStatus === 'pending';
  }

  isApproved(): boolean {
    const status = this.proposal?.status;
    if (!status) return false;
    // Normalize status to lowercase string for comparison
    return String(status).toLowerCase().trim() === 'approved';
  }
}
