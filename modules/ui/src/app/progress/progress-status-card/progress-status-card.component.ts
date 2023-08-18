import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Observable} from 'rxjs/internal/Observable';
import {TestrunStatus, StatusOfTestrun, TestsData, IResult} from '../../model/testrun-status';

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
    if (data.status === StatusOfTestrun.InProgress || data.finished) {
      if ((data.tests as TestsData)?.results?.length && (data.tests as TestsData)?.total) {
        return `${(data.tests as TestsData)?.results?.length}/${(data.tests as TestsData)?.total}`
      } else if((data.tests as IResult[])?.length) {
        return `${(data.tests as IResult[])?.length}/${(data.tests as IResult[])?.length}`
      }
    }
    return '';
  }

  public getProgressValue(data: TestrunStatus): number {
    const testData = data.tests as TestsData;

    if (testData && testData.total && testData.results?.length) {
      return testData.results.length / testData.total * 100;
    }
    return 0;
  }
}
