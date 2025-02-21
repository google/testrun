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
import {
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of } from 'rxjs';
import { AppEffects } from './effects';
import { TestRunService } from '../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { Action } from '@ngrx/store';
import * as actions from './actions';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from './state';
import { selectIsOpenWaitSnackBar, selectSystemStatus } from './selectors';
import { device, expired_device } from '../mocks/device.mock';
import {
  MOCK_PROGRESS_DATA_CANCELLING,
  MOCK_PROGRESS_DATA_COMPLIANT,
  MOCK_PROGRESS_DATA_IN_PROGRESS,
  MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE,
} from '../mocks/testrun.mock';
import {
  fetchSystemStatus,
  fetchSystemStatusSuccess,
  setReports,
  setStatus,
  setTestrunStatus,
} from './actions';
import { NotificationService } from '../services/notification.service';
import { PROFILE_MOCK } from '../mocks/profile.mock';
import { throwError } from 'rxjs/internal/observable/throwError';
import { HttpErrorResponse } from '@angular/common/http';
import { IDLE_STATUS } from '../model/testrun-status';
import { HISTORY } from '../mocks/reports.mock';
import { TestRunMqttService } from '../services/test-run-mqtt.service';

describe('Effects', () => {
  let actions$ = new Observable<Action>();
  let effects: AppEffects;
  let testRunServiceMock: SpyObj<TestRunService>;
  let store: MockStore<AppState>;
  let dispatchSpy: jasmine.Spy;
  const notificationServiceMock: jasmine.SpyObj<NotificationService> =
    jasmine.createSpyObj('notificationServiceMock', [
      'dismissWithTimout',
      'openSnackBar',
    ]);
  const mockMqttService: jasmine.SpyObj<TestRunMqttService> =
    jasmine.createSpyObj('mockMqttService', [
      'getStatus',
      'getInternetConnection',
    ]);

  beforeEach(() => {
    testRunServiceMock = jasmine.createSpyObj('testRunServiceMock', [
      'getSystemInterfaces',
      'getSystemConfig',
      'createSystemConfig',
      'fetchSystemStatus',
      'testrunInProgress',
      'stopTestrun',
      'fetchProfiles',
      'getHistory',
    ]);
    testRunServiceMock.getSystemInterfaces.and.returnValue(of({}));
    testRunServiceMock.getSystemConfig.and.returnValue(of({ network: {} }));
    testRunServiceMock.createSystemConfig.and.returnValue(of({ network: {} }));
    testRunServiceMock.fetchSystemStatus.and.returnValue(
      of(MOCK_PROGRESS_DATA_IN_PROGRESS)
    );
    testRunServiceMock.fetchProfiles.and.returnValue(of([]));
    testRunServiceMock.getHistory.and.returnValue(of([]));
    mockMqttService.getInternetConnection.and.returnValue(
      of({ connection: false })
    );

    mockMqttService.getStatus.and.returnValue(
      of(MOCK_PROGRESS_DATA_IN_PROGRESS)
    );

    TestBed.configureTestingModule({
      providers: [
        AppEffects,
        { provide: TestRunService, useValue: testRunServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: TestRunMqttService, useValue: mockMqttService },
        provideMockActions(() => actions$),
        provideMockStore({}),
      ],
    });

    store = TestBed.inject(MockStore);
    effects = TestBed.inject(AppEffects);

    dispatchSpy = spyOn(store, 'dispatch');
    store.refreshState();
  });

  afterEach(() => {
    dispatchSpy.calls.reset();
  });

  it('onSetDevices$ should call setDeviceInProgress when testrun in progress', done => {
    testRunServiceMock.testrunInProgress.and.returnValue(true);
    const status = MOCK_PROGRESS_DATA_IN_PROGRESS;
    actions$ = of(actions.setTestrunStatus({ systemStatus: status }));

    effects.onSetTestrunStatus$.subscribe(action => {
      expect(action).toEqual(
        actions.setDeviceInProgress({ device: status.device })
      );
      done();
    });
  });

  it('onSetTestrunStatus$ should setDeviceInProgress when testrun cancelling', done => {
    testRunServiceMock.testrunInProgress.and.returnValue(false);
    const status = MOCK_PROGRESS_DATA_CANCELLING;
    actions$ = of(actions.setTestrunStatus({ systemStatus: status }));

    effects.onSetTestrunStatus$.subscribe(action => {
      expect(action).toEqual(
        actions.setDeviceInProgress({ device: status.device })
      );
      done();
    });
  });

  it('onSetDevices$ should call setHasDevices', done => {
    actions$ = of(actions.setDevices({ devices: [device] }));

    effects.onSetDevices$.subscribe(action => {
      expect(action).toEqual(actions.setHasDevices({ hasDevices: true }));
      done();
    });
  });

  it('onSetExpiredDevices$ should call setHasExpiredDevices', done => {
    actions$ = of(actions.setDevices({ devices: [device, expired_device] }));

    effects.onSetExpiredDevices$.subscribe(action => {
      expect(action).toEqual(
        actions.setHasExpiredDevices({ hasExpiredDevices: true })
      );
      done();
    });
  });

  it('onSetIsAllDevicesOutdated$ should call setIsAllDevicesOutdated', done => {
    actions$ = of(
      actions.setDevices({ devices: [expired_device, expired_device] })
    );

    effects.onSetIsAllDevicesOutdated$.subscribe(action => {
      expect(action).toEqual(
        actions.setIsAllDevicesOutdated({ isAllDevicesOutdated: true })
      );
      done();
    });
  });

  it('onSetRiskProfiles$ should call setHasRiskProfiles', done => {
    actions$ = of(actions.setRiskProfiles({ riskProfiles: [PROFILE_MOCK] }));

    effects.onSetRiskProfiles$.subscribe(action => {
      expect(action).toEqual(
        actions.setHasRiskProfiles({ hasRiskProfiles: true })
      );
      done();
    });
  });

  describe('onFetchSystemConfigSuccess$', () => {
    it('should dispatch setHasConnectionSettings with true if device_intf is present', done => {
      actions$ = of(
        actions.fetchSystemConfigSuccess({
          systemConfig: { network: { device_intf: 'intf' } },
        })
      );

      effects.onFetchSystemConfigSuccess$.subscribe(action => {
        expect(action).toEqual(
          actions.setHasConnectionSettings({ hasConnectionSettings: true })
        );
        done();
      });
    });

    it('should dispatch setHasConnectionSettings with false if device_intf is not present', done => {
      actions$ = of(
        actions.fetchSystemConfigSuccess({
          systemConfig: { network: { device_intf: '' } },
        })
      );

      effects.onFetchSystemConfigSuccess$.subscribe(action => {
        expect(action).toEqual(
          actions.setHasConnectionSettings({ hasConnectionSettings: false })
        );
        done();
      });
    });
  });

  it('onFetchSystemStatus$ should call onFetchSystemStatusSuccess on success', done => {
    actions$ = of(actions.fetchSystemStatus());

    effects.onFetchSystemStatus$.subscribe(action => {
      expect(action).toEqual(
        actions.fetchSystemStatusSuccess({
          systemStatus: MOCK_PROGRESS_DATA_IN_PROGRESS,
        })
      );
      done();
    });
  });

  describe('onFetchSystemStatusSuccess$', () => {
    beforeEach(() => {
      store.overrideSelector(selectIsOpenWaitSnackBar, false);
      store.overrideSelector(selectSystemStatus, null);
    });

    describe('with status "in progress"', () => {
      beforeEach(() => {
        store.overrideSelector(selectSystemStatus, null);
        testRunServiceMock.testrunInProgress.and.returnValue(true);
        actions$ = of(
          actions.fetchSystemStatusSuccess({
            systemStatus: MOCK_PROGRESS_DATA_IN_PROGRESS,
          })
        );
      });

      it('should call fetchSystemStatus for status "in progress"', () => {
        effects.onFetchSystemStatusSuccess$.subscribe(() => {
          expect(dispatchSpy).toHaveBeenCalledWith(
            fetchSystemStatusSuccess({
              systemStatus: MOCK_PROGRESS_DATA_IN_PROGRESS,
            })
          );
        });
      });

      it('should dispatch status and systemStatus', done => {
        effects.onFetchSystemStatusSuccess$.subscribe(() => {
          expect(dispatchSpy).toHaveBeenCalledWith(
            setStatus({ status: MOCK_PROGRESS_DATA_IN_PROGRESS.status })
          );

          expect(dispatchSpy).toHaveBeenCalledWith(
            setTestrunStatus({ systemStatus: MOCK_PROGRESS_DATA_IN_PROGRESS })
          );
          dispatchSpy.calls.reset();
          done();
        });
      });

      it('should dispatch status and systemStatus', done => {
        store.overrideSelector(selectIsOpenWaitSnackBar, true);
        store.refreshState();

        effects.onFetchSystemStatusSuccess$.subscribe(() => {
          expect(dispatchSpy).toHaveBeenCalledWith(
            setStatus({ status: MOCK_PROGRESS_DATA_IN_PROGRESS.status })
          );

          expect(notificationServiceMock.dismissWithTimout).toHaveBeenCalled();
          done();
        });
      });

      it('should call fetchInternetConnection for status "in progress"', () => {
        effects.onFetchSystemStatusSuccess$.subscribe(() => {
          expect(mockMqttService.getInternetConnection).toHaveBeenCalled();
        });
      });
    });

    describe('with status "waiting for device"', () => {
      beforeEach(() => {
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE
        );
        testRunServiceMock.testrunInProgress.and.returnValue(true);
        actions$ = of(
          actions.fetchSystemStatusSuccess({
            systemStatus: MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE,
          })
        );
      });

      it('should call fetchSystemStatus for status "waiting for device"', () => {
        effects.onFetchSystemStatusSuccess$.subscribe(() => {
          expect(dispatchSpy).toHaveBeenCalledWith(
            fetchSystemStatusSuccess({
              systemStatus: MOCK_PROGRESS_DATA_IN_PROGRESS,
            })
          );
        });
      });

      it('should open snackbar when waiting for device is too long', fakeAsync(() => {
        effects.onFetchSystemStatusSuccess$.subscribe(() => {
          tick(60000);

          expect(notificationServiceMock.openSnackBar).toHaveBeenCalled();
          discardPeriodicTasks();
        });
      }));
    });
  });

  describe('onStopTestrun$ should call stopTestrun', () => {
    beforeEach(() => {
      testRunServiceMock.stopTestrun.and.returnValue(of(true));
    });

    it('should call stopTestrun', done => {
      actions$ = of(actions.setIsStopTestrun());

      effects.onStopTestrun$.subscribe(() => {
        expect(testRunServiceMock.stopTestrun).toHaveBeenCalled();
        expect(dispatchSpy).toHaveBeenCalledWith(fetchSystemStatus());
        done();
      });
    });
  });

  it('onFetchSystemStatus$ should call onFetchSystemStatusSuccess on success', done => {
    actions$ = of(actions.fetchRiskProfiles());

    effects.onFetchRiskProfiles$.subscribe(action => {
      expect(action).toEqual(
        actions.setRiskProfiles({
          riskProfiles: [],
        })
      );
      done();
    });
  });

  describe('onFetchReports$', () => {
    it(' should call setReports on success', done => {
      testRunServiceMock.getHistory.and.returnValue(of([]));
      actions$ = of(actions.fetchReports());

      effects.onFetchReports$.subscribe(action => {
        expect(action).toEqual(
          actions.setReports({
            reports: [],
          })
        );
        done();
      });
    });

    it('should call setReports with empty array if null is returned', done => {
      testRunServiceMock.getHistory.and.returnValue(of(null));
      actions$ = of(actions.fetchReports());

      effects.onFetchReports$.subscribe(action => {
        expect(action).toEqual(
          actions.setReports({
            reports: [],
          })
        );
        done();
      });
    });

    it('should call setReports with empty array if error happens', done => {
      testRunServiceMock.getHistory.and.returnValue(
        throwError(
          new HttpErrorResponse({ error: { error: 'error' }, status: 500 })
        )
      );
      actions$ = of(actions.fetchReports());

      effects.onFetchReports$.subscribe({
        complete: () => {
          expect(dispatchSpy).toHaveBeenCalledWith(
            setReports({
              reports: [],
            })
          );
          done();
        },
      });
    });
  });

  describe('checkStatusInReports$', () => {
    it('should call setTestrunStatus if current test run is completed and not present in reports', done => {
      store.overrideSelector(
        selectSystemStatus,
        Object.assign({}, MOCK_PROGRESS_DATA_COMPLIANT, {
          mac_addr: '01:02:03:04:05:07',
          report: 'http://localhost:8000/report/1234 1234/2024-07-17T15:33:40',
        })
      );
      actions$ = of(
        actions.setReports({
          reports: HISTORY,
        })
      );

      effects.checkStatusInReports$.subscribe(action => {
        expect(action).toEqual(
          actions.fetchSystemStatusSuccess({ systemStatus: IDLE_STATUS })
        );
        done();
      });
    });
  });

  it('onFetchInterfaces$ should call fetchInterfacesSuccess on success', done => {
    actions$ = of(actions.fetchInterfaces());

    effects.onFetchInterfaces$.subscribe(action => {
      expect(action).toEqual(
        actions.fetchInterfacesSuccess({
          interfaces: {},
        })
      );
      done();
    });
  });

  it('onFetchSystemConfig$ should call fetchSystemConfigSuccess on success', done => {
    actions$ = of(actions.fetchSystemConfig());

    effects.onFetchSystemConfig$.subscribe(action => {
      expect(action).toEqual(
        actions.fetchSystemConfigSuccess({
          systemConfig: { network: {} },
        })
      );
      done();
    });
  });
});
