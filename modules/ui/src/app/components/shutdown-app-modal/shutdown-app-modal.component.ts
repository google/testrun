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
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { EscapableDialogComponent } from '../escapable-dialog/escapable-dialog.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

interface DialogData {
  title?: string;
  content?: string;
}

@Component({
  selector: 'app-shutdown-app-modal',
  templateUrl: './shutdown-app-modal.component.html',
  styleUrl: './shutdown-app-modal.component.scss',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShutdownAppModalComponent extends EscapableDialogComponent {
  constructor(
    public override dialogRef: MatDialogRef<ShutdownAppModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    super(dialogRef);
  }

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close();
  }
}
