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
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Observable} from 'rxjs/internal/Observable';
import {IResult, StatusOfTestrun, TestrunStatus, TestsData} from '../../model/testrun-status';

@Component({
  selector: 'app-progress-status-card',
  templateUrl: './progress-status-card.component.html',
  styleUrls: ['./progress-status-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressStatusCardComponent {
  @Input() systemStatus$!: Observable<TestrunStatus>;

  public readonly StatusOfTestrun = StatusOfTestrun;

  public getClass(status: string): { progress: boolean, 'completed-success': boolean, 'completed-failed': boolean, canceled: boolean } {
    return {
      'progress': status === StatusOfTestrun.InProgress,
      'completed-success': status === StatusOfTestrun.Compliant || status === StatusOfTestrun.SmartReady,
      'completed-failed': status === StatusOfTestrun.NonCompliant,
      'canceled': status === StatusOfTestrun.Cancelled
    }
  }

  public getTestsResult(data: TestrunStatus): string {
    if (data.status === StatusOfTestrun.InProgress || data.status === StatusOfTestrun.Cancelled || data.finished) {
      if ((data.tests as TestsData)?.results?.length && (data.tests as TestsData)?.total) {
        return `${(data.tests as TestsData)?.results?.length}/${(data.tests as TestsData)?.total}`
      } else if ((data.tests as IResult[])?.length) {
        return `${(data.tests as IResult[])?.length}/${(data.tests as IResult[])?.length}`
      }
    }
    return '';
  }

  public getTestStatus(data: TestrunStatus): string {
    if (data.finished) {
      return 'Complete';
    } else if (data.status === StatusOfTestrun.Cancelled) {
      return 'Incomplete';
    } else {
      return data.status;
    }
  }

  public getProgressValue(data: TestrunStatus): number {
    const testData = data.tests as TestsData;

    if (testData && testData.total && testData.results?.length) {
      return Math.round(testData.results.length / testData.total * 100);
    }
    return 0;
  }
}
