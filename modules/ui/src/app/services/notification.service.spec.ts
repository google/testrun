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
import {TestBed} from '@angular/core/testing';

import {NotificationService} from './notification.service';
import {MatSnackBar} from '@angular/material/snack-bar';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockMatSnackBar = {
    open: () => {
    },
    dismiss: () => {

    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {provide: MatSnackBar, useValue: mockMatSnackBar},
      ]
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('notify', () => {
    it('should open snackbar with message', () => {
      const matSnackBarSpy = spyOn(mockMatSnackBar, 'open').and.stub();

      service.notify('something good happened');

      expect(matSnackBarSpy).toHaveBeenCalled();

      const args = matSnackBarSpy.calls.argsFor(0);
      expect(args.length).toBe(3);
      expect(args[0]).toBe('something good happened');
      expect(args[1]).toBe('OK');
      expect(args[2]).toEqual({
        horizontalPosition: 'right',
        panelClass: 'test-run-notification',
        duration: 5000
      });
    });

    it('should open snackbar with duration', () => {
      const matSnackBarSpy = spyOn(mockMatSnackBar, 'open').and.stub();

      service.notify('something good happened', 15000);

      const args = matSnackBarSpy.calls.argsFor(0);
      expect(args[2]).toEqual({
        horizontalPosition: 'right',
        panelClass: 'test-run-notification',
        duration: 15000
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
