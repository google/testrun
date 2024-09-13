import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Config {
  config: ConfigProperty;
}

export interface ConfigProperty {
  singleIntf: string;
}
@Injectable({
  providedIn: 'root',
})
export class ConfigLoaderService {
  private config!: Config | undefined | null;
  constructor(private http: HttpClient) {}

  get configuration() {
    return this.config;
  }

  load() {
    return new Promise(resolve => {
      this.http
        .get('assets/config.json')
        .pipe(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tap((data: any) => {
            this.config = data;
            resolve(true);
          }),
          catchError(() => {
            this.config = null;
            resolve(true);
            return of(null);
          })
        )
        .subscribe();
    });
  }
}
