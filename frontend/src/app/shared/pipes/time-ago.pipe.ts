import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {
  transform(timestamp: number, includeAbout: boolean = false): string {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    const prefix = includeAbout ? 'about ' : '';
    
    if (days > 0) {
      return `${prefix}${days} day${days > 1 ? 's' : ''} ago`;
    }
    if (hours > 0) {
      return `${prefix}${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  }
}
