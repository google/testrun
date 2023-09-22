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
