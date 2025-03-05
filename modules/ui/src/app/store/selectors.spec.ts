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

import { AppState } from './state';
import {
  selectAdapters,
  selectDeviceInProgress,
  selectDevices,
  selectHasConnectionSettings,
  selectHasDevices,
  selectHasRiskProfiles,
  selectIsOpenAddDevice,
  selectIsOpenStartTestrun,
  selectIsOpenWaitSnackBar,
  selectReports,
  selectRiskProfiles,
  selectStatus,
  selectSystemStatus,
  selectTestModules,
  selectHasExpiredDevices,
  selectInternetConnection,
  selectIsAllDevicesOutdated,
  selectIsTestingComplete,
  selectInterfaces,
  selectSystemConfig,
} from './selectors';

describe('Selectors', () => {
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

  it('should select interfaces', () => {
    const result = selectInterfaces.projector(initialState);
    expect(result).toEqual({});
  });

  it('should select has connection settings', () => {
    const result = selectHasConnectionSettings.projector(initialState);
    expect(result).toEqual(false);
  });

  it('should select devices', () => {
    const result = selectDevices.projector(initialState);
    expect(result).toEqual([]);
  });

  it('should select hasDevices', () => {
    const result = selectHasDevices.projector(initialState);
    expect(result).toEqual(false);
  });

  it('should select hasExpiredDevices', () => {
    const result = selectHasExpiredDevices.projector(initialState);
    expect(result).toEqual(false);
  });

  it('should select isAllDevicesOutdated', () => {
    const result = selectIsAllDevicesOutdated.projector(initialState);
    expect(result).toEqual(false);
  });

  it('should select riskProfiles', () => {
    const result = selectRiskProfiles.projector(initialState);
    expect(result).toEqual([]);
  });

  it('should select hasRiskProfiles', () => {
    const result = selectHasRiskProfiles.projector(initialState);
    expect(result).toEqual(false);
  });

  it('should select isOpenAddDevice', () => {
    const result = selectIsOpenAddDevice.projector(initialState);
    expect(result).toEqual(false);
  });

  it('should select systemStatus', () => {
    const result = selectSystemStatus.projector(initialState);
    expect(result).toEqual(null);
  });

  it('should select isTestingComplete', () => {
    const result = selectIsTestingComplete.projector(initialState);
    expect(result).toEqual(false);
  });

  it('should select isOpenStartTestrun', () => {
    const result = selectIsOpenStartTestrun.projector(initialState);
    expect(result).toEqual(false);
  });

  it('should select isOpenWaitSnackBar', () => {
    const result = selectIsOpenWaitSnackBar.projector(initialState);
    expect(result).toEqual(false);
  });

  it('should select deviceInProgress', () => {
    const result = selectDeviceInProgress.projector(initialState);
    expect(result).toEqual(null);
  });

  it('should select status', () => {
    const result = selectStatus.projector(initialState);
    expect(result).toEqual(null);
  });

  it('should select status', () => {
    const result = selectReports.projector(initialState);
    expect(result).toEqual([]);
  });

  it('should select testModules', () => {
    const result = selectTestModules.projector(initialState);
    expect(result).toEqual([]);
  });

  it('should select adapters', () => {
    const result = selectAdapters.projector(initialState);
    expect(result).toEqual({});
  });

  it('should select internetConnection', () => {
    const result = selectInternetConnection.projector(initialState);
    expect(result).toEqual(null);
  });

  it('should select systemConfig', () => {
    const result = selectSystemConfig.projector(initialState);
    expect(result).toEqual({ network: {} });
  });
});
