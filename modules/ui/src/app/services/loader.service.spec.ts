import {fakeAsync, TestBed, tick} from '@angular/core/testing';

import {LoaderService} from './loader.service';

describe('LoaderService', () => {
  let service: LoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('update loading value', () => {
    it('should has delay if true', fakeAsync(() => {
      service.setLoading(true);

      let timeoutSpy = jasmine.createSpy('timeoutSpy');
      service.getLoading().subscribe(timeoutSpy);

      expect(timeoutSpy).not.toHaveBeenCalled();
      tick(1000);
      expect(timeoutSpy).toHaveBeenCalledWith(true);
    }));

    it('should has no delay if false', fakeAsync(() => {
      service.setLoading(false);

      let timeoutSpy = jasmine.createSpy('timeoutSpy');
      service.getLoading().subscribe(timeoutSpy);

      expect(timeoutSpy).toHaveBeenCalledWith(false);
    }));
  })
});
