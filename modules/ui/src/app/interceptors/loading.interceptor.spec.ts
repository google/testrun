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

import { LoadingInterceptor } from './loading.interceptor';
import { of } from 'rxjs/internal/observable/of';
import { HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { LoaderService } from '../services/loader.service';

describe('LoadingInterceptor', () => {
  const loaderServiceMock: jasmine.SpyObj<LoaderService> = jasmine.createSpyObj(
    ['setLoading']
  );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LoadingInterceptor,
        { provide: LoaderService, useValue: loaderServiceMock },
      ],
    });
  });

  afterEach(() => {
    loaderServiceMock.setLoading.calls.reset();
  });

  it('should be created', () => {
    const interceptor: LoadingInterceptor = TestBed.inject(LoadingInterceptor);
    expect(interceptor).toBeTruthy();
  });

  it('should call setLoader with true when request intercepted', done => {
    const interceptor: LoadingInterceptor = TestBed.inject(LoadingInterceptor);

    const next: HttpHandler = {
      handle: () => {
        return of(new HttpResponse());
      },
    };

    const requestMock = new HttpRequest('GET', '/test');

    interceptor.intercept(requestMock, next).subscribe(() => {
      expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);
      done();
    });
  });

  it('should not call setLoader with false if more than one request is in process', done => {
    const interceptor: LoadingInterceptor = TestBed.inject(LoadingInterceptor);

    const next: HttpHandler = {
      handle: () => {
        return of(new HttpResponse());
      },
    };

    const requestMock = new HttpRequest('GET', '/test');

    interceptor.intercept(requestMock, next).subscribe(() => {
      expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);

      loaderServiceMock.setLoading.calls.reset();
      interceptor.intercept(requestMock, next).subscribe(() => {
        expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);

        loaderServiceMock.setLoading.calls.reset();
        done();
      });

      expect(loaderServiceMock.setLoading).not.toHaveBeenCalled();
    });

    expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(false);
  });
});
