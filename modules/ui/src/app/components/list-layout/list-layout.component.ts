import { Component, input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-list-layout',
  imports: [CommonModule],
  templateUrl: './list-layout.component.html',
  styleUrl: './list-layout.component.scss',
})
export class ListLayoutComponent<T> {
  title = input<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emptyContent = input<TemplateRef<any>>();
  entities = input<T[]>([]);
}
