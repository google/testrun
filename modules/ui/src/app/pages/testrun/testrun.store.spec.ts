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
import {
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../../store/state';
import { skip, take, of } from 'rxjs';
import {
  selectHasConnectionSettings,
  selectHasDevices,
  selectIsOpenStartTestrun,
  selectIsOpenWaitSnackBar,
  selectIsStopTestrun,
  selectIsTestrunStarted,
  selectSystemStatus,
} from '../../store/selectors';
import {
  setIsOpenStartTestrun,
  setIsTestrunStarted,
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
  TEST_DATA_RESULT_WITH_RECOMMENDATIONS,
  TEST_DATA_TABLE_RESULT,
} from '../../mocks/progress.mock';
import { LoaderService } from '../../services/loader.service';
import { NotificationService } from '../../services/notification.service';

describe('TestrunStore', () => {
  let testrunStore: TestrunStore;
  let mockService: SpyObj<TestRunService>;
  let store: MockStore<AppState>;
  const loaderServiceMock: jasmine.SpyObj<LoaderService> = jasmine.createSpyObj(
    'loaderServiceMock',
    ['setLoading', 'getLoading']
  );
  const notificationServiceMock: jasmine.SpyObj<NotificationService> =
    jasmine.createSpyObj('NotificationService', [
      'dismissWithTimout',
      'openSnackBar',
    ]);

  beforeEach(() => {
    mockService = jasmine.createSpyObj('mockService', [
      'stopTestrun',
      'fetchSystemStatus',
    ]);

    TestBed.configureTestingModule({
      providers: [
        TestrunStore,
        { provide: TestRunService, useValue: mockService },
        { provide: LoaderService, useValue: loaderServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        provideMockStore({
          selectors: [
            { selector: selectHasDevices, value: false },
            { selector: selectSystemStatus, value: null },
            { selector: selectIsTestrunStarted, value: true },
            { selector: selectHasConnectionSettings, value: true },
            { selector: selectIsOpenStartTestrun, value: false },
            { selector: selectIsOpenWaitSnackBar, value: false },
            { selector: selectIsStopTestrun, value: false },
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
          systemStatus: null,
          dataSource: undefined,
          stepsToResolveCount: 0,
          isCancelling: false,
          startInterval: false,
        });
        done();
      });
    });
  });

  describe('updaters', () => {
    it('should update dataSource and stepsToResolveCount', (done: DoneFn) => {
      const dataSource = [...TEST_DATA_RESULT_WITH_RECOMMENDATIONS];

      testrunStore.viewModel$.pipe(skip(2), take(1)).subscribe(store => {
        expect(store.dataSource).toEqual(dataSource);
        expect(store.stepsToResolveCount).toEqual(1);
        done();
      });

      testrunStore.setDataSource(dataSource);
    });

    it('should update isCancelling', (done: DoneFn) => {
      testrunStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.isCancelling).toEqual(true);
        done();
      });

      testrunStore.updateCancelling(true);
    });

    it('should update startInterval', (done: DoneFn) => {
      testrunStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.startInterval).toEqual(true);
        done();
      });

      testrunStore.updateStartInterval(true);
    });
  });

  describe('effects', () => {
    describe('getStatus', () => {
      beforeEach(() => {
        testrunStore.updateStartInterval(true);
        mockService.fetchSystemStatus.and.returnValue(
          of({ ...MOCK_PROGRESS_DATA_MONITORING })
        );
      });

      it('should dispatch action setTestrunStatus', () => {
        testrunStore.getStatus();

        expect(store.dispatch).toHaveBeenCalledWith(
          setTestrunStatus({
            systemStatus: { ...MOCK_PROGRESS_DATA_MONITORING },
          })
        );
      });

      it('should change status to Cancelling if cancelling', () => {
        testrunStore.updateCancelling(true);
        testrunStore.getStatus();

        expect(store.dispatch).toHaveBeenCalledWith(
          setTestrunStatus({ systemStatus: MOCK_PROGRESS_DATA_CANCELLING })
        );
      });

      describe('pullingSystemStatusData with available status "In Progress"', () => {
        beforeEach(() => {
          mockService.fetchSystemStatus.and.returnValue(
            of({ ...MOCK_PROGRESS_DATA_IN_PROGRESS })
          );
          mockService.fetchSystemStatus.calls.reset();
        });

        it('should call again getSystemStatus', fakeAsync(() => {
          testrunStore.updateStartInterval(false);
          testrunStore.updateCancelling(false);
          store.overrideSelector(
            selectSystemStatus,
            MOCK_PROGRESS_DATA_IN_PROGRESS
          );

          testrunStore.getStatus();
          expect(mockService.fetchSystemStatus).toHaveBeenCalled();

          tick(5000);

          expect(mockService.fetchSystemStatus).toHaveBeenCalledTimes(2);
          discardPeriodicTasks();
        }));
      });

      describe('dataSource', () => {
        it('should set value with empty values if result length < total for status "In Progress"', done => {
          const expectedResult = TEST_DATA_TABLE_RESULT;

          mockService.fetchSystemStatus.and.returnValue(
            of(MOCK_PROGRESS_DATA_IN_PROGRESS)
          );
          testrunStore.getStatus();

          testrunStore.viewModel$.pipe(take(1)).subscribe(store => {
            expect(store.dataSource).toEqual(expectedResult);
            done();
          });
        });

        it('should set value with empty values for status "Monitoring"', done => {
          const expectedResult = EMPTY_RESULT;

          mockService.fetchSystemStatus.and.returnValue(
            of(MOCK_PROGRESS_DATA_MONITORING)
          );
          testrunStore.getStatus();

          testrunStore.viewModel$.pipe(take(1)).subscribe(store => {
            expect(store.dataSource).toEqual(expectedResult);
            done();
          });
        });

        it('should set value with empty values for status "Waiting for Device"', done => {
          const expectedResult = EMPTY_RESULT;

          mockService.fetchSystemStatus.and.returnValue(
            of(MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE)
          );
          testrunStore.getStatus();

          testrunStore.viewModel$.pipe(take(1)).subscribe(store => {
            expect(store.dataSource).toEqual(expectedResult);
            done();
          });
        });

        it('should set value with empty values for status "Cancelled" and empty result', done => {
          const expectedResult = EMPTY_RESULT;

          mockService.fetchSystemStatus.and.returnValue(
            of(MOCK_PROGRESS_DATA_CANCELLED_EMPTY)
          );
          testrunStore.getStatus();

          testrunStore.viewModel$.pipe(take(1)).subscribe(store => {
            expect(store.dataSource).toEqual(expectedResult);
            done();
          });
        });

        describe('hideLoading', () => {
          it('should called if testrun is finished', () => {
            mockService.fetchSystemStatus.and.returnValue(
              of(MOCK_PROGRESS_DATA_COMPLIANT)
            );
            testrunStore.getStatus();

            expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(false);
          });

          it('should called if testrun is in progress and have some test finished', () => {
            mockService.fetchSystemStatus.and.returnValue(
              of(MOCK_PROGRESS_DATA_IN_PROGRESS)
            );
            testrunStore.getStatus();

            expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(false);
          });
        });

        describe('showLoading', () => {
          it('should be called if testrun is monitoring', () => {
            mockService.fetchSystemStatus.and.returnValue(
              of(MOCK_PROGRESS_DATA_MONITORING)
            );
            testrunStore.getStatus();

            expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);
          });

          it('should be called if testrun is in progress and have some test finished', () => {
            mockService.fetchSystemStatus.and.returnValue(
              of(MOCK_PROGRESS_DATA_IN_PROGRESS_EMPTY)
            );
            testrunStore.getStatus();

            expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);
          });
        });
      });
    });

    describe('stopTestrun', () => {
      beforeEach(() => {
        mockService.stopTestrun.and.returnValue(of(true));
      });

      it('should call stopTestrun', () => {
        testrunStore.stopTestrun();

        expect(mockService.stopTestrun).toHaveBeenCalled();
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

    describe('setIsTestrunStarted', () => {
      it('should dispatch action setIsTestrunStarted', () => {
        testrunStore.setIsTestrunStarted(true);

        expect(store.dispatch).toHaveBeenCalledWith(
          setIsTestrunStarted({ isTestrunStarted: true })
        );
      });
    });

    describe('setCancellingStatus', () => {
      it('should update state', done => {
        testrunStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
          expect(store.isCancelling).toEqual(true);
          done();
        });
        testrunStore.setCancellingStatus();
      });
    });
  });
});
