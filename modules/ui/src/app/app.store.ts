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
import { tap } from 'rxjs/operators';
import {
  selectError,
  selectHasConnectionSettings,
  selectHasDevices,
  selectHasRiskProfiles,
  selectInterfaces,
  selectInternetConnection,
  selectMenuOpened,
  selectReports,
  selectStatus,
} from './store/selectors';
import { Store } from '@ngrx/store';
import { AppState } from './store/state';
import { TestRunService } from './services/test-run.service';
import { delay, exhaustMap, Observable, skip } from 'rxjs';
import { Device, TestModule } from './model/device';
import {
  setDevices,
  setIsOpenStartTestrun,
  fetchSystemStatus,
  fetchRiskProfiles,
  fetchReports,
  setTestModules,
  updateAdapters,
} from './store/actions';
import { TestrunStatus } from './model/testrun-status';
import {
  Adapters,
  SettingMissedError,
  SystemInterfaces,
} from './model/setting';
import { FocusManagerService } from './services/focus-manager.service';
import { TestRunMqttService } from './services/test-run-mqtt.service';
import { NotificationService } from './services/notification.service';

export const CONSENT_SHOWN_KEY = 'CONSENT_SHOWN';
export interface AppComponentState {
  consentShown: boolean;
  isStatusLoaded: boolean;
  systemStatus: TestrunStatus | null;
}
@Injectable()
export class AppStore extends ComponentStore<AppComponentState> {
  private consentShown$ = this.select(state => state.consentShown);
  private isStatusLoaded$ = this.select(state => state.isStatusLoaded);
  private hasInternetConnection$ = this.store.select(selectInternetConnection);
  private hasDevices$ = this.store.select(selectHasDevices);
  private hasRiskProfiles$ = this.store.select(selectHasRiskProfiles);
  private reports$ = this.store.select(selectReports);
  private hasConnectionSetting$ = this.store.select(
    selectHasConnectionSettings
  );
  private isMenuOpen$ = this.store.select(selectMenuOpened);
  private interfaces$: Observable<SystemInterfaces> =
    this.store.select(selectInterfaces);
  private settingMissedError$: Observable<SettingMissedError | null> =
    this.store.select(selectError);
  systemStatus$: Observable<string | null> = this.store.select(selectStatus);

  viewModel$ = this.select({
    consentShown: this.consentShown$,
    hasDevices: this.hasDevices$,
    hasRiskProfiles: this.hasRiskProfiles$,
    reports: this.reports$,
    isStatusLoaded: this.isStatusLoaded$,
    systemStatus: this.systemStatus$,
    hasConnectionSettings: this.hasConnectionSetting$,
    isMenuOpen: this.isMenuOpen$,
    interfaces: this.interfaces$,
    settingMissedError: this.settingMissedError$,
    hasInternetConnection: this.hasInternetConnection$,
  });

  updateConsent = this.updater((state, consentShown: boolean) => ({
    ...state,
    consentShown,
  }));

  updateIsStatusLoaded = this.updater((state, isStatusLoaded: boolean) => ({
    ...state,
    isStatusLoaded,
  }));

  setContent = this.effect<void>(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        sessionStorage.setItem(CONSENT_SHOWN_KEY, 'shown');
        this.updateConsent(true);
      })
    );
  });

  getDevices = this.effect(trigger$ => {
    return trigger$.pipe(
      exhaustMap(() => {
        return this.testRunService.fetchDevices().pipe(
          tap((devices: Device[]) => {
            this.store.dispatch(setDevices({ devices }));
          })
        );
      })
    );
  });

  getRiskProfiles = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.store.dispatch(fetchRiskProfiles());
      })
    );
  });

  statusLoaded = this.effect(() => {
    return this.systemStatus$.pipe(
      skip(1),
      tap(() => {
        this.updateIsStatusLoaded(true);
      })
    );
  });

  getSystemStatus = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.store.dispatch(fetchSystemStatus());
      })
    );
  });

  getNetworkAdapters = this.effect(trigger$ => {
    return trigger$.pipe(
      exhaustMap(() => {
        return this.testRunMqttService.getNetworkAdapters().pipe(
          tap((adapters: Adapters) => {
            if (adapters.adapters_added) {
              this.notifyAboutTheAdapters(adapters.adapters_added);
            }
            this.store.dispatch(updateAdapters({ adapters }));
          })
        );
      })
    );
  });

  private notifyAboutTheAdapters(adapters: SystemInterfaces) {
    this.notificationService.notify(
      `New network adapter(s) ${Object.keys(adapters).join(', ')} has been detected. You can switch to using it in the System settings menu`
    );
  }

  setIsOpenStartTestrun = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.store.dispatch(
          setIsOpenStartTestrun({ isOpenStartTestrun: true })
        );
      })
    );
  });

  setFocusOnPage = this.effect(trigger$ => {
    return trigger$.pipe(
      delay(100),
      tap(() => {
        this.focusManagerService.focusFirstElementInContainer();
      })
    );
  });

  getReports = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.store.dispatch(fetchReports());
      })
    );
  });

  getTestModules = this.effect(trigger$ => {
    return trigger$.pipe(
      exhaustMap(() => {
        return this.testRunService.getTestModules().pipe(
          tap((testModules: string[]) => {
            this.store.dispatch(
              setTestModules({
                testModules: testModules.map(
                  module =>
                    ({
                      displayName: module,
                      name: module.toLowerCase(),
                      enabled: true,
                    }) as TestModule
                ),
              })
            );
          })
        );
      })
    );
  });

  constructor(
    private store: Store<AppState>,
    private testRunService: TestRunService,
    private testRunMqttService: TestRunMqttService,
    private focusManagerService: FocusManagerService,
    private notificationService: NotificationService
  ) {
    super({
      consentShown: sessionStorage.getItem(CONSENT_SHOWN_KEY) !== null,
      isStatusLoaded: false,
      systemStatus: null,
    });
  }
}
