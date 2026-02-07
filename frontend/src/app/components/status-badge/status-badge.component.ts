import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentStatus } from '../../models/types';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss'
})
export class StatusBadgeComponent {
  @Input() status!: AgentStatus | 'working';

  get statusText(): string {
    if (this.status === 'active') return 'WORKING';
    return this.status.toUpperCase();
  }
}
