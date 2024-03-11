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
import { initialAppComponentState, initialSharedState } from './state';
import {
  fetchInterfacesSuccess,
  setDevices,
  setHasConnectionSettings,
  setHasDevices,
  setIsOpenAddDevice,
  toggleMenu,
  updateError,
  updateFocusNavigation,
} from './actions';
import { device } from '../mocks/device.mock';

describe('Reducer', () => {
  describe('unknown action', () => {
    it('should return the default state', () => {
      const initialState = initialAppComponentState;
      const action = {
        type: 'Unknown',
      };
      const state = fromReducer.appComponentReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  describe('fetchInterfacesSuccess action', () => {
    it('should update state', () => {
      const initialState = initialAppComponentState;
      const newInterfaces = {
        enx00e04c020fa8: '00:e0:4c:02:0f:a8',
        enx207bd26205e9: '20:7b:d2:62:05:e9',
      };
      const action = fetchInterfacesSuccess({ interfaces: newInterfaces });
      const state = fromReducer.appComponentReducer(initialState, action);

      const newState = { ...initialState, ...{ interfaces: newInterfaces } };
      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('updateFocusNavigation action', () => {
    it('should update state', () => {
      const initialState = initialAppComponentState;
      const action = updateFocusNavigation({ focusNavigation: true });
      const state = fromReducer.appComponentReducer(initialState, action);

      const newState = { ...initialState, ...{ focusNavigation: true } };
      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('toggleMenu action', () => {
    it('should update state', () => {
      const initialState = initialAppComponentState;
      const action = toggleMenu();
      const state = fromReducer.appComponentReducer(initialState, action);

      const newState = { ...initialState, ...{ isMenuOpen: true } };
      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setHasConnectionSettings action', () => {
    it('should update state', () => {
      const initialState = initialSharedState;
      const action = setHasConnectionSettings({ hasConnectionSettings: true });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ hasConnectionSettings: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('updateError action', () => {
    it('should update state', () => {
      const initialState = initialAppComponentState;
      const action = updateError({ error: true });
      const state = fromReducer.appComponentReducer(initialState, action);
      const newState = { ...initialState, ...{ error: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setIsOpenAddDevice action', () => {
    it('should update state', () => {
      const initialState = initialSharedState;
      const action = setIsOpenAddDevice({ isOpenAddDevice: true });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ isOpenAddDevice: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setHasDevices action', () => {
    it('should update state', () => {
      const initialState = initialSharedState;
      const action = setHasDevices({ hasDevices: true });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ hasDevices: true } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setDevices action', () => {
    it('should update state', () => {
      const initialState = initialSharedState;
      const devices = [device, device];
      const action = setDevices({ devices });
      const state = fromReducer.sharedReducer(initialState, action);
      const newState = { ...initialState, ...{ devices } };

      expect(state).toEqual(newState);
      expect(state).not.toBe(initialState);
    });
  });
});
