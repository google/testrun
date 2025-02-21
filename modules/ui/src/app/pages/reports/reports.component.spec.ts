/*
/!**
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
 *!/
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
import { MatSort } from '@angular/material/sort';
import { DATA_SOURCE_INITIAL_VALUE, ReportsStore } from './reports.store';
import {
  DATA_SOURCE_FOR_EMPTY_FILTERS,
  DATA_SOURCE_INITIAL_VALUE_NOT_EMPTY,
  HISTORY,
} from '../../mocks/reports.mock';
import { MatTableDataSource } from '@angular/material/table';
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
      },
      dataLoaded: dataLoaded,
      selectedRow: null,
      isFiltersEmpty: true,
      profiles: [],
    });
  };
  beforeEach(() => {
    mockService = jasmine.createSpyObj(['getResultClass']);
    mockReportsStore = jasmine.createSpyObj('ReportsStore', [
      'deleteReport',
      'setSelectedRow',
      'setFilteredValues',
      'setFilteredValuesDateRange',
      'setFilteredValuesDeviceFirmware',
      'setFilteredValuesDeviceInfo',
      'setFilteredValuesResults',
      'setActiveFiler',
      'setFilterOpened',
      'updateSort',
      'getHistory',
      'getReports',
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
      it('should update sort', fakeAsync(() => {
        const sort = new MatSort();
        component.sort = sort;
        component.ngOnInit();

        expect(mockReportsStore.updateSort).toHaveBeenCalledWith(sort);
      }));

      it('should get reports', fakeAsync(() => {
        component.ngOnInit();

        expect(mockReportsStore.getReports).toHaveBeenCalled();
      }));
    });

    it('#sortData should call update sort', () => {
      component.sortData({ active: '', direction: 'desc' });

      expect(mockReportsStore.updateSort).toHaveBeenCalled();
    });

    it('#sortData should call liveAnnouncer with sorted direction message', () => {
      component.sortData({ active: '', direction: 'desc' });

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
        const nextButton = window.document.querySelector(
          '.report-selected + tr a'
        ) as HTMLButtonElement;
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
      component.removeDevice(data);
      expect(mockReportsStore.deleteReport).toHaveBeenCalledWith({
        mac_addr: data.mac_addr,
        deviceMacAddr: data.device.mac_addr,
        started: data.started,
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
        const empty = compiled.querySelector('.results-content-empty');
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
    });
  });
});
*/
