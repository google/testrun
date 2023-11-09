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

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private notificationService: NotificationService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
    timeoutMs = 5000
  ): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      timeout(timeoutMs),
      catchError((error: HttpErrorResponse | TimeoutError) => {
        if (error instanceof TimeoutError) {
          this.notificationService.notify(
            'BE is not responding. Please, try again later.'
          );
        } else {
          if (error.status === 0) {
            this.notificationService.notify(
              'BE is not responding. Please, try again later.'
            );
          } else {
            this.notificationService.notify(
              error.error?.error || error.message
            );
          }
        }
        return throwError(error);
      })
    );
  }
}
