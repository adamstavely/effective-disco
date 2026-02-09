import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Document, Message, Agent } from '../../models/types';
import { SupabaseService } from '../../services/supabase.service';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-document-conversation-tray',
  standalone: true,
  imports: [CommonModule, MarkdownPipe, TimeAgoPipe],
  templateUrl: './document-conversation-tray.component.html',
  styleUrl: './document-conversation-tray.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentConversationTrayComponent implements OnChanges {
  @Input() document: Document | null = null;
  @Output() close = new EventEmitter<void>();

  private documentSubject = new BehaviorSubject<Document | null>(null);
  messages$: Observable<Message[]>;
  agents$: Observable<Agent[]>;
  messagesWithAgents$: Observable<Array<Message & { agentName: string }>>;

  constructor(private supabaseService: SupabaseService) {
    this.agents$ = this.supabaseService.getAgents().pipe(
      catchError(() => of([]))
    );

    this.messages$ = this.documentSubject.pipe(
      switchMap(doc => {
        if (doc) {
          return this.supabaseService.getDocumentMessages(doc._id).pipe(
            catchError(() => of([]))
          );
        }
        return of([]);
      })
    );

    // Combine messages with agent names
    // Note: Document messages are task messages, so they should always have fromAgentId
    this.messagesWithAgents$ = combineLatest([
      this.messages$,
      this.agents$
    ]).pipe(
      map(([messages, agents]) => {
        return messages.map(msg => {
          // For task messages, fromAgentId should always be set
          // But handle null case just in case
          if (!msg.fromAgentId) {
            return {
              ...msg,
              agentName: 'Unknown'
            };
          }
          const agent = agents.find(a => a._id === msg.fromAgentId);
          return {
            ...msg,
            agentName: agent?.name || msg.fromAgentId || 'Unknown'
          };
        });
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document']) {
      this.documentSubject.next(this.document);
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
