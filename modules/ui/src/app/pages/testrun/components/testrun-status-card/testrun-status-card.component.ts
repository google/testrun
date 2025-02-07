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
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  IResult,
  ResultOfTestrun,
  StatusOfTestResult,
  StatusOfTestrun,
  TestrunStatus,
  TestsData,
} from '../../../../model/testrun-status';
import { TestingType } from '../../../../model/device';

@Component({
  selector: 'app-testrun-status-card',
  templateUrl: './testrun-status-card.component.html',
  styleUrls: ['./testrun-status-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestrunStatusCardComponent {
  @Input() systemStatus!: TestrunStatus;

  public readonly StatusOfTestrun = StatusOfTestrun;
  public readonly TestingType = TestingType;

  public getClass(
    status: StatusOfTestrun,
    result?: ResultOfTestrun
  ): {
    progress: boolean;
    'completed-success': boolean;
    'completed-failed': boolean;
    canceled: boolean;
  } {
    return {
      progress: this.isProgressStatus(status),
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
        status === StatusOfTestrun.Error ||
        status === StatusOfTestrun.DoNotProceed,
      canceled:
        status === StatusOfTestrun.Cancelled ||
        status === StatusOfTestrun.Cancelling,
    };
  }

  public getTestsResult(data: TestrunStatus): string {
    if (
      data.status === StatusOfTestrun.InProgress ||
      data.status === StatusOfTestrun.Cancelled ||
      data.status === StatusOfTestrun.Cancelling ||
      data.finished
    ) {
      if (
        (data.tests as TestsData)?.results?.length &&
        (data.tests as TestsData)?.total
      ) {
        return `${(data.tests as TestsData)?.results?.filter(result => result.result !== StatusOfTestResult.NotStarted && result.result !== StatusOfTestResult.Error).length}/${
          (data.tests as TestsData)?.total
        }`;
      } else if ((data.tests as IResult[])?.length) {
        return `${(data.tests as IResult[])?.filter(result => result.result !== StatusOfTestResult.NotStarted && result.result !== StatusOfTestResult.Error).length}/${
          (data.tests as IResult[])?.length
        }`;
      }
    }
    return '';
  }

  public getTestStatus(data: TestrunStatus): string {
    if (data.status === StatusOfTestrun.Cancelled) {
      return 'Incomplete';
    } else if (data.finished && !this.isProgressStatus(data.status)) {
      return 'Complete';
    } else {
      return data.status;
    }
  }

  public getTestResult(data: TestrunStatus): string {
    if (
      data.status === StatusOfTestrun.Complete ||
      data.status === StatusOfTestrun.Proceed ||
      data.status === StatusOfTestrun.DoNotProceed
    ) {
      return data.result!;
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
        (testData.results.filter(
          result => result.result !== StatusOfTestResult.NotStarted
        ).length /
          testData.total) *
          100
      );
    }
    return 0;
  }
}
