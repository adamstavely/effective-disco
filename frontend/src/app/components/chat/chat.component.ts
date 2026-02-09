import { Component, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatThread, Message, Agent } from '../../models/types';
import { SupabaseService } from '../../services/supabase.service';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { map, switchMap, catchError, take } from 'rxjs/operators';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe, TimeAgoPipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy {
  chatThreads$: Observable<ChatThread[]>;
  selectedThreadId$ = new BehaviorSubject<string | null>(null);
  agents$: Observable<Agent[]>;
  
  messagesWithAgents$: Observable<Array<Message & { senderName: string; senderAvatar?: string; isUser: boolean }>>;
  
  newMessageContent = '';
  selectedAgentId: string | null = null; // The agent the user is chatting with

  constructor(private supabaseService: SupabaseService) {
    this.agents$ = this.supabaseService.getAgents().pipe(
      catchError(() => of([]))
    );

    this.chatThreads$ = this.supabaseService.getChatThreads().pipe(
      catchError(() => of([]))
    );

    // Get messages for selected thread
    const messages$ = this.selectedThreadId$.pipe(
      switchMap(threadId => {
        if (threadId) {
          return this.supabaseService.getChatMessages(threadId).pipe(
            catchError(() => of([]))
          );
        }
        return of([]);
      })
    );

    // Combine messages with sender info (user or agent)
    this.messagesWithAgents$ = combineLatest([
      messages$,
      this.agents$
    ]).pipe(
      map(([messages, agents]) => {
        return messages.map(msg => {
          if (msg.fromAgentId === null) {
            // User message
            return {
              ...msg,
              senderName: 'You',
              senderAvatar: undefined,
              isUser: true
            };
          } else {
            // Agent message
            const agent = agents.find(a => a._id === msg.fromAgentId);
            return {
              ...msg,
              senderName: agent?.name || 'Unknown Agent',
              senderAvatar: agent?.avatar ?? undefined,
              isUser: false
            };
          }
        });
      })
    );
  }

  ngOnInit(): void {
    // Select first agent as default chat partner if available
    this.agents$.pipe(take(1)).subscribe(agents => {
      if (agents.length > 0 && !this.selectedAgentId) {
        this.selectedAgentId = agents[0]._id;
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup handled by RxJS subscriptions
  }

  selectThread(threadId: string): void {
    this.selectedThreadId$.next(threadId);
  }

  async createNewThread(): Promise<void> {
    if (!this.selectedAgentId) {
      alert('Please select an agent to chat with first');
      return;
    }

    try {
      // Create thread with the selected agent (user chats WITH this agent)
      const threadId = await this.supabaseService.createChatThread(this.selectedAgentId);
      this.selectedThreadId$.next(threadId);
    } catch (error) {
      console.error('Error creating chat thread:', error);
      alert('Failed to create chat thread');
    }
  }

  async sendMessage(): Promise<void> {
    const threadId = this.selectedThreadId$.value;
    if (!threadId || !this.newMessageContent.trim()) {
      return;
    }

    try {
      // Send message as user (fromAgentId is null/undefined)
      await this.supabaseService.createChatMessage(
        threadId,
        this.newMessageContent.trim(),
        null // null = user message
      );
      this.newMessageContent = '';
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
