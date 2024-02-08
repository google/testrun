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
import {
  SystemInterfaces,
  TestRunService,
} from '../../services/test-run.service';
import { FormKey, SettingOption, SystemConfig } from '../../model/setting';
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
  monitoringPeriodOptions: { [key: string]: string };
}

export const DEFAULT_INTERNET_OPTION = {
  '': 'Not specified',
};

@Injectable()
export class SettingsStore extends ComponentStore<SettingsComponentState> {
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
          })
        )
      )
    );
  });

  private setDefaultDeviceInterfaceValue(
    device: string | undefined,
    interfaces: { [key: string]: string },
    formGroup: FormGroup
  ): void {
    if (device && interfaces[device]) {
      const deviceData = this.transformValueToObj(device, interfaces);
      (formGroup.get(FormKey.DEVICE) as FormControl).setValue(deviceData);
    }
  }

  private setDefaultInternetInterfaceValue(
    internet: string | undefined,
    interfaces: { [key: string]: string },
    formGroup: FormGroup
  ): void {
    const control = formGroup.get('internet_intf') as FormControl;
    if (internet && interfaces[internet]) {
      const internetData = this.transformValueToObj(internet, interfaces);
      control.setValue(internetData);
    } else {
      const internetData = this.transformValueToObj('', interfaces);
      control.setValue(internetData);
    }
  }

  private transformValueToObj(
    value: string,
    interfaces: { [key: string]: string }
  ): SettingOption {
    return {
      key: value,
      value: interfaces[value],
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
      logLevelOptions: {},
      monitoringPeriodOptions: {},
    });
  }
}
