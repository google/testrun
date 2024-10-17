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
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { NotificationService } from './notification.service';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar,
} from '@angular/material/snack-bar';
import { of } from 'rxjs/internal/observable/of';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../store/state';
import { SnackBarComponent } from '../components/snack-bar/snack-bar.component';
import { setIsOpenWaitSnackBar } from '../store/actions';
import { FocusManagerService } from './focus-manager.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let store: MockStore<AppState>;

  const mockMatSnackBar = {
    open: () => ({}),
    dismiss: () => ({}),
    openFromComponent: () => ({}),
  };

  const focusServiceMock: jasmine.SpyObj<FocusManagerService> =
    jasmine.createSpyObj('focusServiceMock', ['focusFirstElementInContainer']);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MatSnackBar, useValue: mockMatSnackBar },
        { provide: FocusManagerService, useValue: focusServiceMock },
        provideMockStore({}),
      ],
    });
    service = TestBed.inject(NotificationService);
    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch').and.callFake(() => {});
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
        panelClass: ['test-run-notification'],
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
        panelClass: ['test-run-notification'],
        duration: 15000,
        politeness: 'assertive',
      });
    });

    it('should open snackbar with addition panelClass', () => {
      const openSpy = spyOn(service.snackBar, 'open').and.returnValues({
        afterOpened: () => of(void 0),
        afterDismissed: () => of({ dismissedByAction: true }),
      } as MatSnackBarRef<TextOnlySnackBar>);

      service.notify('something good happened', 1500, 'mock-class');

      expect(openSpy).toHaveBeenCalledWith('something good happened', 'OK', {
        horizontalPosition: 'center',
        panelClass: ['test-run-notification', 'mock-class'],
        duration: 1500,
        politeness: 'assertive',
      });
    });
  });

  describe('openSnackBar', () => {
    it('should open snackbar fromComponent', () => {
      const openSpy = spyOn(
        service.snackBar,
        'openFromComponent'
      ).and.returnValues({
        afterOpened: () => of(void 0),
        afterDismissed: () => of({ dismissedByAction: true }),
      } as MatSnackBarRef<SnackBarComponent>);

      service.openSnackBar();

      expect(openSpy).toHaveBeenCalledWith(SnackBarComponent, {
        duration: 0,
        panelClass: 'snack-bar-info',
      });
    });

    it('should call focusFirstElementInContainer', fakeAsync(() => {
      spyOn(service.snackBar, 'openFromComponent').and.returnValues({
        afterOpened: () => of(void 0),
        afterDismissed: () => of({ dismissedByAction: true }),
      } as MatSnackBarRef<SnackBarComponent>);

      service.openSnackBar();
      tick(8000);

      expect(focusServiceMock.focusFirstElementInContainer).toHaveBeenCalled();
    }));
  });

  describe('dismiss', () => {
    it('should close snackbar', () => {
      const matSnackBarSpy = spyOn(mockMatSnackBar, 'dismiss').and.stub();

      service.dismiss();

      expect(matSnackBarSpy).toHaveBeenCalled();
    });
  });

  it('#dismissSnackBar should dispatch setIsOpenWaitSnackBar action', () => {
    service.dismissSnackBar();

    expect(store.dispatch).toHaveBeenCalledWith(
      setIsOpenWaitSnackBar({ isOpenWaitSnackBar: false })
    );
  });

  it('#dismissWithTimout should call dismissSnackBar after timer', fakeAsync(() => {
    const dismissSnackBarSpy = spyOn(service, 'dismissSnackBar').and.stub();

    service.dismissWithTimout();
    tick(5000);

    expect(dismissSnackBarSpy).toHaveBeenCalledWith();
  }));
});
