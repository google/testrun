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

import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { TestRunService } from '../../services/test-run.service';
import {
  FormKey,
  SettingOption,
  SystemConfig,
  SystemInterfaces,
} from '../../model/setting';
import { exhaustMap, switchMap, Observable } from 'rxjs';
import { tap, withLatestFrom } from 'rxjs/operators';
import * as AppActions from '../../store/actions';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/state';
import { selectHasConnectionSettings } from '../../store/selectors';
import { FormControl, FormGroup } from '@angular/forms';

export interface SettingsComponentState {
  hasConnectionSettings: boolean;
  isSubmitting: boolean;
  systemConfig: SystemConfig;
  isLessThanOneInterface: boolean;
  interfaces: SystemInterfaces;
  deviceOptions: SystemInterfaces;
  internetOptions: SystemInterfaces;
  logLevelOptions: { [key: string]: string };
  monitoringPeriodOptions: SystemInterfaces;
}

export const DEFAULT_INTERNET_OPTION = {
  '': 'Not specified',
};

export const LOG_LEVELS = {
  DEBUG: '',
  INFO: '',
  WARNING: '',
  ERROR: '',
  CRITICAL: '',
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
export class SettingsStore extends ComponentStore<SettingsComponentState> {
  private static readonly DEFAULT_LOG_LEVEL = 'INFO';
  private static readonly DEFAULT_MONITORING_PERIOD = '300';
  private systemConfig$ = this.select(state => state.systemConfig);
  private hasConnectionSettings$ = this.store.select(
    selectHasConnectionSettings
  );
  private isSubmitting$ = this.select(state => state.isSubmitting);
  private isLessThanOneInterfaces$ = this.select(
    state => state.isLessThanOneInterface
  );
  private interfaces$ = this.select(state => state.interfaces);
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

  setSystemConfig = this.updater((state, systemConfig: SystemConfig) => ({
    ...state,
    systemConfig,
  }));

  setIsSubmitting = this.updater((state, isSubmitting: boolean) => ({
    ...state,
    isSubmitting,
  }));

  setInterfaces = this.updater((state, interfaces: SystemInterfaces) => ({
    ...state,
    interfaces,
    deviceOptions: interfaces,
    internetOptions: {
      ...DEFAULT_INTERNET_OPTION,
      ...interfaces,
    },
    isLessThanOneInterface: Object.keys(interfaces).length < 1,
  }));

  getInterfaces = this.effect(trigger$ => {
    return trigger$.pipe(
      exhaustMap(() => {
        return this.testRunService.getSystemInterfaces().pipe(
          tap((interfaces: SystemInterfaces) => {
            this.store.dispatch(
              AppActions.fetchInterfacesSuccess({ interfaces })
            );
            this.setInterfaces(interfaces);
          })
        );
      })
    );
  });

  getSystemConfig = this.effect(trigger$ => {
    return trigger$.pipe(
      exhaustMap(() => {
        return this.testRunService.getSystemConfig().pipe(
          tap((systemConfig: SystemConfig) => {
            this.store.dispatch(
              AppActions.fetchSystemConfigSuccess({ systemConfig })
            );
            this.setSystemConfig(systemConfig);
            this.store.dispatch(
              AppActions.setHasConnectionSettings({
                hasConnectionSettings:
                  systemConfig.network != null &&
                  systemConfig.network.device_intf != '',
              })
            );
          })
        );
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
            this.setSystemConfig(trigger.config);
            trigger.onSystemConfigUpdate();
          })
        );
      })
    );
  });

  setDefaultFormValues = this.effect((formGroup$: Observable<FormGroup>) => {
    return formGroup$.pipe(
      switchMap(formGroup =>
        this.systemConfig$.pipe(
          withLatestFrom(this.deviceOptions$, this.internetOptions$),
          tap(([config, deviceOptions, internetOptions]) => {
            this.setDefaultDeviceInterfaceValue(
              config.network?.device_intf,
              deviceOptions,
              formGroup
            );
            this.setDefaultInternetInterfaceValue(
              config.network?.internet_intf,
              internetOptions,
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
      SettingsStore.DEFAULT_LOG_LEVEL,
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
      SettingsStore.DEFAULT_MONITORING_PERIOD,
      options,
      formGroup.get(FormKey.MONITOR_PERIOD) as FormControl
    );
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

  constructor(
    private testRunService: TestRunService,
    private store: Store<AppState>
  ) {
    super({
      systemConfig: {},
      hasConnectionSettings: false,
      isSubmitting: false,
      isLessThanOneInterface: false,
      interfaces: {},
      deviceOptions: {},
      internetOptions: {},
      logLevelOptions: LOG_LEVELS,
      monitoringPeriodOptions: MONITORING_PERIOD,
    });
  }
}
