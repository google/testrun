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
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of, skip, take } from 'rxjs';
import { AppStore, CONSENT_SHOWN_KEY } from './app.store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from './store/state';
import {
  selectError,
  selectHasConnectionSettings,
  selectHasDevices,
  selectHasRiskProfiles,
  selectInterfaces,
  selectIsOpenWaitSnackBar,
  selectMenuOpened,
  selectReports,
  selectStatus,
  selectTestModules,
} from './store/selectors';
import { TestRunService } from './services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { device, MOCK_MODULES, MOCK_TEST_MODULES } from './mocks/device.mock';
import {
  fetchReports,
  fetchRiskProfiles,
  fetchSystemStatus,
  setDevices,
  updateAdapters,
  setTestModules,
} from './store/actions';
import { MOCK_PROGRESS_DATA_IN_PROGRESS } from './mocks/testrun.mock';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NotificationService } from './services/notification.service';
import { FocusManagerService } from './services/focus-manager.service';
import { TestRunMqttService } from './services/test-run-mqtt.service';
import { MOCK_ADAPTERS } from './mocks/settings.mock';

const mock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: string) => {
      store[key] = value + '';
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'sessionStorage', {
  value: mock,
  writable: true,
});
describe('AppStore', () => {
  let appStore: AppStore;
  let store: MockStore<AppState>;
  let mockService: SpyObj<TestRunService>;
  let mockNotificationService: SpyObj<NotificationService>;
  let mockFocusManagerService: SpyObj<FocusManagerService>;
  let mockMqttService: SpyObj<TestRunMqttService>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj('mockService', [
      'fetchDevices',
      'getTestModules',
    ]);
    mockNotificationService = jasmine.createSpyObj('mockNotificationService', [
      'notify',
    ]);
    mockFocusManagerService = jasmine.createSpyObj([
      'focusFirstElementInContainer',
    ]);
    mockMqttService = jasmine.createSpyObj([
      'getNetworkAdapters',
      'getInternetConnection',
    ]);

    TestBed.configureTestingModule({
      providers: [
        AppStore,
        provideMockStore({
          selectors: [
            { selector: selectStatus, value: null },
            { selector: selectIsOpenWaitSnackBar, value: false },
            { selector: selectTestModules, value: MOCK_TEST_MODULES },
          ],
        }),
        { provide: TestRunService, useValue: mockService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: FocusManagerService, useValue: mockFocusManagerService },
        { provide: TestRunMqttService, useValue: mockMqttService },
      ],
      imports: [BrowserAnimationsModule],
    });

    store = TestBed.inject(MockStore);
    appStore = TestBed.inject(AppStore);

    store.overrideSelector(selectHasDevices, true);
    store.overrideSelector(selectHasRiskProfiles, false);
    store.overrideSelector(selectReports, []);
    store.overrideSelector(selectHasConnectionSettings, true);
    store.overrideSelector(selectMenuOpened, true);
    store.overrideSelector(selectInterfaces, {});
    store.overrideSelector(selectError, null);
    store.overrideSelector(selectStatus, null);

    spyOn(store, 'dispatch').and.callFake(() => {});
  });

  afterEach(() => {
    mock.clear();
  });

  it('should be created', () => {
    expect(appStore).toBeTruthy();
  });

  describe('updaters', () => {
    it('should update updateConsent', (done: DoneFn) => {
      appStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.consentShown).toEqual(true);
        done();
      });

      appStore.updateConsent(true);
    });

    it('should update isStatusLoaded', (done: DoneFn) => {
      appStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.isStatusLoaded).toEqual(true);
        done();
      });

      appStore.updateIsStatusLoaded(true);
    });
  });

  describe('selectors', () => {
    it('should select state', done => {
      appStore.viewModel$.pipe(take(1)).subscribe(store => {
        expect(store).toEqual({
          consentShown: false,
          hasDevices: true,
          hasRiskProfiles: false,
          reports: [],
          isStatusLoaded: false,
          systemStatus: null,
          hasConnectionSettings: true,
          isMenuOpen: true,
          interfaces: {},
          settingMissedError: null,
          hasInternetConnection: null,
        });
        done();
      });
    });
  });

  describe('effects', () => {
    describe('setContent', () => {
      it('should update store', done => {
        appStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
          expect(store.consentShown).toEqual(true);
          done();
        });

        appStore.setContent();
      });

      it('should update store', () => {
        appStore.setContent();

        expect(mock.getItem(CONSENT_SHOWN_KEY)).toBeTruthy();
      });
    });

    describe('fetchDevices', () => {
      const devices = [device];

      beforeEach(() => {
        mockService.fetchDevices.and.returnValue(of(devices));
      });

      it('should dispatch action setDevices', () => {
        appStore.getDevices();

        expect(store.dispatch).toHaveBeenCalledWith(setDevices({ devices }));
      });
    });

    describe('fetchProfiles', () => {
      it('should dispatch action fetchRiskProfiles', () => {
        appStore.getRiskProfiles();

        expect(store.dispatch).toHaveBeenCalledWith(fetchRiskProfiles());
      });
    });

    describe('getSystemStatus', () => {
      it('should dispatch fetchSystemStatus', () => {
        appStore.getSystemStatus();

        expect(store.dispatch).toHaveBeenCalledWith(fetchSystemStatus());
      });
    });

    describe('statusLoaded', () => {
      it('should update store', done => {
        appStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
          expect(store.isStatusLoaded).toEqual(true);
          done();
        });

        store.overrideSelector(
          selectStatus,
          MOCK_PROGRESS_DATA_IN_PROGRESS.status
        );
        store.refreshState();
      });
    });

    describe('setFocusOnPage', () => {
      it('should call focusFirstElementInContainer', fakeAsync(() => {
        appStore.setFocusOnPage();

        tick(101);

        expect(
          mockFocusManagerService.focusFirstElementInContainer
        ).toHaveBeenCalled();
      }));
    });

    describe('getReports', () => {
      it('should dispatch fetchReports', () => {
        appStore.getReports();

        expect(store.dispatch).toHaveBeenCalledWith(fetchReports());
      });
    });

    describe('getTestModules', () => {
      const modules = [...MOCK_MODULES];

      beforeEach(() => {
        mockService.getTestModules.and.returnValue(of(modules));
      });

      it('should dispatch action setDevices', () => {
        appStore.getTestModules();

        expect(store.dispatch).toHaveBeenCalledWith(
          setTestModules({
            testModules: [
              {
                displayName: 'Connection',
                name: 'connection',
                enabled: true,
              },
              {
                displayName: 'Udmi',
                name: 'udmi',
                enabled: true,
              },
            ],
          })
        );
      });
    });

    describe('getNetworkAdapters', () => {
      const adapters = MOCK_ADAPTERS;

      beforeEach(() => {
        mockMqttService.getNetworkAdapters.and.returnValue(of(adapters));
      });

      it('should dispatch action setDevices', () => {
        appStore.getNetworkAdapters();

        expect(store.dispatch).toHaveBeenCalledWith(
          updateAdapters({ adapters })
        );
      });

      it('should notify about new adapters', () => {
        appStore.getNetworkAdapters();

        expect(mockNotificationService.notify).toHaveBeenCalledWith(
          'New network adapter(s) mockNewInternetKey has been detected. You can switch to using it in the System settings menu'
        );
      });
    });

    describe('getInternetConnection', () => {
      it('should update store', done => {
        mockMqttService.getInternetConnection.and.returnValue(
          of({ connection: false })
        );
        appStore.getInternetConnection();

        appStore.viewModel$.pipe(take(1)).subscribe(store => {
          expect(store.hasInternetConnection).toEqual(false);
          done();
        });
      });
    });
  });
});
