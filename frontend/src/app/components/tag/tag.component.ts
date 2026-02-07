import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tag',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="tag">{{ text }}</span>
  `,
  styles: [`
    .tag {
      display: inline-block;
      font-size: 0.7rem;
      padding: 0.2rem 0.4rem;
      background: #f0f0f0;
      color: #666;
      border-radius: 3px;
      font-weight: 500;
    }
  `]
})
export class TagComponent {
  @Input() text!: string;
}
