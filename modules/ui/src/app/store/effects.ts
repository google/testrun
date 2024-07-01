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

import { Injectable, NgZone } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, switchMap, tap, withLatestFrom } from 'rxjs/operators';

import * as AppActions from './actions';
import { AppState } from './state';
import { TestRunService } from '../services/test-run.service';
import { filter, combineLatest, interval, Subject, timer, take } from 'rxjs';
import {
  selectIsOpenWaitSnackBar,
  selectMenuOpened,
  selectSystemStatus,
} from './selectors';
import { IResult, StatusOfTestrun, TestsData } from '../model/testrun-status';
import {
  fetchSystemStatus,
  setStatus,
  setTestrunStatus,
  stopInterval,
} from './actions';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { NotificationService } from '../services/notification.service';
import { Profile } from '../model/profile';

const WAIT_TO_OPEN_SNACKBAR_MS = 60 * 1000;

@Injectable()
export class AppEffects {
  private startInterval = false;
  private destroyInterval$: Subject<boolean> = new Subject<boolean>();
  private destroyWaitDeviceInterval$: Subject<boolean> = new Subject<boolean>();

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
            validInterfaces: {
              hasSetInterfaces: network != null,
              deviceValid:
                !!network &&
                !!network.device_intf &&
                !!interfaces[network.device_intf],
              internetValid:
                !!network &&
                (network?.internet_intf == '' ||
                  (!!network.internet_intf &&
                    !!interfaces[network.internet_intf])),
            },
          })
      )
    )
  );

  onValidateInterfaces$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.updateValidInterfaces),
      map(({ validInterfaces }) =>
        AppActions.updateError({
          settingMissedError: {
            isSettingMissed:
              validInterfaces.hasSetInterfaces &&
              (!validInterfaces.deviceValid || !validInterfaces.internetValid),
            devicePortMissed:
              validInterfaces.hasSetInterfaces && !validInterfaces.deviceValid,
            internetPortMissed:
              validInterfaces.hasSetInterfaces &&
              !validInterfaces.internetValid,
          },
        })
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

  onSetDevices$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.setDevices),
      map(({ devices }) =>
        AppActions.setHasDevices({ hasDevices: devices.length > 0 })
      )
    );
  });

  onSetRiskProfiles$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.setRiskProfiles),
      map(({ riskProfiles }) =>
        AppActions.setHasRiskProfiles({
          hasRiskProfiles: riskProfiles.length > 0,
        })
      )
    );
  });

  onSetTestrunStatus$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.setTestrunStatus),
      map(({ systemStatus }) => {
        const isInProgressDevice =
          this.testrunService.testrunInProgress(systemStatus?.status) ||
          systemStatus.status === StatusOfTestrun.Cancelling;
        return AppActions.setDeviceInProgress({
          device: isInProgressDevice ? systemStatus.device : null,
        });
      })
    );
  });

  onFetchSystemStatus$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.fetchSystemStatus),
      switchMap(() =>
        this.testrunService.fetchSystemStatus().pipe(
          map(systemStatus => {
            return AppActions.fetchSystemStatusSuccess({ systemStatus });
          })
        )
      )
    );
  });

  onStopTestrun$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.setIsStopTestrun),
        switchMap(() => {
          this.store.dispatch(stopInterval());
          return this.testrunService.stopTestrun().pipe(
            map(stopped => {
              if (stopped) {
                this.store.dispatch(fetchSystemStatus());
              }
            })
          );
        })
      );
    },
    { dispatch: false }
  );

  onStopInterval$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.stopInterval),
        tap(() => {
          this.startInterval = false;
          this.destroyInterval$.next(true);
        })
      );
    },
    { dispatch: false }
  );

  onFetchSystemStatusSuccess$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.fetchSystemStatusSuccess),
        tap(({ systemStatus }) => {
          if (
            this.testrunService.testrunInProgress(systemStatus.status) &&
            !this.startInterval
          ) {
            this.pullingSystemStatusData();
          } else if (
            !this.testrunService.testrunInProgress(systemStatus.status)
          ) {
            this.store.dispatch(stopInterval());
          }
        }),
        withLatestFrom(
          this.store.select(selectIsOpenWaitSnackBar),
          this.store.select(selectSystemStatus)
        ),
        tap(([{ systemStatus }, isOpenWaitSnackBar]) => {
          if (
            systemStatus?.status === StatusOfTestrun.WaitingForDevice &&
            !isOpenWaitSnackBar
          ) {
            this.showSnackBar();
          }
          if (
            systemStatus?.status !== StatusOfTestrun.WaitingForDevice &&
            isOpenWaitSnackBar
          ) {
            this.notificationService.dismissWithTimout();
          }
        }),
        tap(([{ systemStatus }, , status]) => {
          // for app - requires only status
          if (systemStatus.status !== status?.status) {
            this.ngZone.run(() => {
              this.store.dispatch(setStatus({ status: systemStatus.status }));
              this.store.dispatch(
                setTestrunStatus({ systemStatus: systemStatus })
              );
            });
          } else if (
            systemStatus.finished !== status?.finished ||
            (systemStatus.tests as TestsData)?.results?.length !==
              (status?.tests as TestsData)?.results?.length ||
            (systemStatus.tests as IResult[])?.length !==
              (status?.tests as IResult[])?.length
          ) {
            this.ngZone.run(() => {
              this.store.dispatch(
                setTestrunStatus({ systemStatus: systemStatus })
              );
            });
          }
        })
      );
    },
    { dispatch: false }
  );

  onFetchRiskProfiles$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.fetchRiskProfiles),
      switchMap(() =>
        this.testrunService.fetchProfiles().pipe(
          map((riskProfiles: Profile[]) => {
            return AppActions.setRiskProfiles({ riskProfiles });
          })
        )
      )
    );
  });

  private showSnackBar() {
    timer(WAIT_TO_OPEN_SNACKBAR_MS)
      .pipe(
        take(1),
        takeUntil(this.destroyWaitDeviceInterval$),
        withLatestFrom(this.store.select(selectSystemStatus)),
        tap(([, systemStatus]) => {
          if (systemStatus?.status === StatusOfTestrun.WaitingForDevice) {
            this.notificationService.openSnackBar();
            this.destroyWaitDeviceInterval$.next(true);
          }
        })
      )
      .subscribe();
  }

  private pullingSystemStatusData(): void {
    this.ngZone.runOutsideAngular(() => {
      this.startInterval = true;
      interval(5000)
        .pipe(
          takeUntil(this.destroyInterval$),
          tap(() => this.store.dispatch(fetchSystemStatus()))
        )
        .subscribe();
    });
  }

  constructor(
    private actions$: Actions,
    private testrunService: TestRunService,
    private store: Store<AppState>,
    private ngZone: NgZone,
    private notificationService: NotificationService
  ) {}
}
