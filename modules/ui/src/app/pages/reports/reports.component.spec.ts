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
import { FilterName, FilterTitle, Filters } from '../../model/filters';
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
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { Breakpoints } from '@angular/cdk/layout';
import { HistoryTestrun } from '../../model/testrun-status';
import { SCREEN_SIZE_PAGE_SIZES } from './reports.component';

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
        assessmentType: '',
        results: ['compliant'],
        dateRange: '',
        quickSearch: [],
        location: '',
        linuxEnv: '',
        pythonVersion: '',
        kernel: '',
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
      'setFilteredValuesAssessmentType',
      'setFilteredValuesQuickSearch',
      'setFilteredValuesResults',
      'setFilteredValuesLocation',
      'setFilteredValuesLinuxEnv',
      'setFilteredValuesPythonVersion',
      'setFilteredValuesKernel',
      'setActiveFiler',
      'setFilterOpened',
      'updateSort',
      'updatePaginator',
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

      it('should update paginator if paginator viewChild is available', () => {
        const mockPaginator = {
          pageIndex: 0,
          pageSize: 10,
        } as unknown as MatPaginator;
        spyOn(component, 'paginator').and.returnValue(mockPaginator);

        component.ngOnInit();

        expect(mockReportsStore.updatePaginator).toHaveBeenCalledWith(
          mockPaginator
        );
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
          menuRect: undefined,
          itemRect: undefined,
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
      const mockFilterAssessmentType = 'mockAssessmentType';
      const mockFilterDateRange = {
        start: 'Wed Jun 21 2023 00:00:00',
        end: 'Thu Jun 22 2023 00:00:00',
      };
      const mockFilterLocation = 'mockLocation';
      const mockFilterLinuxEnv = 'mockLinuxEnv';
      const mockFilterPythonVersion = 'mockPythonVersion';
      const mockFilterKernel = 'mockKernel';

      const mockFilteredData = {
        results: mockFilterResults,
        deviceInfo: mockFilterDeviceInfo,
        deviceFirmware: mockFilterDeviceFirmware,
        assessmentType: mockFilterAssessmentType,
        dateRange: mockFilterDateRange,
        location: mockFilterLocation,
        linuxEnv: mockFilterLinuxEnv,
        pythonVersion: mockFilterPythonVersion,
        kernel: mockFilterKernel,
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
      component.openFilter({
        event,
        filter: FilterName.AssessmentType,
        title: FilterTitle.AssessmentType,
        filterOpened: false,
      });
      component.openFilter({
        event,
        filter: FilterName.Location,
        title: FilterTitle.Location,
        filterOpened: false,
      });
      component.openFilter({
        event,
        filter: FilterName.LinuxEnv,
        title: FilterTitle.LinuxEnv,
        filterOpened: false,
      });
      component.openFilter({
        event,
        filter: FilterName.PythonVersion,
        title: FilterTitle.PythonVersion,
        filterOpened: false,
      });
      component.openFilter({
        event,
        filter: FilterName.Kernel,
        title: FilterTitle.Kernel,
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
      expect(
        mockReportsStore.setFilteredValuesAssessmentType
      ).toHaveBeenCalledWith(mockFilterAssessmentType);
      expect(mockReportsStore.setFilteredValuesDateRange).toHaveBeenCalledWith(
        mockFilterDateRange
      );
      expect(mockReportsStore.setFilteredValuesLocation).toHaveBeenCalledWith(
        mockFilterLocation
      );
      expect(mockReportsStore.setFilteredValuesLinuxEnv).toHaveBeenCalledWith(
        mockFilterLinuxEnv
      );
      expect(
        mockReportsStore.setFilteredValuesPythonVersion
      ).toHaveBeenCalledWith(mockFilterPythonVersion);
      expect(mockReportsStore.setFilteredValuesKernel).toHaveBeenCalledWith(
        mockFilterKernel
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

      it('onSearchQueryChanged should update searchQuery and call applySearchQuery', () => {
        component.onSearchQueryChanged('newQuery');

        expect(component.searchQuery).toBe('newQuery');
        expect(
          mockReportsStore.setFilteredValuesQuickSearch
        ).toHaveBeenCalledWith('newQuery');
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
        const item = {
          ...FORMATTED_HISTORY[0],
          started: '2023-06-23T10:11:00',
          deviceInfo: 'Raspberry Pi / 4',
        };
        const id = component.getRowId(item);
        expect(id).toBe('2023-06-23T10_11_00-Raspberry_Pi___4');
      });
    });

    describe('filterCleared', () => {
      it('should update searchQuery and call store.setFilteredValues', () => {
        const filters: Filters = {
          deviceInfo: '',
          deviceFirmware: '',
          assessmentType: '',
          results: [],
          dateRange: '',
          quickSearch: ['searchKeyword'],
          location: '',
          linuxEnv: '',
          pythonVersion: '',
          kernel: '',
        };

        component.filterCleared(filters);

        expect(component.searchQuery).toBe('searchKeyword');
        expect(mockReportsStore.setFilteredValues).toHaveBeenCalledWith(
          filters
        );
      });

      it('should fallback to empty searchQuery if quickSearch is missing in filters', () => {
        const filters = {
          deviceInfo: '',
          deviceFirmware: '',
          results: [],
          dateRange: '',
        };

        component.filterCleared(filters as unknown as Filters);

        expect(component.searchQuery).toBe('');
        expect(mockReportsStore.setFilteredValues).toHaveBeenCalledWith(
          filters as unknown as Filters
        );
      });
    });

    describe('selectRow and trackByStarted', () => {
      it('selectRow should call store.setSelectedRow', () => {
        const row = {} as HistoryTestrun;
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
      it('should return location from host object', () => {
        expect(component.getLocation(HISTORY[0])).toBe(
          'Data Center Alpha - Rack 12, Bay B'
        );

        const itemWithoutHost = {
          ...HISTORY[0],
          host: null,
        } as HistoryTestrun;
        expect(component.getLocation(itemWithoutHost)).toBeUndefined();
      });

      it('should return linux_env from host object', () => {
        expect(component.getLinuxEnv(HISTORY[0])).toBe(
          'Ubuntu 24.04 LTS (x86_64)'
        );

        const itemWithoutHost = {
          ...HISTORY[0],
          host: null,
        } as HistoryTestrun;
        expect(component.getLinuxEnv(itemWithoutHost)).toBeUndefined();
      });

      it('should return kernel from device object', () => {
        expect(component.getKernel(HISTORY[0])).toBe('Linux 6.8.0-40-generic');

        const itemWithoutDevice = {
          ...HISTORY[0],
          device: null,
        } as unknown as HistoryTestrun;
        expect(component.getKernel(itemWithoutDevice)).toBeUndefined();
      });

      it('should return python_version from host object', () => {
        expect(component.getPythonVersion(HISTORY[0])).toBe('3.11.2');

        const itemWithoutHost = {
          ...HISTORY[0],
          host: null,
        } as HistoryTestrun;
        expect(component.getPythonVersion(itemWithoutHost)).toBeUndefined();
      });
    });

    describe('Pagination and Responsive Page Size', () => {
      it('should calculate page size based on width breakpoints', () => {
        const mockMatched = (query: string): boolean =>
          query === Breakpoints.XSmall;
        expect(component.calculatePageSizeFromQueries(mockMatched)).toBe(
          SCREEN_SIZE_PAGE_SIZES.XSmall
        );

        const mockSmall = (query: string): boolean =>
          query === Breakpoints.Small;
        expect(component.calculatePageSizeFromQueries(mockSmall)).toBe(
          SCREEN_SIZE_PAGE_SIZES.Small
        );

        const mockMedium = (query: string): boolean =>
          query === Breakpoints.Medium;
        expect(component.calculatePageSizeFromQueries(mockMedium)).toBe(
          SCREEN_SIZE_PAGE_SIZES.Medium
        );

        const mockLarge = (query: string): boolean =>
          query === Breakpoints.Large;
        expect(component.calculatePageSizeFromQueries(mockLarge)).toBe(
          SCREEN_SIZE_PAGE_SIZES.Large
        );

        const mockXLarge = (query: string): boolean =>
          query === Breakpoints.XLarge;
        expect(component.calculatePageSizeFromQueries(mockXLarge)).toBe(
          SCREEN_SIZE_PAGE_SIZES.XLarge
        );
      });

      it('should adjust page size based on screen height', () => {
        const matchLarge = (query: string): boolean =>
          query === Breakpoints.Large;

        expect(component.calculatePageSizeFromQueries(matchLarge, 500)).toBe(3);
        expect(component.calculatePageSizeFromQueries(matchLarge, 700)).toBe(5);
        expect(component.calculatePageSizeFromQueries(matchLarge, 850)).toBe(8);
        expect(component.calculatePageSizeFromQueries(matchLarge, 1000)).toBe(
          11
        );
        expect(component.calculatePageSizeFromQueries(matchLarge, 1200)).toBe(
          14
        );
      });

      it('should calculate page size based on container height when available', () => {
        const matchLarge = (query: string): boolean =>
          query === Breakpoints.Large;

        expect(
          component.calculatePageSizeFromQueries(matchLarge, 950, 622)
        ).toBe(9);
        expect(
          component.calculatePageSizeFromQueries(matchLarge, 1200, 746)
        ).toBe(12);
        expect(
          component.calculatePageSizeFromQueries(matchLarge, 600, 300)
        ).toBe(3);
      });

      it('should return larger size on extra large screen with large height', () => {
        const matchXLarge = (query: string): boolean =>
          query === Breakpoints.XLarge;
        expect(component.calculatePageSizeFromQueries(matchXLarge, 1200)).toBe(
          15
        );
      });

      it('#updatePageSize should update pageSize and call _changePageSize on paginator', () => {
        const mockPaginator = {
          pageSize: 10,
          _changePageSize: jasmine.createSpy('_changePageSize'),
        } as unknown as MatPaginator;
        spyOn(component, 'paginator').and.returnValue(mockPaginator);

        component.updatePageSize(20);

        expect(component.pageSize).toBe(20);
        expect(mockPaginator.pageSize).toBe(20);
        expect(
          (mockPaginator as unknown as { _changePageSize: jasmine.Spy })
            ._changePageSize
        ).toHaveBeenCalledWith(20);
      });

      it('#onPageChange should announce results range and page', () => {
        const pageEvent: PageEvent = {
          pageIndex: 0,
          pageSize: 10,
          length: 485,
        };

        component.onPageChange(pageEvent);

        expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
          'Showing results 1 to 10 of 485, page 1 of 49',
          'polite'
        );
      });

      it('#onPageChange should announce "No results found" when length is 0', () => {
        const pageEvent: PageEvent = {
          pageIndex: 0,
          pageSize: 10,
          length: 0,
        };

        component.onPageChange(pageEvent);

        expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
          'No results found',
          'polite'
        );
      });

      it('#onPageChange should update pageSize and prevent automatic resize override when user selects page size', () => {
        const pageEvent: PageEvent = {
          pageIndex: 0,
          pageSize: 25,
          length: 100,
        };

        component.onPageChange(pageEvent);

        expect(component.pageSize).toBe(25);

        // evaluateScreenSize should not override user-selected page size
        component.evaluateScreenSize();
        expect(component.pageSize).toBe(25);
      });

      it('#onWindowResize should invoke evaluateScreenSize', () => {
        spyOn(component, 'evaluateScreenSize');
        component.onWindowResize();
        expect(component.evaluateScreenSize).toHaveBeenCalled();
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

      it('should have search component', () => {
        const search = compiled.querySelector('app-search');

        expect(search).toBeTruthy();
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

      it('should render mat-paginator with accessible attributes', () => {
        const paginator = compiled.querySelector('mat-paginator');
        expect(paginator).toBeTruthy();
        expect(paginator?.getAttribute('aria-label')).toBe(
          'Select page of reports'
        );
      });

      it('should hide page size dropdown on mat-paginator', () => {
        const paginator = component.paginator();
        expect(paginator?.hidePageSize).toBeTrue();
        const pageSizeContainer = compiled.querySelector(
          '.mat-mdc-paginator-page-size'
        );
        expect(pageSizeContainer).toBeNull();
      });

      it('should hide paginator when there is no data', () => {
        const emptyDataSource = new MatTableDataSource<HistoryTestrun>([]);
        component.viewModel$ = getViewModel(emptyDataSource, true);
        fixture.detectChanges();

        const paginator = compiled.querySelector('mat-paginator');
        expect(paginator?.classList).toContain('hidden');
      });

      it('should paginate items when results exceed page size', () => {
        const manyItems: HistoryTestrun[] = Array.from(
          { length: 25 },
          (_, i) => ({
            ...FORMATTED_HISTORY[0],
            started: `2023-06-${(i + 1).toString().padStart(2, '0')}T10:11:00.123Z`,
            deviceInfo: `Device ${i + 1}`,
          })
        );
        const manyDataSource = new MatTableDataSource<HistoryTestrun>(
          manyItems
        );
        component.viewModel$ = getViewModel(manyDataSource, true);
        component.pageSize = 10;
        fixture.detectChanges();

        const paginator = component.paginator();
        if (paginator) {
          manyDataSource.paginator = paginator;
          fixture.detectChanges();
        }

        const renderedRows = compiled.querySelectorAll(
          'tbody tr:not(.detail-row)'
        );
        expect(renderedRows.length).toBe(10);
      });
    });
  });
});
