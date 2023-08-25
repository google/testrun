import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Observable} from 'rxjs/internal/Observable';
import {IResult, StatusResultClassName} from '../../model/testrun-status';
import {TestRunService} from '../../test-run.service';

@Component({
  selector: 'app-progress-table',
  templateUrl: './progress-table.component.html',
  styleUrls: ['./progress-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressTableComponent {
  @Input() dataSource$!: Observable<IResult[] | undefined>;

  displayedColumns: string[] = ['name', 'description', 'result'];

  constructor(private readonly testRunService: TestRunService) {}

  public getResultClass(result: string): StatusResultClassName {
    return this.testRunService.getResultClass(result);
  }
}
