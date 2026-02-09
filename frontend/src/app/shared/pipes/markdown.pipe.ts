import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    try {
      return marked.parse(value) as string;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return value;
    }
  }
}
