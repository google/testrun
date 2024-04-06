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
  Component,
  Input,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { MatAccordion, MatExpansionPanel } from '@angular/material/expansion';
import { Observable } from 'rxjs/internal/Observable';
import {
  IResult,
  StatusResultClassName,
} from '../../../../model/testrun-status';
import { CalloutType } from '../../../../model/callout-type';
import { TestRunService } from '../../../../services/test-run.service';
import { tap } from 'rxjs/internal/operators/tap';
import { shareReplay } from 'rxjs/internal/operators/shareReplay';

@Component({
  selector: 'app-progress-table',
  templateUrl: './progress-table.component.html',
  styleUrls: ['./progress-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressTableComponent implements OnInit {
  @ViewChild(MatAccordion) accordion!: MatAccordion;
  @ViewChildren(MatExpansionPanel) panels!: QueryList<MatExpansionPanel>;
  public readonly CalloutType = CalloutType;
  @Input() dataSource$!: Observable<IResult[] | undefined>;
  isAllCollapsed!: boolean;
  stepsToResolve?: IResult[];

  constructor(private readonly testRunService: TestRunService) {}

  ngOnInit() {
    this.dataSource$ = this.dataSource$.pipe(
      tap(
        items =>
          (this.stepsToResolve = items?.filter(item => item.recommendations))
      ),
      shareReplay({ refCount: true, bufferSize: 1 })
    );
  }

  public checkAllCollapsed(): void {
    this.isAllCollapsed = this.panels
      ?.toArray()
      .every(panel => !panel.expanded);
  }

  public getResultClass(result: string): StatusResultClassName {
    return this.testRunService.getResultClass(result);
  }
  public getAriaLabel(): string {
    const action = this.isAllCollapsed ? 'Expand' : 'Collapse';
    const message = this.stepsToResolve?.length === 1 ? 'row' : 'all rows';
    return `${action} ${message}`;
  }

  public trackTest(index: number, item: IResult) {
    return item.name + item.result;
  }
}
