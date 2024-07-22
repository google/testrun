/*
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

import { TestRunService } from '../../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { TestBed } from '@angular/core/testing';
import { skip, take } from 'rxjs';
import { of } from 'rxjs/internal/observable/of';
import { ReportsStore } from './reports.store';
import {
  EMPTY_FILTERS,
  FILTERS,
  FORMATTED_HISTORY,
  HISTORY,
  HISTORY_AFTER_REMOVE,
} from '../../mocks/reports.mock';
import { DatePipe } from '@angular/common';
import { MatRow } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { selectReports, selectRiskProfiles } from '../../store/selectors';
import { AppState } from '../../store/state';
import { setReports } from '../../store/actions';

describe('ReportsStore', () => {
  let reportsStore: ReportsStore;
  let mockService: SpyObj<TestRunService>;
  let store: MockStore<AppState>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj(['deleteReport']);

    TestBed.configureTestingModule({
      providers: [
        ReportsStore,
        { provide: TestRunService, useValue: mockService },
        provideMockStore({
          selectors: [
            { selector: selectRiskProfiles, value: [] },
            { selector: selectReports, value: [] },
          ],
        }),
        DatePipe,
      ],
    });

    reportsStore = TestBed.inject(ReportsStore);
    store = TestBed.inject(MockStore);

    spyOn(store, 'dispatch').and.callFake(() => {});
  });

  it('should be created', () => {
    expect(reportsStore).toBeTruthy();
  });

  describe('updaters', () => {
    it('should update activeFiler', (done: DoneFn) => {
      reportsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.activeFilter).toEqual('filter');
        done();
      });

      reportsStore.setActiveFiler('filter');
    });

    it('should update filterOpened', (done: DoneFn) => {
      reportsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.filterOpened).toEqual(true);
        done();
      });

      reportsStore.setFilterOpened(true);
    });

    it('should update isFiltersEmpty', (done: DoneFn) => {
      reportsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.isFiltersEmpty).toEqual(false);
        done();
      });

      reportsStore.setIsFiltersEmpty(false);
    });

    it('should update selectedRow', (done: DoneFn) => {
      const row = new MatRow();
      reportsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.selectedRow).toEqual(row);
        done();
      });

      reportsStore.setSelectedRow(row);
    });

    it('should update filteredValues', (done: DoneFn) => {
      const filters = { ...FILTERS };

      reportsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.filteredValues).toEqual(filters);
        done();
      });

      reportsStore.updateFilteredValues(filters);
    });

    it('should update dataSource', (done: DoneFn) => {
      reportsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.dataSource.data).toEqual(FORMATTED_HISTORY);
        expect(store.dataLoaded).toEqual(true);
        done();
      });

      reportsStore.setDataSource([...HISTORY]);
    });
  });

  describe('selectors', () => {
    it('should select state', done => {
      reportsStore.viewModel$.pipe(take(1)).subscribe(store => {
        expect(store).toEqual({
          displayedColumns: [
            'started',
            'duration',
            'deviceInfo',
            'deviceFirmware',
            'status',
            'report',
          ],
          chips: ['chips'],
          dataSource: store.dataSource,
          filterOpened: false,
          activeFilter: '',
          filteredValues: {
            deviceInfo: '',
            deviceFirmware: '',
            results: [],
            dateRange: '',
          },
          dataLoaded: true,
          selectedRow: null,
          isFiltersEmpty: true,
          profiles: [],
        });
        done();
      });
    });
  });

  describe('effects', () => {
    describe('getHistory', () => {
      it('should update store', done => {
        store.overrideSelector(selectReports, [...HISTORY]);
        store.refreshState();

        reportsStore.viewModel$.pipe(take(1)).subscribe(store => {
          expect(store.dataSource.data).toEqual(FORMATTED_HISTORY);
          done();
        });

        reportsStore.getHistory();
      });
    });

    describe('deleteReport', () => {
      it('should update store', done => {
        mockService.deleteReport.and.returnValue(of(true));
        store.overrideSelector(selectReports, [...HISTORY]);
        store.refreshState();

        reportsStore.deleteReport({
          mac_addr: '01:02:03:04:05:07',
          deviceMacAddr: '01:02:03:04:05:07',
          started: '2023-07-23T10:11:00.123Z',
        });

        expect(store.dispatch).toHaveBeenCalledWith(
          setReports({ reports: HISTORY_AFTER_REMOVE })
        );
        done();
      });

      it('should update store after remove with null mac_addr', done => {
        mockService.deleteReport.and.returnValue(of(true));
        store.overrideSelector(selectReports, [...HISTORY_AFTER_REMOVE]);
        store.refreshState();

        reportsStore.deleteReport({
          mac_addr: null,
          deviceMacAddr: '01:02:03:04:05:08',
          started: '2023-06-23T10:11:00.123Z',
        });

        expect(store.dispatch).toHaveBeenCalledWith(
          setReports({ reports: [HISTORY_AFTER_REMOVE[0]] })
        );
        done();
      });
    });

    describe('updateSort', () => {
      it('should update store', done => {
        const sort = new MatSort();
        store.overrideSelector(selectReports, [...HISTORY]);

        reportsStore.updateSort(sort);

        reportsStore.viewModel$.pipe(take(1)).subscribe(store => {
          expect(store.dataSource.sort).toEqual(sort);
          done();
        });
      });
    });

    describe('setFilteredValuesResults', () => {
      it('should update store', done => {
        const updatedFilters = { ...FILTERS, ...{ results: ['test2'] } };
        store.overrideSelector(selectReports, [...HISTORY]);
        reportsStore.setFilteredValues({ ...FILTERS });

        reportsStore.setFilteredValuesResults(['test2']);

        reportsStore.viewModel$.pipe(take(1)).subscribe(store => {
          expect(store.filteredValues).toEqual(updatedFilters);
          expect(store.dataSource.filter).toEqual(
            JSON.stringify(updatedFilters)
          );
          done();
        });
      });
    });

    describe('setFilteredValuesDeviceInfo', () => {
      it('should update store', done => {
        const updatedFilters = { ...FILTERS, ...{ deviceInfo: 'test2' } };
        store.overrideSelector(selectReports, [...HISTORY]);
        reportsStore.setFilteredValues({ ...FILTERS });

        reportsStore.setFilteredValuesDeviceInfo('test2');

        reportsStore.viewModel$.pipe(take(1)).subscribe(store => {
          expect(store.filteredValues).toEqual(updatedFilters);
          expect(store.dataSource.filter).toEqual(
            JSON.stringify(updatedFilters)
          );
          done();
        });
      });
    });

    describe('setFilteredValuesDeviceFirmware', () => {
      it('should update store', done => {
        const updatedFilters = { ...FILTERS, ...{ deviceFirmware: 'test2' } };
        store.overrideSelector(selectReports, [...HISTORY]);
        reportsStore.setFilteredValues({ ...FILTERS });

        reportsStore.setFilteredValuesDeviceFirmware('test2');

        reportsStore.viewModel$.pipe(take(1)).subscribe(store => {
          expect(store.filteredValues).toEqual(updatedFilters);
          expect(store.dataSource.filter).toEqual(
            JSON.stringify(updatedFilters)
          );
          done();
        });
      });
    });

    describe('setFilteredValuesDateRange', () => {
      it('should update store', done => {
        const updatedFilters = { ...FILTERS, ...{ dateRange: 'test2' } };
        store.overrideSelector(selectReports, [...HISTORY]);
        reportsStore.setFilteredValues({ ...FILTERS });

        reportsStore.setFilteredValuesDateRange('test2');

        reportsStore.viewModel$.pipe(take(1)).subscribe(store => {
          expect(store.filteredValues).toEqual(updatedFilters);
          expect(store.dataSource.filter).toEqual(
            JSON.stringify(updatedFilters)
          );
          done();
        });
      });
    });

    describe('setFilteredValues', () => {
      it('should update store', done => {
        const updatedFilters = { ...EMPTY_FILTERS };
        store.overrideSelector(selectReports, [...HISTORY]);
        reportsStore.setFilteredValues({ ...FILTERS });

        reportsStore.setFilteredValues(updatedFilters);

        reportsStore.viewModel$.pipe(take(1)).subscribe(store => {
          expect(store.filteredValues).toEqual(updatedFilters);
          expect(store.dataSource.filter).toEqual(
            JSON.stringify(updatedFilters)
          );
          done();
        });
      });
    });
  });
});
