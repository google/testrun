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
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  inject,
} from '@angular/core';
import {
  ResultOfTestrun,
  StatusOfTestResult,
  StatusOfTestrun,
  TestrunStatus,
  TestsData,
} from '../../../../model/testrun-status';
import { TestingType } from '../../../../model/device';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { TimerComponent } from '../timer/timer.component';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../store/state';
import { selectSystemConfig } from '../../../../store/selectors';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-testrun-status-card',
  templateUrl: './testrun-status-card.component.html',
  styleUrls: ['./testrun-status-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatDialogModule,
    MatInputModule,
    MatExpansionModule,
    ReactiveFormsModule,
    MatTooltipModule,
    TimerComponent,
  ],
})
export class TestrunStatusCardComponent
  implements OnInit, OnChanges, OnDestroy
{
  @Input() systemStatus!: TestrunStatus;
  @Input() monitorPeriod?: number;

  public isTimerExpired = false;
  private readonly store = inject(Store<AppState>, { optional: true });
  private readonly cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  public readonly StatusOfTestrun = StatusOfTestrun;
  public readonly TestingType = TestingType;

  ngOnInit(): void {
    if (this.store && this.monitorPeriod === undefined) {
      this.store
        .select(selectSystemConfig)
        .pipe(takeUntil(this.destroy$))
        .subscribe(config => {
          if (config?.monitor_period) {
            this.monitorPeriod = Number(config.monitor_period);
            this.cdr.markForCheck();
          }
        });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['systemStatus']) {
      const current = changes['systemStatus'].currentValue as
        TestrunStatus | undefined;
      const previous = changes['systemStatus'].previousValue as
        TestrunStatus | undefined;
      if (
        current?.status === StatusOfTestrun.Monitoring &&
        previous?.status !== StatusOfTestrun.Monitoring
      ) {
        this.isTimerExpired = false;
        this.cdr.markForCheck();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public getClass(
    status: StatusOfTestrun,
    result?: ResultOfTestrun
  ): {
    progress: boolean;
    'completed-success': boolean;
    'completed-failed': boolean;
    canceled: boolean;
    error: boolean;
  } {
    return {
      progress:
        this.isProgressStatus(status) ||
        status === StatusOfTestrun.Cancelling ||
        status === StatusOfTestrun.Stopping,
      'completed-success':
        (result === ResultOfTestrun.Compliant &&
          status === StatusOfTestrun.Complete) ||
        status === StatusOfTestrun.CompliantLimited ||
        status === StatusOfTestrun.CompliantHigh ||
        status === StatusOfTestrun.SmartReady ||
        status === StatusOfTestrun.Proceed,
      'completed-failed':
        (result === ResultOfTestrun.NonCompliant &&
          status === StatusOfTestrun.Complete) ||
        status === StatusOfTestrun.DoNotProceed,
      canceled: status === StatusOfTestrun.Cancelled,
      error: status === StatusOfTestrun.Error,
    };
  }

  public getTestsResult(data: TestrunStatus): string {
    if (
      data.status === StatusOfTestrun.InProgress ||
      data.status === StatusOfTestrun.Cancelled ||
      data.status === StatusOfTestrun.Cancelling ||
      data.status === StatusOfTestrun.Stopping ||
      data.finished
    ) {
      const testData = data.tests as TestsData;
      if (testData && testData.total && testData.results?.length) {
        return `${this.getTestsExecuted(testData)}/${testData.total}`;
      }
    }
    return '-/-';
  }

  public getTestStatusText(data: TestrunStatus): string {
    if (!data.finished) {
      return 'Status';
    } else {
      return 'Result';
    }
  }

  public getTestStatus(data: TestrunStatus): string {
    if (
      data.status === StatusOfTestrun.Complete ||
      data.status === StatusOfTestrun.Proceed ||
      data.status === StatusOfTestrun.DoNotProceed
    ) {
      return data.result!;
    }
    if (data.status === StatusOfTestrun.Stopping) {
      return StatusOfTestrun.Cancelling;
    }
    return data.status;
  }

  private isProgressStatus(status: string): boolean {
    return (
      status === StatusOfTestrun.Monitoring ||
      status === StatusOfTestrun.InProgress ||
      status === StatusOfTestrun.WaitingForDevice ||
      status === StatusOfTestrun.Starting ||
      status === StatusOfTestrun.Validating
    );
  }

  public getProgressValue(data: TestrunStatus): number {
    const testData = data.tests as TestsData;

    if (testData && testData.total && testData.results?.length) {
      return Math.round(
        (this.getTestsExecuted(testData) / testData.total) * 100
      );
    }
    return 0;
  }

  private getTestsExecuted(testData: TestsData) {
    if (testData && testData.results) {
      return testData.results.filter(
        result =>
          result.result !== StatusOfTestResult.NotStarted &&
          result.result !== StatusOfTestResult.InProgress &&
          result.result !== StatusOfTestResult.Error
      ).length;
    }
    return 0;
  }
}
