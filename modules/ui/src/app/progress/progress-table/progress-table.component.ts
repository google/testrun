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
import {IResult, StatusResultClassName} from '../../model/testrun-status';
import {TestRunService} from '../../services/test-run.service';

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
