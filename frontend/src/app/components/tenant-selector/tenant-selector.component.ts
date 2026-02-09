import { Component, ChangeDetectionStrategy, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantContextService } from '../../services/tenant-context.service';
import { SupabaseService } from '../../services/supabase.service';
import { Tenant } from '../../models/types';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap, startWith, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-tenant-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tenant-selector.component.html',
  styleUrl: './tenant-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TenantSelectorComponent implements OnInit {
  tenants$: Observable<Tenant[]>;
  currentTenantId$: Observable<string>;
  currentTenant$: Observable<Tenant | null>;
  isOpen = false;

  constructor(
    private tenantContext: TenantContextService,
    private supabaseService: SupabaseService
  ) {
    this.currentTenantId$ = this.tenantContext.getCurrentTenantId();
    
    // Fetch tenants (for now, we'll create a simple list)
    // In a real implementation, you'd fetch from Supabase
    this.tenants$ = new BehaviorSubject<Tenant[]>([
      {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Default Tenant',
        slug: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]).asObservable();
    
    this.currentTenant$ = combineLatest([
      this.tenants$,
      this.currentTenantId$
    ]).pipe(
      map(([tenants, currentId]) => {
        return tenants.find(t => t.id === currentId) || null;
      })
    );
  }

  ngOnInit(): void {
    // Fetch tenants from Supabase
    this.tenants$ = this.supabaseService.getTenants().pipe(
      startWith([]),
      catchError(() => {
        // Fallback to default tenant if fetch fails
        return new BehaviorSubject<Tenant[]>([
          {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'Default Tenant',
            slug: 'default',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]).asObservable();
      })
    );
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.tenant-selector')) {
      this.isOpen = false;
    }
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  selectTenant(tenant: Tenant): void {
    this.tenantContext.setTenantId(tenant.id);
    this.isOpen = false;
    // Reload the page to refresh all data with new tenant context
    window.location.reload();
  }
}
