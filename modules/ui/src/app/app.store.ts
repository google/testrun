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
import { selectHasDevices } from './store/selectors';
import { Store } from '@ngrx/store';
import { AppState } from './store/state';
import { TestRunService } from './services/test-run.service';
import { exhaustMap } from 'rxjs';
import { Device } from './model/device';
import { setDevices } from './store/actions';

export const CONSENT_SHOWN_KEY = 'CONSENT_SHOWN';
export interface AppComponentState {
  consentShown: boolean;
}
@Injectable()
export class AppStore extends ComponentStore<AppComponentState> {
  private consentShown$ = this.select(state => state.consentShown);
  private hasDevices$ = this.store.select(selectHasDevices);

  viewModel$ = this.select({
    consentShown: this.consentShown$,
    hasDevices: this.hasDevices$,
  });

  updateConsent = this.updater((state, consentShown: boolean) => ({
    ...state,
    consentShown,
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

  constructor(
    private store: Store<AppState>,
    private testRunService: TestRunService
  ) {
    super({
      consentShown: sessionStorage.getItem(CONSENT_SHOWN_KEY) !== null,
    });
  }
}
