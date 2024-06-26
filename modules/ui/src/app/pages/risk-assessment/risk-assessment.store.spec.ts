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
import { TestRunService } from '../../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RiskAssessmentStore } from './risk-assessment.store';
import {
  NEW_PROFILE_MOCK,
  PROFILE_FORM,
  PROFILE_MOCK,
  PROFILE_MOCK_2,
} from '../../mocks/profile.mock';
import { FocusManagerService } from '../../services/focus-manager.service';
import { AppState } from '../../store/state';
import { selectRiskProfiles } from '../../store/selectors';
import { fetchRiskProfiles, setRiskProfiles } from '../../store/actions';

describe('RiskAssessmentStore', () => {
  let riskAssessmentStore: RiskAssessmentStore;
  let store: MockStore<AppState>;
  let mockService: SpyObj<TestRunService>;
  let mockFocusManagerService: SpyObj<FocusManagerService>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj([
      'fetchProfiles',
      'deleteProfile',
      'fetchProfilesFormat',
      'saveProfile',
    ]);
    mockService.saveProfile.and.returnValue(of(true));
    mockFocusManagerService = jasmine.createSpyObj([
      'focusFirstElementInContainer',
    ]);

    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        RiskAssessmentStore,
        provideMockStore({
          selectors: [
            {
              selector: selectRiskProfiles,
              value: [PROFILE_MOCK, PROFILE_MOCK_2],
            },
          ],
        }),
        { provide: TestRunService, useValue: mockService },
        { provide: FocusManagerService, useValue: mockFocusManagerService },
      ],
    });

    store = TestBed.inject(MockStore);
    riskAssessmentStore = TestBed.inject(RiskAssessmentStore);

    spyOn(store, 'dispatch').and.callFake(() => {});
  });

  it('should be created', () => {
    expect(riskAssessmentStore).toBeTruthy();
  });

  describe('updaters', () => {
    it('should update activeFiler', (done: DoneFn) => {
      riskAssessmentStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.profileFormat).toEqual(PROFILE_FORM);
        done();
      });

      riskAssessmentStore.updateProfileFormat(PROFILE_FORM);
    });
  });

  describe('selectors', () => {
    it('should select state', done => {
      riskAssessmentStore.viewModel$.pipe(take(1)).subscribe(store => {
        expect(store).toEqual({
          profiles: [PROFILE_MOCK, PROFILE_MOCK_2],
          profileFormat: [],
        });
        done();
      });
    });
  });

  describe('effects', () => {
    describe('deleteProfile', () => {
      it('should dispatch setRiskProfiles', () => {
        mockService.deleteProfile.and.returnValue(of(true));

        riskAssessmentStore.deleteProfile(PROFILE_MOCK.name);

        expect(store.dispatch).toHaveBeenCalledWith(
          setRiskProfiles({ riskProfiles: [PROFILE_MOCK_2] })
        );
      });
    });

    describe('setFocus', () => {
      const mockNextItem = document.createElement('div') as HTMLElement;
      const mockFirstItem = document.createElement('section') as HTMLElement;
      const mockNullEL = window.document.querySelector(`.mock`) as HTMLElement;

      it('should set focus to the next profile item when available', () => {
        const mockData = {
          nextItem: mockNextItem,
          firstItem: mockFirstItem,
        };

        riskAssessmentStore.setFocus(mockData);

        expect(
          mockFocusManagerService.focusFirstElementInContainer
        ).toHaveBeenCalledWith(mockNextItem);
      });

      it('should set focus to the first profile item when available and no next item', () => {
        const mockData = {
          nextItem: mockNullEL,
          firstItem: mockFirstItem,
        };

        riskAssessmentStore.setFocus(mockData);

        expect(
          mockFocusManagerService.focusFirstElementInContainer
        ).toHaveBeenCalledWith(mockFirstItem);
      });

      it('should set focus to the first element in the main when no items', () => {
        const mockData = {
          nextItem: mockNullEL,
          firstItem: mockFirstItem,
        };

        store.overrideSelector(selectRiskProfiles, [PROFILE_MOCK]);
        store.refreshState();

        riskAssessmentStore.setFocus(mockData);

        expect(
          mockFocusManagerService.focusFirstElementInContainer
        ).toHaveBeenCalledWith();
      });
    });

    describe('getProfilesFormat', () => {
      it('should update store', done => {
        mockService.fetchProfilesFormat.and.returnValue(of(PROFILE_FORM));

        riskAssessmentStore.viewModel$
          .pipe(skip(1), take(1))
          .subscribe(store => {
            expect(store.profileFormat).toEqual(PROFILE_FORM);
            done();
          });

        riskAssessmentStore.getProfilesFormat();
      });
    });

    describe('saveProfile', () => {
      it('should dispatch fetchRiskProfiles', () => {
        riskAssessmentStore.saveProfile(NEW_PROFILE_MOCK);

        expect(store.dispatch).toHaveBeenCalledWith(fetchRiskProfiles());
      });
    });
  });
});
