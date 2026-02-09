import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { combineLatest, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PanelHeaderComponent } from '../../shared/components/panel-header/panel-header.component';

interface DashboardStats {
  proposalsToday: number;
  missionsCompleted: number;
  successRate: number;
  costToday: number;
  budgetRemaining: number;
}

@Component({
  selector: 'app-quick-stats',
  standalone: true,
  imports: [
    CommonModule,
    PanelHeaderComponent
  ],
  templateUrl: './quick-stats.component.html',
  styleUrl: './quick-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickStatsComponent {
  stats$: Observable<DashboardStats>;

  constructor(private supabaseService: SupabaseService) {
    this.stats$ = combineLatest([
      this.supabaseService.getProposalsToday(),
      this.supabaseService.getCompletedMissions(),
      this.supabaseService.getSuccessRate(),
      this.supabaseService.getCostToday(),
      this.supabaseService.getBudgetRemaining()
    ]).pipe(
      map(([proposalsToday, missionsCompleted, successRate, costToday, budgetRemaining]) => ({
        proposalsToday,
        missionsCompleted,
        successRate,
        costToday,
        budgetRemaining
      })),
      catchError((error) => {
        console.error('Error loading dashboard stats:', error);
        return of({
          proposalsToday: 0,
          missionsCompleted: 0,
          successRate: 0,
          costToday: 0,
          budgetRemaining: 0
        });
      })
    );
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
}
