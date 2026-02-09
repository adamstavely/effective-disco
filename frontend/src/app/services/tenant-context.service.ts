import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Tenant } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class TenantContextService {
  private readonly STORAGE_KEY = 'mission_control_tenant_id';
  private readonly DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'; // Default tenant from migration
  
  private currentTenantId$ = new BehaviorSubject<string>(this.getStoredTenantId());
  
  constructor() {
    // Initialize with stored tenant or default
    const storedId = this.getStoredTenantId();
    if (storedId) {
      this.currentTenantId$.next(storedId);
    } else {
      this.setTenantId(this.DEFAULT_TENANT_ID);
    }
  }
  
  /**
   * Get the current tenant ID as an Observable
   */
  getCurrentTenantId(): Observable<string> {
    return this.currentTenantId$.asObservable();
  }
  
  /**
   * Get the current tenant ID synchronously
   */
  getCurrentTenantIdSync(): string {
    return this.currentTenantId$.value;
  }
  
  /**
   * Set the current tenant ID
   */
  setTenantId(tenantId: string): void {
    this.currentTenantId$.next(tenantId);
    localStorage.setItem(this.STORAGE_KEY, tenantId);
  }
  
  /**
   * Get stored tenant ID from localStorage
   */
  private getStoredTenantId(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored || this.DEFAULT_TENANT_ID;
    }
    return this.DEFAULT_TENANT_ID;
  }
  
  /**
   * Clear the current tenant (resets to default)
   */
  clearTenant(): void {
    this.setTenantId(this.DEFAULT_TENANT_ID);
  }
}
