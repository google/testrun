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

import { Injectable } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar,
} from '@angular/material/snack-bar';
import { FocusManagerService } from './focus-manager.service';
import { delay } from 'rxjs/internal/operators/delay';
import { take } from 'rxjs/internal/operators/take';

const TIMEOUT_MS = 8000;

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private snackBarRef!: MatSnackBarRef<TextOnlySnackBar>;
  constructor(
    public snackBar: MatSnackBar,
    private focusManagerService: FocusManagerService
  ) {}

  notify(message: string, duration = 0, panelClass = 'test-run-notification') {
    this.snackBarRef = this.snackBar.open(message, 'OK', {
      horizontalPosition: 'center',
      panelClass: panelClass,
      duration: duration,
      politeness: 'assertive',
    });

    this.snackBarRef
      .afterOpened()
      .pipe(take(1), delay(TIMEOUT_MS))
      .subscribe(() => this.setFocusToActionButton());

    this.snackBarRef
      .afterDismissed()
      .pipe(take(1))
      .subscribe(() => this.focusManagerService.focusFirstElementInContainer());
  }
  dismiss() {
    this.snackBar.dismiss();
  }

  private setFocusToActionButton(): void {
    const btn = document.querySelector(
      '.test-run-notification button'
    ) as HTMLButtonElement;
    btn?.focus();
  }
}
