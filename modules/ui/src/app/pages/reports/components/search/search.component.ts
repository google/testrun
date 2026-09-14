/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  viewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  DateRange,
  FilterName,
  FilterTitle,
  Filters,
  FilterItem,
  FilterMenuItem,
  OpenFilterEvent,
  FilterValue,
} from '../../../../model/filters';

export interface ActiveFilterItem {
  key: string;
  value: FilterValue;
}

@Component({
  selector: 'app-search',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent {
  @Input() filters: Filters = new Filters();
  @Input() filterOpened: boolean = false;
  @Input() activeFilter: string = '';

  @Output() emitOpenFilter = new EventEmitter<OpenFilterEvent>();
  @Output() filterCleared = new EventEmitter<Filters>();
  @Output() searchQueryChanged = new EventEmitter<string>();

  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  readonly filterButton =
    viewChild<ElementRef<HTMLButtonElement>>('filterButton');
  private readonly liveAnnouncer = inject(LiveAnnouncer, { optional: true });

  public readonly FilterName = FilterName;
  public readonly FilterTitle = FilterTitle;

  inputValue: string = '';
  isFocused: boolean = false;
  isMenuOpened: boolean = false;
  filterMenuItems: FilterMenuItem[] = [
    {
      displayName: FilterItem.Started,
      name: FilterName.Started,
      title: FilterTitle.Started,
    },
    {
      displayName: FilterItem.DeviceInfo,
      name: FilterName.DeviceInfo,
      title: FilterTitle.DeviceInfo,
    },
    {
      displayName: FilterItem.DeviceFirmware,
      name: FilterName.DeviceFirmware,
      title: FilterTitle.DeviceFirmware,
    },
    {
      displayName: FilterItem.AssessmentType,
      name: FilterName.AssessmentType,
      title: FilterTitle.AssessmentType,
    },
    {
      displayName: FilterItem.Results,
      name: FilterName.Results,
      title: FilterTitle.Results,
    },
    {
      displayName: FilterItem.Location,
      name: FilterName.Location,
      title: FilterTitle.Location,
    },
    {
      displayName: FilterItem.LinuxEnv,
      name: FilterName.LinuxEnv,
      title: FilterTitle.LinuxEnv,
    },
    {
      displayName: FilterItem.PythonVersion,
      name: FilterName.PythonVersion,
      title: FilterTitle.PythonVersion,
    },
    {
      displayName: FilterItem.Kernel,
      name: FilterName.Kernel,
      title: FilterTitle.Kernel,
    },
  ];

  focusInput(): void {
    this.searchInput()?.nativeElement.focus();
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.inputValue = target.value;
  }

  private normalizeQuickSearch(value: FilterValue): string[] {
    if (Array.isArray(value)) {
      return value.map(v => String(v).trim()).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      return [value.trim()];
    }
    return [];
  }

  getChipTrackId(item: ActiveFilterItem): string {
    return `${item.key}_${this.getFilterChipLabel(item.key, item.value)}`;
  }

  onEnter(event: Event): void {
    event.preventDefault();
    const query = this.inputValue.trim();
    if (query) {
      if (!this.filters) {
        this.filters = new Filters();
      }
      const currentQueries = this.normalizeQuickSearch(
        this.filters.quickSearch
      );
      if (!currentQueries.includes(query)) {
        currentQueries.push(query);
      }
      this.filters.quickSearch = currentQueries;
      this.searchQueryChanged.emit(query);
      this.filterCleared.emit(this.filters);
      this.liveAnnouncer?.announce(
        `Filter added: search: "${query}"`,
        'polite'
      );
      this.inputValue = '';
      if (this.searchInput()?.nativeElement) {
        this.searchInput()!.nativeElement.value = '';
      }
    }
  }

  onBackspace(): void {
    if (this.inputValue === '') {
      const active = this.getActiveFilters();
      if (active.length > 0) {
        const lastFilter = active[active.length - 1];
        if (lastFilter.key === FilterName.QuickSearch) {
          this.removeFilter(lastFilter.key, undefined, lastFilter.value);
        } else {
          this.removeFilter(lastFilter.key);
        }
      }
    }
  }

  getActiveFilters(): ActiveFilterItem[] {
    if (!this.filters) {
      return [];
    }
    const items: ActiveFilterItem[] = [];
    const keys: (keyof Filters)[] = [
      FilterName.QuickSearch,
      FilterName.DeviceInfo,
      FilterName.DeviceFirmware,
      FilterName.AssessmentType,
      FilterName.DateRange,
      FilterName.Results,
      FilterName.Location,
      FilterName.LinuxEnv,
      FilterName.PythonVersion,
      FilterName.Kernel,
    ];

    for (const key of keys) {
      const value = this.filters[key];
      if (!this.isValueEmpty(value)) {
        if (key === FilterName.QuickSearch) {
          const queries = this.normalizeQuickSearch(value);
          for (const query of queries) {
            items.push({ key, value: query });
          }
        } else {
          items.push({ key, value });
        }
      }
    }

    return items;
  }

  hasActiveFilters(): boolean {
    return this.getActiveFilters().length > 0;
  }

  isFilterActive(key: string): boolean {
    if (!this.filters) {
      return false;
    }
    const filterKey = key as keyof Filters;
    const val = this.filters[filterKey] as FilterValue;
    return !this.isValueEmpty(val);
  }

  isValueEmpty(value: FilterValue): boolean {
    if (
      value instanceof DateRange ||
      (typeof value === 'object' && value !== null && !Array.isArray(value))
    ) {
      return !value.start && !value.end;
    }
    return value === null || value === undefined || value.length === 0;
  }

  getFilterChipLabel(key: string, value: FilterValue): string {
    if (key === FilterName.QuickSearch) {
      return `search: "${value}"`;
    }
    if (key === FilterName.DeviceInfo) {
      return `Device: ${value}`;
    }
    if (key === FilterName.DeviceFirmware) {
      return `Firmware: ${value}`;
    }
    if (key === FilterName.AssessmentType) {
      return `Assessment type: ${value}`;
    }
    if (key === FilterName.Results) {
      const results = Array.isArray(value)
        ? value.join(', ')
        : String(value ?? '');
      return `Result: ${results}`;
    }
    if (key === FilterName.Location) {
      return `Location: ${value}`;
    }
    if (key === FilterName.LinuxEnv) {
      return `Linux Environment: ${value}`;
    }
    if (key === FilterName.PythonVersion) {
      return `Python Version: ${value}`;
    }
    if (key === FilterName.Kernel) {
      return `Kernel: ${value}`;
    }
    if (key === FilterName.DateRange || key === FilterName.Started) {
      const dateStr = this.formatDateFilter(value);
      return dateStr ? `Started: ${dateStr}` : 'Started';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value ?? '');
  }

  private formatDateItem(date: string | Date | null | undefined): string {
    if (!date) {
      return '';
    }
    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        return '';
      }
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }
    if (typeof date === 'string') {
      const trimmed = date.trim();
      if (!trimmed) {
        return '';
      }
      if (
        /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed) ||
        /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
      ) {
        return trimmed;
      }
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;
      }
      return trimmed;
    }
    return String(date);
  }

  private formatDateFilter(value: FilterValue): string {
    if (!value) {
      return '';
    }
    if (value instanceof Date) {
      return this.formatDateItem(value);
    }
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      ('start' in value || 'end' in value)
    ) {
      const range = value as {
        start?: string | Date | null;
        end?: string | Date | null;
      };
      const startStr = this.formatDateItem(range.start);
      const endStr = this.formatDateItem(range.end);

      if (startStr && endStr) {
        if (startStr === endStr) {
          return startStr;
        }
        return `${startStr} - ${endStr}`;
      }
      if (startStr) {
        return startStr;
      }
      if (endStr) {
        return endStr;
      }
      return '';
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.includes(' - ')) {
        const [s, e] = trimmed.split(' - ');
        const sFormatted = this.formatDateItem(s);
        const eFormatted = this.formatDateItem(e);
        if (sFormatted && eFormatted && sFormatted !== eFormatted) {
          return `${sFormatted} - ${eFormatted}`;
        }
        return sFormatted || eFormatted || trimmed;
      }
      return this.formatDateItem(trimmed);
    }
    return String(value);
  }

  getChipAriaLabel(key: string, value: FilterValue): string {
    return `Filter: ${this.getFilterChipLabel(key, value)}`;
  }

  getRemoveFilterAriaLabel(key: string, value: FilterValue): string {
    return `Clear filter: ${this.getFilterChipLabel(key, value)}`;
  }

  removeFilter(
    key: string,
    eventOrValue?: Event | FilterValue,
    valueOrEvent?: FilterValue | Event
  ): void {
    let event: Event | undefined;
    let value: FilterValue | undefined;

    if (eventOrValue instanceof Event) {
      event = eventOrValue;
      value = valueOrEvent as FilterValue;
    } else if (valueOrEvent instanceof Event) {
      event = valueOrEvent;
      value = eventOrValue as FilterValue;
    } else {
      value = (eventOrValue as FilterValue) ?? (valueOrEvent as FilterValue);
    }

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const filterKey = key as keyof Filters;
    const filterValue = value !== undefined ? value : this.filters[filterKey];
    const filterLabel = this.getFilterChipLabel(key, filterValue);

    switch (key) {
      case FilterName.DeviceInfo:
        this.filters.deviceInfo = '';
        break;
      case FilterName.DeviceFirmware:
        this.filters.deviceFirmware = '';
        break;
      case FilterName.AssessmentType:
        this.filters.assessmentType = '';
        break;
      case FilterName.Results:
        this.filters.results = [];
        break;
      case FilterName.DateRange:
      case FilterName.Started:
        this.filters.dateRange = '';
        break;
      case FilterName.QuickSearch:
        if (value !== undefined) {
          const currentQueries = this.normalizeQuickSearch(
            this.filters.quickSearch
          );
          this.filters.quickSearch = currentQueries.filter(
            q => q !== String(value)
          );
        } else {
          this.filters.quickSearch = [];
        }
        break;
      case FilterName.Location:
        this.filters.location = '';
        break;
      case FilterName.LinuxEnv:
        this.filters.linuxEnv = '';
        break;
      case FilterName.PythonVersion:
        this.filters.pythonVersion = '';
        break;
      case FilterName.Kernel:
        this.filters.kernel = '';
        break;
    }
    this.filterCleared.emit(this.filters);
    this.liveAnnouncer?.announce(`Filter removed: ${filterLabel}`, 'polite');
  }

  clearAll(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.inputValue = '';
    if (this.searchInput()?.nativeElement) {
      this.searchInput()!.nativeElement.value = '';
    }
    this.filters.deviceInfo = '';
    this.filters.deviceFirmware = '';
    this.filters.assessmentType = '';
    this.filters.results = [];
    this.filters.dateRange = '';
    this.filters.quickSearch = [];
    this.filters.location = '';
    this.filters.linuxEnv = '';
    this.filters.pythonVersion = '';
    this.filters.kernel = '';
    this.searchQueryChanged.emit('');
    this.filterCleared.emit(this.filters);
    this.liveAnnouncer?.announce('All filters cleared', 'polite');
  }

  openFilterMenu(filter: FilterName, title: FilterTitle, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const menuItem = event.currentTarget as HTMLElement;
    const itemRect = menuItem?.getBoundingClientRect?.();
    const menuPanel =
      menuItem?.closest('.mat-mdc-menu-panel') ||
      menuItem?.closest('.search-filter-menu') ||
      (document.querySelector('.search-filter-menu') as HTMLElement);
    const menuRect = menuPanel ? menuPanel.getBoundingClientRect() : itemRect;

    const trigger = this.filterButton()?.nativeElement
      ? new ElementRef(this.filterButton()!.nativeElement)
      : new ElementRef(event.currentTarget);
    this.emitOpenFilter.emit({
      event: {
        ...event,
        currentTarget: trigger.nativeElement,
        preventDefault: () => event?.preventDefault?.(),
        stopPropagation: () => event?.stopPropagation?.(),
      } as unknown as Event,
      filter,
      title,
      filterOpened: this.filterOpened,
      menuRect,
      itemRect,
    });
  }
}
