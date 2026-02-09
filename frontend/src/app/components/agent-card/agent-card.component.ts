import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Agent } from '../../models/types';
import { LevelBadgeComponent } from '../level-badge/level-badge.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-agent-card',
  standalone: true,
  imports: [CommonModule, LevelBadgeComponent, StatusBadgeComponent],
  templateUrl: './agent-card.component.html',
  styleUrl: './agent-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentCardComponent {
  @Input() agent!: Agent;
  @Input() selected = false;

  /**
   * Get the avatar to display - emoji, image URL, or initials fallback
   */
  getAvatar(): string {
    if (this.agent.avatar) {
      // Check if it's a URL (starts with http:// or https://)
      if (this.agent.avatar.startsWith('http://') || this.agent.avatar.startsWith('https://')) {
        return this.agent.avatar;
      }
      // Otherwise treat as emoji
      return this.agent.avatar;
    }
    // Fallback to initials
    return this.getInitials();
  }

  /**
   * Check if avatar is a URL (for img tag) vs emoji/text
   */
  isAvatarUrl(): boolean {
    return !!(this.agent.avatar && 
      (this.agent.avatar.startsWith('http://') || this.agent.avatar.startsWith('https://')));
  }

  /**
   * Get initials from agent name (first letter of each word, max 2)
   */
  getInitials(): string {
    if (!this.agent.name) return '?';
    const words = this.agent.name.trim().split(/\s+/);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Get role tag to display - use roleTag if available, otherwise use role
   */
  getRoleTag(): string {
    return this.agent.roleTag || this.agent.role;
  }

  /**
   * Check if status is active (for enhanced styling)
   */
  isActive(): boolean {
    return this.agent.status === 'active';
  }

  /**
   * Check if status is idle (for enhanced styling)
   */
  isIdle(): boolean {
    return this.agent.status === 'idle';
  }
}
