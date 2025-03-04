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
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { EscapableDialogComponent } from '../../../../components/escapable-dialog/escapable-dialog.component';
import { IResult } from '../../../../model/testrun-status';

interface DialogData {
  testResult: IResult;
}

@Component({
  selector: 'app-test-result-dialog',
  imports: [MatDialogModule, MatButtonModule, CommonModule],
  templateUrl: './test-result-dialog.component.html',
  styleUrl: './test-result-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestResultDialogComponent extends EscapableDialogComponent {
  override dialogRef: MatDialogRef<TestResultDialogComponent>;
  data = inject<DialogData>(MAT_DIALOG_DATA);

  constructor() {
    const dialogRef =
      inject<MatDialogRef<TestResultDialogComponent>>(MatDialogRef);

    super();
    this.dialogRef = dialogRef;
  }
}
