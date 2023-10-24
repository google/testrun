import {TestBed} from '@angular/core/testing';

import {LoadingInterceptor} from './loading.interceptor';
import {of} from 'rxjs/internal/observable/of';
import {HttpRequest, HttpResponse} from '@angular/common/http';
import {LoaderService} from '../services/loader.service';

describe('LoadingInterceptor', () => {
  let loaderServiceMock: jasmine.SpyObj<LoaderService> = jasmine.createSpyObj(['setLoading']);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LoadingInterceptor,
        {provide: LoaderService, useValue: loaderServiceMock},
      ]
    })
  });

  afterEach(() => {
    loaderServiceMock.setLoading.calls.reset();
  });

  it('should be created', () => {
    const interceptor: LoadingInterceptor = TestBed.inject(LoadingInterceptor);
    expect(interceptor).toBeTruthy();
  });

  it('should call setLoader with true when request intercepted', (done) => {
    const interceptor: LoadingInterceptor = TestBed.inject(LoadingInterceptor);

    const next: any = {
      handle: () => {
        return of(new HttpResponse());
      }
    };

    const requestMock = new HttpRequest('GET', '/test');

    interceptor.intercept(requestMock, next).subscribe((res) => {
      expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);
      done();
    });
  });

  it('should not call setLoader with false if more than one request is in process', (done) => {
    const interceptor: LoadingInterceptor = TestBed.inject(LoadingInterceptor);

    const next: any = {
      handle: () => {
        return of(new HttpResponse());
      }
    };

    const requestMock = new HttpRequest('GET', '/test');

    interceptor.intercept(requestMock, next).subscribe((res) => {

      expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);

      loaderServiceMock.setLoading.calls.reset();
      interceptor.intercept(requestMock, next).subscribe((res) => {

        expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);

        loaderServiceMock.setLoading.calls.reset();
        done();
      });

      expect(loaderServiceMock.setLoading).not.toHaveBeenCalled();
    });

    expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(false);
  });

});
