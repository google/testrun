import {Component, OnInit} from '@angular/core';
import {TestRunService} from '../test-run.service';
import {Observable} from 'rxjs/internal/Observable';
import {StatusResultClassName, TestrunStatus} from '../model/testrun-status';
import {DatePipe} from '@angular/common';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  history$!: Observable<TestrunStatus[]>;
  displayedColumns: string[] = ['#', 'started', 'finished', 'manufacturer', 'model', 'result', 'report']

  constructor(private testRunService: TestRunService, private datePipe: DatePipe) {
    this.testRunService.fetchHistory();
  }

  ngOnInit() {
    this.history$ = this.testRunService.getHistory();
  }

  getTestRunId(data: TestrunStatus) {
    return `${data.device.manufacturer} ${data.device.model} ${data.device.firmware} ${this.getFormattedDateString(data.started)}`;
  }

  getFormattedDateString(date: string | null) {
    return date ? this.datePipe.transform(date, 'd MMM y H:mm') : '';
  }

  public getResultClass(status: string): StatusResultClassName {
    return this.testRunService.getResultClass(status);
  }
}
