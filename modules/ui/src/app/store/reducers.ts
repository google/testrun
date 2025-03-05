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
import { createReducer, on } from '@ngrx/store';
import * as Actions from './actions';
import { initialState } from './state';

export const appFeatureKey = 'app';

export const sharedReducer = createReducer(
  initialState,
  on(Actions.setHasConnectionSettings, (state, { hasConnectionSettings }) => {
    return {
      ...state,
      hasConnectionSettings,
    };
  }),
  on(Actions.setIsOpenAddDevice, (state, { isOpenAddDevice }) => {
    return {
      ...state,
      isOpenAddDevice,
    };
  }),
  on(Actions.setIsOpenWaitSnackBar, (state, { isOpenWaitSnackBar }) => {
    return {
      ...state,
      isOpenWaitSnackBar,
    };
  }),
  on(Actions.setHasDevices, (state, { hasDevices }) => {
    return {
      ...state,
      hasDevices,
    };
  }),
  on(Actions.setHasExpiredDevices, (state, { hasExpiredDevices }) => {
    return {
      ...state,
      hasExpiredDevices,
    };
  }),
  on(Actions.setIsAllDevicesOutdated, (state, { isAllDevicesOutdated }) => {
    return {
      ...state,
      isAllDevicesOutdated,
    };
  }),
  on(Actions.setDevices, (state, { devices }) => {
    return {
      ...state,
      devices,
    };
  }),
  on(Actions.setHasRiskProfiles, (state, { hasRiskProfiles }) => {
    return {
      ...state,
      hasRiskProfiles,
    };
  }),
  on(Actions.setRiskProfiles, (state, { riskProfiles }) => {
    return {
      ...state,
      riskProfiles,
    };
  }),
  on(Actions.setTestrunStatus, (state, { systemStatus }) => {
    return {
      ...state,
      systemStatus,
    };
  }),
  on(Actions.setIsTestingComplete, (state, { isTestingComplete }) => {
    return {
      ...state,
      isTestingComplete,
    };
  }),
  on(Actions.setIsOpenStartTestrun, (state, { isOpenStartTestrun }) => {
    return {
      ...state,
      isOpenStartTestrun,
    };
  }),
  on(Actions.setDeviceInProgress, (state, { device }) => {
    return {
      ...state,
      deviceInProgress: device,
    };
  }),
  on(Actions.setStatus, (state, { status }) => {
    return {
      ...state,
      status,
    };
  }),
  on(Actions.setReports, (state, { reports }) => {
    return {
      ...state,
      reports,
    };
  }),
  on(Actions.setTestModules, (state, { testModules }) => {
    return {
      ...state,
      testModules,
    };
  }),
  on(Actions.updateAdapters, (state, { adapters }) => {
    return {
      ...state,
      adapters,
    };
  }),
  on(Actions.updateInternetConnection, (state, { internetConnection }) => {
    return {
      ...state,
      internetConnection,
    };
  }),
  on(Actions.fetchInterfacesSuccess, (state, { interfaces }) => ({
    ...state,
    interfaces,
  })),
  on(Actions.fetchSystemConfigSuccess, (state, { systemConfig }) => ({
    ...state,
    systemConfig,
  })),
  on(Actions.setIsOpenProfile, (state, { isOpenCreateProfile }) => {
    return {
      ...state,
      isOpenCreateProfile,
    };
  })
);

export const rootReducer = sharedReducer;
