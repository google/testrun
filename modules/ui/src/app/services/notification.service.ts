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

import { Injectable, NgZone, inject } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar,
} from '@angular/material/snack-bar';
import { FocusManagerService } from './focus-manager.service';
import { delay } from 'rxjs/internal/operators/delay';
import { take } from 'rxjs/internal/operators/take';
import { SnackBarComponent } from '../components/snack-bar/snack-bar.component';
import { timer } from 'rxjs';
import { setIsOpenWaitSnackBar } from '../store/actions';
import { Store } from '@ngrx/store';
import { AppState } from '../store/state';

const TIMEOUT_MS = 8000;
const WAIT_DISMISS_TIMEOUT_MS = 5000;

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  snackBar = inject(MatSnackBar);
  private store = inject<Store<AppState>>(Store);
  private focusManagerService = inject(FocusManagerService);
  private zone = inject(NgZone);

  private snackBarRef!: MatSnackBarRef<TextOnlySnackBar>;
  public snackBarCompRef!: MatSnackBarRef<SnackBarComponent>;

  notify(
    message: string,
    duration = 0,
    panelClass = '',
    timeout = TIMEOUT_MS,
    container?: Document | Element | null
  ) {
    const previousActiveElement = document.activeElement;
    const panelClasses = ['test-run-notification'];
    if (panelClass) {
      panelClasses.push(panelClass);
    }
    this.snackBarRef = this.snackBar.open(message, 'OK', {
      horizontalPosition: 'center',
      panelClass: panelClasses,
      duration: duration,
      politeness: 'assertive',
    });

    this.snackBarRef
      .afterOpened()
      .pipe(take(1), delay(timeout))
      .subscribe(() => this.setFocusToActionButton());

    this.snackBarRef
      .afterDismissed()
      .pipe(take(1))
      .subscribe(() => {
        if (previousActiveElement) {
          (previousActiveElement as HTMLElement).focus();
        } else {
          this.focusManagerService.focusFirstElementInContainer(container);
        }
      });
  }
  dismiss() {
    this.snackBar.dismiss();
  }
  openSnackBar() {
    this.zone.run(() => {
      this.snackBarCompRef = this.snackBar.openFromComponent(
        SnackBarComponent,
        {
          duration: 0,
          panelClass: 'snack-bar-info',
        }
      );
    });

    this.store.dispatch(setIsOpenWaitSnackBar({ isOpenWaitSnackBar: true }));

    this.snackBarCompRef
      .afterOpened()
      .pipe(take(1), delay(TIMEOUT_MS))
      .subscribe(() => this.setFocusToActionButton());

    this.snackBarCompRef
      .afterDismissed()
      .pipe(take(1), delay(1000))
      .subscribe(() => {
        this.focusManagerService.focusFirstElementInContainer();
      });
  }

  dismissSnackBar() {
    this.snackBarCompRef?.dismiss();
    this.store.dispatch(setIsOpenWaitSnackBar({ isOpenWaitSnackBar: false }));
  }

  dismissWithTimout() {
    timer(WAIT_DISMISS_TIMEOUT_MS)
      .pipe(take(1))
      .subscribe(() => this.dismissSnackBar());
  }

  private setFocusToActionButton(): void {
    const btn = document.querySelector(
      '.test-run-notification button, .snack-bar-info button'
    ) as HTMLButtonElement;
    btn?.focus();
  }
}
