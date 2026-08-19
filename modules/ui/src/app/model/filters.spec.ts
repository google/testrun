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
  DateRange,
  Filters,
  FilterItem,
  FilterName,
  FilterTitle,
} from './filters';

describe('Filters Models', () => {
  describe('DateRange', () => {
    it('should return formatted string with start and end as Date objects', () => {
      const range = new DateRange();
      range.start = new Date(2024, 0, 15);
      range.end = new Date(2024, 0, 20);

      expect(range.toString()).toBe('1/15/2024-1/20/2024');
    });

    it('should return formatted string with start and end as strings', () => {
      const range = new DateRange();
      range.start = '2024-01-15';
      range.end = '2024-01-20';

      expect(range.toString()).toBe('2024-01-15-2024-01-20');
    });

    it('should return formatted string with only start date', () => {
      const range = new DateRange();
      range.start = new Date(2024, 4, 10);
      range.end = null;

      expect(range.toString()).toBe('5/10/2024');
    });

    it('should return formatted string with only start string', () => {
      const range = new DateRange();
      range.start = '2024-05-10';
      range.end = '';

      expect(range.toString()).toBe('2024-05-10');
    });

    it('should return formatted string with only end date', () => {
      const range = new DateRange();
      range.start = null;
      range.end = new Date(2024, 11, 25);

      expect(range.toString()).toBe('12/25/2024');
    });

    it('should return formatted string with only end string', () => {
      const range = new DateRange();
      range.start = '';
      range.end = '2024-12-25';

      expect(range.toString()).toBe('2024-12-25');
    });

    it('should return empty string when neither start nor end is set', () => {
      const range = new DateRange();
      range.start = '';
      range.end = '';

      expect(range.toString()).toBe('');
    });
  });

  describe('Filters', () => {
    it('should initialize with default empty values for all filter fields', () => {
      const filters = new Filters();

      expect(filters.deviceInfo).toBe('');
      expect(filters.deviceFirmware).toBe('');
      expect(filters.results).toEqual([]);
      expect(filters.dateRange).toBe('');
      expect(filters.quickSearch).toBe('');
      expect(filters.location).toBe('');
      expect(filters.linuxEnv).toBe('');
      expect(filters.pythonVersion).toBe('');
      expect(filters.kernel).toBe('');
    });
  });

  describe('Enums', () => {
    it('should define FilterItem values correctly', () => {
      expect(FilterItem.DeviceInfo).toBe('Device');
      expect(FilterItem.DeviceFirmware).toBe('Firmware');
      expect(FilterItem.Results).toBe('Result');
      expect(FilterItem.Started).toBe('Started');
      expect(FilterItem.Location).toBe('Location');
      expect(FilterItem.LinuxEnv).toBe('Linux Environment');
      expect(FilterItem.PythonVersion).toBe('Python Version');
      expect(FilterItem.Kernel).toBe('Kernel');
    });

    it('should define FilterName values correctly', () => {
      expect(FilterName.DeviceInfo).toBe('deviceInfo');
      expect(FilterName.DeviceFirmware).toBe('deviceFirmware');
      expect(FilterName.Results).toBe('results');
      expect(FilterName.Started).toBe('started');
      expect(FilterName.DateRange).toBe('dateRange');
      expect(FilterName.QuickSearch).toBe('quickSearch');
      expect(FilterName.Location).toBe('location');
      expect(FilterName.LinuxEnv).toBe('linuxEnv');
      expect(FilterName.PythonVersion).toBe('pythonVersion');
      expect(FilterName.Kernel).toBe('kernel');
    });

    it('should define FilterTitle values correctly', () => {
      expect(FilterTitle.DeviceInfo).toBe('Enter device name');
      expect(FilterTitle.DeviceFirmware).toBe('Enter firmware name');
      expect(FilterTitle.Results).toBe('Select status');
      expect(FilterTitle.Started).toBe('Select dates');
      expect(FilterTitle.Location).toBe('Enter location');
      expect(FilterTitle.LinuxEnv).toBe('Enter Linux environment');
      expect(FilterTitle.PythonVersion).toBe('Enter Python version');
      expect(FilterTitle.Kernel).toBe('Enter kernel');
    });
  });
});
