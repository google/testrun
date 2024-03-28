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
import { throwError } from 'rxjs/internal/observable/throwError';
import { of } from 'rxjs/internal/observable/of';
import { DATA_SOURCE_INITIAL_VALUE, ReportsStore } from './reports.store';
import {
  EMPTY_FILTERS,
  FILTERS,
  FORMATTED_HISTORY,
  HISTORY,
  HISTORY_AFTER_REMOVE,
} from '../../mocks/reports.mock';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatRow } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';

describe('ReportsStore', () => {
  let reportsStore: ReportsStore;
  let mockService: SpyObj<TestRunService>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj(['getHistory', 'deleteReport']);

    TestBed.configureTestingModule({
      providers: [
        ReportsStore,
        { provide: TestRunService, useValue: mockService },
        DatePipe,
      ],
    });

    reportsStore = TestBed.inject(ReportsStore);
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
      reportsStore.viewModel$.pipe(skip(2), take(1)).subscribe(store => {
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
          dataSource: DATA_SOURCE_INITIAL_VALUE,
          filterOpened: false,
          activeFilter: '',
          filteredValues: {
            deviceInfo: '',
            deviceFirmware: '',
            results: [],
            dateRange: '',
          },
          dataLoaded: false,
          selectedRow: null,
          isFiltersEmpty: true,
        });
        done();
      });
    });
  });

  describe('effects', () => {
    describe('getHistory', () => {
      describe('should update store', () => {
        it('with empty value if error happens', done => {
          mockService.getHistory.and.returnValue(
            throwError(
              new HttpErrorResponse({ error: { error: 'error' }, status: 500 })
            )
          );

          reportsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
            expect(store.dataSource.data).toEqual([]);
            done();
          });

          reportsStore.getHistory();
        });

        it('with value if not null', done => {
          mockService.getHistory.and.returnValue(of([...HISTORY]));

          reportsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
            expect(store.dataSource.data).toEqual(FORMATTED_HISTORY);
            done();
          });

          reportsStore.getHistory();
        });
      });
    });

    describe('deleteReport', () => {
      it('should update store', done => {
        mockService.deleteReport.and.returnValue(of(true));
        reportsStore.setHistory([...HISTORY]);

        reportsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
          expect(store.dataSource.data).toEqual(HISTORY_AFTER_REMOVE);
          done();
        });

        reportsStore.deleteReport({
          mac_addr: '00:1e:42:35:73:c4',
          started: '2023-06-22T10:11:00.123Z',
        });
      });
    });

    describe('updateSort', () => {
      it('should update store', done => {
        const sort = new MatSort();
        reportsStore.setHistory([...HISTORY]);

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
        reportsStore.setHistory([...HISTORY]);
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
        reportsStore.setHistory([...HISTORY]);
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
        reportsStore.setHistory([...HISTORY]);
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
        reportsStore.setHistory([...HISTORY]);
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
        reportsStore.setHistory([...HISTORY]);
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
