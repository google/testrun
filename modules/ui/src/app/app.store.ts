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
import { tap, withLatestFrom } from 'rxjs/operators';
import {
  selectHasConnectionSettings,
  selectHasDevices,
  selectHasExpiredDevices,
  selectHasRiskProfiles,
  selectInterfaces,
  selectInternetConnection,
  selectIsAllDevicesOutdated,
  selectIsTestingComplete,
  selectReports,
  selectRiskProfiles,
  selectStatus,
  selectSystemConfig,
  selectSystemStatus,
} from './store/selectors';
import { Store } from '@ngrx/store';
import { AppState } from './store/state';
import { TestRunService } from './services/test-run.service';
import {
  combineLatest,
  delay,
  exhaustMap,
  filter,
  Observable,
  skip,
} from 'rxjs';
import { Device, TestingType, TestModule } from './model/device';
import {
  setDevices,
  setIsOpenStartTestrun,
  fetchSystemStatus,
  fetchRiskProfiles,
  fetchReports,
  setTestModules,
  updateAdapters,
} from './store/actions';
import { StatusOfTestrun, TestrunStatus } from './model/testrun-status';
import {
  Adapters,
  SettingMissedError,
  SystemConfig,
  SystemInterfaces,
} from './model/setting';
import { FocusManagerService } from './services/focus-manager.service';
import { TestRunMqttService } from './services/test-run-mqtt.service';
import { NotificationService } from './services/notification.service';
import { Profile } from './model/profile';

export const CONSENT_SHOWN_KEY = 'CONSENT_SHOWN';
export const CALLOUT_STATE_KEY = 'CALLOUT_STATE';
export interface AppComponentState {
  consentShown: boolean;
  isStatusLoaded: boolean;
  systemStatus: TestrunStatus | null;
  calloutState: Map<string, boolean>;
  isMenuOpen: boolean;
  /**
   * Indicates, if side menu should be focused on keyboard navigation after menu is opened
   */
  focusNavigation: boolean;
  settingMissedError: SettingMissedError | null;
}
@Injectable()
export class AppStore extends ComponentStore<AppComponentState> {
  private consentShown$ = this.select(state => state.consentShown);
  private calloutState$ = this.select(state => state.calloutState);
  private isStatusLoaded$ = this.select(state => state.isStatusLoaded);
  private hasInternetConnection$ = this.store.select(selectInternetConnection);
  private hasDevices$ = this.store.select(selectHasDevices);
  private isAllDevicesOutdated$ = this.store.select(selectIsAllDevicesOutdated);
  private hasExpiredDevices$ = this.store.select(selectHasExpiredDevices);
  private hasRiskProfiles$ = this.store.select(selectHasRiskProfiles);
  private reports$ = this.store.select(selectReports);
  private hasConnectionSetting$ = this.store.select(
    selectHasConnectionSettings
  );
  private isMenuOpened$ = this.select(state => state.isMenuOpen);
  private focusNavigation$ = this.select(state => state.focusNavigation);
  private interfaces$: Observable<SystemInterfaces> =
    this.store.select(selectInterfaces);
  private systemConfig$: Observable<SystemConfig> =
    this.store.select(selectSystemConfig);
  private settingMissedError$: Observable<SettingMissedError | null> =
    this.select(state => state.settingMissedError);
  systemStatus$: Observable<string | null> = this.store.select(selectStatus);
  testrunStatus$: Observable<TestrunStatus | null> =
    this.store.select(selectSystemStatus);
  isTestingComplete$: Observable<boolean> = this.store.select(
    selectIsTestingComplete
  );
  riskProfiles$: Observable<Profile[]> = this.store.select(selectRiskProfiles);

  viewModel$ = this.select({
    consentShown: this.consentShown$,
    hasDevices: this.hasDevices$,
    isAllDevicesOutdated: this.isAllDevicesOutdated$,
    hasExpiredDevices: this.hasExpiredDevices$,
    hasRiskProfiles: this.hasRiskProfiles$,
    reports: this.reports$,
    isStatusLoaded: this.isStatusLoaded$,
    systemStatus: this.systemStatus$,
    testrunStatus: this.testrunStatus$,
    isTestingComplete: this.isTestingComplete$,
    riskProfiles: this.riskProfiles$,
    hasConnectionSettings: this.hasConnectionSetting$,
    isMenuOpen: this.isMenuOpened$,
    interfaces: this.interfaces$,
    settingMissedError: this.settingMissedError$,
    calloutState: this.calloutState$,
    hasInternetConnection: this.hasInternetConnection$,
    focusNavigation: this.focusNavigation$,
  });

  updateConsent = this.updater((state, consentShown: boolean) => ({
    ...state,
    consentShown,
  }));

  updateCalloutState = this.updater((state, callout: string) => {
    const calloutState = state.calloutState;
    calloutState.set(callout, true);
    // @ts-expect-error property is defined in index.html
    sessionStorage.setObject(CALLOUT_STATE_KEY, calloutState);
    return {
      ...state,
      calloutState: new Map(calloutState),
    };
  });

  updateIsStatusLoaded = this.updater((state, isStatusLoaded: boolean) => ({
    ...state,
    isStatusLoaded,
  }));

  updateFocusNavigation = this.updater((state, focusNavigation: boolean) => ({
    ...state,
    focusNavigation,
  }));

  updateIsMenuOpened = this.updater((state, isMenuOpen: boolean) => ({
    ...state,
    isMenuOpen,
  }));

  updateSettingMissedError = this.updater(
    (state, settingMissedError: SettingMissedError | null) => ({
      ...state,
      settingMissedError,
    })
  );

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

  setCloseCallout = this.effect<string>(trigger$ => {
    return trigger$.pipe(
      tap((id: string) => {
        this.updateCalloutState(id);
      })
    );
  });

  toggleMenu = this.effect(trigger$ => {
    return trigger$.pipe(
      withLatestFrom(this.isMenuOpened$),
      tap(([, opened]) => {
        this.updateIsMenuOpened(!opened);
        if (!opened) {
          this.updateFocusNavigation(true);
        }
      })
    );
  });

  checkInterfacesInConfig = this.effect(() => {
    return combineLatest([
      this.interfaces$.pipe(skip(1)),
      this.systemConfig$.pipe(skip(1)),
    ]).pipe(
      filter(([, { network }]) => network !== null),
      tap(([interfaces, { network, single_intf }]) => {
        const deviceValid =
          network?.device_intf == '' ||
          (!!network?.device_intf && !!interfaces[network.device_intf]);
        const internetValid = single_intf
          ? true
          : network?.internet_intf == '' ||
            (!!network?.internet_intf && !!interfaces[network.internet_intf]);
        this.updateSettingMissedError({
          isSettingMissed: !deviceValid || !internetValid,
          devicePortMissed: !deviceValid,
          internetPortMissed: !internetValid,
        });
      })
    );
  });

  sendGAEvent = this.effect(() => {
    return combineLatest([this.isTestingComplete$, this.testrunStatus$]).pipe(
      filter(([isTestingComplete]) => isTestingComplete === true),
      filter(
        ([, testrunStatus]) =>
          testrunStatus?.status === StatusOfTestrun.Compliant &&
          testrunStatus?.device.test_pack === TestingType.Pilot
      ),
      tap(() => {
        // @ts-expect-error data layer is not null
        window.dataLayer.push({
          event: 'pilot_is_compliant',
        });
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
    // @ts-expect-error get object is defined in index.html
    const calloutState = sessionStorage.getObject(CALLOUT_STATE_KEY);

    super({
      consentShown: sessionStorage.getItem(CONSENT_SHOWN_KEY) !== null,
      isStatusLoaded: false,
      systemStatus: null,
      calloutState: calloutState
        ? new Map(Object.entries(calloutState))
        : new Map(),
      isMenuOpen: false,
      focusNavigation: false,
      settingMissedError: null,
    });
  }
}
