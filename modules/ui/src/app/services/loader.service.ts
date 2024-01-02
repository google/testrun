import { Inject, Injectable, Optional } from '@angular/core';
import { BehaviorSubject, delay, Observable, of, switchMap } from 'rxjs';
import { LOADER_TIMEOUT_CONFIG_TOKEN } from './loaderConfig';

@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  private loading$ = new BehaviorSubject<boolean>(false);

  constructor(
    @Optional()
    @Inject(LOADER_TIMEOUT_CONFIG_TOKEN)
    private timeout: number = 1000
  ) {}

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
