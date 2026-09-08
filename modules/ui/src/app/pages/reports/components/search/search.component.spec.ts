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
import { SearchComponent } from './search.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  DateRange,
  FilterName,
  FilterTitle,
  Filters,
} from '../../../../model/filters';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchComponent, BrowserAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Active filters & labels', () => {
    it('should return empty list when no filters are active', () => {
      component.filters = new Filters();
      expect(component.getActiveFilters()).toEqual([]);
      expect(component.hasActiveFilters()).toBeFalse();
    });

    it('should return empty list when filters is null or undefined', () => {
      component.filters = null as unknown as Filters;
      expect(component.getActiveFilters()).toEqual([]);
      expect(component.hasActiveFilters()).toBeFalse();
      expect(component.isFilterActive('deviceInfo')).toBeFalse();
    });

    it('should return active filter items when filters are set', () => {
      component.filters = {
        deviceInfo: 'Pixel',
        deviceFirmware: '1.0',
        results: ['Compliant'],
        dateRange: { start: '10/01/2024', end: '10/05/2024' },
        quickSearch: ['test'],
        location: 'Data Center',
        linuxEnv: 'Ubuntu 24.04',
        pythonVersion: '3.11',
        kernel: '6.8.0',
      };

      const active = component.getActiveFilters();
      expect(active.length).toBe(9);
      expect(component.hasActiveFilters()).toBeTrue();
      expect(component.isFilterActive('deviceInfo')).toBeTrue();
      expect(component.isFilterActive('deviceFirmware')).toBeTrue();
      expect(component.isFilterActive('results')).toBeTrue();
      expect(component.isFilterActive('dateRange')).toBeTrue();
      expect(component.isFilterActive('quickSearch')).toBeTrue();
      expect(component.isFilterActive('location')).toBeTrue();
      expect(component.isFilterActive('linuxEnv')).toBeTrue();
      expect(component.isFilterActive('pythonVersion')).toBeTrue();
      expect(component.isFilterActive('kernel')).toBeTrue();
    });

    it('should format chip labels correctly for all filter types', () => {
      expect(
        component.getFilterChipLabel(FilterName.QuickSearch, 'query')
      ).toBe('search: "query"');
      expect(
        component.getFilterChipLabel(FilterName.DeviceInfo, 'Device A')
      ).toBe('Device contains "Device A"');
      expect(
        component.getFilterChipLabel(FilterName.DeviceFirmware, 'v2.1')
      ).toBe('Firmware contains "v2.1"');
      expect(
        component.getFilterChipLabel(FilterName.Location, 'Building 1')
      ).toBe('Location contains "Building 1"');
      expect(component.getFilterChipLabel(FilterName.LinuxEnv, 'Ubuntu')).toBe(
        'Linux Env contains "Ubuntu"'
      );
      expect(
        component.getFilterChipLabel(FilterName.PythonVersion, '3.11')
      ).toBe('Python contains "3.11"');
      expect(component.getFilterChipLabel(FilterName.Kernel, 'Linux 6.8')).toBe(
        'Kernel contains "Linux 6.8"'
      );
      expect(
        component.getFilterChipLabel(FilterName.DateRange, {
          start: '01/01/2024',
          end: '01/10/2024',
        })
      ).toBe('01/01/2024 - 01/10/2024');
      expect(
        component.getFilterChipLabel(FilterName.Started, {
          start: '01/01/2024',
          end: '',
        })
      ).toBe('01/01/2024 - ');
      expect(
        component.getFilterChipLabel(
          FilterName.DateRange,
          '01/01/2024 - 01/10/2024'
        )
      ).toBe('01/01/2024 - 01/10/2024');
      expect(
        component.getFilterChipLabel(FilterName.Results, [
          'Compliant',
          'Non-compliant',
        ])
      ).toBe('Compliant, Non-compliant');
      expect(component.getFilterChipLabel('unknownKey', 'sampleValue')).toBe(
        'sampleValue'
      );
    });

    it('should correctly evaluate isValueEmpty', () => {
      expect(component.isValueEmpty('')).toBeTrue();
      expect(component.isValueEmpty([])).toBeTrue();
      expect(component.isValueEmpty(null)).toBeTrue();
      expect(component.isValueEmpty(undefined as unknown as string)).toBeTrue();
      expect(component.isValueEmpty(new DateRange())).toBeTrue();
      expect(component.isValueEmpty({ start: '', end: '' })).toBeTrue();

      expect(component.isValueEmpty('value')).toBeFalse();
      expect(component.isValueEmpty(['value'])).toBeFalse();
      expect(
        component.isValueEmpty({ start: '01/01/2024', end: '01/10/2024' })
      ).toBeFalse();
      const dateRange = new DateRange();
      dateRange.start = '01/01/2024';
      expect(component.isValueEmpty(dateRange)).toBeFalse();
    });

    it('should generate accessible labels', () => {
      expect(component.getChipAriaLabel(FilterName.QuickSearch, 'test')).toBe(
        'Filter: search: "test". Click to edit.'
      );
      expect(
        component.getRemoveFilterAriaLabel(FilterName.DeviceInfo, 'Pixel')
      ).toBe('Clear filter: Device contains "Pixel"');
    });
  });

  describe('Filter removal & clearing', () => {
    let mockFilters: Filters;

    beforeEach(() => {
      mockFilters = {
        deviceInfo: 'Pixel',
        deviceFirmware: '1.0',
        results: ['Compliant'],
        dateRange: { start: '10/01/2024', end: '10/05/2024' },
        quickSearch: ['test'],
        location: 'DC-1',
        linuxEnv: 'Ubuntu',
        pythonVersion: '3.11',
        kernel: '6.8',
      };
      component.filters = { ...mockFilters };
    });

    it('should remove deviceInfo filter and handle event', () => {
      spyOn(component.filterCleared, 'emit');
      const event = new MouseEvent('click');
      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');

      component.removeFilter(FilterName.DeviceInfo, event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.filters.deviceInfo).toBe('');
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
    });

    it('should remove deviceFirmware filter', () => {
      spyOn(component.filterCleared, 'emit');
      component.removeFilter(FilterName.DeviceFirmware);

      expect(component.filters.deviceFirmware).toBe('');
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
    });

    it('should remove results filter', () => {
      spyOn(component.filterCleared, 'emit');
      component.removeFilter(FilterName.Results);

      expect(component.filters.results).toEqual([]);
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
    });

    it('should remove dateRange filter', () => {
      spyOn(component.filterCleared, 'emit');
      component.removeFilter(FilterName.DateRange);

      expect(component.filters.dateRange).toBe('');
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
    });

    it('should remove started filter', () => {
      spyOn(component.filterCleared, 'emit');
      component.removeFilter(FilterName.Started);

      expect(component.filters.dateRange).toBe('');
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
    });

    it('should remove quickSearch filter', () => {
      spyOn(component.filterCleared, 'emit');
      component.removeFilter(FilterName.QuickSearch);

      expect(component.filters.quickSearch).toEqual([]);
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
    });

    it('should remove specific quickSearch chip when value is provided', () => {
      component.filters.quickSearch = ['first', 'second', 'third'];
      spyOn(component.filterCleared, 'emit');

      component.removeFilter(FilterName.QuickSearch, undefined, 'second');

      expect(component.filters.quickSearch).toEqual(['first', 'third']);
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
    });

    it('should remove location filter', () => {
      spyOn(component.filterCleared, 'emit');
      component.removeFilter(FilterName.Location);

      expect(component.filters.location).toBe('');
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
    });

    it('should remove linuxEnv filter', () => {
      spyOn(component.filterCleared, 'emit');
      component.removeFilter(FilterName.LinuxEnv);

      expect(component.filters.linuxEnv).toBe('');
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
    });

    it('should remove pythonVersion filter', () => {
      spyOn(component.filterCleared, 'emit');
      component.removeFilter(FilterName.PythonVersion);

      expect(component.filters.pythonVersion).toBe('');
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
    });

    it('should remove kernel filter', () => {
      spyOn(component.filterCleared, 'emit');
      component.removeFilter(FilterName.Kernel);

      expect(component.filters.kernel).toBe('');
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
    });

    it('should clear all filters on clearAll and handle event', () => {
      spyOn(component.filterCleared, 'emit');
      spyOn(component.searchQueryChanged, 'emit');
      component.inputValue = 'some text';

      const event = new MouseEvent('click');
      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');

      component.clearAll(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.inputValue).toBe('');
      expect(component.filters.deviceInfo).toBe('');
      expect(component.filters.deviceFirmware).toBe('');
      expect(component.filters.results).toEqual([]);
      expect(component.filters.dateRange).toBe('');
      expect(component.filters.quickSearch).toEqual([]);
      expect(component.filters.location).toBe('');
      expect(component.filters.linuxEnv).toBe('');
      expect(component.filters.pythonVersion).toBe('');
      expect(component.filters.kernel).toBe('');
      expect(component.searchQueryChanged.emit).toHaveBeenCalledWith('');
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
    });
  });

  describe('Input handling', () => {
    it('should update inputValue on input change', () => {
      const event = {
        target: { value: 'my search' },
      } as unknown as Event;

      component.onInputChange(event);
      expect(component.inputValue).toBe('my search');
    });

    it('should add search chip on Enter and clear input', () => {
      spyOn(component.filterCleared, 'emit');
      spyOn(component.searchQueryChanged, 'emit');
      component.inputValue = '  Raspberry Pi  ';

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');

      component.onEnter(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.filters.quickSearch).toEqual(['Raspberry Pi']);
      expect(component.searchQueryChanged.emit).toHaveBeenCalledWith(
        'Raspberry Pi'
      );
      expect(component.filterCleared.emit).toHaveBeenCalledWith(
        component.filters
      );
      expect(component.inputValue).toBe('');
    });

    it('should add multiple search chips on subsequent Enters without replacing previous chip', () => {
      spyOn(component.filterCleared, 'emit');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      component.inputValue = 'first';
      component.onEnter(event);

      expect(component.filters.quickSearch).toEqual(['first']);

      component.inputValue = 'second';
      component.onEnter(event);

      expect(component.filters.quickSearch).toEqual(['first', 'second']);

      const active = component.getActiveFilters();
      const searchChips = active.filter(
        item => item.key === FilterName.QuickSearch
      );
      expect(searchChips.length).toBe(2);
      expect(searchChips[0].value).toBe('first');
      expect(searchChips[1].value).toBe('second');
    });

    it('should not add duplicate search chip if identical query is entered', () => {
      component.filters.quickSearch = ['first'];
      component.inputValue = 'first';
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onEnter(event);

      expect(component.filters.quickSearch).toEqual(['first']);
      expect(component.inputValue).toBe('');
    });

    it('should not add search chip on Enter if input is empty or whitespace', () => {
      spyOn(component.filterCleared, 'emit');
      spyOn(component.searchQueryChanged, 'emit');
      component.inputValue = '   ';

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onEnter(event);

      expect(component.searchQueryChanged.emit).not.toHaveBeenCalled();
      expect(component.filterCleared.emit).not.toHaveBeenCalled();
    });

    it('should remove last filter on Backspace when input is empty', () => {
      component.filters = {
        deviceInfo: 'Pixel',
        deviceFirmware: '1.0',
        results: [],
        dateRange: '',
        quickSearch: [],
        location: '',
        linuxEnv: '',
        pythonVersion: '',
        kernel: '',
      };
      component.inputValue = '';
      spyOn(component, 'removeFilter');

      component.onBackspace();

      expect(component.removeFilter).toHaveBeenCalledWith('deviceFirmware');
    });

    it('should remove last quickSearch chip on Backspace when multiple exist', () => {
      component.filters = {
        ...new Filters(),
        quickSearch: ['first', 'second'],
      };
      component.inputValue = '';
      spyOn(component, 'removeFilter').and.callThrough();

      component.onBackspace();

      expect(component.filters.quickSearch).toEqual(['first']);
    });

    it('should not remove last filter on Backspace when no active filters', () => {
      component.filters = new Filters();
      component.inputValue = '';
      spyOn(component, 'removeFilter');

      component.onBackspace();

      expect(component.removeFilter).not.toHaveBeenCalled();
    });

    it('should not remove last filter on Backspace if input is not empty', () => {
      component.filters = {
        deviceInfo: 'Pixel',
        deviceFirmware: '',
        results: [],
        dateRange: '',
        quickSearch: [],
        location: '',
        linuxEnv: '',
        pythonVersion: '',
        kernel: '',
      };
      component.inputValue = 'abc';
      spyOn(component, 'removeFilter');

      component.onBackspace();

      expect(component.removeFilter).not.toHaveBeenCalled();
    });

    it('should focus search input on focusInput()', () => {
      const inputEl = component.searchInput()?.nativeElement;
      if (inputEl) {
        spyOn(inputEl, 'focus');
        component.focusInput();
        expect(inputEl.focus).toHaveBeenCalled();
      }
    });
  });

  describe('Filter menu & dialog opening', () => {
    it('should emit emitOpenFilter on openFilterMenu for all menu items', () => {
      spyOn(component.emitOpenFilter, 'emit');
      component.filterMenuItems.forEach(item => {
        const button = document.createElement('button');
        const event = {
          currentTarget: button,
          preventDefault: jasmine.createSpy('preventDefault'),
          stopPropagation: jasmine.createSpy('stopPropagation'),
        } as unknown as Event;

        component.openFilterMenu(item.name, item.title, event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.emitOpenFilter.emit).toHaveBeenCalledWith(
          jasmine.objectContaining({
            filter: item.name,
            title: item.title,
            filterOpened: component.filterOpened,
          })
        );
      });
    });

    it('should find closest menu panel if present', () => {
      spyOn(component.emitOpenFilter, 'emit');
      const menuPanel = document.createElement('div');
      menuPanel.classList.add('search-filter-menu');
      const button = document.createElement('button');
      menuPanel.appendChild(button);
      document.body.appendChild(menuPanel);

      const event = {
        currentTarget: button,
        preventDefault: () => undefined,
        stopPropagation: () => undefined,
      } as unknown as Event;

      component.openFilterMenu(FilterName.Started, FilterTitle.Started, event);

      expect(component.emitOpenFilter.emit).toHaveBeenCalled();
      document.body.removeChild(menuPanel);
    });
  });

  describe('DOM rendering', () => {
    it('should render search input and filter button', () => {
      const input = compiled.querySelector('.search-input');
      const filterBtn = compiled.querySelector('.filter-button');

      expect(input).toBeTruthy();
      expect(filterBtn).toBeTruthy();
    });

    it('should render filter chips when filters are present', () => {
      component.filters = {
        deviceInfo: 'Pixel',
        deviceFirmware: '',
        results: ['Compliant'],
        dateRange: '',
        quickSearch: ['test'],
        location: '',
        linuxEnv: '',
        pythonVersion: '',
        kernel: '',
      };
      fixture.detectChanges();

      const chips = compiled.querySelectorAll('.filter-chip');
      expect(chips.length).toBe(3);
    });

    it('should render multiple search chips and remove only clicked chip from DOM', () => {
      component.filters = {
        ...new Filters(),
        quickSearch: ['apple', 'banana'],
      };
      fixture.detectChanges();

      let chips = compiled.querySelectorAll('.filter-chip');
      expect(chips.length).toBe(2);
      expect(chips[0].textContent).toContain('search: "apple"');
      expect(chips[1].textContent).toContain('search: "banana"');

      spyOn(component, 'removeFilter').and.callThrough();
      const firstRemoveBtn = chips[0].querySelector(
        '.filter-chip-remove'
      ) as HTMLButtonElement;
      firstRemoveBtn.click();

      expect(component.removeFilter).toHaveBeenCalledWith(
        FilterName.QuickSearch,
        jasmine.any(MouseEvent),
        'apple'
      );
      expect(component.filters.quickSearch).toEqual(['banana']);

      fixture.detectChanges();
      chips = compiled.querySelectorAll('.filter-chip');
      expect(chips.length).toBe(1);
      expect(chips[0].textContent).toContain('search: "banana"');
    });

    it('should render clear button when filters or input value are present', () => {
      component.filters = new Filters();
      component.inputValue = '';
      fixture.detectChanges();
      expect(compiled.querySelector('.clear-button')).toBeNull();

      component.inputValue = 'abc';
      fixture.detectChanges();
      const clearBtn = compiled.querySelector('.clear-button');
      expect(clearBtn).toBeTruthy();
      expect(clearBtn?.textContent?.trim()).toBe('Clear all');
    });

    it('should trigger removeFilter on chip remove button click, enter, space', () => {
      component.filters = {
        deviceInfo: 'Pixel',
        deviceFirmware: '',
        results: [],
        dateRange: '',
        quickSearch: [],
        location: '',
        linuxEnv: '',
        pythonVersion: '',
        kernel: '',
      };
      fixture.detectChanges();

      spyOn(component, 'removeFilter');
      const removeBtn = compiled.querySelector(
        '.filter-chip-remove'
      ) as HTMLButtonElement;
      expect(removeBtn).toBeTruthy();

      removeBtn.click();
      expect(component.removeFilter).toHaveBeenCalledWith(
        'deviceInfo',
        jasmine.any(MouseEvent)
      );

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      removeBtn.dispatchEvent(enterEvent);
      expect(component.removeFilter).toHaveBeenCalled();

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      removeBtn.dispatchEvent(spaceEvent);
      expect(component.removeFilter).toHaveBeenCalled();
    });
  });
});
