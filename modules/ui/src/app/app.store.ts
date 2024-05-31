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

import { Inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { tap } from 'rxjs/operators';
import {
  selectError,
  selectHasConnectionSettings,
  selectHasDevices,
  selectInterfaces,
  selectMenuOpened,
  selectStatus,
} from './store/selectors';
import { Store } from '@ngrx/store';
import { AppState } from './store/state';
import { TestRunService } from './services/test-run.service';
import { exhaustMap, Observable, skip } from 'rxjs';
import { Device } from './model/device';
import {
  setDevices,
  setIsOpenStartTestrun,
  fetchSystemStatus,
} from './store/actions';
import { TestrunStatus } from './model/testrun-status';
import { SettingMissedError, SystemInterfaces } from './model/setting';
import { NotificationService } from './services/notification.service';
import { Routes } from './model/routes';
import { WINDOW } from './providers/window.provider';

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
  private hasDevices$ = this.store.select(selectHasDevices);
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
    isStatusLoaded: this.isStatusLoaded$,
    systemStatus: this.systemStatus$,
    hasConnectionSettings: this.hasConnectionSetting$,
    isMenuOpen: this.isMenuOpen$,
    interfaces: this.interfaces$,
    settingMissedError: this.settingMissedError$,
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

  setIsOpenStartTestrun = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.store.dispatch(
          setIsOpenStartTestrun({ isOpenStartTestrun: true })
        );
      })
    );
  });

  constructor(
    private store: Store<AppState>,
    private testRunService: TestRunService,
    private notification: NotificationService,
    @Inject(WINDOW) private window: Window
  ) {
    super({
      consentShown: sessionStorage.getItem(CONSENT_SHOWN_KEY) !== null,
      isStatusLoaded: false,
      systemStatus: null,
    });
  }
}
