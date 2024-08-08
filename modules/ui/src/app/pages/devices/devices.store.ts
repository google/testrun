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

import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { TestRunService } from '../../services/test-run.service';
import { exhaustMap } from 'rxjs';
import { tap, withLatestFrom } from 'rxjs/operators';
import { Device, TestModule } from '../../model/device';
import { AppState } from '../../store/state';
import { Store } from '@ngrx/store';
import {
  selectDeviceInProgress,
  selectDevices,
  selectIsOpenAddDevice,
  selectTestModules,
} from '../../store/selectors';
import {
  fetchSystemStatusSuccess,
  setDevices,
  setIsOpenAddDevice,
} from '../../store/actions';
import { TestrunStatus } from '../../model/testrun-status';

export interface DevicesComponentState {
  devices: Device[];
  selectedDevice: Device | null;
  testModules: TestModule[];
}

@Injectable()
export class DevicesStore extends ComponentStore<DevicesComponentState> {
  devices$ = this.store.select(selectDevices);
  isOpenAddDevice$ = this.store.select(selectIsOpenAddDevice);
  testModules$ = this.store.select(selectTestModules);
  private deviceInProgress$ = this.store.select(selectDeviceInProgress);
  private selectedDevice$ = this.select(state => state.selectedDevice);

  //testModules = this.testRunService.getTestModules();
  viewModel$ = this.select({
    devices: this.devices$,
    selectedDevice: this.selectedDevice$,
    deviceInProgress: this.deviceInProgress$,
    testModules: this.testModules$,
  });

  selectDevice = this.updater((state, device: Device | null) => ({
    ...state,
    selectedDevice: device,
  }));

  deleteDevice = this.effect<{
    device: Device;
    onDelete: () => void;
  }>(trigger$ => {
    return trigger$.pipe(
      exhaustMap(({ device, onDelete }) => {
        return this.testRunService.deleteDevice(device).pipe(
          withLatestFrom(this.devices$),
          tap(([deleted, devices]) => {
            if (deleted) {
              this.removeDevice(device, devices);
              onDelete();
            }
          })
        );
      })
    );
  });

  saveDevice = this.effect<{ device: Device; onSuccess: () => void }>(
    trigger$ => {
      return trigger$.pipe(
        exhaustMap(({ device, onSuccess }) => {
          return this.testRunService.saveDevice(device).pipe(
            withLatestFrom(this.devices$),
            tap(([added, devices]) => {
              if (added) {
                this.addDevice(device, devices);
                onSuccess();
              }
            })
          );
        })
      );
    }
  );

  editDevice = this.effect<{
    device: Device;
    mac_addr: string;
    onSuccess: () => void;
  }>(trigger$ => {
    return trigger$.pipe(
      exhaustMap(({ device, mac_addr, onSuccess }) => {
        return this.testRunService.editDevice(device, mac_addr).pipe(
          withLatestFrom(this.devices$),
          tap(([edited, devices]) => {
            if (edited) {
              this.updateDevice(device, mac_addr, devices);
              onSuccess();
            }
          })
        );
      })
    );
  });

  setIsOpenAddDevice = this.effect<boolean>(trigger$ => {
    return trigger$.pipe(
      tap(isOpen =>
        this.store.dispatch(setIsOpenAddDevice({ isOpenAddDevice: isOpen }))
      )
    );
  });

  setStatus = this.effect<TestrunStatus>(status$ => {
    return status$.pipe(
      tap(status => {
        this.store.dispatch(
          fetchSystemStatusSuccess({
            systemStatus: status,
          })
        );
      })
    );
  });

  private addDevice(device: Device, devices: Device[]): void {
    this.updateDevices(devices.concat([device]));
  }

  private updateDevice(
    update: Device,
    mac_addr: string,
    oldDevices: Device[]
  ): void {
    const devices = [...oldDevices];
    const deviceIdx = devices.findIndex(device => mac_addr === device.mac_addr);
    if (deviceIdx >= 0) {
      devices.splice(deviceIdx, 1, update);
      this.updateDevices(devices);
    }
  }

  private removeDevice(deviceToDelete: Device, oldDevices: Device[]): void {
    const devices = [...oldDevices];
    const idx = devices.findIndex(
      device => deviceToDelete.mac_addr === device.mac_addr
    );
    if (typeof idx === 'number') {
      devices.splice(idx, 1);
      this.updateDevices(devices);
    }
  }

  private updateDevices(devices: Device[]) {
    this.store.dispatch(setDevices({ devices }));
  }

  constructor(
    private testRunService: TestRunService,
    private store: Store<AppState>
  ) {
    super({
      devices: [],
      selectedDevice: null,
      testModules: [],
    });
  }
}
