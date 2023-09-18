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
  displayedColumns: string[] = ['started', 'duration', 'device', 'firmware', 'result', 'report'];

  constructor(private testRunService: TestRunService, private datePipe: DatePipe) {
    this.testRunService.fetchHistory();
  }

  ngOnInit() {
    this.history$ = this.testRunService.getHistory();
  }

  getFormattedDateString(date: string | null) {
    return date ? this.datePipe.transform(date, 'd MMM y H:mm') : '';
  }

  private transformDate(date: number, format: string) {
    return this.datePipe.transform(date, format);
  }

  public getDuration(started: string | null, finished: string | null): string {
    if (!started || !finished) {
      return '';
    }
    const startedDate = new Date(started);
    const finishedDate = new Date(finished);

    const durationMillisecond = finishedDate.getTime() - startedDate.getTime();
    const durationMinuts = this.transformDate(durationMillisecond, 'mm');
    const durationSeconds = this.transformDate(durationMillisecond, 'ss');

    return `${durationMinuts}m ${durationSeconds}s`
  }

  public getResultClass(status: string): StatusResultClassName {
    return this.testRunService.getResultClass(status);
  }
}
