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
import { Router } from '@angular/router';

import { allowToRunTestGuard } from './allow-to-run-test.guard';
import { TestRunService } from '../services/test-run.service';
import { Device } from '../model/device';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { device } from '../mocks/device.mock';

describe('allowToRunTestGuard', () => {
  const mockRouter = jasmine.createSpyObj<Router>(['parseUrl']);

  const setup = (testRunServiceMock: unknown) => {
    TestBed.configureTestingModule({
      providers: [
        allowToRunTestGuard,
        { provide: TestRunService, useValue: testRunServiceMock },
        { provide: Router, useValue: mockRouter },
      ],
    });

    return TestBed.runInInjectionContext(allowToRunTestGuard);
  };

  it('should allow to continue', () => {
    const mockTestRunService: unknown = {
      getDevices: () => new BehaviorSubject<Device[] | null>([device]),
    };

    const guard = setup(mockTestRunService);

    guard.subscribe(res => {
      expect(res).toBeTrue();
    });
  });

  it('should redirect to the "/device-repository" path', () => {
    const mockTestRunService: unknown = {
      getDevices: () => new BehaviorSubject<Device[] | null>([]),
    };

    const guard = setup(mockTestRunService);

    guard.subscribe(res => {
      expect(res).toBeFalsy();
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/device-repository');
    });
  });
});
