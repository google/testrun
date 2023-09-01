import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';

import {allowToRunTestGuard} from './allow-to-run-test.guard';
import {TestRunService} from '../test-run.service';
import {Device} from '../model/device';
import {BehaviorSubject} from 'rxjs/internal/BehaviorSubject';
import {device} from '../mocks/device.mock';

describe('allowToRunTestGuard', () => {
  const mockRouter = jasmine.createSpyObj<Router>(['parseUrl'])

  const setup = (testRunServiceMock: unknown) => {
    TestBed.configureTestingModule({
      providers: [
        allowToRunTestGuard,
        {provide: TestRunService, useValue: testRunServiceMock},
        {provide: Router, useValue: mockRouter}
      ]
    });

    return TestBed.runInInjectionContext(allowToRunTestGuard);
  }

  it('should allow to continue', () => {
    const mockTestRunService: unknown = {getDevices: () => new BehaviorSubject<Device[] | null>([device])}

    const guard = setup(mockTestRunService)

    guard.subscribe(res => {
      expect(res).toBeTrue();
    });
  });

  it('should redirect to the "/device-repository" path', () => {

    const mockTestRunService: unknown = {getDevices: () => new BehaviorSubject<Device[] | null>([])}

    const guard = setup(mockTestRunService)

    guard.subscribe(res => {
      expect(res).toBeFalsy();
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/device-repository');
    });
  });
});
