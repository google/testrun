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

import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { TestRunService } from '../../services/test-run.service';
import {
  FormKey,
  SettingOption,
  SystemConfig,
  SystemInterfaces,
} from '../../model/setting';
import { exhaustMap, switchMap, Observable, skip } from 'rxjs';
import { tap, withLatestFrom } from 'rxjs/operators';
import * as AppActions from '../../store/actions';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/state';
import {
  selectAdapters,
  selectHasConnectionSettings,
  selectInterfaces,
  selectSystemConfig,
  selectSystemStatus,
} from '../../store/selectors';
import { FormControl, FormGroup } from '@angular/forms';
import { fetchInterfaces, fetchSystemConfig } from '../../store/actions';

export interface SettingsComponentState {
  hasConnectionSettings: boolean;
  isSubmitting: boolean;
  isLessThanOneInterface: boolean;
  deviceOptions: SystemInterfaces;
  internetOptions: SystemInterfaces;
  logLevelOptions: { [key: string]: string };
  monitoringPeriodOptions: SystemInterfaces;
}

export const LOG_LEVELS = {
  DEBUG: 'Every event will be logged',
  INFO: 'Normal events and issues',
  WARNING: 'Warnings, errors, critical issues',
  ERROR: 'Errors and critical problems',
  CRITICAL: 'Critical problems',
};

export const MONITORING_PERIOD = {
  30: 'Extremely fast device',
  60: '',
  120: '',
  240: '',
  300: 'Optimal',
  360: '',
  420: '',
  480: '',
  560: '',
  600: 'Very slow device',
};
@Injectable()
export class GeneralSettingsStore extends ComponentStore<SettingsComponentState> {
  private testRunService = inject(TestRunService);
  private store = inject<Store<AppState>>(Store);

  private static readonly DEFAULT_LOG_LEVEL = 'INFO';
  private static readonly DEFAULT_MONITORING_PERIOD = '300';
  private hasConnectionSettings$ = this.store.select(
    selectHasConnectionSettings
  );

  private adapters$ = this.store.select(selectAdapters);
  systemStatus$ = this.store.select(selectSystemStatus);
  private isSubmitting$ = this.select(state => state.isSubmitting);
  private isLessThanOneInterfaces$ = this.select(
    state => state.isLessThanOneInterface
  );
  private interfaces$: Observable<SystemInterfaces> =
    this.store.select(selectInterfaces);
  private systemConfig$: Observable<SystemConfig> =
    this.store.select(selectSystemConfig);
  private deviceOptions$ = this.select(state => state.deviceOptions);
  private internetOptions$ = this.select(state => state.internetOptions);
  private logLevelOptions$ = this.select(state => state.logLevelOptions);
  private monitoringPeriodOptions$ = this.select(
    state => state.monitoringPeriodOptions
  );
  viewModel$ = this.select({
    systemConfig: this.systemConfig$,
    hasConnectionSettings: this.hasConnectionSettings$,
    isSubmitting: this.isSubmitting$,
    isLessThanOneInterface: this.isLessThanOneInterfaces$,
    interfaces: this.interfaces$,
    deviceOptions: this.deviceOptions$,
    internetOptions: this.internetOptions$,
    logLevelOptions: this.logLevelOptions$,
    monitoringPeriodOptions: this.monitoringPeriodOptions$,
  });

  setIsSubmitting = this.updater((state, isSubmitting: boolean) => ({
    ...state,
    isSubmitting,
  }));

  setInterfaces = this.updater((state, interfaces: SystemInterfaces) => {
    return {
      ...state,
      deviceOptions: interfaces,
      internetOptions: interfaces,
      isLessThanOneInterface: Object.keys(interfaces).length < 1,
    };
  });

  statusLoaded = this.effect(() => {
    return this.interfaces$.pipe(
      skip(1),
      tap(interfaces => {
        this.setInterfaces(interfaces);
      })
    );
  });

  getInterfaces = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.store.dispatch(fetchInterfaces());
      })
    );
  });

  getSystemConfig = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.store.dispatch(fetchSystemConfig());
      })
    );
  });

  updateSystemConfig = this.effect<{
    onSystemConfigUpdate: () => void;
    config: SystemConfig;
  }>(trigger$ => {
    return trigger$.pipe(
      exhaustMap(trigger => {
        return this.testRunService.createSystemConfig(trigger.config).pipe(
          tap(() => {
            this.store.dispatch(
              AppActions.fetchSystemConfigSuccess({
                systemConfig: trigger.config,
              })
            );
            trigger.onSystemConfigUpdate();
          })
        );
      })
    );
  });

  setFormDisable = this.effect((formGroup$: Observable<FormGroup>) => {
    return formGroup$.pipe(
      tap(formGroup => {
        formGroup.disable();
      })
    );
  });

  setFormEnable = this.effect((formGroup$: Observable<FormGroup>) => {
    return formGroup$.pipe(
      withLatestFrom(this.systemConfig$),
      tap(([formGroup, config]) => {
        formGroup.enable();
        if (config.single_intf) {
          this.disableInternetInterface(formGroup);
        }
      })
    );
  });

  setDefaultFormValues = this.effect((formGroup$: Observable<FormGroup>) => {
    return formGroup$.pipe(
      switchMap(formGroup =>
        this.systemConfig$.pipe(
          withLatestFrom(this.deviceOptions$, this.internetOptions$),
          tap(([config, deviceOptions, internetOptions]) => {
            if (config.single_intf) {
              this.disableInternetInterface(formGroup);
            } else {
              this.setDefaultInternetInterfaceValue(
                config.network?.internet_intf,
                internetOptions,
                formGroup
              );
            }

            this.setDefaultDeviceInterfaceValue(
              config.network?.device_intf,
              deviceOptions,
              formGroup
            );
            this.setDefaultLogLevelValue(
              config.log_level,
              LOG_LEVELS,
              formGroup
            );
            this.setDefaultMonitoringPeriodValue(
              config.monitor_period?.toString(),
              MONITORING_PERIOD,
              formGroup
            );
          })
        )
      )
    );
  });

  adaptersUpdate = this.effect(() => {
    return this.adapters$.pipe(
      skip(1),
      withLatestFrom(this.interfaces$),
      tap(([adapters, interfaces]) => {
        const updatedInterfaces = { ...interfaces };
        if (adapters.adapters_added) {
          this.addInterfaces(adapters.adapters_added, updatedInterfaces);
        }
        if (adapters.adapters_removed) {
          this.removeInterfaces(adapters.adapters_removed, updatedInterfaces);
        }
        this.updateInterfaces(updatedInterfaces);
      })
    );
  });

  private updateInterfaces(interfaces: SystemInterfaces) {
    this.store.dispatch(
      AppActions.fetchInterfacesSuccess({ interfaces: interfaces })
    );
    this.setInterfaces(interfaces);
  }

  private addInterfaces(
    newInterfaces: SystemInterfaces,
    interfaces: SystemInterfaces
  ): void {
    for (const [key, value] of Object.entries(newInterfaces)) {
      interfaces[key] = value;
    }
  }

  private removeInterfaces(
    interfacesToDelete: SystemInterfaces,
    interfaces: SystemInterfaces
  ): void {
    for (const key of Object.keys(interfacesToDelete)) {
      delete interfaces[key];
    }
  }

  private setDefaultDeviceInterfaceValue(
    value: string | undefined,
    options: { [key: string]: string },
    formGroup: FormGroup
  ): void {
    this.setDefaultValue(
      value,
      '',
      options,
      formGroup.get(FormKey.DEVICE) as FormControl
    );
  }

  private setDefaultInternetInterfaceValue(
    value: string | undefined,
    options: { [key: string]: string },
    formGroup: FormGroup
  ): void {
    this.setDefaultValue(
      value,
      '',
      options,
      formGroup.get(FormKey.INTERNET) as FormControl
    );
  }

  private setDefaultLogLevelValue(
    value: string | undefined,
    options: { [key: string]: string },
    formGroup: FormGroup
  ): void {
    this.setDefaultValue(
      value,
      GeneralSettingsStore.DEFAULT_LOG_LEVEL,
      options,
      formGroup.get(FormKey.LOG_LEVEL) as FormControl
    );
  }

  private setDefaultMonitoringPeriodValue(
    value: string | undefined,
    options: { [key: string]: string },
    formGroup: FormGroup
  ): void {
    this.setDefaultValue(
      value,
      GeneralSettingsStore.DEFAULT_MONITORING_PERIOD,
      options,
      formGroup.get(FormKey.MONITOR_PERIOD) as FormControl
    );
  }

  private disableInternetInterface(formGroup: FormGroup) {
    const internetControl = formGroup.get(FormKey.INTERNET) as FormControl;
    internetControl.disable();
  }

  private setDefaultValue(
    value: string | undefined,
    defaultValue: string | undefined,
    options: { [key: string]: string },
    control: FormControl
  ): void {
    if (value && options[value] !== undefined) {
      const internetData = this.transformValueToObj(value, options);
      control.setValue(internetData);
    } else if (defaultValue !== undefined) {
      const internetData = this.transformValueToObj(defaultValue, options);
      control.setValue(internetData);
    }
  }

  private transformValueToObj(
    value: string,
    options: { [key: string]: string }
  ): SettingOption {
    return {
      key: value,
      value: options[value],
    };
  }

  constructor() {
    super({
      hasConnectionSettings: false,
      isSubmitting: false,
      isLessThanOneInterface: false,
      deviceOptions: {},
      internetOptions: {},
      logLevelOptions: LOG_LEVELS,
      monitoringPeriodOptions: MONITORING_PERIOD,
    });
  }
}
