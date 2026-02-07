import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentStatus } from '../../models/types';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [class]="'status-' + status">
      <span class="status-dot"></span>
      <span class="status-text">{{ statusText }}</span>
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }

    .status-idle .status-dot {
      background: #999;
    }

    .status-active .status-dot,
    .status-working .status-dot {
      background: #4caf50;
    }

    .status-blocked .status-dot {
      background: #f44336;
    }

    .status-text {
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-idle .status-text {
      color: #999;
    }

    .status-active .status-text,
    .status-working .status-text {
      color: #4caf50;
    }

    .status-blocked .status-text {
      color: #f44336;
    }
  `]
})
export class StatusBadgeComponent {
  @Input() status!: AgentStatus | 'working';

  get statusText(): string {
    if (this.status === 'active') return 'WORKING';
    return this.status.toUpperCase();
  }
}
