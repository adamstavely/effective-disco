import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentLevel } from '../../models/types';

@Component({
  selector: 'app-level-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './level-badge.component.html',
  styleUrl: './level-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
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
