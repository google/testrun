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
import { inject, Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap, catchError, tap, filter, take } from 'rxjs/operators';
import { AppState } from '../store/state';
import { Store } from '@ngrx/store';
import { selectSystemConfig } from '../store/selectors';
import { Routes } from '../model/routes';

@Injectable({
  providedIn: 'root',
})
export class CanActivateGuard implements CanActivate {
  private store = inject<Store<AppState>>(Store);
  private readonly router = inject(Router);

  canActivate(): Observable<boolean> {
    return this.store.select(selectSystemConfig).pipe(
      filter(config => config.network?.device_intf !== undefined),
      tap(config => {
        if (config.network?.device_intf === '') {
          this.router.navigate([Routes.Settings]);
        } else {
          this.router.navigate([Routes.Devices]);
        }
      }),
      take(1),
      switchMap(() => of(false)),
      catchError(() => {
        this.router.navigate([Routes.Settings]);
        return of(false);
      })
    );
  }
}
