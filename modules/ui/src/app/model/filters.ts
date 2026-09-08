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

export type FilterValue =
  | string
  | string[]
  | DateRange
  | { start?: string | Date | null; end?: string | Date | null }
  | null;

export interface OpenFilterEvent {
  event: Event;
  filter: string;
  title: string;
  filterOpened: boolean;
  menuRect?: DOMRect;
  itemRect?: DOMRect;
}

export interface FilterMenuItem {
  displayName: FilterItem;
  name: FilterName;
  title: FilterTitle;
}

export enum FilterItem {
  QuickSearch = 'Raw search',
  DeviceInfo = 'Device',
  DeviceFirmware = 'Firmware',
  Results = 'Result',
  Started = 'Started',
  Location = 'Location',
  LinuxEnv = 'Linux Environment',
  PythonVersion = 'Python Version',
  Kernel = 'Kernel',
}

export enum FilterName {
  DeviceInfo = 'deviceInfo',
  DeviceFirmware = 'deviceFirmware',
  Results = 'results',
  Started = 'started',
  DateRange = 'dateRange',
  QuickSearch = 'quickSearch',
  Location = 'location',
  LinuxEnv = 'linuxEnv',
  PythonVersion = 'pythonVersion',
  Kernel = 'kernel',
}

export enum FilterTitle {
  QuickSearch = 'Enter raw search',
  DeviceInfo = 'Enter device name',
  DeviceFirmware = 'Enter firmware name',
  Results = 'Select status',
  Started = 'Select dates',
  Location = 'Enter location',
  LinuxEnv = 'Enter Linux environment',
  PythonVersion = 'Enter Python version',
  Kernel = 'Enter kernel',
}

export class DateRange {
  start: string | Date | null = '';
  end: string | Date | null = '';
  toString() {
    if (this.start && this.end) {
      return getDateString(this.start) + '-' + getDateString(this.end);
    }
    if (this.start && !this.end) {
      return getDateString(this.start);
    }
    if (!this.start && this.end) {
      return getDateString(this.end);
    }
    return '';
  }
}

export class Filters {
  deviceInfo = '';
  deviceFirmware = '';
  results: string[] = [];
  dateRange: DateRange | string = '';
  quickSearch = '';
  location = '';
  linuxEnv = '';
  pythonVersion = '';
  kernel = '';
}

function getDateString(date: string | Date) {
  if (typeof date === 'string') {
    return date;
  }

  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}
