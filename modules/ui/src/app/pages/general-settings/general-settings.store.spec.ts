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
  LOG_LEVELS,
  MONITORING_PERIOD,
  GeneralSettingsStore,
} from './general-settings.store';
import { TestRunService } from '../../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../../store/state';
import { skip, take } from 'rxjs';
import {
  selectAdapters,
  selectHasConnectionSettings,
  selectInterfaces,
  selectSystemConfig,
} from '../../store/selectors';
import { of } from 'rxjs/internal/observable/of';
import {
  fetchInterfaces,
  fetchSystemConfig,
  fetchSystemConfigSuccess,
} from '../../store/actions';
import { fetchInterfacesSuccess } from '../../store/actions';
import { FormBuilder, FormControl } from '@angular/forms';
import { FormKey } from '../../model/setting';
import {
  MOCK_ADAPTERS,
  MOCK_DEVICE_VALUE,
  MOCK_INTERFACE_VALUE,
  MOCK_INTERFACES,
  MOCK_LOG_VALUE,
  MOCK_PERIOD_VALUE,
  MOCK_SYSTEM_CONFIG_WITH_DATA,
  MOCK_SYSTEM_CONFIG_WITH_NO_DATA,
  MOCK_SYSTEM_CONFIG_WITH_SINGLE_PORT,
} from '../../mocks/settings.mock';

describe('GeneralSettingsStore', () => {
  let settingsStore: GeneralSettingsStore;
  let mockService: SpyObj<TestRunService>;
  let store: MockStore<AppState>;
  let fb: FormBuilder;

  beforeEach(() => {
    mockService = jasmine.createSpyObj(['createSystemConfig']);

    TestBed.configureTestingModule({
      providers: [
        GeneralSettingsStore,
        { provide: TestRunService, useValue: mockService },
        provideMockStore({
          selectors: [
            { selector: selectHasConnectionSettings, value: true },
            { selector: selectAdapters, value: {} },
            { selector: selectInterfaces, value: {} },
            { selector: selectSystemConfig, value: { network: {} } },
          ],
        }),
        FormBuilder,
      ],
    });

    settingsStore = TestBed.inject(GeneralSettingsStore);
    store = TestBed.inject(MockStore);
    fb = TestBed.inject(FormBuilder);
    spyOn(store, 'dispatch').and.callFake(() => {});
  });

  it('should be created', () => {
    expect(settingsStore).toBeTruthy();
  });

  describe('updaters', () => {
    it('should update isSubmitting', (done: DoneFn) => {
      settingsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.isSubmitting).toEqual(true);
        done();
      });

      settingsStore.setIsSubmitting(true);
    });

    it('should update interfaces', (done: DoneFn) => {
      settingsStore.viewModel$.pipe(skip(2), take(1)).subscribe(store => {
        expect(store.deviceOptions).toEqual(MOCK_INTERFACES);
        expect(store.internetOptions).toEqual({
          mockDeviceKey: 'mockDeviceValue',
          mockInternetKey: 'mockInternetValue',
        });
        done();
      });

      settingsStore.setInterfaces(MOCK_INTERFACES);
    });
  });

  describe('selectors', () => {
    it('should select state', done => {
      settingsStore.viewModel$.pipe(take(1)).subscribe(store => {
        expect(store).toEqual({
          systemConfig: { network: {} },
          hasConnectionSettings: true,
          isSubmitting: false,
          isLessThanOneInterface: false,
          interfaces: {},
          deviceOptions: {},
          internetOptions: {},
          logLevelOptions: LOG_LEVELS,
          monitoringPeriodOptions: MONITORING_PERIOD,
        });
        done();
      });
    });
  });

  describe('effects', () => {
    describe('getSystemConfig', () => {
      it('should dispatch action fetchSystemConfig', () => {
        settingsStore.getSystemConfig();

        expect(store.dispatch).toHaveBeenCalledWith(fetchSystemConfig());
      });
    });

    describe('getInterfaces', () => {
      it('should dispatch action fetchInterfacesSuccess', () => {
        settingsStore.getInterfaces();

        expect(store.dispatch).toHaveBeenCalledWith(fetchInterfaces());
      });
    });

    describe('updateSystemConfig', () => {
      beforeEach(() => {
        mockService.createSystemConfig.and.returnValue(of({ network: {} }));
      });

      it('should dispatch action fetchSystemConfigSuccess', () => {
        settingsStore.updateSystemConfig(
          of({
            onSystemConfigUpdate: () => {},
            config: { network: {} },
          })
        );

        expect(store.dispatch).toHaveBeenCalledWith(
          fetchSystemConfigSuccess({ systemConfig: { network: {} } })
        );
      });

      it('should call onSystemConfigUpdate', () => {
        const effectParams = {
          onSystemConfigUpdate: () => {},
          config: { network: {} },
        };
        const spyOnSystemConfigUpdate = spyOn(
          effectParams,
          'onSystemConfigUpdate'
        );

        settingsStore.updateSystemConfig(of(effectParams));
        expect(spyOnSystemConfigUpdate).toHaveBeenCalled();
      });
    });

    describe('setDefaultFormValues', () => {
      describe('when values are present', () => {
        beforeEach(() => {
          store.overrideSelector(selectInterfaces, MOCK_INTERFACES);
          store.overrideSelector(
            selectSystemConfig,
            MOCK_SYSTEM_CONFIG_WITH_DATA
          );
          store.refreshState();
        });

        it('should set default form values', () => {
          const form = fb.group({
            device_intf: ['value'],
            internet_intf: ['value'],
            log_level: ['value'],
            monitor_period: ['value'],
          });
          settingsStore.setDefaultFormValues(form);

          expect((form.get(FormKey.DEVICE) as FormControl).value).toEqual(
            MOCK_DEVICE_VALUE
          );
          expect((form.get(FormKey.INTERNET) as FormControl).value).toEqual(
            MOCK_INTERFACE_VALUE
          );
          expect((form.get(FormKey.LOG_LEVEL) as FormControl).value).toEqual(
            MOCK_LOG_VALUE
          );
          expect(
            (form.get(FormKey.MONITOR_PERIOD) as FormControl).value
          ).toEqual(MOCK_PERIOD_VALUE);
        });
      });

      describe('with single port mode', () => {
        beforeEach(() => {
          store.overrideSelector(selectInterfaces, MOCK_INTERFACES);
          store.overrideSelector(
            selectSystemConfig,
            MOCK_SYSTEM_CONFIG_WITH_SINGLE_PORT
          );
          store.refreshState();
        });

        it('should disable internet control', () => {
          const form = fb.group({
            device_intf: ['value'],
            internet_intf: [''],
            log_level: [''],
            monitor_period: ['value'],
          });
          settingsStore.setDefaultFormValues(form);

          expect(
            (form.get(FormKey.INTERNET) as FormControl).disabled
          ).toBeTrue();
        });
      });

      describe('when values are empty', () => {
        beforeEach(() => {
          store.overrideSelector(selectInterfaces, MOCK_INTERFACES);
          store.overrideSelector(
            selectSystemConfig,
            MOCK_SYSTEM_CONFIG_WITH_NO_DATA
          );
          store.refreshState();
        });

        it('should set default form values', () => {
          const form = fb.group({
            device_intf: ['value'],
            internet_intf: ['value'],
            log_level: [''],
            monitor_period: [''],
          });
          settingsStore.setDefaultFormValues(form);

          expect((form.get(FormKey.DEVICE) as FormControl).value).toEqual({
            key: '',
            value: undefined,
          });
          expect((form.get(FormKey.INTERNET) as FormControl).value).toEqual({
            key: '',
            value: undefined,
          });
          expect((form.get(FormKey.LOG_LEVEL) as FormControl).value).toEqual({
            key: 'INFO',
            value: 'Normal events and issues',
          });
          expect(
            (form.get(FormKey.MONITOR_PERIOD) as FormControl).value
          ).toEqual({
            key: '300',
            value: 'Optimal',
          });
        });
      });
    });

    describe('adaptersUpdate', () => {
      const updateInterfaces = {
        mockDeviceKey: 'mockDeviceValue',
        mockNewInternetKey: 'mockNewInternetValue',
      };
      const updateInternetOptions = {
        mockDeviceKey: 'mockDeviceValue',
        mockNewInternetKey: 'mockNewInternetValue',
      };

      beforeEach(() => {
        settingsStore.setInterfaces(MOCK_INTERFACES);
        store.overrideSelector(selectInterfaces, MOCK_INTERFACES);
        store.refreshState();
      });

      it('should update store', done => {
        settingsStore.viewModel$
          .pipe(skip(2), take(1))
          .subscribe(storeValue => {
            expect(storeValue.deviceOptions).toEqual(updateInterfaces);
            expect(storeValue.internetOptions).toEqual(updateInternetOptions);

            expect(store.dispatch).toHaveBeenCalledWith(
              fetchInterfacesSuccess({ interfaces: updateInterfaces })
            );
            done();
          });

        store.overrideSelector(selectAdapters, MOCK_ADAPTERS);
        store.refreshState();
      });
    });
  });
});
