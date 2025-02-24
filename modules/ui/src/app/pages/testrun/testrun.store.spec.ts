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
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../../store/state';
import { skip, take } from 'rxjs';
import {
  selectHasConnectionSettings,
  selectHasDevices,
  selectIsAllDevicesOutdated,
  selectIsOpenStartTestrun,
  selectRiskProfiles,
  selectSystemStatus,
  selectTestModules,
} from '../../store/selectors';
import {
  fetchSystemStatus,
  fetchSystemStatusSuccess,
  setIsOpenStartTestrun,
  setIsStopTestrun,
  setTestrunStatus,
} from '../../store/actions';
import { TestrunStore } from './testrun.store';
import {
  EMPTY_RESULT,
  MOCK_PROGRESS_DATA_CANCELLED_EMPTY,
  MOCK_PROGRESS_DATA_CANCELLING,
  MOCK_PROGRESS_DATA_COMPLIANT,
  MOCK_PROGRESS_DATA_IN_PROGRESS,
  MOCK_PROGRESS_DATA_IN_PROGRESS_EMPTY,
  MOCK_PROGRESS_DATA_MONITORING,
  MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE,
  MOCK_PROGRESS_DATA_VALIDATING,
  TEST_DATA_RESULT_WITH_RECOMMENDATIONS,
  MOCK_PROGRESS_DATA_STARTING,
} from '../../mocks/testrun.mock';
import { LoaderService } from '../../services/loader.service';

describe('TestrunStore', () => {
  let testrunStore: TestrunStore;
  let store: MockStore<AppState>;
  const loaderServiceMock: jasmine.SpyObj<LoaderService> = jasmine.createSpyObj(
    'loaderServiceMock',
    ['setLoading', 'getLoading']
  );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TestrunStore,
        { provide: LoaderService, useValue: loaderServiceMock },
        provideMockStore({
          selectors: [
            { selector: selectHasDevices, value: false },
            { selector: selectIsAllDevicesOutdated, value: false },
            { selector: selectSystemStatus, value: null },
            { selector: selectHasConnectionSettings, value: true },
            { selector: selectIsOpenStartTestrun, value: false },
            { selector: selectRiskProfiles, value: [] },
            { selector: selectTestModules, value: [] },
          ],
        }),
      ],
    });

    testrunStore = TestBed.inject(TestrunStore);
    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch').and.callFake(() => {});
  });

  it('should be created', () => {
    expect(testrunStore).toBeTruthy();
  });

  describe('selectors', () => {
    it('should select state', done => {
      testrunStore.viewModel$.pipe(take(1)).subscribe(store => {
        expect(store).toEqual({
          hasDevices: false,
          isAllDevicesOutdated: false,
          systemStatus: null,
          dataSource: [],
          profiles: [],
          testModules: [],
        });
        done();
      });
    });
  });

  describe('updaters', () => {
    it('should update dataSource', (done: DoneFn) => {
      const dataSource = [...TEST_DATA_RESULT_WITH_RECOMMENDATIONS];

      testrunStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.dataSource).toEqual(dataSource);
        done();
      });

      testrunStore.setDataSource(dataSource);
    });
  });

  describe('effects', () => {
    describe('getSystemStatus', () => {
      it('should dispatch fetchSystemStatus', () => {
        testrunStore.getSystemStatus();

        expect(store.dispatch).toHaveBeenCalledWith(fetchSystemStatus());
      });
    });

    describe('getStatus', () => {
      describe('dataSource', () => {
        it('should set value with empty values for status "Monitoring"', done => {
          const expectedResult = EMPTY_RESULT;

          store.overrideSelector(
            selectSystemStatus,
            MOCK_PROGRESS_DATA_MONITORING
          );
          store.refreshState();

          testrunStore.viewModel$.pipe(take(1)).subscribe(store => {
            expect(store.dataSource).toEqual(expectedResult);
            done();
          });
        });

        it('should set value with empty values for status "Waiting for Device"', done => {
          const expectedResult = EMPTY_RESULT;

          store.overrideSelector(
            selectSystemStatus,
            MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE
          );
          store.refreshState();

          testrunStore.viewModel$.pipe(take(1)).subscribe(store => {
            expect(store.dataSource).toEqual(expectedResult);
            done();
          });
        });

        it('should set value with empty values for status "Validating Network"', done => {
          const expectedResult = EMPTY_RESULT;

          store.overrideSelector(
            selectSystemStatus,
            MOCK_PROGRESS_DATA_VALIDATING
          );
          store.refreshState();

          testrunStore.viewModel$.pipe(take(1)).subscribe(store => {
            expect(store.dataSource).toEqual(expectedResult);
            done();
          });
        });

        it('should set value with empty values for status "Starting"', done => {
          const expectedResult = EMPTY_RESULT;

          store.overrideSelector(
            selectSystemStatus,
            MOCK_PROGRESS_DATA_STARTING
          );
          store.refreshState();

          testrunStore.viewModel$.pipe(take(1)).subscribe(store => {
            expect(store.dataSource).toEqual(expectedResult);
            done();
          });
        });

        it('should set value with empty values for status "Cancelled" and empty result', done => {
          const expectedResult = EMPTY_RESULT;

          store.overrideSelector(
            selectSystemStatus,
            MOCK_PROGRESS_DATA_CANCELLED_EMPTY
          );
          store.refreshState();

          testrunStore.viewModel$.pipe(take(1)).subscribe(store => {
            expect(store.dataSource).toEqual(expectedResult);
            done();
          });
        });

        describe('hideLoading', () => {
          it('should called if testrun is finished', () => {
            store.overrideSelector(
              selectSystemStatus,
              MOCK_PROGRESS_DATA_COMPLIANT
            );
            store.refreshState();

            expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(false);
          });

          it('should called if testrun is in progress and have some test finished', () => {
            store.overrideSelector(
              selectSystemStatus,
              MOCK_PROGRESS_DATA_IN_PROGRESS
            );
            store.refreshState();

            expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(false);
          });
        });

        describe('showLoading', () => {
          it('should be called if testrun is monitoring', () => {
            store.overrideSelector(
              selectSystemStatus,
              MOCK_PROGRESS_DATA_MONITORING
            );
            store.refreshState();

            expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);
          });

          it('should be called if testrun is in progress and have some test finished', () => {
            store.overrideSelector(
              selectSystemStatus,
              MOCK_PROGRESS_DATA_IN_PROGRESS_EMPTY
            );
            store.refreshState();

            expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);
          });
        });
      });
    });

    describe('stopTestrun', () => {
      it('should dispatch stopTestrun', () => {
        testrunStore.stopTestrun();

        expect(store.dispatch).toHaveBeenCalledWith(setIsStopTestrun());
      });
    });

    describe('setIsOpenStartTestrun', () => {
      it('should dispatch action setIsOpenStartTestrun', () => {
        testrunStore.setIsOpenStartTestrun(true);

        expect(store.dispatch).toHaveBeenCalledWith(
          setIsOpenStartTestrun({ isOpenStartTestrun: true })
        );
      });
    });

    describe('setCancellingStatus', () => {
      it('should dispatch setTestrunStatus', () => {
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_IN_PROGRESS
        );
        store.refreshState();

        testrunStore.setCancellingStatus();

        expect(store.dispatch).toHaveBeenCalledWith(
          setTestrunStatus({
            systemStatus: { ...MOCK_PROGRESS_DATA_CANCELLING },
          })
        );
      });
    });

    describe('setStatus', () => {
      it('should dispatch action fetchSystemStatusSuccess', () => {
        testrunStore.setStatus(MOCK_PROGRESS_DATA_IN_PROGRESS);

        expect(store.dispatch).toHaveBeenCalledWith(
          fetchSystemStatusSuccess({
            systemStatus: MOCK_PROGRESS_DATA_IN_PROGRESS,
          })
        );
      });
    });
  });
});
