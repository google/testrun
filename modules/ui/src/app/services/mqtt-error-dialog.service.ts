/**
 * Copyright 2025 Google LLC
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
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SimpleDialogComponent } from '../components/simple-dialog/simple-dialog.component';

export const MQTT_ERROR_MESSAGE =
  'Unable to connect and update test status. Please restart the application to try again.';

/**
 * Surfaces the blocking "MQTT connection lost" dialog.
 *
 * Kept separate from TestrunDialogService so that the testrun initiate form
 * (which TestrunDialogService opens) can depend on it without creating a
 * circular import.
 */
@Injectable({ providedIn: 'root' })
export class MqttErrorDialogService {
  private dialog = inject(MatDialog);
  private isDialogOpen = false;

  /** Whether the blocking MQTT error dialog is currently displayed. */
  isOpen(): boolean {
    return this.isDialogOpen;
  }

  /**
   * Opens a persistent, non-dismissible dialog informing the user that the
   * connection to the MQTT service was lost. It can only be cleared by
   * restarting the application. Any other open dialog is closed first, and
   * repeated calls while it is displayed are ignored.
   */
  open(): void {
    if (this.isDialogOpen) {
      return;
    }
    this.isDialogOpen = true;
    this.dialog.closeAll();
    this.dialog
      .open(SimpleDialogComponent, {
        ariaLabel: MQTT_ERROR_MESSAGE,
        role: 'alertdialog',
        data: {
          icon: 'error',
          title: 'Connection Error',
          content: MQTT_ERROR_MESSAGE,
          isPersistent: true,
        },
        autoFocus: true,
        hasBackdrop: true,
        disableClose: true,
        panelClass: ['simple-dialog', 'mqtt-error-dialog'],
      })
      .afterClosed()
      .subscribe(() => {
        this.isDialogOpen = false;
      });
  }
}
