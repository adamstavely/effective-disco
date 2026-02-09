import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Document } from '../../models/types';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-document-preview-tray',
  standalone: true,
  imports: [CommonModule, MarkdownPipe, TimeAgoPipe, LucideAngularModule],
  templateUrl: './document-preview-tray.component.html',
  styleUrl: './document-preview-tray.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentPreviewTrayComponent {
  @Input() document: Document | null = null;
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
