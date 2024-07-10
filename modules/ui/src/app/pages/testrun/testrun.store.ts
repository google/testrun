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
import { AppState } from '../../store/state';
import { Store } from '@ngrx/store';
import {
  selectHasDevices,
  selectIsOpenStartTestrun,
  selectRiskProfiles,
  selectSystemStatus,
  selectTestModules,
} from '../../store/selectors';
import {
  fetchSystemStatus,
  fetchSystemStatusSuccess,
  setIsOpenStartTestrun,
  setIsStopTestrun,
  setTestrunStatus,
} from '../../store/actions';
import {
  IResult,
  StatusOfTestrun,
  TestrunStatus,
  TestsData,
  TestsResponse,
} from '../../model/testrun-status';
import { FocusManagerService } from '../../services/focus-manager.service';
import { LoaderService } from '../../services/loader.service';
import { TestModule } from '../../model/device';

const EMPTY_RESULT = new Array(100).fill(null).map(() => ({}) as IResult);

export interface TestrunComponentState {
  dataSource: IResult[] | undefined;
  stepsToResolveCount: number;
  testModules: TestModule[];
}

@Injectable()
export class TestrunStore extends ComponentStore<TestrunComponentState> {
  private dataSource$ = this.select(state => state.dataSource);
  private stepsToResolveCount$ = this.select(
    state => state.stepsToResolveCount
  );
  private hasDevices$ = this.store.select(selectHasDevices);
  private profiles$ = this.store.select(selectRiskProfiles);
  private systemStatus$ = this.store.select(selectSystemStatus);
  isOpenStartTestrun$ = this.store.select(selectIsOpenStartTestrun);
  testModules$ = this.store.select(selectTestModules);

  viewModel$ = this.select({
    hasDevices: this.hasDevices$,
    systemStatus: this.systemStatus$,
    dataSource: this.dataSource$,
    stepsToResolveCount: this.stepsToResolveCount$,
    profiles: this.profiles$,
    testModules: this.testModules$,
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

  getSystemStatus = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.store.dispatch(fetchSystemStatus());
      })
    );
  });

  getStatus = this.effect(() => {
    return this.systemStatus$.pipe(
      // perform some additional actions
      tap(res => {
        if (
          res?.status === StatusOfTestrun.WaitingForDevice ||
          res?.status === StatusOfTestrun.Monitoring ||
          (res?.status === StatusOfTestrun.InProgress &&
            this.resultIsEmpty(res.tests))
        ) {
          this.showLoading();
        }
        if (
          (res?.status === StatusOfTestrun.InProgress &&
            !this.resultIsEmpty(res.tests)) ||
          (!this.testrunInProgress(res?.status) &&
            res?.status !== StatusOfTestrun.Cancelling)
        ) {
          this.hideLoading();
        }
      }),
      // update data source
      tap(res => {
        const results = (res?.tests as TestsData)?.results || [];
        if (
          res?.status === StatusOfTestrun.Monitoring ||
          res?.status === StatusOfTestrun.WaitingForDevice ||
          (res?.status === StatusOfTestrun.Cancelled && !results.length)
        ) {
          this.setDataSource(EMPTY_RESULT);
          return;
        }

        const total = (res?.tests as TestsData)?.total || 100;
        if (
          res?.status === StatusOfTestrun.InProgress &&
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
  });
  stopTestrun = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.store.dispatch(setIsStopTestrun());
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

  setCancellingStatus = this.effect(trigger$ => {
    return trigger$.pipe(
      withLatestFrom(this.systemStatus$),
      tap(([, systemStatus]) => {
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

  setStatus = this.effect<TestrunStatus>(status$ => {
    return status$.pipe(
      tap(status => {
        this.store.dispatch(
          fetchSystemStatusSuccess({
            systemStatus: status,
          })
        );
      })
    );
  });
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
    private store: Store<AppState>,
    private readonly focusManagerService: FocusManagerService,
    private readonly loaderService: LoaderService
  ) {
    super({
      dataSource: undefined,
      stepsToResolveCount: 0,
      testModules: [],
    });
  }
}
