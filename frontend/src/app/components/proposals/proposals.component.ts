import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { Proposal, ProposalStatus } from '../../models/types';
import { ProposalCardComponent } from '../proposal-card/proposal-card.component';
import { PanelHeaderComponent } from '../../shared/components/panel-header/panel-header.component';
import { FilterButtonComponent } from '../../shared/components/filter-button/filter-button.component';
import { combineLatest, map, Observable, of, catchError, startWith, BehaviorSubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-proposals',
  standalone: true,
  imports: [
    CommonModule,
    ProposalCardComponent,
    PanelHeaderComponent,
    FilterButtonComponent
  ],
  templateUrl: './proposals.component.html',
  styleUrl: './proposals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProposalsComponent {
  selectedTab: 'all' | 'pending' | 'approved' | 'rejected' = 'all';
  private selectedTab$ = new BehaviorSubject<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  proposals$: Observable<Proposal[]>;
  allProposals$: Observable<Proposal[]>;
  pendingCount$: Observable<number>;
  approvedCount$: Observable<number>;
  rejectedCount$: Observable<number>;

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {
    // Get all proposals for counting
    this.allProposals$ = this.supabaseService.getProposals().pipe(
      catchError(error => {
        console.error('Error loading proposals:', error);
        return of([]);
      }),
      startWith([])
    );

    // Calculate counts
    this.pendingCount$ = this.allProposals$.pipe(
      map(proposals => proposals.filter(p => p.status === 'pending').length)
    );

    this.approvedCount$ = this.allProposals$.pipe(
      map(proposals => proposals.filter(p => p.status === 'approved').length)
    );

    this.rejectedCount$ = this.allProposals$.pipe(
      map(proposals => proposals.filter(p => p.status === 'rejected').length)
    );

    // Filter proposals based on selected tab
    this.proposals$ = combineLatest([
      this.allProposals$,
      this.selectedTab$
    ]).pipe(
      map(([proposals, tab]) => {
        if (tab === 'all') return proposals;
        return proposals.filter(p => p.status === tab);
      })
    );
  }

  setTab(tab: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.selectedTab = tab;
    this.selectedTab$.next(tab);
    this.cdr.markForCheck();
  }

  onApprove(proposalId: string): void {
    this.supabaseService.approveProposal(proposalId)
      .then(() => {
        console.log('Proposal approved');
      })
      .catch(error => {
        console.error('Error approving proposal:', error);
      });
  }

  onReject(proposalId: string): void {
    this.supabaseService.rejectProposal(proposalId)
      .then(() => {
        console.log('Proposal rejected');
      })
      .catch(error => {
        console.error('Error rejecting proposal:', error);
      });
  }

  onConvertToTask(proposalId: string): void {
    this.supabaseService.convertProposalToTask(proposalId)
      .then(() => {
        console.log('Proposal converted to task');
      })
      .catch(error => {
        console.error('Error converting proposal to task:', error);
      });
  }
}
