import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';

export interface OpenFilterEvent {
  event: Event;
  filter: string;
  title: string;
  filterOpened: boolean;
}

@Component({
  selector: 'app-filter-header',
  imports: [
    MatIconModule,
    MatButtonModule,
    CommonModule,
    MatTableModule,
    MatSortModule,
  ],
  templateUrl: './filter-header.component.html',
  styleUrl: './filter-header.component.scss',
})
export class FilterHeaderComponent {
  @Output() emitOpenFilter = new EventEmitter<OpenFilterEvent>();
  @Input({ required: true }) filterName!: string;
  @Input({ required: true }) filterTitle!: string;
  @Input({ required: true }) filterOpened!: boolean;
  @Input() hasSorting: boolean = true;
  @Input() filtered: boolean = false;
  @Input({ required: true }) activeFilter!: string;
  @Input() sortActionDescription: string = '';
  @Input({ required: true }) headerText!: string;

  openFilter(
    event: Event,
    filter: string,
    title: string,
    filterOpened: boolean
  ): void {
    this.emitOpenFilter.emit({
      event,
      filter,
      title,
      filterOpened,
    });
  }
}
