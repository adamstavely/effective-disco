import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity } from '../../models/types';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-activity-item',
  standalone: true,
  imports: [CommonModule, TimeAgoPipe],
  templateUrl: './activity-item.component.html',
  styleUrl: './activity-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityItemComponent {
  @Input() activity!: Activity;
}
