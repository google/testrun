/**
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
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { TestRunService } from '../../services/test-run.service';
import {
  IResult,
  StatusOfTestrun,
  TestrunStatus,
  TestsData,
  TestsResponse,
} from '../../model/testrun-status';
import {
  interval,
  map,
  shareReplay,
  Subject,
  takeUntil,
  tap,
  timer,
} from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ProgressInitiateFormComponent } from './components/progress-initiate-form/progress-initiate-form.component';
import { DeleteFormComponent } from '../../components/delete-form/delete-form.component';
import { LoaderService } from '../../services/loader.service';
import { LOADER_TIMEOUT_CONFIG_TOKEN } from '../../services/loaderConfig';
import { FocusManagerService } from '../../services/focus-manager.service';
import { combineLatest } from 'rxjs/internal/observable/combineLatest';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/state';
import { selectHasDevices } from '../../store/selectors';

const EMPTY_RESULT = new Array(100).fill(null).map(() => ({}) as IResult);

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    LoaderService,
    { provide: LOADER_TIMEOUT_CONFIG_TOKEN, useValue: 0 },
  ],
})
export class ProgressComponent implements OnInit, OnDestroy {
  public systemStatus$!: Observable<TestrunStatus>;
  public dataSource$!: Observable<IResult[] | undefined>;
  public hasDevices$!: Observable<boolean>;
  public readonly StatusOfTestrun = StatusOfTestrun;

  private destroy$: Subject<boolean> = new Subject<boolean>();
  private destroyInterval$: Subject<boolean> = new Subject<boolean>();
  private startInterval = false;
  public currentStatus: TestrunStatus | null = null;
  isCancelling = false;

  constructor(
    private readonly testRunService: TestRunService,
    private readonly loaderService: LoaderService,
    public dialog: MatDialog,
    private readonly state: FocusManagerService,
    private store: Store<AppState>
  ) {}

  ngOnInit(): void {
    this.hasDevices$ = this.store.select(selectHasDevices);
    this.testRunService.getSystemStatus();

    combineLatest([
      this.testRunService.isOpenStartTestrun$,
      this.testRunService.isTestrunStarted$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([isOpenStartTestrun, isTestrunStarted]) => {
        if (isOpenStartTestrun && !isTestrunStarted) {
          this.openTestRunModal();
        }
      });

    this.systemStatus$ = this.testRunService.systemStatus$.pipe(
      tap(res => {
        this.currentStatus = res;
        if (this.testrunInProgress(res.status) && !this.startInterval) {
          this.pullingSystemStatusData();
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
          if (this.isCancelling) {
            this.state.focusFirstElementInContainer();
          }
          this.isCancelling = false;
          this.destroyInterval$.next(true);
          this.startInterval = false;
          this.hideLoading();
        }
      }),
      shareReplay({ refCount: true, bufferSize: 1 })
    );

    this.dataSource$ = this.systemStatus$.pipe(
      map((res: TestrunStatus) => {
        const results = (res.tests as TestsData)?.results || [];
        if (
          res.status === StatusOfTestrun.Monitoring ||
          res.status === StatusOfTestrun.WaitingForDevice ||
          (res.status === StatusOfTestrun.Cancelled && !results.length)
        ) {
          return EMPTY_RESULT;
        }

        const total = (res.tests as TestsData)?.total || 100;
        if (
          res.status === StatusOfTestrun.InProgress &&
          results.length < total
        ) {
          return [
            ...results,
            ...new Array(total - results.length)
              .fill(null)
              .map(() => ({}) as IResult),
          ];
        }

        return results;
      })
    );
  }

  testrunInProgress(status?: string): boolean {
    return (
      status === StatusOfTestrun.InProgress ||
      status === StatusOfTestrun.WaitingForDevice ||
      status === StatusOfTestrun.Monitoring
    );
  }

  private pullingSystemStatusData(): void {
    this.startInterval = true;
    interval(5000)
      .pipe(
        takeUntil(this.destroyInterval$),
        tap(() => this.testRunService.getSystemStatus(this.isCancelling))
      )
      .subscribe();
  }

  public openStopTestrunDialog() {
    const dialogRef = this.dialog.open(DeleteFormComponent, {
      ariaLabel: `Stop testrun ${this.getTestRunName()}`,
      data: {
        title: `Stop testrun ${this.getTestRunName()}`,
        content:
          'Are you sure you would like to stop testrun without a report generation?',
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'delete-form-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stopTestrun => {
        if (stopTestrun) {
          this.stopTestrun();
        }
      });
  }

  public stopTestrun(): void {
    this.showLoading();
    this.setCancellingStatus();
    this.sendCloseRequest();
  }

  private getTestRunName(): string {
    if (this.currentStatus?.device) {
      const device = this.currentStatus.device;
      return `${device.manufacturer} ${device.model} v${device.firmware}`;
    } else {
      return '';
    }
  }
  private setCancellingStatus() {
    this.isCancelling = true;
    if (this.currentStatus) {
      this.currentStatus.status = StatusOfTestrun.Cancelling;
      this.testRunService.setSystemStatus(this.currentStatus);
    }
  }
  private showLoading() {
    this.loaderService.setLoading(true);
  }

  private hideLoading() {
    this.loaderService.setLoading(false);
  }

  private sendCloseRequest() {
    this.testRunService
      .stopTestrun()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
    this.destroyInterval$.next(true);
    this.destroyInterval$.unsubscribe();
  }

  openTestRunModal(): void {
    const dialogRef = this.dialog.open(ProgressInitiateFormComponent, {
      ariaLabel: 'Initiate testrun',
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        timer(10)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.state.focusFirstElementInContainer();
          });
      });
  }

  resultIsEmpty(tests: TestsResponse | undefined) {
    return (
      (tests as TestsData)?.results?.length === 0 ||
      (tests as IResult[])?.length === 0
    );
  }
}
