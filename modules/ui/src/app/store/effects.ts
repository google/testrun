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

import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, switchMap, tap, withLatestFrom } from 'rxjs/operators';

import * as AppActions from './actions';
import { AppState } from './state';
import { TestRunService } from '../services/test-run.service';
import {
  filter,
  Subject,
  timer,
  take,
  catchError,
  EMPTY,
  Subscription,
} from 'rxjs';
import { selectIsOpenWaitSnackBar, selectSystemStatus } from './selectors';
import {
  IDLE_STATUS,
  StatusOfTestrun,
  TestrunStatus,
} from '../model/testrun-status';
import {
  fetchSystemStatusSuccess,
  setIsTestingComplete,
  setReports,
  setStatus,
  setTestrunStatus,
  stopInterval,
  updateInternetConnection,
} from './actions';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { NotificationService } from '../services/notification.service';
import { Profile } from '../model/profile';
import { DeviceStatus } from '../model/device';
import { TestRunMqttService } from '../services/test-run-mqtt.service';
import { InternetConnection } from '../model/topic';
import { SystemConfig, SystemInterfaces } from '../model/setting';

const WAIT_TO_OPEN_SNACKBAR_MS = 60 * 1000;

@Injectable()
export class AppEffects {
  private actions$ = inject(Actions);
  private testrunService = inject(TestRunService);
  private testrunMqttService = inject(TestRunMqttService);
  private store = inject<Store<AppState>>(Store);
  private notificationService = inject(NotificationService);

  private isSinglePortMode: boolean | undefined = false;
  private statusSubscription: Subscription | undefined;
  private internetSubscription: Subscription | undefined;
  private destroyWaitDeviceInterval$: Subject<boolean> = new Subject<boolean>();

  onFetchSystemConfigSuccess$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.fetchSystemConfigSuccess),
      tap(
        ({ systemConfig }) => (this.isSinglePortMode = systemConfig.single_intf)
      ),
      map(({ systemConfig }) =>
        AppActions.setHasConnectionSettings({
          hasConnectionSettings:
            systemConfig.network != null && !!systemConfig.network.device_intf,
        })
      )
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

  onSetExpiredDevices$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.setDevices),
      map(({ devices }) =>
        AppActions.setHasExpiredDevices({
          hasExpiredDevices: devices.some(
            device => device.status === DeviceStatus.INVALID
          ),
        })
      )
    );
  });

  onSetIsAllDevicesOutdated$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.setDevices),
      map(({ devices }) =>
        AppActions.setIsAllDevicesOutdated({
          isAllDevicesOutdated: devices.every(
            device => device.status === DeviceStatus.INVALID
          ),
        })
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
          return this.testrunService.stopTestrun();
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
          this.internetSubscription?.unsubscribe();
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
          this.store.dispatch(
            setIsTestingComplete({
              isTestingComplete: this.isTestrunFinished(systemStatus.status),
            })
          );
          if (
            this.testrunService.testrunInProgress(systemStatus.status) ||
            systemStatus.status === StatusOfTestrun.Cancelling
          ) {
            this.pullingSystemStatusData();
            this.fetchInternetConnection();
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
          if (systemStatus?.status !== StatusOfTestrun.WaitingForDevice) {
            if (isOpenWaitSnackBar) {
              this.notificationService.dismissWithTimout();
            } else {
              this.destroyWaitDeviceInterval$.next(true);
            }
          }
        }),
        tap(([{ systemStatus }, , status]) => {
          // for app - requires only status
          if (systemStatus.status !== status?.status) {
            this.store.dispatch(setStatus({ status: systemStatus.status }));
          }
          this.store.dispatch(setTestrunStatus({ systemStatus: systemStatus }));
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
      map(() =>
        AppActions.fetchSystemStatusSuccess({ systemStatus: IDLE_STATUS })
      )
    );
  });

  onFetchInterfaces$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.fetchInterfaces),
      switchMap(() =>
        this.testrunService.getSystemInterfaces().pipe(
          map((interfaces: SystemInterfaces) => {
            return AppActions.fetchInterfacesSuccess({ interfaces });
          })
        )
      )
    );
  });

  onFetchSystemConfig$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.fetchSystemConfig),
      switchMap(() =>
        this.testrunService.getSystemConfig().pipe(
          map((systemConfig: SystemConfig) => {
            return AppActions.fetchSystemConfigSuccess({ systemConfig });
          })
        )
      )
    );
  });

  private isTestrunFinished(status: string) {
    return (
      status === StatusOfTestrun.Complete ||
      status === StatusOfTestrun.Proceed ||
      status === StatusOfTestrun.DoNotProceed ||
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

  private fetchInternetConnection() {
    if (this.isSinglePortMode) {
      return;
    }
    if (
      this.internetSubscription === undefined ||
      this.internetSubscription?.closed
    ) {
      this.internetSubscription = this.testrunMqttService
        .getInternetConnection()
        .subscribe((internetConnection: InternetConnection) => {
          this.store.dispatch(
            updateInternetConnection({
              internetConnection: internetConnection.connection,
            })
          );
        });
    }
  }
}
