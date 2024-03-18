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
import { TestBed } from '@angular/core/testing';

import { NotificationService } from './notification.service';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar,
} from '@angular/material/snack-bar';
import { of } from 'rxjs/internal/observable/of';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockMatSnackBar = {
    open: () => ({}),
    dismiss: () => ({}),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: mockMatSnackBar }],
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('notify', () => {
    it('should open snackbar with message', () => {
      const openSpy = spyOn(service.snackBar, 'open').and.returnValues({
        afterOpened: () => of(void 0),
        afterDismissed: () => of({ dismissedByAction: true }),
      } as MatSnackBarRef<TextOnlySnackBar>);

      service.notify('something good happened');

      expect(openSpy).toHaveBeenCalledWith('something good happened', 'OK', {
        horizontalPosition: 'center',
        panelClass: 'test-run-notification',
        duration: 0,
        politeness: 'assertive',
      });
    });

    it('should open snackbar with duration', () => {
      const openSpy = spyOn(service.snackBar, 'open').and.returnValues({
        afterOpened: () => of(void 0),
        afterDismissed: () => of({ dismissedByAction: true }),
      } as MatSnackBarRef<TextOnlySnackBar>);

      service.notify('something good happened', 15000);

      expect(openSpy).toHaveBeenCalledWith('something good happened', 'OK', {
        horizontalPosition: 'center',
        panelClass: 'test-run-notification',
        duration: 15000,
        politeness: 'assertive',
      });
    });
  });

  describe('dismiss', () => {
    it('should close snackbar', () => {
      const matSnackBarSpy = spyOn(mockMatSnackBar, 'dismiss').and.stub();

      service.dismiss();

      expect(matSnackBarSpy).toHaveBeenCalled();
    });
  });
});
