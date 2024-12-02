import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule, NgIf } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';

export interface OpenFilterEvent {
  event: Event;
  filter: string;
  filterOpened: boolean;
}

@Component({
  selector: 'app-filter-header',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    CommonModule,
    MatTableModule,
    MatSortModule,
    NgIf,
  ],
  templateUrl: './filter-header.component.html',
  styleUrl: './filter-header.component.scss',
})
export class FilterHeaderComponent {
  @Output() emitOpenFilter = new EventEmitter<OpenFilterEvent>();
  @Input({ required: true }) filterName!: string;
  @Input({ required: true }) filterOpened!: boolean;
  @Input() hasSorting: boolean = true;
  @Input({ required: true }) activeFilter!: string;
  @Input() sortActionDescription: string = '';
  @Input({ required: true }) headerText!: string;

  openFilter(event: Event, filter: string, filterOpened: boolean): void {
    this.emitOpenFilter.emit({
      event,
      filter,
      filterOpened,
    });
  }
}
