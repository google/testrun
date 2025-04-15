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
import { Store, StoreModule } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { CanActivateGuard } from './can-activate.guard';
import { AppState } from '../store/state';
import { selectSystemConfig } from '../store/selectors';
import { Routes } from '../model/routes';

describe('CanActivateGuard', () => {
  let guard: CanActivateGuard;
  let store: MockStore<AppState>;
  let router: Router;

  const initialState: AppState = {
    hasConnectionSettings: false,
    isAllDevicesOutdated: false,
    devices: [],
    hasDevices: false,
    hasExpiredDevices: false,
    isOpenAddDevice: false,
    riskProfiles: [],
    hasRiskProfiles: false,
    isStopTestrun: false,
    isOpenWaitSnackBar: false,
    isOpenStartTestrun: false,
    systemStatus: null,
    deviceInProgress: null,
    status: null,
    isTestingComplete: false,
    reports: [],
    testModules: [],
    adapters: {},
    internetConnection: null,
    interfaces: {},
    systemConfig: { network: {} },
    isOpenCreateProfile: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StoreModule.forRoot({})],
      providers: [
        CanActivateGuard,
        provideMockStore({ initialState }),
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate'),
          },
        },
      ],
    });
    guard = TestBed.inject(CanActivateGuard);
    store = TestBed.inject(Store) as MockStore<AppState>;
    router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should navigate to Devices if device_intf is not empty', done => {
    const mockConfig = { network: { device_intf: 'eth0' } };
    store.overrideSelector(selectSystemConfig, mockConfig);

    guard.canActivate().subscribe(canActivate => {
      expect(canActivate).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith([Routes.Devices]);
      done();
    });
  });

  it('should navigate to Settings if device_intf is an empty string', done => {
    const mockConfig = { network: { device_intf: '' } };
    store.overrideSelector(selectSystemConfig, mockConfig);

    guard.canActivate().subscribe(canActivate => {
      expect(canActivate).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith([Routes.Settings]);
      done();
    });
  });
});
