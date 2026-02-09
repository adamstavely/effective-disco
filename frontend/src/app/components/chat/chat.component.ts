import { Component, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatThread, Message, Agent } from '../../models/types';
import { SupabaseService } from '../../services/supabase.service';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { map, switchMap, catchError, take } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe, TimeAgoPipe, LucideAngularModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy {
  chatThreads$: Observable<ChatThread[]>;
  selectedThreadId$ = new BehaviorSubject<string | null>(null);
  agents$: Observable<Agent[]>;
  currentThread$: Observable<ChatThread | null>;
  
  messagesWithAgents$: Observable<Array<Message & { senderName: string; senderAvatar?: string; isUser: boolean }>>;
  
  newMessageContent = '';
  selectedAgentId: string | null = null; // The agent the user is chatting with
  
  // Loading states
  isSendingMessage = false;
  isCreatingThread = false;
  agentTyping$ = new BehaviorSubject<boolean>(false);
  
  // Broadcast
  showBroadcastDialog = false;
  broadcastMessage = '';
  isBroadcasting = false;

  // Agent-to-agent thread creation
  showAgentToAgentDialog = false;
  selectedParticipantIds: string[] = [];
  agentToAgentThreadTitle = '';
  isCreatingAgentToAgentThread = false;

  // Message editing/deletion
  editingMessageId: string | null = null;
  editingMessageContent = '';
  isUpdatingMessage = false;
  isDeletingMessage = false;
  hoveredMessageId: string | null = null;

  constructor(private supabaseService: SupabaseService) {
    this.agents$ = this.supabaseService.getAgents().pipe(
      catchError(() => of([]))
    );

    this.chatThreads$ = this.supabaseService.getChatThreads().pipe(
      catchError(() => of([]))
    );

    // Current thread observable
    this.currentThread$ = combineLatest([
      this.chatThreads$,
      this.selectedThreadId$
    ]).pipe(
      map(([threads, threadId]) => {
        if (!threadId) return null;
        return threads.find(t => t._id === threadId) || null;
      })
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
    // Also combine with thread info to determine if it's an agent-to-agent thread
    this.messagesWithAgents$ = combineLatest([
      messages$,
      this.agents$,
      this.selectedThreadId$.pipe(
        switchMap(threadId => {
          if (threadId) {
            return this.chatThreads$.pipe(
              map(threads => threads.find(t => t._id === threadId)),
              catchError(() => of(null))
            );
          }
          return of(null);
        })
      )
    ]).pipe(
      map(([messages, agents, currentThread]) => {
        const isAgentToAgentThread = currentThread?.participantAgentIds !== null && 
                                     currentThread?.participantAgentIds !== undefined;
        
        const result = messages.map(msg => {
          if (msg.fromAgentId === null) {
            // User message (only in user-to-agent threads)
            return {
              ...msg,
              senderName: 'You',
              senderAvatar: undefined,
              isUser: true
            };
          } else {
            // Agent message (can be in user-to-agent or agent-to-agent threads)
            const agent = agents.find(a => a._id === msg.fromAgentId);
            return {
              ...msg,
              senderName: agent?.name || 'Unknown Agent',
              senderAvatar: agent?.avatar ?? undefined,
              isUser: false
            };
          }
        });
        
        // Hide typing indicator when agent responds
        if (result.length > 0 && result[result.length - 1].fromAgentId !== null) {
          this.agentTyping$.next(false);
        }
        
        return result;
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

    if (this.isCreatingThread) return; // Prevent double-click

    this.isCreatingThread = true;
    try {
      // Create thread with the selected agent (user chats WITH this agent)
      const threadId = await this.supabaseService.createChatThread(this.selectedAgentId);
      this.selectedThreadId$.next(threadId);
    } catch (error: any) {
      console.error('Error creating chat thread:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to create new thread: ${errorMessage}`);
    } finally {
      this.isCreatingThread = false;
    }
  }

  async sendMessage(): Promise<void> {
    const threadId = this.selectedThreadId$.value;
    if (!threadId || !this.newMessageContent.trim() || this.isSendingMessage) {
      return;
    }

    const messageContent = this.newMessageContent.trim();
    this.isSendingMessage = true;
    this.agentTyping$.next(true); // Show "agent typing" indicator

    try {
      // Send message as user (fromAgentId is null/undefined)
      await this.supabaseService.createChatMessage(
        threadId,
        messageContent,
        null // null = user message
      );
      
      // Auto-generate thread title from first message if thread has no title
      this.chatThreads$.pipe(take(1)).subscribe(threads => {
        const currentThread = threads.find(t => t._id === threadId);
        if (currentThread && !currentThread.title) {
          const title = messageContent.length > 50 
            ? messageContent.substring(0, 50) + '...'
            : messageContent;
          this.supabaseService.updateChatThreadTitle(threadId, title)
            .catch(err => console.error('Failed to update thread title:', err));
        }
      });
      
      this.newMessageContent = '';
      
      // Wait a bit for agent response, then hide typing indicator
      setTimeout(() => {
        // Check if agent has responded (messages will update via real-time)
        setTimeout(() => {
          this.agentTyping$.next(false);
        }, 5000); // Hide after 5 seconds if no response
      }, 1000);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to send message: ${errorMessage}`);
      this.agentTyping$.next(false);
    } finally {
      this.isSendingMessage = false;
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  openBroadcastDialog(): void {
    this.showBroadcastDialog = true;
    this.broadcastMessage = '';
  }

  closeBroadcastDialog(): void {
    this.showBroadcastDialog = false;
    this.broadcastMessage = '';
  }

  async sendBroadcast(): Promise<void> {
    if (!this.broadcastMessage.trim() || this.isBroadcasting) {
      return;
    }

    this.isBroadcasting = true;
    try {
      // Get all agents for current tenant
      const agents = await this.agents$.pipe(take(1)).toPromise();
      if (!agents || agents.length === 0) {
        alert('No agents available to broadcast to');
        return;
      }

      // Create a chat thread with each agent and send the message
      const promises = agents.map(async (agent) => {
        try {
          // Create or get existing thread with this agent
          let threadId: string;
          const existingThreads = await this.chatThreads$.pipe(take(1)).toPromise();
          const existingThread = existingThreads?.find(t => t.agentId === agent._id);
          
          if (existingThread) {
            threadId = existingThread._id;
          } else {
            threadId = await this.supabaseService.createChatThread(agent._id, `Broadcast: ${this.broadcastMessage.substring(0, 30)}...`);
          }

          // Send broadcast message
          await this.supabaseService.createChatMessage(
            threadId,
            `[BROADCAST] ${this.broadcastMessage.trim()}`,
            null // User message
          );
        } catch (error) {
          console.error(`Error broadcasting to ${agent.name}:`, error);
        }
      });

      await Promise.all(promises);
      alert(`Broadcast sent to ${agents.length} agent(s)`);
      this.closeBroadcastDialog();
    } catch (error: any) {
      console.error('Error sending broadcast:', error);
      alert(`Failed to send broadcast: ${error?.message || 'Unknown error'}`);
    } finally {
      this.isBroadcasting = false;
    }
  }

  startEditing(message: Message & { isUser: boolean }): void {
    if (!message.isUser) return; // Only allow editing user messages
    this.editingMessageId = message._id;
    this.editingMessageContent = message.content;
  }

  cancelEditing(): void {
    this.editingMessageId = null;
    this.editingMessageContent = '';
  }

  async saveEdit(): Promise<void> {
    if (!this.editingMessageId || !this.editingMessageContent.trim() || this.isUpdatingMessage) {
      return;
    }

    this.isUpdatingMessage = true;
    try {
      await this.supabaseService.updateChatMessage(
        this.editingMessageId,
        this.editingMessageContent.trim()
      );
      this.cancelEditing();
    } catch (error: any) {
      console.error('Error updating message:', error);
      alert(`Failed to update message: ${error?.message || 'Unknown error'}`);
    } finally {
      this.isUpdatingMessage = false;
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    if (this.isDeletingMessage) return;
    this.isDeletingMessage = true;
    try {
      await this.supabaseService.deleteChatMessage(messageId);
    } catch (error: any) {
      console.error('Error deleting message:', error);
      alert(`Failed to delete message: ${error?.message || 'Unknown error'}`);
    } finally {
      this.isDeletingMessage = false;
    }
  }

  onMessageMouseEnter(messageId: string): void {
    this.hoveredMessageId = messageId;
  }

  onMessageMouseLeave(): void {
    this.hoveredMessageId = null;
  }

  onEditKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditing();
    }
  }

  openAgentToAgentDialog(): void {
    this.showAgentToAgentDialog = true;
    this.selectedParticipantIds = [];
    this.agentToAgentThreadTitle = '';
  }

  closeAgentToAgentDialog(): void {
    this.showAgentToAgentDialog = false;
    this.selectedParticipantIds = [];
    this.agentToAgentThreadTitle = '';
  }

  toggleParticipant(agentId: string): void {
    const index = this.selectedParticipantIds.indexOf(agentId);
    if (index === -1) {
      this.selectedParticipantIds.push(agentId);
    } else {
      this.selectedParticipantIds.splice(index, 1);
    }
  }

  isParticipantSelected(agentId: string): boolean {
    return this.selectedParticipantIds.includes(agentId);
  }

  async createAgentToAgentThread(): Promise<void> {
    if (this.selectedParticipantIds.length < 2) {
      alert('Please select at least 2 agents for an agent-to-agent thread');
      return;
    }

    if (this.isCreatingAgentToAgentThread) return;

    this.isCreatingAgentToAgentThread = true;
    try {
      const threadId = await this.supabaseService.createAgentToAgentThread(
        this.selectedParticipantIds,
        this.agentToAgentThreadTitle.trim() || undefined
      );
      this.selectedThreadId$.next(threadId);
      this.closeAgentToAgentDialog();
    } catch (error: any) {
      console.error('Error creating agent-to-agent thread:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to create agent-to-agent thread: ${errorMessage}`);
    } finally {
      this.isCreatingAgentToAgentThread = false;
    }
  }

  getThreadDisplayName(thread: ChatThread, agents: Agent[]): string {
    if (thread.title) {
      return thread.title;
    }
    
    if (thread.participantAgentIds && thread.participantAgentIds.length >= 2) {
      // Agent-to-agent thread: show participant names
      const participantNames = thread.participantAgentIds
        .map(id => agents.find(a => a._id === id)?.name || 'Unknown')
        .join(', ');
      return `Agent Chat: ${participantNames}`;
    }
    
    if (thread.agentId) {
      // User-to-agent thread: show agent name
      const agent = agents.find(a => a._id === thread.agentId);
      return agent?.name || 'Untitled Thread';
    }
    
    return 'Untitled Thread';
  }
}
