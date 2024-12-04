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
  viewChild,
  viewChildren,
  inject,
} from '@angular/core';
import {
  MatAccordion,
  MatExpansionModule,
  MatExpansionPanel,
} from '@angular/material/expansion';
import {
  IResult,
  StatusResultClassName,
} from '../../../../model/testrun-status';
import { CalloutType } from '../../../../model/callout-type';
import { TestRunService } from '../../../../services/test-run.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CalloutComponent } from '../../../../components/callout/callout.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-testrun-table',
  templateUrl: './testrun-table.component.html',
  styleUrls: ['./testrun-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatDialogModule,
    MatInputModule,
    MatExpansionModule,
    ReactiveFormsModule,
    CalloutComponent,
    MatTooltipModule,
  ],
})
export class TestrunTableComponent {
  private readonly testRunService = inject(TestRunService);

  readonly accordion = viewChild.required(MatAccordion);
  readonly panels = viewChildren(MatExpansionPanel);
  public readonly CalloutType = CalloutType;
  @Input() dataSource!: IResult[] | undefined;
  @Input() stepsToResolveCount = 0;
  isAllCollapsed!: boolean;
  public checkAllCollapsed(): void {
    this.isAllCollapsed = this.panels().every(panel => !panel.expanded);
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
