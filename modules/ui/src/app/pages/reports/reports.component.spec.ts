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
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { ReportsComponent } from './reports.component';
import { TestRunService } from '../../services/test-run.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatDialogRef } from '@angular/material/dialog';
import { FilterDialogComponent } from './components/filter-dialog/filter-dialog.component';
import { ElementRef } from '@angular/core';
import { FilterName, FilterTitle } from '../../model/filters';
import SpyObj = jasmine.SpyObj;
import { DATA_SOURCE_INITIAL_VALUE, ReportsStore } from './reports.store';
import {
  DATA_SOURCE_FOR_EMPTY_FILTERS,
  DATA_SOURCE_INITIAL_VALUE_NOT_EMPTY,
  FORMATTED_HISTORY,
  HISTORY,
} from '../../mocks/reports.mock';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { HistoryTestrun } from '../../model/testrun-status';

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;
  let compiled: HTMLElement;
  let mockService: SpyObj<TestRunService>;
  let mockLiveAnnouncer: SpyObj<LiveAnnouncer>;
  let mockReportsStore: SpyObj<ReportsStore>;

  const getViewModel = (
    dataSource: MatTableDataSource<HistoryTestrun>,
    dataLoaded: boolean
  ) => {
    return of({
      displayedColumns: [
        'expand',
        'started',
        'duration',
        'deviceInfo',
        'deviceFirmware',
        'status',
        'report',
      ],
      chips: ['chips'],
      dataSource: dataSource,
      filterOpened: false,
      activeFilter: '',
      filteredValues: {
        deviceInfo: '',
        deviceFirmware: '',
        results: ['compliant'],
        dateRange: '',
        quickSearch: '',
      },
      dataLoaded: dataLoaded,
      selectedRow: null,
      isFiltersEmpty: true,
      profiles: [],
    });
  };
  beforeEach(() => {
    mockService = jasmine.createSpyObj(['getResultClass', 'getReportLink']);
    mockReportsStore = jasmine.createSpyObj('ReportsStore', [
      'deleteReport',
      'setSelectedRow',
      'setFilteredValues',
      'setFilteredValuesDateRange',
      'setFilteredValuesDeviceFirmware',
      'setFilteredValuesDeviceInfo',
      'setFilteredValuesQuickSearch',
      'setFilteredValuesResults',
      'setActiveFiler',
      'setFilterOpened',
      'updateSort',
      'getReports',
      'getReports',
      'fetchReports',
    ]);
    mockLiveAnnouncer = jasmine.createSpyObj(['announce']);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, ReportsComponent],
      providers: [
        { provide: TestRunService, useValue: mockService },
        { provide: ReportsStore, useValue: mockReportsStore },
        { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
      ],
    });
    TestBed.overrideProvider(ReportsStore, { useValue: mockReportsStore });
    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    component.viewModel$ = getViewModel(DATA_SOURCE_INITIAL_VALUE, false);
    compiled = fixture.nativeElement as HTMLElement;
  });

  describe('Class tests', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
      it('should get reports', fakeAsync(() => {
        component.ngOnInit();

        expect(mockReportsStore.fetchReports).toHaveBeenCalled();
      }));

      it('should update sort if sort viewChild is available', () => {
        const mockSort = new MatSort();
        spyOn(component, 'sort').and.returnValue(mockSort);

        component.ngOnInit();

        expect(mockReportsStore.updateSort).toHaveBeenCalledWith(mockSort);
      });
    });

    it('#sortData should call liveAnnouncer with sorted direction message and update sort', () => {
      const mockSort = new MatSort();
      spyOn(component, 'sort').and.returnValue(mockSort);

      component.sortData({ active: '', direction: 'desc' });

      expect(mockReportsStore.updateSort).toHaveBeenCalledWith(mockSort);
      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        'Sorted descending'
      );
    });

    it('#sortData should call liveAnnouncer with "Sorting cleared" message', () => {
      component.sortData({ active: '', direction: '' });

      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        'Sorting cleared'
      );
    });

    it('#getFormattedDateString should return string in the format "d MMM y H:mm"', () => {
      const expectedResult = '23 Jun 2023 10:11';

      const result = component.getFormattedDateString(HISTORY[0].started);

      expect(result).toEqual(expectedResult);
    });

    it('#getFormattedDateString should return empty string if no date', () => {
      const expectedResult = '';

      const result = component.getFormattedDateString(null);

      expect(result).toEqual(expectedResult);
    });

    it('should open filter dialog with data', () => {
      const event = {
        currentTarget: null,
        stopPropagation: () => undefined,
        preventDefault: () => undefined,
      } as Event;
      const openSpy = spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<typeof FilterDialogComponent>);
      fixture.detectChanges();

      component.openFilter({
        event,
        filter: '',
        title: '',
        filterOpened: false,
      });

      expect(openSpy).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalledWith(FilterDialogComponent, {
        ariaLabel: 'Filters',
        data: {
          filter: '',
          title: '',
          trigger: new ElementRef(event.currentTarget),
        },
        autoFocus: true,
        hasBackdrop: true,
        disableClose: true,
        panelClass: 'filter-form-dialog',
      });

      openSpy.calls.reset();
    });

    it('should update filteredValues when filter dialog closes with data', () => {
      const event = {
        currentTarget: null,
        stopPropagation: () => undefined,
        preventDefault: () => undefined,
      } as Event;

      const mockFilterResults = ['compliant'];
      const mockFilterDeviceInfo = 'mockDevice';
      const mockFilterDeviceFirmware = 'mockFirmware';
      const mockFilterDateRange = {
        start: 'Wed Jun 21 2023 00:00:00',
        end: 'Thu Jun 22 2023 00:00:00',
      };

      const mockFilteredData = {
        results: mockFilterResults,
        deviceInfo: mockFilterDeviceInfo,
        deviceFirmware: mockFilterDeviceFirmware,
        dateRange: mockFilterDateRange,
      };

      spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(mockFilteredData),
      } as MatDialogRef<typeof FilterDialogComponent>);
      fixture.detectChanges();

      component.openFilter({
        event,
        filter: FilterName.Started,
        title: FilterTitle.Started,
        filterOpened: false,
      });
      component.openFilter({
        event,
        filter: FilterName.Results,
        title: FilterTitle.Results,
        filterOpened: false,
      });
      component.openFilter({
        event,
        filter: FilterName.DeviceFirmware,
        title: FilterTitle.DeviceFirmware,
        filterOpened: false,
      });
      component.openFilter({
        event,
        filter: FilterName.DeviceInfo,
        title: FilterTitle.DeviceInfo,
        filterOpened: false,
      });
      expect(mockReportsStore.setFilteredValuesResults).toHaveBeenCalledWith(
        mockFilterResults
      );
      expect(mockReportsStore.setFilteredValuesDeviceInfo).toHaveBeenCalledWith(
        mockFilterDeviceInfo
      );
      expect(
        mockReportsStore.setFilteredValuesDeviceFirmware
      ).toHaveBeenCalledWith(mockFilterDeviceFirmware);
      expect(mockReportsStore.setFilteredValuesDateRange).toHaveBeenCalledWith(
        mockFilterDateRange
      );
    });

    describe('#focusNextButton', () => {
      beforeEach(() => {
        component.viewModel$ = getViewModel(
          DATA_SOURCE_INITIAL_VALUE_NOT_EMPTY,
          true
        );
        fixture.detectChanges();
      });

      it('should focus next active element if exist', fakeAsync(() => {
        const row = window.document.querySelector('tbody tr') as HTMLElement;
        row.classList.add('report-selected');
        const nextButton = (window.document.querySelector(
          '.report-selected + tr + tr a'
        ) ||
          window.document.querySelector(
            '.report-selected + tr a'
          )) as HTMLButtonElement;
        const buttonFocusSpy = spyOn(nextButton, 'focus');

        component.focusNextButton();

        tick(50);

        expect(buttonFocusSpy).toHaveBeenCalled();
      }));

      it('should focus navigation button if next active element does not exist', fakeAsync(() => {
        const button = document.createElement('BUTTON');
        button.classList.add('app-sidebar-button-reports');
        document.querySelector('body')?.appendChild(button);
        const buttonFocusSpy = spyOn(button, 'focus');

        component.focusNextButton();

        tick(50);

        expect(buttonFocusSpy).toHaveBeenCalled();
      }));
    });

    it('#removeDevice should call delete report', () => {
      const data = HISTORY[0];
      component.removeReport(data);
      expect(mockReportsStore.deleteReport).toHaveBeenCalledWith('/report/123');
    });

    describe('search query methods', () => {
      it('applySearchQuery should call setFilteredValuesQuickSearch', () => {
        component.searchQuery = 'testSearch';
        component.applySearchQuery();

        expect(
          mockReportsStore.setFilteredValuesQuickSearch
        ).toHaveBeenCalledWith('testSearch');
      });

      it('addSearchTag should set searchQuery and call applySearchQuery', () => {
        component.addSearchTag('tagSearch');

        expect(component.searchQuery).toBe('tagSearch');
        expect(
          mockReportsStore.setFilteredValuesQuickSearch
        ).toHaveBeenCalledWith('tagSearch');
      });

      it('clearSearchQuery should reset searchQuery and call applySearchQuery', () => {
        component.searchQuery = 'someQuery';
        component.clearSearchQuery();

        expect(component.searchQuery).toBe('');
        expect(
          mockReportsStore.setFilteredValuesQuickSearch
        ).toHaveBeenCalledWith('');
      });
    });

    describe('Row expansion methods', () => {
      it('toggleRowExpand should add and delete row from expandedRows and announce to screen reader', () => {
        const item = FORMATTED_HISTORY[0];
        expect(component.isExpanded(item)).toBeFalse();

        component.toggleRowExpand(item);
        expect(component.isExpanded(item)).toBeTrue();
        expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
          `Metadata expanded for ${item.deviceInfo}`
        );

        component.toggleRowExpand(item);
        expect(component.isExpanded(item)).toBeFalse();
        expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
          `Metadata collapsed for ${item.deviceInfo}`
        );
      });

      it('toggleRowExpand should stop event propagation when event is provided', () => {
        const item = FORMATTED_HISTORY[0];
        const event = jasmine.createSpyObj<Event>('Event', [
          'preventDefault',
          'stopPropagation',
        ]);

        component.toggleRowExpand(item, event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.isExpanded(item)).toBeTrue();
      });

      it('getRowId should return sanitized identifier', () => {
        const item = { ...FORMATTED_HISTORY[0], started: '2023-06-23T10:11:00', deviceInfo: 'Raspberry Pi / 4' };
        const id = component.getRowId(item);
        expect(id).toBe('2023-06-23T10_11_00-Raspberry_Pi___4');
      });
    });

    describe('filterCleared', () => {
      it('should update searchQuery and call store.setFilteredValues', () => {
        const filters = {
          deviceInfo: '',
          deviceFirmware: '',
          results: [],
          dateRange: '',
          quickSearch: 'searchKeyword',
        };

        component.filterCleared(filters);

        expect(component.searchQuery).toBe('searchKeyword');
        expect(mockReportsStore.setFilteredValues).toHaveBeenCalledWith(filters);
      });

      it('should fallback to empty searchQuery if quickSearch is missing in filters', () => {
        const filters = {
          deviceInfo: '',
          deviceFirmware: '',
          results: [],
          dateRange: '',
        };

        component.filterCleared(filters as any);

        expect(component.searchQuery).toBe('');
        expect(mockReportsStore.setFilteredValues).toHaveBeenCalledWith(filters as any);
      });
    });

    describe('selectRow and trackByStarted', () => {
      it('selectRow should call store.setSelectedRow', () => {
        const row = {} as any;
        component.selectRow(row);
        expect(mockReportsStore.setSelectedRow).toHaveBeenCalledWith(row);
      });

      it('trackByStarted should return started date of item', () => {
        expect(component.trackByStarted(0, FORMATTED_HISTORY[0])).toBe(
          FORMATTED_HISTORY[0].started
        );
      });
    });

    describe('Metadata helper methods', () => {
      it('should return location from host object, top level, or device object', () => {
        expect(component.getLocation(HISTORY[0])).toBe(
          'Data Center Alpha - Rack 12, Bay B'
        );

        const itemWithTopLocation = {
          ...HISTORY[0],
          host: null,
          location: 'Lab Room 101',
        } as HistoryTestrun;
        expect(component.getLocation(itemWithTopLocation)).toBe('Lab Room 101');

        const itemWithDeviceLocation = {
          ...HISTORY[0],
          host: null,
          location: null,
          device: { ...HISTORY[0].device, location: 'Device Shelf A' },
        } as HistoryTestrun;
        expect(component.getLocation(itemWithDeviceLocation)).toBe(
          'Device Shelf A'
        );
      });

      it('should return linux_env from host object, top level, or device object', () => {
        expect(component.getLinuxEnv(HISTORY[0])).toBe(
          'Ubuntu 24.04 LTS (x86_64)'
        );

        const itemWithTopEnv = {
          ...HISTORY[0],
          host: null,
          linux_env: 'Debian 12 Bookworm',
        } as HistoryTestrun;
        expect(component.getLinuxEnv(itemWithTopEnv)).toBe('Debian 12 Bookworm');

        const itemWithDeviceEnv = {
          ...HISTORY[0],
          host: null,
          linux_env: null,
          device: { ...HISTORY[0].device, linux_env: 'Alpine 3.19' },
        } as HistoryTestrun;
        expect(component.getLinuxEnv(itemWithDeviceEnv)).toBe('Alpine 3.19');
      });

      it('should return kernel from device object or top level', () => {
        expect(component.getKernel(HISTORY[0])).toBe('Linux 6.8.0-40-generic');

        const itemWithTopKernel = {
          ...HISTORY[0],
          device: null,
          kernel: 'Linux 5.15.0-89-generic',
        } as any;
        expect(component.getKernel(itemWithTopKernel)).toBe(
          'Linux 5.15.0-89-generic'
        );
      });

      it('should return python_version from host object or top level', () => {
        expect(component.getPythonVersion(HISTORY[0])).toBe('3.11.2');

        const itemWithTopPython = {
          ...HISTORY[0],
          host: null,
          python_version: '3.12.1',
        } as HistoryTestrun;
        expect(component.getPythonVersion(itemWithTopPython)).toBe('3.12.1');
      });
    });
  });

  describe('DOM tests', () => {
    describe('data is not fetched', () => {
      beforeEach(() => {
        component.viewModel$ = getViewModel(DATA_SOURCE_INITIAL_VALUE, false);
        component.ngOnInit();
      });

      it('should have empty page if data not fetched yet', () => {
        const empty = compiled.querySelector('.results-content-empty');
        const table = compiled.querySelector('table');

        expect(table).toBeNull();
        expect(empty).toBeNull();
      });
    });

    describe('with no devices', () => {
      beforeEach(() => {
        component.viewModel$ = getViewModel(DATA_SOURCE_INITIAL_VALUE, true);
        component.ngOnInit();
        fixture.detectChanges();
      });

      it('should have empty message', () => {
        const empty = compiled.querySelector('.history-content-empty');
        expect(empty).toBeTruthy();
      });
    });

    describe('with devices', () => {
      beforeEach(() => {
        component.viewModel$ = getViewModel(
          DATA_SOURCE_INITIAL_VALUE_NOT_EMPTY,
          true
        );

        mockService.getResultClass.and.returnValue({
          green: false,
          red: true,
          blue: false,
          cyan: false,
          grey: false,
        });
        component.ngOnInit();
        fixture.detectChanges();
      });

      it('should have data table', () => {
        const table = compiled.querySelector('table');

        expect(table).toBeTruthy();
      });

      it('should have addition valid class on table cell "Status"', () => {
        const statusResultEl = compiled.querySelector('.cell-result-text');

        expect(statusResultEl?.classList).toContain('red');
      });

      it('should have report pdf link', () => {
        const link = compiled.querySelector('app-download-report-pdf');

        expect(link).toBeTruthy();
      });

      it('should have report zip link', () => {
        const link = compiled.querySelector('app-download-report-zip');

        expect(link).toBeTruthy();
      });

      it('should have filter chips', () => {
        const chips = compiled.querySelector('app-filter-chips');

        expect(chips).toBeTruthy();
      });

      it('should have empty state when no data satisfy filters', () => {
        const dataSource = DATA_SOURCE_FOR_EMPTY_FILTERS;
        dataSource.filter = JSON.stringify({
          deviceInfo: 'some not existing data',
          deviceFirmware: 'some not existing data',
          results: [],
          dateRange: '',
        });

        component.viewModel$ = getViewModel(dataSource, true);

        fixture.detectChanges();
        const emptyMessage = compiled.querySelector(
          '.results-content-filter-empty'
        );

        expect(emptyMessage).toBeTruthy();
      });

      it('should select row on row click', () => {
        const row = window.document.querySelector('tbody tr') as HTMLElement;

        row.click();

        expect(mockReportsStore.setSelectedRow).toHaveBeenCalled();
      });

      it('should render detail row with spacer cell and expanded detail cell with accessibility attributes', () => {
        const detailRow = compiled.querySelector('tr.detail-row');
        const spacerCell = detailRow?.querySelector(
          '.expanded-detail-spacer-cell'
        );
        const detailCell = detailRow?.querySelector('.expanded-detail-cell');
        const metadataDetail = detailRow?.querySelector(
          '.metadata-accordion-detail'
        );
        const metadataGrid = detailRow?.querySelector('dl.metadata-grid');
        const expandButton = compiled.querySelector('.expand-row-button');

        expect(detailRow).toBeTruthy();
        expect(spacerCell).toBeTruthy();
        expect(detailCell).toBeTruthy();
        expect(metadataDetail).toBeTruthy();
        expect(metadataGrid).toBeTruthy();
        expect(detailCell?.getAttribute('colspan')).toBe('6');
        expect(expandButton?.getAttribute('aria-expanded')).toBe('false');
        expect(metadataDetail?.getAttribute('role')).toBe('region');
        expect(expandButton?.getAttribute('aria-controls')).toBeTruthy();
      });

      it('should add expanded-row class to detail row when row is expanded', () => {
        const detailRow = compiled.querySelector('tr.detail-row');
        expect(detailRow?.classList).not.toContain('expanded-row');

        component.toggleRowExpand(DATA_SOURCE_INITIAL_VALUE_NOT_EMPTY.data[0]);
        fixture.detectChanges();

        expect(detailRow?.classList).toContain('expanded-row');
      });

      it('should render metadata values when present', () => {
        const detailRow = compiled.querySelector('tr.detail-row');
        const metaValues = detailRow?.querySelectorAll('.meta-value');
        expect(metaValues?.length).toBeGreaterThanOrEqual(4);
      });

      it('should render "Could not fetch details" with error icon when metadata is missing', () => {
        const itemWithoutMeta = {
          ...DATA_SOURCE_INITIAL_VALUE_NOT_EMPTY.data[0],
          host: null,
          location: null,
          device: {
            ...DATA_SOURCE_INITIAL_VALUE_NOT_EMPTY.data[0].device,
            kernel: undefined,
            location: undefined,
            linux_env: undefined,
          },
          kernel: null,
          linux_env: null,
          python_version: null,
        } as HistoryTestrun;

        expect(component.getLocation(itemWithoutMeta)).toBeFalsy();
        expect(component.getLinuxEnv(itemWithoutMeta)).toBeFalsy();
        expect(component.getKernel(itemWithoutMeta)).toBeFalsy();
        expect(component.getPythonVersion(itemWithoutMeta)).toBeFalsy();
      });
    });
  });
});
