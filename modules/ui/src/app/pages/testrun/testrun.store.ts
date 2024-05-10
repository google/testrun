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
import { TestRunService } from '../../services/test-run.service';
import { exhaustMap, interval, Subject, take, timer } from 'rxjs';
import { tap, withLatestFrom } from 'rxjs/operators';
import { AppState } from '../../store/state';
import { Store } from '@ngrx/store';
import {
  selectHasDevices,
  selectIsOpenStartTestrun,
  selectIsOpenWaitSnackBar,
  selectIsStopTestrun,
  selectIsTestrunStarted,
  selectSystemStatus,
} from '../../store/selectors';
import {
  setIsOpenStartTestrun,
  setIsTestrunStarted,
  setTestrunStatus,
} from '../../store/actions';
import {
  IResult,
  StatusOfTestrun,
  TestrunStatus,
  TestsData,
  TestsResponse,
} from '../../model/testrun-status';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { FocusManagerService } from '../../services/focus-manager.service';
import { LoaderService } from '../../services/loader.service';
import { NotificationService } from '../../services/notification.service';

const EMPTY_RESULT = new Array(100).fill(null).map(() => ({}) as IResult);
const WAIT_TO_OPEN_SNACKBAR_MS = 60 * 1000;

export interface TestrunComponentState {
  dataSource: IResult[] | undefined;
  isCancelling: boolean;
  startInterval: boolean;
  stepsToResolveCount: number;
}

@Injectable()
export class TestrunStore extends ComponentStore<TestrunComponentState> {
  private destroyInterval$: Subject<boolean> = new Subject<boolean>();
  private destroyWaitDeviceInterval$: Subject<boolean> = new Subject<boolean>();
  private dataSource$ = this.select(state => state.dataSource);
  private isCancelling$ = this.select(state => state.isCancelling);
  private startInterval$ = this.select(state => state.startInterval);
  private stepsToResolveCount$ = this.select(
    state => state.stepsToResolveCount
  );
  private hasDevices$ = this.store.select(selectHasDevices);
  private systemStatus$ = this.store.select(selectSystemStatus);
  isTestrunStarted$ = this.store.select(selectIsTestrunStarted);
  isStopTestrun$ = this.store.select(selectIsStopTestrun);
  isOpenWaitSnackBar$ = this.store.select(selectIsOpenWaitSnackBar);
  isOpenStartTestrun$ = this.store.select(selectIsOpenStartTestrun);
  viewModel$ = this.select({
    hasDevices: this.hasDevices$,
    systemStatus: this.systemStatus$,
    dataSource: this.dataSource$,
    stepsToResolveCount: this.stepsToResolveCount$,
    isCancelling: this.isCancelling$,
    startInterval: this.startInterval$,
  });

  setDataSource = this.updater((state, dataSource: IResult[] | undefined) => {
    const stepsToResolveCount =
      dataSource?.filter(result => result.recommendations).length || 0;
    return {
      ...state,
      stepsToResolveCount,
      dataSource,
    };
  });

  updateCancelling = this.updater((state, isCancelling: boolean) => {
    return {
      ...state,
      isCancelling,
    };
  });

  updateStartInterval = this.updater((state, startInterval: boolean) => {
    return {
      ...state,
      startInterval,
    };
  });

  getStatus = this.effect(trigger$ => {
    return trigger$.pipe(
      exhaustMap(() => {
        return this.testRunService.fetchSystemStatus().pipe(
          withLatestFrom(
            this.isCancelling$,
            this.startInterval$,
            this.isOpenWaitSnackBar$
          ),
          // change status if cancelling in process
          tap(([res, isCancelling]) => {
            if (isCancelling && res.status !== StatusOfTestrun.Cancelled) {
              res.status = StatusOfTestrun.Cancelling;
            }
          }),
          // perform some additional actions
          tap(([res, , startInterval, isOpenWaitSnackBar]) => {
            this.store.dispatch(setTestrunStatus({ systemStatus: res }));

            if (this.testrunInProgress(res.status) && !startInterval) {
              this.pullingSystemStatusData();
            }
            if (
              res.status === StatusOfTestrun.WaitingForDevice &&
              !isOpenWaitSnackBar
            ) {
              this.showSnackBar();
            }
            if (
              res.status !== StatusOfTestrun.WaitingForDevice &&
              isOpenWaitSnackBar
            ) {
              this.notificationService.dismissWithTimout();
            }
            if (
              res.status === StatusOfTestrun.WaitingForDevice ||
              res.status === StatusOfTestrun.Monitoring ||
              (res.status === StatusOfTestrun.InProgress &&
                this.resultIsEmpty(res.tests))
            ) {
              this.showLoading();
            }
            if (
              res.status === StatusOfTestrun.InProgress &&
              !this.resultIsEmpty(res.tests)
            ) {
              this.hideLoading();
            }
            if (
              !this.testrunInProgress(res.status) &&
              res.status !== StatusOfTestrun.Cancelling
            ) {
              this.updateCancelling(false);
              this.destroyInterval$.next(true);
              this.updateStartInterval(false);
              this.hideLoading();
            }
          }),
          // update data source
          tap(([res]) => {
            const results = (res.tests as TestsData)?.results || [];
            if (
              res.status === StatusOfTestrun.Monitoring ||
              res.status === StatusOfTestrun.WaitingForDevice ||
              (res.status === StatusOfTestrun.Cancelled && !results.length)
            ) {
              this.setDataSource(EMPTY_RESULT);
              return;
            }

            const total = (res.tests as TestsData)?.total || 100;
            if (
              res.status === StatusOfTestrun.InProgress &&
              results.length < total
            ) {
              this.setDataSource([
                ...results,
                ...new Array(total - results.length)
                  .fill(null)
                  .map(() => ({}) as IResult),
              ]);
              return;
            }

            this.setDataSource(results);
          })
        );
      })
    );
  });
  stopTestrun = this.effect(trigger$ => {
    return trigger$.pipe(
      exhaustMap(() => {
        return this.testRunService.stopTestrun();
      })
    );
  });

  setIsOpenStartTestrun = this.effect<boolean>(trigger$ => {
    return trigger$.pipe(
      tap(isOpenStartTestrun => {
        this.store.dispatch(setIsOpenStartTestrun({ isOpenStartTestrun }));
      })
    );
  });

  setIsTestrunStarted = this.effect<boolean>(trigger$ => {
    return trigger$.pipe(
      tap(isTestrunStarted => {
        this.store.dispatch(setIsTestrunStarted({ isTestrunStarted }));
      })
    );
  });

  destroyInterval = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.destroyInterval$.next(true);
        this.destroyInterval$.unsubscribe();
      })
    );
  });

  setCancellingStatus = this.effect(trigger$ => {
    return trigger$.pipe(
      withLatestFrom(this.systemStatus$),
      tap(([, systemStatus]) => {
        this.updateCancelling(true);
        if (systemStatus) {
          this.store.dispatch(
            setTestrunStatus({
              systemStatus: this.getCancellingStatus(systemStatus),
            })
          );
        }
      })
    );
  });

  resultIsEmpty(tests: TestsResponse | undefined) {
    return (
      (tests as TestsData)?.results?.length === 0 ||
      (tests as IResult[])?.length === 0
    );
  }

  showLoading() {
    this.loaderService.setLoading(true);
  }

  private showSnackBar() {
    timer(WAIT_TO_OPEN_SNACKBAR_MS)
      .pipe(
        take(1),
        takeUntil(this.destroyWaitDeviceInterval$),
        withLatestFrom(this.systemStatus$),
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
    this.updateStartInterval(true);
    interval(5000)
      .pipe(
        takeUntil(this.destroyInterval$),
        tap(() => this.getStatus())
      )
      .subscribe();
  }

  private getCancellingStatus(systemStatus: TestrunStatus): TestrunStatus {
    const status = Object.assign({}, systemStatus);
    status.status = StatusOfTestrun.Cancelling;
    return status;
  }

  private testrunInProgress(status?: string): boolean {
    return (
      status === StatusOfTestrun.InProgress ||
      status === StatusOfTestrun.WaitingForDevice ||
      status === StatusOfTestrun.Monitoring
    );
  }

  private hideLoading() {
    this.loaderService.setLoading(false);
  }

  constructor(
    private testRunService: TestRunService,
    private notificationService: NotificationService,
    private store: Store<AppState>,
    private readonly focusManagerService: FocusManagerService,
    private readonly loaderService: LoaderService
  ) {
    super({
      isCancelling: false,
      startInterval: false,
      dataSource: undefined,
      stepsToResolveCount: 0,
    });
  }
}
