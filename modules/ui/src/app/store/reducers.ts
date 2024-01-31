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
import { combineReducers, createReducer, on } from '@ngrx/store';
import * as Actions from './actions';
import {
  initialAppComponentState,
  initialSettingsState,
  initialSharedState,
} from './state';

export const appFeatureKey = 'app';

export const appComponentReducer = createReducer(
  initialAppComponentState,
  on(Actions.toggleMenu, state => ({
    ...state,
    isMenuOpen: !state.isMenuOpen,
  })),
  on(Actions.fetchInterfacesSuccess, (state, { interfaces }) => ({
    ...state,
    interfaces,
  })),
  on(Actions.updateFocusNavigation, (state, { focusNavigation }) => ({
    ...state,
    focusNavigation,
  })),
  on(Actions.updateError, (state, { error }) => ({
    ...state,
    error,
  }))
);

export const sharedReducer = createReducer(
  initialSharedState,
  on(Actions.setHasConnectionSettings, (state, { hasConnectionSettings }) => ({
    ...state,
    hasConnectionSettings,
  }))
);

export const settingsReducer = createReducer(
  initialSettingsState,
  on(Actions.fetchSystemConfigSuccess, (state, { systemConfig }) => ({
    ...state,
    systemConfig,
  }))
);

export const rootReducer = combineReducers({
  appComponent: appComponentReducer,
  shared: sharedReducer,
  settings: settingsReducer,
});
