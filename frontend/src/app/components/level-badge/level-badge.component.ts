import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentLevel } from '../../models/types';

@Component({
  selector: 'app-level-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="level-badge" [class]="'level-' + level">
      {{ levelText }}
    </span>
  `,
  styles: [`
    .level-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      letter-spacing: 0.05em;
    }

    .level-lead {
      background: #e3f2fd;
      color: #1976d2;
    }

    .level-specialist {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .level-intern {
      background: #fff3e0;
      color: #e65100;
    }
  `]
})
export class LevelBadgeComponent {
  @Input() level!: AgentLevel;

  get levelText(): string {
    const map: Record<AgentLevel, string> = {
      lead: 'LEAD',
      specialist: 'SPC',
      intern: 'INT'
    };
    return map[this.level];
  }
}
