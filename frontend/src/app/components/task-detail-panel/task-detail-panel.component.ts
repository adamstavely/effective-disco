import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { Task, TaskStatus, Agent, Message, Document } from '../../models/types';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { TagComponent } from '../tag/tag.component';
import { DocumentTraysComponent } from '../document-trays/document-trays.component';
import { TASK_STATUS_LABELS, TASK_STATUSES } from '../../shared/constants/app.constants';
import { Observable, combineLatest, of, BehaviorSubject, firstValueFrom } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-task-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeAgoPipe, MarkdownPipe, TagComponent, DocumentTraysComponent],
  templateUrl: './task-detail-panel.component.html',
  styleUrl: './task-detail-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskDetailPanelComponent implements OnChanges {
  @Input() task: Task | null = null;
  @Output() close = new EventEmitter<void>();

  isEditingDescription = false;
  editedDescription = '';
  isEditingTitle = false;
  editedTitle = '';
  newTag = '';
  isAddingTag = false;
  isAddingDocument = false;
  newDocumentTitle = '';
  newDocumentContent = '';
  newDocumentType: Document['type'] = 'other';
  selectedDocument: Document | null = null;

  private taskSubject = new BehaviorSubject<Task | null>(null);
  agents$: Observable<Agent[]>;
  messages$: Observable<Message[]>;
  messagesWithAgents$: Observable<Array<Message & { agentName: string }>>;
  documents$: Observable<Document[]>;
  assignees$: Observable<Agent[]>;

  readonly TASK_STATUS_LABELS = TASK_STATUS_LABELS;
  readonly TASK_STATUSES = TASK_STATUSES;

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {
    this.agents$ = this.supabaseService.getAgents().pipe(
      catchError(() => of([]))
    );

    // Messages observable - updates when task changes
    this.messages$ = this.taskSubject.pipe(
      switchMap(task => {
        if (task) {
          return this.supabaseService.getMessages(task._id).pipe(
            catchError(() => of([]))
          );
        }
        return of([]);
      })
    );

    // Combine messages with agent names
    // Note: Task messages should always have fromAgentId
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

    // Documents observable - updates when task changes
    this.documents$ = this.taskSubject.pipe(
      switchMap(task => {
        if (task) {
          return this.supabaseService.getDocuments(task._id).pipe(
            catchError(() => of([]))
          );
        }
        return of([]);
      })
    );

    // Assignees observable - combines agents with task assigneeIds
    this.assignees$ = combineLatest([
      this.agents$,
      this.taskSubject
    ]).pipe(
      map(([agents, task]) => {
        if (!task) return [];
        const assigneeIds = task.assigneeIds || [];
        return agents.filter(agent => assigneeIds.includes(agent._id));
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task']) {
      this.taskSubject.next(this.task);
    }
  }

  startEditingDescription(): void {
    if (this.task) {
      this.editedDescription = this.task.description;
      this.isEditingDescription = true;
    }
  }

  saveDescription(): void {
    if (this.task && this.editedDescription !== this.task.description) {
      this.supabaseService.updateTask(this.task._id, { description: this.editedDescription })
        .then(() => {
          this.isEditingDescription = false;
          this.cdr.markForCheck();
        })
        .catch(error => {
          console.error('Error updating description:', error);
        });
    } else {
      this.isEditingDescription = false;
    }
  }

  cancelEditingDescription(): void {
    this.isEditingDescription = false;
    this.editedDescription = '';
  }

  startEditingTitle(): void {
    if (this.task) {
      this.editedTitle = this.task.title;
      this.isEditingTitle = true;
    }
  }

  saveTitle(): void {
    if (this.task && this.editedTitle !== this.task.title) {
      this.supabaseService.updateTask(this.task._id, { title: this.editedTitle })
        .then(() => {
          this.isEditingTitle = false;
          this.cdr.markForCheck();
        })
        .catch(error => {
          console.error('Error updating title:', error);
        });
    } else {
      this.isEditingTitle = false;
    }
  }

  cancelEditingTitle(): void {
    this.isEditingTitle = false;
    this.editedTitle = '';
  }

  updateStatus(newStatus: TaskStatus): void {
    if (this.task) {
      this.supabaseService.updateTask(this.task._id, { status: newStatus })
        .catch(error => {
          console.error('Error updating status:', error);
        });
    }
  }

  addTag(): void {
    if (this.task && this.newTag.trim()) {
      const tags = [...(this.task.tags || []), this.newTag.trim()];
      this.supabaseService.updateTask(this.task._id, { tags })
        .then(() => {
          this.newTag = '';
          this.isAddingTag = false;
          this.cdr.markForCheck();
        })
        .catch(error => {
          console.error('Error adding tag:', error);
        });
    }
  }

  removeTag(tag: string): void {
    if (this.task) {
      const tags = (this.task.tags || []).filter(t => t !== tag);
      this.supabaseService.updateTask(this.task._id, { tags })
        .then(() => {
          this.cdr.markForCheck();
        })
        .catch(error => {
          console.error('Error removing tag:', error);
        });
    }
  }

  addAssignee(agentId: string): void {
    if (this.task) {
      const assigneeIds = [...(this.task.assigneeIds || []), agentId];
      this.supabaseService.updateTask(this.task._id, { assigneeIds })
        .then(() => {
          this.cdr.markForCheck();
        })
        .catch(error => {
          console.error('Error adding assignee:', error);
        });
    }
  }

  removeAssignee(agentId: string): void {
    if (this.task) {
      const assigneeIds = (this.task.assigneeIds || []).filter(id => id !== agentId);
      this.supabaseService.updateTask(this.task._id, { assigneeIds })
        .then(() => {
          this.cdr.markForCheck();
        })
        .catch(error => {
          console.error('Error removing assignee:', error);
        });
    }
  }

  markAsDone(): void {
    this.updateStatus('done');
  }

  archiveTask(): void {
    if (this.task) {
      this.supabaseService.updateTask(this.task._id, { status: 'archived' })
        .then(() => {
          this.cdr.markForCheck();
        })
        .catch(error => {
          console.error('Error archiving task:', error);
        });
    }
  }

  resumeTask(): void {
    if (this.task) {
      this.supabaseService.resumeTask(this.task._id)
        .then(() => {
          this.cdr.markForCheck();
        })
        .catch(error => {
          console.error('Error resuming task:', error);
        });
    }
  }

  canResumeTask(): boolean {
    return this.task?.status === 'review' && (this.task?.assigneeIds?.length || 0) > 0;
  }

  copyTaskId(): void {
    if (this.task) {
      navigator.clipboard.writeText(this.task._id).then(() => {
        // Could show a toast notification here
        console.log('Task ID copied to clipboard');
      });
    }
  }

  onClose(): void {
    this.close.emit();
  }

  getAvailableAgents(agents: Agent[]): Agent[] {
    if (!this.task) return agents;
    const assigneeIds = this.task.assigneeIds || [];
    return agents.filter(agent => !assigneeIds.includes(agent._id));
  }

  startAddingDocument(): void {
    this.isAddingDocument = true;
    this.newDocumentTitle = '';
    this.newDocumentContent = '';
    this.newDocumentType = 'other';
  }

  cancelAddingDocument(): void {
    this.isAddingDocument = false;
    this.newDocumentTitle = '';
    this.newDocumentContent = '';
    this.newDocumentType = 'other';
  }

  async createDocument(): Promise<void> {
    if (!this.task) return;

    if (!this.newDocumentTitle.trim() || !this.newDocumentContent.trim()) {
      return;
    }

    try {
      // Get the first assignee as creator, or first agent if no assignees
      const [agents, assignees] = await firstValueFrom(
        combineLatest([
          this.agents$.pipe(catchError(() => of([]))),
          this.assignees$.pipe(catchError(() => of([])))
        ])
      );

      if (!agents || agents.length === 0) {
        console.error('No agents available to create document');
        return;
      }

      const creatorId = (assignees && assignees.length > 0) 
        ? assignees[0]._id 
        : agents[0]._id;

      await this.supabaseService.createDocument(
        this.newDocumentTitle.trim(),
        this.newDocumentContent.trim(),
        this.newDocumentType,
        creatorId,
        this.task._id
      );
      
      this.cancelAddingDocument();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error creating document:', error);
    }
  }

  selectDocument(document: Document): void {
    this.selectedDocument = document;
    this.cdr.markForCheck();
  }

  closeDocumentTrays(): void {
    this.selectedDocument = null;
    this.cdr.markForCheck();
  }
}
