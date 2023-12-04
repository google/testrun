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

import { HistoryComponent } from './history.component';
import { TestRunService } from '../services/test-run.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HistoryModule } from './history.module';
import { of } from 'rxjs';
import { TestrunStatus } from '../model/testrun-status';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatDialogRef } from '@angular/material/dialog';
import { FilterDialogComponent } from '../components/filter-dialog/filter-dialog.component';
import { ElementRef } from '@angular/core';
import { FilterName, ReportFilters } from '../model/filters';
import SpyObj = jasmine.SpyObj;
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

const history = [
  {
    status: 'compliant',
    device: {
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:06',
      firmware: '1.2.2',
    },
    report: 'https://api.testrun.io/report.pdf',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
] as TestrunStatus[];

describe('HistoryComponent', () => {
  let component: HistoryComponent;
  let fixture: ComponentFixture<HistoryComponent>;
  let compiled: HTMLElement;
  let mockService: SpyObj<TestRunService>;
  let mockLiveAnnouncer: SpyObj<LiveAnnouncer>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj([
      'fetchHistory',
      'getHistory',
      'getResultClass',
    ]);
    mockLiveAnnouncer = jasmine.createSpyObj(['announce']);

    TestBed.configureTestingModule({
      imports: [HistoryModule, BrowserAnimationsModule],
      providers: [
        { provide: TestRunService, useValue: mockService },
        { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
      ],
      declarations: [HistoryComponent],
    });
    fixture = TestBed.createComponent(HistoryComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
  });

  describe('Class tests', () => {
    beforeEach(() => {
      mockService.getHistory.and.returnValue(
        new BehaviorSubject<TestrunStatus[] | null>(history)
      );
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should set dataSource data', () => {
      component.ngOnInit();

      expect(component.dataSource.data).toBeTruthy();
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

      const result = component.getFormattedDateString(history[0].started);

      expect(result).toEqual(expectedResult);
    });

    it('#getFormattedDateString should return empty string if no date', () => {
      const expectedResult = '';

      const result = component.getFormattedDateString(null);

      expect(result).toEqual(expectedResult);
    });

    it('#getDuration should return dates duration in minutes and seconds', () => {
      const expectedResult = '06m 10s';

      const result = component.getDuration(
        history[0].started,
        history[0].finished
      );

      expect(result).toEqual(expectedResult);
    });

    it('#getDuration should return empty string if any of dates are not provided', () => {
      const expectedResult = '';

      const result = component.getDuration(history[0].started, null);

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

      component.openFilter(event, '');

      expect(openSpy).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalledWith(FilterDialogComponent, {
        ariaLabel: 'Filters dialog',
        data: {
          filter: '',
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

      const mockFilteredData = {
        results: ['compliant'],
        deviceInfo: 'mockDevice',
        deviceFirmware: 'mockFirmware',
        dateRange: {
          start: 'Wed Jun 21 2023 00:00:00',
          end: 'Thu Jun 22 2023 00:00:00',
        },
      };

      spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(mockFilteredData),
      } as MatDialogRef<typeof FilterDialogComponent>);
      fixture.detectChanges();

      component.openFilter(event, FilterName.Started);
      component.openFilter(event, FilterName.Results);
      component.openFilter(event, FilterName.DeviceFirmware);
      component.openFilter(event, FilterName.DeviceInfo);
      expect(component.filteredValues as ReportFilters).toEqual(
        mockFilteredData
      );
    });
  });

  describe('DOM tests', () => {
    describe('data is not fetched', () => {
      beforeEach(() => {
        mockService.getHistory.and.returnValue(
          new BehaviorSubject<TestrunStatus[] | null>(null)
        );
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
        mockService.getHistory.and.returnValue(
          new BehaviorSubject<TestrunStatus[] | null>([])
        );
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
        mockService.getHistory.and.returnValue(
          new BehaviorSubject<TestrunStatus[] | null>(history)
        );
        mockService.getResultClass.and.returnValue({
          green: false,
          red: true,
          blue: false,
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
        const statusResultEl = compiled.querySelector(
          '.table-cell-result-text'
        );

        expect(statusResultEl?.classList).toContain('red');
      });

      it('should have report link', () => {
        const link = compiled.querySelector(
          '.download-report-link'
        ) as HTMLAnchorElement;

        expect(link.href).toEqual('https://api.testrun.io/report.pdf');
        expect(link.download).toEqual(
          'delta_03-din-src_1.2.2_compliant_23_jun_2023_10:11'
        );
        expect(link.title).toEqual(
          'Download report for Test Run # Delta 03-DIN-SRC 1.2.2 23 Jun 2023 10:11'
        );
      });

      it('should have filter ships', () => {
        const chips = compiled.querySelector('app-filter-chips');

        expect(chips).toBeTruthy();
      });
    });
  });
});
