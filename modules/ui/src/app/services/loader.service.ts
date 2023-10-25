import {Injectable} from '@angular/core';
import {BehaviorSubject, delay, Observable, of, switchMap} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private loading$ = new BehaviorSubject<boolean>(false);

  setLoading(loading: boolean) {
    this.loading$.next(loading);
  }

  getLoading(): Observable<boolean> {
    return this.loading$.pipe(
      switchMap((loading) => {
        if (loading) {
          return of(true).pipe(delay(1000));
        }
        return of(false);
      })
    );
  }
}
