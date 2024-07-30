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
import { map, switchMap, tap, withLatestFrom } from 'rxjs/operators';

import * as AppActions from './actions';
import { AppState } from './state';
import { TestRunService } from '../services/test-run.service';
import {
  filter,
  combineLatest,
  Subject,
  timer,
  take,
  catchError,
  EMPTY,
  Subscription,
} from 'rxjs';
import {
  selectIsOpenWaitSnackBar,
  selectMenuOpened,
  selectSystemStatus,
} from './selectors';
import {
  IDLE_STATUS,
  IResult,
  StatusOfTestrun,
  TestrunStatus,
  TestsData,
} from '../model/testrun-status';
import {
  fetchSystemStatus,
  fetchSystemStatusSuccess,
  setReports,
  setStatus,
  setTestrunStatus,
  stopInterval,
} from './actions';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { NotificationService } from '../services/notification.service';
import { Profile } from '../model/profile';
import { TestRunMqttService } from '../services/test-run-mqtt.service';

const WAIT_TO_OPEN_SNACKBAR_MS = 60 * 1000;

@Injectable()
export class AppEffects {
  private statusSubscription: Subscription | undefined;
  private destroyWaitDeviceInterval$: Subject<boolean> = new Subject<boolean>();

  checkInterfacesInConfig$ = createEffect(() =>
    combineLatest([
      this.actions$.pipe(ofType(AppActions.fetchInterfacesSuccess)),
      this.actions$.pipe(ofType(AppActions.fetchSystemConfigSuccess)),
    ]).pipe(
      filter(
        ([
          ,
          {
            systemConfig: { network },
          },
        ]) => network !== null
      ),
      map(
        ([
          { interfaces },
          {
            systemConfig: { network },
          },
        ]) =>
          AppActions.updateValidInterfaces({
            validInterfaces: {
              deviceValid:
                network?.device_intf == '' ||
                (!!network?.device_intf && !!interfaces[network.device_intf]),
              internetValid:
                network?.internet_intf == '' ||
                (!!network?.internet_intf &&
                  !!interfaces[network.internet_intf]),
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
              !validInterfaces.deviceValid || !validInterfaces.internetValid,
            devicePortMissed: !validInterfaces.deviceValid,
            internetPortMissed: !validInterfaces.internetValid,
          },
        })
      )
    );
  });

  onFetchSystemConfigSuccess$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.fetchSystemConfigSuccess),
      map(({ systemConfig }) =>
        AppActions.setHasConnectionSettings({
          hasConnectionSettings:
            systemConfig.network != null && !!systemConfig.network.device_intf,
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
          this.statusSubscription?.unsubscribe();
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
          if (this.testrunService.testrunInProgress(systemStatus.status)) {
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
            this.store.dispatch(setStatus({ status: systemStatus.status }));
            this.store.dispatch(
              setTestrunStatus({ systemStatus: systemStatus })
            );
          } else if (
            systemStatus.finished !== status?.finished ||
            (systemStatus.tests as TestsData)?.results?.length !==
              (status?.tests as TestsData)?.results?.length ||
            (systemStatus.tests as IResult[])?.length !==
              (status?.tests as IResult[])?.length
          ) {
            this.store.dispatch(
              setTestrunStatus({ systemStatus: systemStatus })
            );
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

  onFetchReports$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.fetchReports),
      switchMap(() =>
        this.testrunService.getHistory().pipe(
          map((reports: TestrunStatus[] | null) => {
            if (reports !== null) {
              return AppActions.setReports({ reports });
            }
            return AppActions.setReports({ reports: [] });
          }),
          catchError(() => {
            this.store.dispatch(setReports({ reports: [] }));
            return EMPTY;
          })
        )
      )
    );
  });

  checkStatusInReports$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.setReports),
      withLatestFrom(this.store.select(selectSystemStatus)),
      filter(([, systemStatus]) => {
        return (
          systemStatus != null && this.isTestrunFinished(systemStatus.status)
        );
      }),
      filter(([{ reports }, systemStatus]) => {
        return (
          !reports?.some(report => report.report === systemStatus!.report) ||
          false
        );
      }),
      map(() => AppActions.setTestrunStatus({ systemStatus: IDLE_STATUS }))
    );
  });

  private isTestrunFinished(status: string) {
    return (
      status === StatusOfTestrun.Compliant ||
      status === StatusOfTestrun.NonCompliant ||
      status === StatusOfTestrun.Error
    );
  }

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
    if (
      this.statusSubscription === undefined ||
      this.statusSubscription?.closed
    ) {
      this.statusSubscription = this.testrunMqttService
        .getStatus()
        .subscribe(systemStatus => {
          this.store.dispatch(fetchSystemStatusSuccess({ systemStatus }));
        });
    }
  }

  constructor(
    private actions$: Actions,
    private testrunService: TestRunService,
    private testrunMqttService: TestRunMqttService,
    private store: Store<AppState>,
    private notificationService: NotificationService
  ) {}
}
