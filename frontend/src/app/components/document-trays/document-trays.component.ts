import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Document } from '../../models/types';
import { DocumentPreviewTrayComponent } from '../document-preview-tray/document-preview-tray.component';
import { DocumentConversationTrayComponent } from '../document-conversation-tray/document-conversation-tray.component';

@Component({
  selector: 'app-document-trays',
  standalone: true,
  imports: [CommonModule, DocumentPreviewTrayComponent, DocumentConversationTrayComponent],
  templateUrl: './document-trays.component.html',
  styleUrl: './document-trays.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentTraysComponent {
  @Input() selectedDocument: Document | null = null;
  @Output() close = new EventEmitter<void>();

  showPreview = true;
  showConversation = true;

  onClosePreview(): void {
    this.showPreview = false;
    if (!this.showConversation) {
      this.close.emit();
    }
  }

  onCloseConversation(): void {
    this.showConversation = false;
    if (!this.showPreview) {
      this.close.emit();
    }
  }

  onCloseAll(): void {
    this.close.emit();
  }
}
