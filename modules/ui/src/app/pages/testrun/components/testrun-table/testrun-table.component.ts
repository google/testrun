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
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { MatAccordion, MatExpansionPanel } from '@angular/material/expansion';
import {
  IResult,
  StatusResultClassName,
} from '../../../../model/testrun-status';
import { CalloutType } from '../../../../model/callout-type';
import { TestRunService } from '../../../../services/test-run.service';

@Component({
  selector: 'app-testrun-table',
  templateUrl: './testrun-table.component.html',
  styleUrls: ['./testrun-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TestrunTableComponent {
  @ViewChild(MatAccordion) accordion!: MatAccordion;
  @ViewChildren(MatExpansionPanel) panels!: QueryList<MatExpansionPanel>;
  public readonly CalloutType = CalloutType;
  @Input() dataSource!: IResult[] | undefined;
  @Input() stepsToResolveCount = 0;
  isAllCollapsed!: boolean;

  constructor(private readonly testRunService: TestRunService) {}
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
    const message = this.stepsToResolveCount === 1 ? 'row' : 'all rows';
    return `${action} ${message}`;
  }

  public trackTest(index: number, item: IResult) {
    return item.name + item.result;
  }
}
