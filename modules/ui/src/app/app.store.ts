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
  selectInterfaces,
  selectIsTestrunStarted,
  selectMenuOpened,
  selectSystemStatus,
} from './store/selectors';
import { Store } from '@ngrx/store';
import { AppState } from './store/state';
import { TestRunService } from './services/test-run.service';
import { exhaustMap, Observable } from 'rxjs';
import { Device } from './model/device';
import {
  setDevices,
  setTestrunStatus,
  setIsOpenStartTestrun,
} from './store/actions';
import { TestrunStatus } from './model/testrun-status';
import { SettingMissedError, SystemInterfaces } from './model/setting';
import { Certificate } from './model/certificate';

export const CONSENT_SHOWN_KEY = 'CONSENT_SHOWN';
export interface AppComponentState {
  consentShown: boolean;
  isStatusLoaded: boolean;
  isTestrunStarted: boolean;
  systemStatus: TestrunStatus | null;
  certificates: Certificate[];
}
@Injectable()
export class AppStore extends ComponentStore<AppComponentState> {
  private consentShown$ = this.select(state => state.consentShown);
  private isStatusLoaded$ = this.select(state => state.isStatusLoaded);
  private certificates$ = this.select(state => state.certificates);
  private hasDevices$ = this.store.select(selectHasDevices);
  private hasConnectionSetting$ = this.store.select(
    selectHasConnectionSettings
  );
  private isMenuOpen$ = this.store.select(selectMenuOpened);
  private interfaces$: Observable<SystemInterfaces> =
    this.store.select(selectInterfaces);
  private settingMissedError$: Observable<SettingMissedError | null> =
    this.store.select(selectError);
  private systemStatus$ = this.store.select(selectSystemStatus);
  private isTestrunStarted$ = this.store.select(selectIsTestrunStarted);

  viewModel$ = this.select({
    consentShown: this.consentShown$,
    hasDevices: this.hasDevices$,
    isTestrunStarted: this.isTestrunStarted$,
    isStatusLoaded: this.isStatusLoaded$,
    systemStatus: this.systemStatus$,
    hasConnectionSettings: this.hasConnectionSetting$,
    isMenuOpen: this.isMenuOpen$,
    interfaces: this.interfaces$,
    settingMissedError: this.settingMissedError$,
    certificates: this.certificates$,
  });

  updateConsent = this.updater((state, consentShown: boolean) => ({
    ...state,
    consentShown,
  }));

  updateIsStatusLoaded = this.updater((state, isStatusLoaded: boolean) => ({
    ...state,
    isStatusLoaded,
  }));

  updateCertificates = this.updater((state, certificates: Certificate[]) => ({
    ...state,
    certificates,
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

  getSystemStatus = this.effect(trigger$ => {
    return trigger$.pipe(
      exhaustMap(() => {
        return this.testRunService.fetchSystemStatus().pipe(
          tap((res: TestrunStatus) => {
            this.updateIsStatusLoaded(true);
            this.store.dispatch(setTestrunStatus({ systemStatus: res }));
          })
        );
      })
    );
  });

  setIsOpenStartTestrun = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.store.dispatch(
          setIsOpenStartTestrun({ isOpenStartTestrun: true })
        );
      })
    );
  });

  getCertificates = this.effect(trigger$ => {
    return trigger$.pipe(
      exhaustMap(() => {
        return this.testRunService.fetchCertificates().pipe(
          tap((certificates: Certificate[]) => {
            this.updateCertificates(certificates);
          })
        );
      })
    );
  });
  constructor(
    private store: Store<AppState>,
    private testRunService: TestRunService
  ) {
    super({
      consentShown: sessionStorage.getItem(CONSENT_SHOWN_KEY) !== null,
      isStatusLoaded: false,
      isTestrunStarted: false,
      systemStatus: null,
      certificates: [],
    });
  }
}
