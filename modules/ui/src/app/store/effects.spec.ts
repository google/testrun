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
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of } from 'rxjs';
import { AppEffects } from './effects';
import { TestRunService } from '../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { Action } from '@ngrx/store';
import * as actions from './actions';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from './state';
import { selectMenuOpened } from './selectors';
import { device } from '../mocks/device.mock';
describe('Effects', () => {
  let actions$ = new Observable<Action>();
  let effects: AppEffects;
  let testRunServiceMock: SpyObj<TestRunService>;
  let store: MockStore<AppState>;

  beforeEach(() => {
    testRunServiceMock = jasmine.createSpyObj([
      'getSystemInterfaces',
      'getSystemConfig',
      'createSystemConfig',
    ]);
    testRunServiceMock.getSystemInterfaces.and.returnValue(of({}));
    testRunServiceMock.getSystemConfig.and.returnValue(of({}));
    testRunServiceMock.createSystemConfig.and.returnValue(of({}));
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

    store.refreshState();
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
    it('should call updateError with false if interfaces are valid', done => {
      actions$ = of(actions.updateValidInterfaces({ validInterfaces: true }));

      effects.onValidateInterfaces$.subscribe(action => {
        expect(action).toEqual(actions.updateError({ error: false }));
        done();
      });
    });

    it('should call updateError with true if interfaces are not valid', done => {
      actions$ = of(actions.updateValidInterfaces({ validInterfaces: false }));

      effects.onValidateInterfaces$.subscribe(action => {
        expect(action).toEqual(actions.updateError({ error: true }));
        done();
      });
    });
  });

  describe('checkInterfacesInConfig$', () => {
    it('should call updateValidInterfaces with false if interface is no longer available', done => {
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
          actions.updateValidInterfaces({ validInterfaces: false })
        );
        done();
      });
    });

    it('should call updateValidInterfaces with true if interface is available', done => {
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
          actions.updateValidInterfaces({ validInterfaces: true })
        );
        done();
      });
    });
  });
});
