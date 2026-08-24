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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
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

  readonly filterButton =
    viewChild<ElementRef<HTMLButtonElement>>('filterButton');

  public readonly FilterName = FilterName;
  public readonly FilterTitle = FilterTitle;

  isMenuOpened: boolean = false;
  filterMenuItems: FilterMenuItem[] = [
    {
      displayName: FilterItem.QuickSearch,
      name: FilterName.QuickSearch,
      title: FilterTitle.QuickSearch,
    },
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

  getActiveFilters(): ActiveFilterItem[] {
    if (!this.filters) {
      return [];
    }
    const items: ActiveFilterItem[] = [];
    const keys: (keyof Filters)[] = [
      FilterName.QuickSearch,
      FilterName.DeviceInfo,
      FilterName.DeviceFirmware,
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
        items.push({ key, value });
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
      return `Raw search contains "${value}"`;
    }
    if (key === FilterName.DeviceInfo) {
      return `Device contains "${value}"`;
    }
    if (key === FilterName.DeviceFirmware) {
      return `Firmware contains "${value}"`;
    }
    if (key === FilterName.Location) {
      return `Location contains "${value}"`;
    }
    if (key === FilterName.LinuxEnv) {
      return `Linux Env contains "${value}"`;
    }
    if (key === FilterName.PythonVersion) {
      return `Python contains "${value}"`;
    }
    if (key === FilterName.Kernel) {
      return `Kernel contains "${value}"`;
    }
    if (key === FilterName.DateRange || key === FilterName.Started) {
      if (
        typeof value === 'object' &&
        value &&
        !Array.isArray(value) &&
        (value.start || value.end)
      ) {
        return `${value.start || ''} - ${value.end || ''}`;
      }
      return String(value ?? '');
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value ?? '');
  }

  getChipAriaLabel(key: string, value: FilterValue): string {
    return `Filter: ${this.getFilterChipLabel(key, value)}. Click to edit.`;
  }

  getRemoveFilterAriaLabel(key: string, value: FilterValue): string {
    return `Clear filter: ${this.getFilterChipLabel(key, value)}`;
  }

  removeFilter(key: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    switch (key) {
      case FilterName.DeviceInfo:
        this.filters.deviceInfo = '';
        break;
      case FilterName.DeviceFirmware:
        this.filters.deviceFirmware = '';
        break;
      case FilterName.Results:
        this.filters.results = [];
        break;
      case FilterName.DateRange:
      case FilterName.Started:
        this.filters.dateRange = '';
        break;
      case FilterName.QuickSearch:
        this.filters.quickSearch = '';
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
  }

  clearAll(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.filters.deviceInfo = '';
    this.filters.deviceFirmware = '';
    this.filters.results = [];
    this.filters.dateRange = '';
    this.filters.quickSearch = '';
    this.filters.location = '';
    this.filters.linuxEnv = '';
    this.filters.pythonVersion = '';
    this.filters.kernel = '';
    this.searchQueryChanged.emit('');
    this.filterCleared.emit(this.filters);
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
