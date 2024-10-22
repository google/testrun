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
import * as fromReducer from './reducers';
import { initialState as initialAppState } from './state';
import {
  fetchInterfacesSuccess,
  fetchSystemConfigSuccess,
  setDeviceInProgress,
  setDevices,
  setHasConnectionSettings,
  setHasDevices,
  setHasExpiredDevices,
  setHasRiskProfiles,
  setIsAllDevicesOutdated,
  setIsOpenAddDevice,
  setIsOpenStartTestrun,
  setIsOpenWaitSnackBar,
  setIsTestingComplete,
  setReports,
  setRiskProfiles,
  setStatus,
  setTestModules,
  setTestrunStatus,
  updateAdapters,
  updateInternetConnection,
} from './actions';
import { device, MOCK_TEST_MODULES } from '../mocks/device.mock';
import { MOCK_PROGRESS_DATA_CANCELLING } from '../mocks/testrun.mock';
import { PROFILE_MOCK } from '../mocks/profile.mock';
import { HISTORY } from '../mocks/reports.mock';
import { MOCK_ADAPTERS } from '../mocks/settings.mock';

describe('Reducer', () => {
  describe('unknown action', () => {
    it('should return the default state', () => {
      const initialState = initialAppState;
      const action = {
        type: 'Unknown',
      };
      const state = fromReducer.rootReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  describe('fetchInterfacesSuccess action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const newInterfaces = {
        enx00e04c020fa8: '00:e0:4c:02:0f:a8',
        enx207bd26205e9: '20:7b:d2:62:05:e9',
      };
      const action = fetchInterfacesSuccess({ interfaces: newInterfaces });
      const state = fromReducer.rootReducer(initialState, action);

      const newState = { ...initialState, ...{ interfaces: newInterfaces } };
      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setHasConnectionSettings action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setHasConnectionSettings({ hasConnectionSettings: true });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ hasConnectionSettings: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setIsOpenAddDevice action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setIsOpenAddDevice({ isOpenAddDevice: true });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ isOpenAddDevice: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setIsOpenWaitSnackBar action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setIsOpenWaitSnackBar({ isOpenWaitSnackBar: true });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ isOpenWaitSnackBar: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setHasDevices action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setHasDevices({ hasDevices: true });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ hasDevices: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setHasExpiredDevices action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setHasExpiredDevices({ hasExpiredDevices: true });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ hasExpiredDevices: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setIsAllDevicesOutdated action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setIsAllDevicesOutdated({ isAllDevicesOutdated: true });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ isAllDevicesOutdated: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setDevices action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const devices = [device, device];
      const action = setDevices({ devices });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ devices } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setHasRiskProfiles action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setHasRiskProfiles({ hasRiskProfiles: true });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ hasRiskProfiles: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setRiskProfiles action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const riskProfiles = [PROFILE_MOCK];
      const action = setRiskProfiles({ riskProfiles });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ riskProfiles } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setDeviceInProgress action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const deviceInProgress = device;
      const action = setDeviceInProgress({ device: deviceInProgress });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = {
        ...initialState,
        ...{ deviceInProgress: deviceInProgress },
      };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setTestrunStatus action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setTestrunStatus({
        systemStatus: MOCK_PROGRESS_DATA_CANCELLING,
      });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = {
        ...initialState,
        ...{ systemStatus: MOCK_PROGRESS_DATA_CANCELLING },
      };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setIsTestingComplete action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setIsTestingComplete({
        isTestingComplete: true,
      });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = {
        ...initialState,
        ...{ isTestingComplete: true },
      };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setIsOpenStartTestrun action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setIsOpenStartTestrun({ isOpenStartTestrun: true });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ isOpenStartTestrun: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setStatus action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setStatus({
        status: MOCK_PROGRESS_DATA_CANCELLING.status,
      });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = {
        ...initialState,
        ...{ status: MOCK_PROGRESS_DATA_CANCELLING.status },
      };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setReports action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setReports({
        reports: HISTORY,
      });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = {
        ...initialState,
        ...{ reports: HISTORY },
      };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setTestModules action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = setTestModules({
        testModules: MOCK_TEST_MODULES,
      });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = {
        ...initialState,
        ...{ testModules: MOCK_TEST_MODULES },
      };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('updateAdapters action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = updateAdapters({
        adapters: MOCK_ADAPTERS,
      });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = {
        ...initialState,
        ...{ adapters: MOCK_ADAPTERS },
      };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('updateInternetConnection action', () => {
    it('should update state', () => {
      const initialState = initialAppState;
      const action = updateInternetConnection({ internetConnection: true });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ internetConnection: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('fetchSystemConfigSuccess action', () => {
    it('should update state', () => {
      const initialState = initialAppState;

      const action = fetchSystemConfigSuccess({
        systemConfig: { network: {} },
      });
      const state = fromReducer.rootReducer(initialState, action);

      const newState = {
        ...initialState,
        ...{ systemConfig: { network: {} } },
      };
      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });
});
