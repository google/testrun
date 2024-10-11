/*
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
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ConsentDialogResult, Version } from '../../../model/version';
import { MatButtonModule } from '@angular/material/button';
import { CalloutComponent } from '../../callout/callout.component';
import { CalloutType } from '../../../model/callout-type';
import { NgIf } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { FocusManagerService } from '../../../services/focus-manager.service';
import { timer } from 'rxjs';

type DialogData = {
  version: Version;
};

@Component({
  selector: 'app-consent-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    CalloutComponent,
    NgIf,
    MatCheckbox,
    FormsModule,
  ],
  templateUrl: './consent-dialog.component.html',
  styleUrl: './consent-dialog.component.scss',
})
export class ConsentDialogComponent {
  public readonly CalloutType = CalloutType;
  optOut = false;
  constructor(
    private readonly focusManagerService: FocusManagerService,
    public dialogRef: MatDialogRef<ConsentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  confirm(optOut: boolean) {
    // dialog should be closed with opposite value to grant or deny access to GA
    const dialogResult: ConsentDialogResult = {
      grant: !optOut,
    };
    this.dialogRef.close(dialogResult);
    timer(100).subscribe(() => {
      this.focusManagerService.focusFirstElementInContainer();
    });
  }
}
