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
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import {
  catchError,
  Observable,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';
import { NotificationService } from '../services/notification.service';

import { SYSTEM_STOP, EXPORT } from '../services/test-run.service';
import { finalize } from 'rxjs/operators';

const DEFAULT_TIMEOUT_MS = 5000;
const SYSTEM_STOP_TIMEOUT_MS = 60 * 1000;
const EXPORT_ZIP_TIMEOUT_MS = 60 * 1000;

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private isTestrunStop = false;
  constructor(private notificationService: NotificationService) {}
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): Observable<HttpEvent<unknown>> {
    let timeoutValue = timeoutMs;
    if (request.url.includes(SYSTEM_STOP) || this.isTestrunStop) {
      timeoutValue = SYSTEM_STOP_TIMEOUT_MS;
    }
    if (request.url.includes(EXPORT)) {
      timeoutValue = EXPORT_ZIP_TIMEOUT_MS;
    }
    if (request.url.includes(SYSTEM_STOP)) {
      this.isTestrunStop = true;
    }
    return next.handle(request).pipe(
      timeout(timeoutValue),
      catchError((error: HttpErrorResponse | TimeoutError) => {
        if (error instanceof TimeoutError) {
          this.notificationService.notify(
            'Testrun is not responding. Please try again in a moment.'
          );
        } else {
          if (error.status === 0) {
            this.notificationService.notify(
              'Testrun is not responding. Please try again in a moment.'
            );
          } else {
            this.notificationService.notify(
              error.error?.error ||
                'Something went wrong. Check the Terminal for details.'
            );
            console.error(error.error?.error || error.message);
          }
        }
        return throwError(error);
      }),
      finalize(() => {
        if (request.url.includes(SYSTEM_STOP)) {
          this.isTestrunStop = false;
        }
      })
    );
  }
}
