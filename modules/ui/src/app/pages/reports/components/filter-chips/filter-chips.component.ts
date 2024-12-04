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
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { DateRange, FilterName, Filters } from '../../../../model/filters';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-filter-chips',
  templateUrl: './filter-chips.component.html',
  styleUrls: ['./filter-chips.component.scss'],

  imports: [
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    KeyValuePipe,
    CommonModule,
  ],
})
export class FilterChipsComponent {
  @Input() filters!: Filters;

  @Output() filterCleared = new EventEmitter<Filters>();

  isValueEmpty(value: string | string[] | DateRange) {
    if (value instanceof DateRange) {
      return !value.start && !value.end;
    }
    return value === null || value.length === 0;
  }

  clearFilter(filter: string) {
    switch (filter) {
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
        this.filters.dateRange = '';
        break;
    }
    this.filterCleared.emit(this.filters);
  }

  clearAllFilters() {
    this.filters.deviceInfo = '';
    this.filters.deviceFirmware = '';
    this.filters.results = [];
    this.filters.dateRange = '';
    this.filterCleared.emit(this.filters);
  }
}
