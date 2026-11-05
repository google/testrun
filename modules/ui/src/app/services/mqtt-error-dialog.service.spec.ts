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
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import {
  MQTT_ERROR_MESSAGE,
  MqttErrorDialogService,
} from './mqtt-error-dialog.service';
import { SimpleDialogComponent } from '../components/simple-dialog/simple-dialog.component';

describe('MqttErrorDialogService', () => {
  let service: MqttErrorDialogService;
  let dialog: MatDialog;
  let afterClosed$: Subject<void>;
  let openSpy: jasmine.Spy;
  let closeAllSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MqttErrorDialogService);
    dialog = TestBed.inject(MatDialog);
    afterClosed$ = new Subject<void>();
    closeAllSpy = spyOn(dialog, 'closeAll');
    openSpy = spyOn(dialog, 'open').and.returnValue({
      afterClosed: () => afterClosed$,
    } as unknown as MatDialogRef<SimpleDialogComponent>);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the exact required error message', () => {
    expect(MQTT_ERROR_MESSAGE).toBe(
      'Unable to connect and update test status. Please restart the application to try again.'
    );
  });

  it('should close other dialogs and open a persistent, non-dismissible dialog', () => {
    service.open();

    expect(closeAllSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledOnceWith(SimpleDialogComponent, {
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
    });
    expect(service.isOpen()).toBeTrue();
  });

  it('should open the dialog only once while it is displayed', () => {
    service.open();
    service.open();

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(closeAllSpy).toHaveBeenCalledTimes(1);
  });

  it('should allow the dialog to be re-opened after it was closed', () => {
    service.open();
    afterClosed$.next();

    expect(service.isOpen()).toBeFalse();

    service.open();

    expect(openSpy).toHaveBeenCalledTimes(2);
  });
});
