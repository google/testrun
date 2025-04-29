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
import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { EscapableDialogComponent } from '../../../../components/escapable-dialog/escapable-dialog.component';
import {
  Profile,
  ProfileRisk,
  RiskResultClassName,
} from '../../../../model/profile';
import { TestRunService } from '../../../../services/test-run.service';
import { CommonModule } from '@angular/common';

interface DialogData {
  profile: Profile;
}

@Component({
  selector: 'app-success-dialog',
  templateUrl: './success-dialog.component.html',
  styleUrls: ['./success-dialog.component.scss'],

  imports: [MatDialogModule, MatButtonModule, CommonModule],
})
export class SuccessDialogComponent extends EscapableDialogComponent {
  private readonly testRunService = inject(TestRunService);
  override dialogRef: MatDialogRef<SuccessDialogComponent>;
  data = inject<DialogData>(MAT_DIALOG_DATA);

  constructor() {
    const dialogRef =
      inject<MatDialogRef<SuccessDialogComponent>>(MatDialogRef);

    super();
    this.dialogRef = dialogRef;
  }

  confirm() {
    this.dialogRef.close();
  }

  public getRiskClass(riskResult: string): RiskResultClassName {
    return this.testRunService.getRiskClass(riskResult);
  }

  getRiskExplanation(risk: string | undefined) {
    return risk === ProfileRisk.HIGH
      ? 'An additional assessment may be required.'
      : '';
  }
}
