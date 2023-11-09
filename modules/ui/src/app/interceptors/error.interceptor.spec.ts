import { TestBed } from '@angular/core/testing';

import { ErrorInterceptor } from './error.interceptor';
import { NotificationService } from '../services/notification.service';
import {
  HttpErrorResponse,
  HttpHandler,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { throwError } from 'rxjs/internal/observable/throwError';
import { delay } from 'rxjs/internal/operators/delay';
import { of } from 'rxjs/internal/observable/of';

describe('ErrorInterceptor', () => {
  const notificationServiceMock: jasmine.SpyObj<NotificationService> =
    jasmine.createSpyObj(['notify']);
  let interceptor: ErrorInterceptor;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ErrorInterceptor,
        { provide: NotificationService, useValue: notificationServiceMock },
      ],
    });
    interceptor = TestBed.inject(ErrorInterceptor);
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should notify about backend errors', done => {
    const next: HttpHandler = {
      handle: () => {
        return throwError(
          new HttpErrorResponse({ error: { error: 'error' }, status: 500 })
        );
      },
    };

    const requestMock = new HttpRequest('GET', '/test');

    interceptor.intercept(requestMock, next).subscribe(
      () => ({}),
      () => {
        expect(notificationServiceMock.notify).toHaveBeenCalledWith('error');
        done();
      }
    );
  });

  it('should notify about other errors', done => {
    const next: HttpHandler = {
      handle: () => {
        return throwError(new HttpErrorResponse({ status: 0 }));
      },
    };

    const requestMock = new HttpRequest('GET', '/test');

    interceptor.intercept(requestMock, next).subscribe(
      () => ({}),
      () => {
        expect(notificationServiceMock.notify).toHaveBeenCalledWith(
          'BE is not responding. Please, try again later.'
        );
        done();
      }
    );
  });

  it('should throw timeout error when timeout is exceeded', done => {
    const next: HttpHandler = {
      handle: () => {
        return of(new HttpResponse()).pipe(delay(2000));
      },
    };

    const requestMock = new HttpRequest('GET', '/test');

    interceptor.intercept(requestMock, next, 1000).subscribe(
      () => ({}),
      () => {
        expect(notificationServiceMock.notify).toHaveBeenCalledWith(
          'BE is not responding. Please, try again later.'
        );
        done();
      }
    );
  });
});
