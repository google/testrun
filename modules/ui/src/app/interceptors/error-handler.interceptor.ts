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
import {
  ErrorHandler,
  Injectable,
  InjectionToken,
  inject,
} from '@angular/core';
export const WINDOW_TOKEN = new InjectionToken('Window');

/**
 * Interceptor to fix chunk error https://medium.com/@kamrankhatti/angular-lazy-routes-loading-chunk-failed-42b16c22a377
 */
@Injectable()
export class ErrorHandlerInterceptor implements ErrorHandler {
  private _window = inject<Window>(WINDOW_TOKEN, { optional: true }) ?? window;

  constructor() {}
  handleError(error: Error): void {
    const chunkFailedMessage = /Loading chunk [\d]+ failed/;

    if (chunkFailedMessage.test(error.message)) {
      this._window.location.reload();
    }
  }
}
