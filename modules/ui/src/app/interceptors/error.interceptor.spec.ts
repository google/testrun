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

  afterEach(() => {
    notificationServiceMock.notify.calls.reset();
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should notify about backend errors with message if exist', done => {
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

  it('should notify about backend errors with default message', done => {
    const next: HttpHandler = {
      handle: () => {
        return throwError(new HttpErrorResponse({ status: 500 }));
      },
    };

    const requestMock = new HttpRequest('GET', '/test');

    interceptor.intercept(requestMock, next).subscribe(
      () => ({}),
      () => {
        expect(notificationServiceMock.notify).toHaveBeenCalledWith(
          'Something went wrong. Check the Terminal for details.'
        );
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
          'Testrun is not responding. Please try again in a moment.'
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
          'Testrun is not responding. Please try again in a moment.'
        );
        done();
      }
    );
  });
});
