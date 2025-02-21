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
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterChipsComponent } from './filter-chips.component';

describe('FilterChipsComponent', () => {
  let component: FilterChipsComponent;
  let fixture: ComponentFixture<FilterChipsComponent>;
  let compiled: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FilterChipsComponent],
    });
    fixture = TestBed.createComponent(FilterChipsComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('#clearFilter', () => {
    const MOCK_FILTERS = {
      deviceInfo: 'Delta',
      deviceFirmware: '03',
      results: ['Compliant'],
      dateRange: { start: '10/2/2024', end: '11/2/2024' },
    };

    beforeEach(() => {
      component.filters = MOCK_FILTERS;
    });

    it(`should clear deviceFirmware filter`, () => {
      const result = { ...MOCK_FILTERS, deviceFirmware: '' };
      component.clearFilter('deviceFirmware');

      expect(component.filters).toEqual(result);
    });

    it(`should clear results filter`, () => {
      const clearedFilters = { ...MOCK_FILTERS, results: [] };
      component.clearFilter('results');

      expect(component.filters).toEqual(clearedFilters);
    });

    it(`should clear dateRange filter`, () => {
      const clearedFilters = { ...MOCK_FILTERS, dateRange: '' };
      component.clearFilter('dateRange');

      expect(component.filters).toEqual(clearedFilters);
    });
  });

  describe('DOM tests', () => {
    describe('"Clear all filters" button', () => {
      it('should exist', () => {
        const button = compiled.querySelector('.clear-button');

        expect(button).toBeTruthy();
      });

      it('should clear all filters on click', () => {
        const clearAllFiltersSpy = spyOn(component, 'clearAllFilters');
        const button = compiled.querySelector(
          '.clear-button'
        ) as HTMLButtonElement;
        button.click();

        expect(clearAllFiltersSpy).toHaveBeenCalled();
      });
    });

    describe('filter chips', () => {
      describe('with no filter data', () => {
        beforeEach(() => {
          component.filters = {
            deviceInfo: '',
            deviceFirmware: '',
            results: [],
            dateRange: '',
          };
          fixture.detectChanges();
        });
        it('should not be displayed', () => {
          const chips = compiled.querySelectorAll('.filter-chip');

          expect(chips.length).toEqual(0);
        });
      });

      describe('with filter data', () => {
        beforeEach(() => {
          component.filters = {
            deviceInfo: 'Delta',
            deviceFirmware: '03',
            results: ['Compliant'],
            dateRange: '',
          };
          fixture.detectChanges();
        });
        it('should be displayed', () => {
          const chips = compiled.querySelectorAll('.filter-chip');

          expect(chips.length).toEqual(3);
        });

        it('should call clearFilter on close button click', () => {
          const clearFilterSpy = spyOn(component, 'clearFilter');
          const chipRemoveButtons = compiled.querySelectorAll(
            '.filter-chip button'
          );
          (chipRemoveButtons[1] as HTMLButtonElement).click();

          expect(clearFilterSpy).toHaveBeenCalledWith('deviceInfo');
        });
      });
    });
  });

  describe('Class tests', () => {
    beforeEach(() => {
      component.filters = {
        deviceInfo: 'Delta',
        deviceFirmware: '03',
        results: ['Compliant'],
        dateRange: '',
      };
      fixture.detectChanges();
    });

    it('should clear filters on clearAllFilters', () => {
      component.clearAllFilters();

      expect(component.filters).toEqual({
        deviceInfo: '',
        deviceFirmware: '',
        results: [],
        dateRange: '',
      });
    });

    it('should filter by kay on clearFilter', () => {
      component.clearFilter('deviceInfo');

      expect(component.filters).toEqual({
        deviceInfo: '',
        deviceFirmware: '03',
        results: ['Compliant'],
        dateRange: '',
      });
    });
  });
});
