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
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, switchMap, withLatestFrom } from 'rxjs/operators';

import * as AppActions from './actions';
import { AppState } from './state';
import { TestRunService } from '../services/test-run.service';
import { filter } from 'rxjs';
import { selectMenuOpened, selectSystemConfig } from './selectors';

@Injectable()
export class AppEffects {
  onFetchInterfaces$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.fetchInterfaces),
      switchMap(() =>
        this.testrunService
          .getSystemInterfaces()
          .pipe(
            map(interfaces => AppActions.fetchInterfacesSuccess({ interfaces }))
          )
      )
    );
  });
  onMenuOpened$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.toggleMenu),
      withLatestFrom(this.store.select(selectMenuOpened)),
      filter(([, opened]) => opened === true),
      map(() => AppActions.updateFocusNavigation({ focusNavigation: true })) // user will be navigated to side menu on tab
    );
  });

  onFetchSystemConfig$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.fetchSystemConfig),
      switchMap(() =>
        this.testrunService
          .getSystemConfig()
          .pipe(
            map(systemConfig =>
              AppActions.fetchSystemConfigSuccess({ systemConfig })
            )
          )
      )
    );
  });

  onFetchSystemConfigSuccessNonEmpty$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.fetchSystemConfigSuccess),
      withLatestFrom(this.store.select(selectSystemConfig)),
      filter(
        ([, systemConfig]) =>
          systemConfig.network != null &&
          systemConfig.network.device_intf != '' &&
          systemConfig.network.internet_intf != ''
      ),
      map(() =>
        AppActions.setHasConnectionSettings({ hasConnectionSettings: true })
      )
    );
  });

  onFetchSystemConfigSuccessEmpty$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.fetchSystemConfigSuccess),
      withLatestFrom(this.store.select(selectSystemConfig)),
      filter(
        ([, systemConfig]) =>
          systemConfig.network == null ||
          systemConfig.network.device_intf === '' ||
          systemConfig.network.internet_intf === ''
      ),
      map(() =>
        AppActions.setHasConnectionSettings({ hasConnectionSettings: false })
      )
    );
  });

  onCreateSystemConfig$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.createSystemConfig),
      switchMap(action =>
        this.testrunService
          .createSystemConfig(action.data)
          .pipe(
            map(() =>
              AppActions.createSystemConfigSuccess({ data: action.data })
            )
          )
      )
    );
  });

  onCreateSystemConfigSuccess$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.createSystemConfigSuccess),
      map(action =>
        AppActions.fetchSystemConfigSuccess({ systemConfig: action.data })
      )
    );
  });
  constructor(
    private actions$: Actions,
    private testrunService: TestRunService,
    private store: Store<AppState>
  ) {}
}
