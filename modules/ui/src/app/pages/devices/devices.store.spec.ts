/*
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
import { of, skip, take } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../../store/state';
import {
  selectDeviceInProgress,
  selectHasDevices,
  selectTestModules,
} from '../../store/selectors';
import { TestRunService } from '../../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { device, updated_device } from '../../mocks/device.mock';
import {
  fetchSystemStatusSuccess,
  setDevices,
  setIsOpenAddDevice,
} from '../../store/actions';
import { selectDevices, selectIsOpenAddDevice } from '../../store/selectors';
import { DevicesStore } from './devices.store';
import { MOCK_PROGRESS_DATA_IN_PROGRESS } from '../../mocks/testrun.mock';
import { DeviceAction } from '../../model/device';

describe('DevicesStore', () => {
  let devicesStore: DevicesStore;
  let store: MockStore<AppState>;
  let mockService: SpyObj<TestRunService>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj([
      'getTestModules',
      'deleteDevice',
      'saveDevice',
      'editDevice',
    ]);

    TestBed.configureTestingModule({
      providers: [
        DevicesStore,
        provideMockStore({
          selectors: [
            { selector: selectDevices, value: [device] },
            { selector: selectIsOpenAddDevice, value: true },
            { selector: selectDeviceInProgress, value: device },
            { selector: selectTestModules, value: [] },
          ],
        }),
        { provide: TestRunService, useValue: mockService },
      ],
    });

    store = TestBed.inject(MockStore);
    devicesStore = TestBed.inject(DevicesStore);

    store.overrideSelector(selectHasDevices, true);
    spyOn(store, 'dispatch').and.callFake(() => {});
  });

  it('should be created', () => {
    expect(devicesStore).toBeTruthy();
  });

  describe('updaters', () => {
    it('should update selectedDevice', (done: DoneFn) => {
      devicesStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.selectedDevice).toEqual(device);
        done();
      });

      devicesStore.selectDevice(device);
    });
  });

  describe('selectors', () => {
    it('should select state', done => {
      devicesStore.viewModel$.pipe(take(1)).subscribe(store => {
        expect(store).toEqual({
          devices: [device],
          selectedDevice: null,
          deviceInProgress: device,
          testModules: [],
          actions: [
            {
              action: DeviceAction.StartNewTestrun,
              svgIcon: 'testrun_logo_small',
            },
            { action: DeviceAction.Delete, icon: 'delete' },
          ],
        });
        done();
      });
    });
  });

  describe('effects', () => {
    describe('deleteDevice', () => {
      it('should dispatch setDevices', () => {
        mockService.deleteDevice.and.returnValue(of(true));
        const effectParams = {
          onDelete: () => {},
          device: device,
        };
        devicesStore.deleteDevice(effectParams);

        expect(store.dispatch).toHaveBeenCalledWith(
          setDevices({ devices: [] })
        );
      });

      it('should call callback', () => {
        mockService.deleteDevice.and.returnValue(of(true));
        const effectParams = {
          onDelete: () => {},
          device: device,
        };
        const spyOnCallback = spyOn(effectParams, 'onDelete');

        devicesStore.deleteDevice(effectParams);
        expect(spyOnCallback).toHaveBeenCalled();
      });
    });

    describe('saveDevice', () => {
      it('should dispatch setDevices', () => {
        mockService.saveDevice.and.returnValue(of(true));
        const effectParams = {
          onSuccess: () => {},
          device: device,
        };
        devicesStore.saveDevice(effectParams);

        expect(store.dispatch).toHaveBeenCalledWith(
          setDevices({ devices: [device, device] })
        );
      });

      it('should call callback', () => {
        mockService.saveDevice.and.returnValue(of(true));
        const effectParams = {
          onSuccess: () => {},
          device: device,
        };
        const spyOnCallback = spyOn(effectParams, 'onSuccess');

        devicesStore.saveDevice(effectParams);
        expect(spyOnCallback).toHaveBeenCalled();
      });
    });

    describe('editDevice', () => {
      it('should dispatch setDevices', () => {
        mockService.editDevice.and.returnValue(of(true));
        const effectParams = {
          onSuccess: () => {},
          device: updated_device,
          mac_addr: '00:1e:42:35:73:c4',
        };
        devicesStore.editDevice(effectParams);

        expect(store.dispatch).toHaveBeenCalledWith(
          setDevices({ devices: [updated_device] })
        );
      });

      it('should call callback', () => {
        mockService.editDevice.and.returnValue(of(true));
        const effectParams = {
          onSuccess: () => {},
          device: updated_device,
          mac_addr: '00:1e:42:35:73:c4',
        };
        const spyOnCallback = spyOn(effectParams, 'onSuccess');

        devicesStore.editDevice(effectParams);
        expect(spyOnCallback).toHaveBeenCalled();
      });
    });

    describe('setIsOpenAddDevice', () => {
      it('should dispatch action setIsOpenAddDevice', () => {
        devicesStore.setIsOpenAddDevice(true);

        expect(store.dispatch).toHaveBeenCalledWith(
          setIsOpenAddDevice({ isOpenAddDevice: true })
        );
      });
    });

    describe('setStatus', () => {
      it('should dispatch action fetchSystemStatusSuccess', () => {
        devicesStore.setStatus(MOCK_PROGRESS_DATA_IN_PROGRESS);

        expect(store.dispatch).toHaveBeenCalledWith(
          fetchSystemStatusSuccess({
            systemStatus: MOCK_PROGRESS_DATA_IN_PROGRESS,
          })
        );
      });
    });
  });
});
