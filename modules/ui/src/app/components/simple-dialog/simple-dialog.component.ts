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
import { EscapableDialogComponent } from '../escapable-dialog/escapable-dialog.component';
import { ComponentWithAnnouncement } from '../component-with-announcement';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FocusManagerService } from '../../services/focus-manager.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

interface DialogData {
  icon?: string;
  title?: string;
  content?: string;
  confirmName?: string;
}

@Component({
  selector: 'app-simple-dialog',
  templateUrl: './simple-dialog.component.html',
  styleUrls: ['./simple-dialog.component.scss'],

  imports: [MatDialogModule, MatButtonModule, MatIconModule, CommonModule],
})
export class SimpleDialogComponent extends ComponentWithAnnouncement(
  EscapableDialogComponent
) {
  override dialogRef: MatDialogRef<SimpleDialogComponent>;
  data: DialogData;
  liveAnnouncer: LiveAnnouncer;
  override focusService: FocusManagerService;

  constructor() {
    const dialogRef = inject<MatDialogRef<SimpleDialogComponent>>(MatDialogRef);
    const data = inject<DialogData>(MAT_DIALOG_DATA);
    const liveAnnouncer = inject(LiveAnnouncer);
    const focusService = inject(FocusManagerService);

    // @ts-expect-error ComponentWithAnnouncement should have 4 arguments
    super(dialogRef, data.title, liveAnnouncer, focusService);
    this.dialogRef = dialogRef;
    this.data = data;
    this.liveAnnouncer = liveAnnouncer;
    this.focusService = focusService;
  }

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close();
  }
}
