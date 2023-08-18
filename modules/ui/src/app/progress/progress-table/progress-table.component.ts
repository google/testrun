import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Observable} from 'rxjs/internal/Observable';
import {IResult, StatusOfTestResult} from '../../model/testrun-status';

@Component({
  selector: 'app-progress-table',
  templateUrl: './progress-table.component.html',
  styleUrls: ['./progress-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressTableComponent {
  @Input() dataSource$!: Observable<IResult[] | undefined>;

  displayedColumns: string[] = ['name', 'description', 'result'];

  public getResultClass(result: string): { green: boolean, read: boolean, grey: boolean } {
    return {
      'green': result === StatusOfTestResult.Compliant || result === StatusOfTestResult.SmartReady,
      'read': result === StatusOfTestResult.NonCompliant,
      'grey': result === StatusOfTestResult.Skipped || result === StatusOfTestResult.NotStarted
    }
  }
}
