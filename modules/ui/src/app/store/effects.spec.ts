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
import { selectMenuOpened, selectSystemStatus } from './selectors';
import { device } from '../mocks/device.mock';
import { MOCK_PROGRESS_DATA_IN_PROGRESS } from '../mocks/progress.mock';
import { fetchSystemStatus, setStatus, setTestrunStatus } from './actions';
describe('Effects', () => {
  let actions$ = new Observable<Action>();
  let effects: AppEffects;
  let testRunServiceMock: SpyObj<TestRunService>;
  let store: MockStore<AppState>;
  let dispatchSpy: jasmine.Spy;
  beforeEach(() => {
    testRunServiceMock = jasmine.createSpyObj('testRunServiceMock', [
      'getSystemInterfaces',
      'getSystemConfig',
      'createSystemConfig',
      'fetchSystemStatus',
      'testrunInProgress',
    ]);
    testRunServiceMock.getSystemInterfaces.and.returnValue(of({}));
    testRunServiceMock.getSystemConfig.and.returnValue(of({}));
    testRunServiceMock.createSystemConfig.and.returnValue(of({}));
    testRunServiceMock.fetchSystemStatus.and.returnValue(
      of(MOCK_PROGRESS_DATA_IN_PROGRESS)
    );
    TestBed.configureTestingModule({
      providers: [
        AppEffects,
        { provide: TestRunService, useValue: testRunServiceMock },
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

  it('onSetDevices$ should call setHasDevices', done => {
    actions$ = of(actions.setDevices({ devices: [device] }));

    effects.onSetDevices$.subscribe(action => {
      expect(action).toEqual(actions.setHasDevices({ hasDevices: true }));
      done();
    });
  });

  it('onMenuOpened$ should call updateFocusNavigation', done => {
    actions$ = of(actions.toggleMenu());
    store.overrideSelector(selectMenuOpened, true);

    effects.onMenuOpened$.subscribe(action => {
      expect(action).toEqual(
        actions.updateFocusNavigation({ focusNavigation: true })
      );
      done();
    });
  });

  describe('onValidateInterfaces$', () => {
    it('should call updateError and set false if interfaces are not missed', done => {
      actions$ = of(
        actions.updateValidInterfaces({
          validInterfaces: {
            hasSetInterfaces: false,
            deviceValid: false,
            internetValid: false,
          },
        })
      );

      effects.onValidateInterfaces$.subscribe(action => {
        expect(action).toEqual(
          actions.updateError({
            settingMissedError: {
              isSettingMissed: false,
              devicePortMissed: false,
              internetPortMissed: false,
            },
          })
        );
        done();
      });
    });

    it('should call updateError and set true if interfaces are missed', done => {
      actions$ = of(
        actions.updateValidInterfaces({
          validInterfaces: {
            hasSetInterfaces: true,
            deviceValid: false,
            internetValid: false,
          },
        })
      );

      effects.onValidateInterfaces$.subscribe(action => {
        expect(action).toEqual(
          actions.updateError({
            settingMissedError: {
              isSettingMissed: true,
              devicePortMissed: true,
              internetPortMissed: true,
            },
          })
        );
        done();
      });
    });
  });

  describe('checkInterfacesInConfig$', () => {
    it('should call updateValidInterfaces and set deviceValid as false if device interface is no longer available', done => {
      actions$ = of(
        actions.fetchInterfacesSuccess({
          interfaces: {
            enx00e04c020fa8: '00:e0:4c:02:0f:a8',
            enx207bd26205e9: '20:7b:d2:62:05:e9',
          },
        }),
        actions.fetchSystemConfigSuccess({
          systemConfig: {
            network: {
              device_intf: 'enx00e04c020fa2',
              internet_intf: 'enx207bd26205e9',
            },
          },
        })
      );

      effects.checkInterfacesInConfig$.subscribe(action => {
        expect(action).toEqual(
          actions.updateValidInterfaces({
            validInterfaces: {
              hasSetInterfaces: true,
              deviceValid: false,
              internetValid: true,
            },
          })
        );
        done();
      });
    });

    it('should call updateValidInterfaces and set all true if interface is set and valid', done => {
      actions$ = of(
        actions.fetchInterfacesSuccess({
          interfaces: {
            enx00e04c020fa8: '00:e0:4c:02:0f:a8',
            enx207bd26205e9: '20:7b:d2:62:05:e9',
          },
        }),
        actions.fetchSystemConfigSuccess({
          systemConfig: {
            network: {
              device_intf: 'enx00e04c020fa8',
              internet_intf: 'enx207bd26205e9',
            },
          },
        })
      );

      effects.checkInterfacesInConfig$.subscribe(action => {
        expect(action).toEqual(
          actions.updateValidInterfaces({
            validInterfaces: {
              hasSetInterfaces: true,
              deviceValid: true,
              internetValid: true,
            },
          })
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

      it('should call fetchSystemStatus for status "in progress"', fakeAsync(() => {
        effects.onFetchSystemStatusSuccess$.subscribe(() => {
          tick(5000);

          expect(dispatchSpy).toHaveBeenCalledWith(fetchSystemStatus());
          discardPeriodicTasks();
        });
      }));

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
    });
  });
});
