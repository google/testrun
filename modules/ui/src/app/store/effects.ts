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
import { map, withLatestFrom } from 'rxjs/operators';

import * as AppActions from './actions';
import { AppState } from './state';
import { TestRunService } from '../services/test-run.service';
import { filter, combineLatest } from 'rxjs';
import { selectMenuOpened } from './selectors';

@Injectable()
export class AppEffects {
  checkInterfacesInConfig$ = createEffect(() =>
    combineLatest([
      this.actions$.pipe(ofType(AppActions.fetchInterfacesSuccess)),
      this.actions$.pipe(ofType(AppActions.fetchSystemConfigSuccess)),
    ]).pipe(
      map(
        ([
          { interfaces },
          {
            systemConfig: { network },
          },
        ]) =>
          AppActions.updateValidInterfaces({
            validInterfaces:
              network != null &&
              // @ts-expect-error network is not null
              interfaces[network.device_intf] != null &&
              (network.internet_intf == '' ||
                // @ts-expect-error network is not null
                interfaces[network.internet_intf] != null),
          })
      )
    )
  );

  onValidateInterfaces$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.updateValidInterfaces),
      map(({ validInterfaces }) =>
        AppActions.updateError({ error: !validInterfaces })
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

  constructor(
    private actions$: Actions,
    private testrunService: TestRunService,
    private store: Store<AppState>
  ) {}
}
