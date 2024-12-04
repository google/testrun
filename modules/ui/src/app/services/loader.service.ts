import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, delay, Observable, of, switchMap } from 'rxjs';
import { LOADER_TIMEOUT_CONFIG_TOKEN } from './loaderConfig';

@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  private timeout =
    inject(LOADER_TIMEOUT_CONFIG_TOKEN, { optional: true }) ?? 1000;

  private loading$ = new BehaviorSubject<boolean>(false);

  setLoading(loading: boolean) {
    this.loading$.next(loading);
  }

  getLoading(): Observable<boolean> {
    return this.loading$.pipe(
      switchMap(loading => {
        if (loading) {
          return of(true).pipe(delay(this.timeout));
        }
        return of(false);
      })
    );
  }
}
