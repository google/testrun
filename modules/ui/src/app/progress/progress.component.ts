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
import { TestRunService } from '../services/test-run.service';
import {
  IResult,
  StatusOfTestrun,
  TestrunStatus,
  TestsData,
  TestsResponse,
} from '../model/testrun-status';
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
import { ProgressInitiateFormComponent } from './progress-initiate-form/progress-initiate-form.component';
import { DeleteFormComponent } from '../components/delete-form/delete-form.component';
import { LoaderService } from '../services/loader.service';
import { LOADER_TIMEOUT_CONFIG_TOKEN } from '../services/loaderConfig';
import { Device } from '../model/device';
import { StateService } from '../services/state.service';

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
  public devices$!: Observable<Device[] | null>;
  public readonly StatusOfTestrun = StatusOfTestrun;

  private destroy$: Subject<boolean> = new Subject<boolean>();
  private startInterval = false;
  public currentStatus: TestrunStatus | null = null;
  isCancelling = false;

  constructor(
    private readonly testRunService: TestRunService,
    private readonly loaderService: LoaderService,
    public dialog: MatDialog,
    private readonly state: StateService
  ) {}

  ngOnInit(): void {
    this.devices$ = this.testRunService.getDevices();

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
            this.state.focusFirstElementInMain();
          }
          this.isCancelling = false;
          this.destroy$.next(true);
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
          res.status === StatusOfTestrun.WaitingForDevice
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
        takeUntil(this.destroy$),
        tap(() => this.testRunService.getSystemStatus(this.isCancelling))
      )
      .subscribe();
  }

  public openStopTestrunDialog() {
    const dialogRef = this.dialog.open(DeleteFormComponent, {
      ariaLabel: 'Stop testrun',
      data: {
        title: 'Stop testrun',
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
        timer(0)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.state.focusFirstElementInMain();
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
