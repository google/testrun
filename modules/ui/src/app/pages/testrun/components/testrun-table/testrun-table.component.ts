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
  inject,
} from '@angular/core';
import {
  IResult,
  RequiredResult,
  StatusOfTestResult,
  StatusResultClassName,
} from '../../../../model/testrun-status';
import { CalloutType } from '../../../../model/callout-type';
import { TestRunService } from '../../../../services/test-run.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatRippleModule } from '@angular/material/core';
import { TestResultDialogComponent } from '../test-result-dialog/test-result-dialog.component';

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
    MatTableModule,
    MatRippleModule,
    ReactiveFormsModule,
    MatTooltipModule,
  ],
})
export class TestrunTableComponent {
  private readonly testRunService = inject(TestRunService);
  public readonly CalloutType = CalloutType;
  @Input() dataSource!: IResult[] | undefined;
  dialog = inject(MatDialog);

  displayedColumns: string[] = [
    'name',
    'description',
    'result',
    'requiredResult',
    'clickableIcon',
  ];

  onRowSelected(testResult: IResult) {
    this.dialog.open(TestResultDialogComponent, {
      ariaLabel: 'Test result information',
      data: {
        testResult,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: ['simple-dialog'],
    });
  }

  isClickableRow = (i: number, row: IResult) => row.recommendations;

  public getResultClass(result: string): StatusResultClassName {
    return this.testRunService.getResultClass(result);
  }

  public getRequiredResultClass(result: string): string {
    if (!result) {
      return '';
    }
    return result.split(' ').join('-').toLowerCase();
  }

  public trackTest(index: number, item: IResult) {
    return item.name + item.result;
  }

  public isNonCompliantAndRequired(result: string, requiredResult: string) {
    return (
      result === StatusOfTestResult.NonCompliant &&
      requiredResult === RequiredResult.Required
    );
  }
}
