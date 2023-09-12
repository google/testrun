import {TestBed} from '@angular/core/testing';

import {NotificationService} from './notification.service';
import {MatSnackBar} from '@angular/material/snack-bar';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockMatSnackBar = {
    open: () => {
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
      expect(args[1]).toBe('x');
      expect(args[2]).toEqual({
        horizontalPosition: 'right',
        panelClass: 'test-run-notification',
      });
    });
  });

});
