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
  DEFAULT_INTERNET_OPTION,
  LOG_LEVELS,
  MONITORING_PERIOD,
  SettingsStore,
} from './settings.store';
import { TestRunService } from '../../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../../store/state';
import { skip, take } from 'rxjs';
import {
  selectAdapters,
  selectHasConnectionSettings,
} from '../../store/selectors';
import { of } from 'rxjs/internal/observable/of';
import { fetchSystemConfigSuccess } from '../../store/actions';
import { fetchInterfacesSuccess } from '../../store/actions';
import { FormBuilder, FormControl } from '@angular/forms';
import { FormKey, SystemConfig } from '../../model/setting';
import {
  MOCK_ADAPTERS,
  MOCK_DEVICE_VALUE,
  MOCK_INTERFACE_VALUE,
  MOCK_INTERFACES,
  MOCK_INTERNET_OPTIONS,
  MOCK_LOG_VALUE,
  MOCK_PERIOD_VALUE,
  MOCK_SYSTEM_CONFIG_WITH_DATA,
  MOCK_SYSTEM_CONFIG_WITH_NO_DATA,
} from '../../mocks/settings.mock';

describe('SettingsStore', () => {
  let settingsStore: SettingsStore;
  let mockService: SpyObj<TestRunService>;
  let store: MockStore<AppState>;
  let fb: FormBuilder;

  beforeEach(() => {
    mockService = jasmine.createSpyObj([
      'getSystemInterfaces',
      'createSystemConfig',
      'getSystemConfig',
    ]);

    TestBed.configureTestingModule({
      providers: [
        SettingsStore,
        { provide: TestRunService, useValue: mockService },
        provideMockStore({
          selectors: [
            { selector: selectHasConnectionSettings, value: true },
            { selector: selectAdapters, value: {} },
          ],
        }),
        FormBuilder,
      ],
    });

    settingsStore = TestBed.inject(SettingsStore);
    store = TestBed.inject(MockStore);
    fb = TestBed.inject(FormBuilder);
    spyOn(store, 'dispatch').and.callFake(() => {});
  });

  it('should be created', () => {
    expect(settingsStore).toBeTruthy();
  });

  describe('updaters', () => {
    describe('setSystemConfig', () => {
      it('should update systemConfig', (done: DoneFn) => {
        const config = {
          network: {
            device_intf: 'enx207bd2620617',
            internet_intf: 'enx207bd2620618',
          },
          log_level: 'INFO',
          startup_timeout: 60,
          monitor_period: 60,
          runtime: 120,
        } as SystemConfig;

        settingsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
          expect(store.systemConfig).toEqual(config);
          done();
        });

        settingsStore.setSystemConfig(config);
      });
    });

    it('should update isSubmitting', (done: DoneFn) => {
      settingsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.isSubmitting).toEqual(true);
        done();
      });

      settingsStore.setIsSubmitting(true);
    });

    it('should update interfaces', (done: DoneFn) => {
      settingsStore.viewModel$.pipe(skip(3), take(1)).subscribe(store => {
        expect(store.interfaces).toEqual(MOCK_INTERFACES);
        expect(store.deviceOptions).toEqual(MOCK_INTERFACES);
        expect(store.internetOptions).toEqual({
          '': 'Not specified',
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
      beforeEach(() => {
        mockService.getSystemConfig.and.returnValue(of({ network: {} }));
      });

      it('should dispatch action fetchSystemConfigSuccess', () => {
        settingsStore.getSystemConfig();

        expect(store.dispatch).toHaveBeenCalledWith(
          fetchSystemConfigSuccess({ systemConfig: { network: {} } })
        );
      });

      it('should update store', done => {
        settingsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
          expect(store.systemConfig).toEqual({ network: {} });
          done();
        });

        settingsStore.getSystemConfig();
      });
    });

    describe('getInterfaces', () => {
      const interfaces = MOCK_INTERFACES;

      beforeEach(() => {
        mockService.getSystemInterfaces.and.returnValue(of(interfaces));
      });

      it('should dispatch action fetchInterfacesSuccess', () => {
        settingsStore.getInterfaces();

        expect(store.dispatch).toHaveBeenCalledWith(
          fetchInterfacesSuccess({ interfaces })
        );
      });

      it('should update store', done => {
        settingsStore.viewModel$.pipe(skip(3), take(1)).subscribe(store => {
          expect(store.interfaces).toEqual(interfaces);
          expect(store.deviceOptions).toEqual(interfaces);
          expect(store.internetOptions).toEqual(MOCK_INTERNET_OPTIONS);
          done();
        });

        settingsStore.getInterfaces();
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

      it('should update store', done => {
        settingsStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
          expect(store.systemConfig).toEqual({ network: {} });
          done();
        });

        settingsStore.updateSystemConfig(
          of({
            onSystemConfigUpdate: () => {},
            config: { network: {} },
          })
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
          settingsStore.setSystemConfig(MOCK_SYSTEM_CONFIG_WITH_DATA);
          settingsStore.setInterfaces(MOCK_INTERFACES);
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

      describe('when values are empty', () => {
        beforeEach(() => {
          settingsStore.setSystemConfig(MOCK_SYSTEM_CONFIG_WITH_NO_DATA);
          settingsStore.setInterfaces(MOCK_INTERFACES);
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
            value: DEFAULT_INTERNET_OPTION[''],
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
        '': 'Not specified',
        mockDeviceKey: 'mockDeviceValue',
        mockNewInternetKey: 'mockNewInternetValue',
      };

      beforeEach(() => {
        settingsStore.setInterfaces(MOCK_INTERFACES);
      });

      it('should update store', done => {
        settingsStore.viewModel$
          .pipe(skip(3), take(1))
          .subscribe(storeValue => {
            expect(storeValue.interfaces).toEqual(updateInterfaces);
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
