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
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
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
import { setRiskProfiles } from '../../store/actions';
import { ProfileAction } from '../../model/profile';

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

    mockFocusManagerService.focusFirstElementInContainer.calls.reset();
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

    it('should update selected profile', (done: DoneFn) => {
      riskAssessmentStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.selectedProfile).toEqual(PROFILE_MOCK);
        done();
      });

      riskAssessmentStore.updateSelectedProfile(PROFILE_MOCK);
    });
  });

  describe('selectors', () => {
    it('should select state', done => {
      riskAssessmentStore.viewModel$.pipe(take(1)).subscribe(store => {
        expect(store).toEqual({
          profiles: [PROFILE_MOCK, PROFILE_MOCK_2],
          profileFormat: [],
          selectedProfile: null,
          actions: [
            { action: ProfileAction.Copy, icon: 'content_copy' },
            { action: ProfileAction.Delete, icon: 'delete' },
          ],
        });
        done();
      });
    });
  });

  describe('effects', () => {
    describe('deleteProfile', () => {
      it('should dispatch setRiskProfiles', () => {
        mockService.deleteProfile.and.returnValue(of(true));

        riskAssessmentStore.deleteProfile({
          name: PROFILE_MOCK.name,
          onDelete: (idx: number) => {
            return idx;
          },
        });

        expect(store.dispatch).toHaveBeenCalledWith(
          setRiskProfiles({ riskProfiles: [PROFILE_MOCK_2] })
        );
      });
    });

    describe('setFocus', () => {
      const mockNextItem = document.createElement('div') as HTMLElement;
      const mockFirstItem = document.createElement('section') as HTMLElement;
      const mockNullEL = window.document.querySelector(`.mock`) as HTMLElement;

      it('should set focus to the next profile item when available', fakeAsync(() => {
        const mockData = {
          nextItem: mockNextItem,
          firstItem: mockFirstItem,
        };

        riskAssessmentStore.setFocus(mockData);
        tick(100);

        expect(
          mockFocusManagerService.focusFirstElementInContainer
        ).toHaveBeenCalledWith(mockNextItem);
      }));

      it('should set focus to the first profile item when available and no next item', fakeAsync(() => {
        const mockData = {
          nextItem: mockNullEL,
          firstItem: mockFirstItem,
        };

        riskAssessmentStore.setFocus(mockData);
        tick(100);

        expect(
          mockFocusManagerService.focusFirstElementInContainer
        ).toHaveBeenCalledWith(mockFirstItem);
      }));

      it('should set focus to the first element in the main when no items', fakeAsync(() => {
        const mockData = {
          nextItem: mockNullEL,
          firstItem: mockFirstItem,
        };

        store.overrideSelector(selectRiskProfiles, [PROFILE_MOCK]);
        store.refreshState();

        riskAssessmentStore.setFocus(mockData);
        tick(100);

        expect(
          mockFocusManagerService.focusFirstElementInContainer
        ).toHaveBeenCalledWith();
      }));
    });

    describe('setFocusOnCreateButton', () => {
      const container = window.document.querySelector('app-risk-assessment');

      it('should call focusFirstElementInContainer', fakeAsync(() => {
        riskAssessmentStore.setFocusOnCreateButton();

        tick(11);
        expect(
          mockFocusManagerService.focusFirstElementInContainer
        ).toHaveBeenCalledWith(container);
      }));
    });

    describe('with selected profile', () => {
      const container = document.createElement('div') as HTMLElement;
      container.classList.add('entity-list');
      const inner = document.createElement('div') as HTMLElement;
      inner.classList.add('selected');
      container.appendChild(inner);
      document.querySelector('body')?.appendChild(container);

      it('setFocusOnSelectedProfile should call focusFirstElementInContainer', () => {
        riskAssessmentStore.setFocusOnSelectedProfile();

        expect(
          mockFocusManagerService.focusFirstElementInContainer
        ).toHaveBeenCalledWith(inner);
      });

      it('scrollToSelectedProfile should call focusFirstElementInContainer', () => {
        const scrollSpy = spyOn(inner, 'scrollIntoView');
        riskAssessmentStore.scrollToSelectedProfile();

        expect(scrollSpy).toHaveBeenCalled();
      });
    });

    describe('setFocusOnProfileForm', () => {
      const profileForm = window.document.querySelector('app-profile-form');
      it('should call focusFirstElementInContainer', () => {
        riskAssessmentStore.setFocusOnProfileForm();

        expect(
          mockFocusManagerService.focusFirstElementInContainer
        ).toHaveBeenCalledWith(profileForm);
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
      it('should dispatch setRiskProfiles', () => {
        const onSave = jasmine.createSpy('onSave');
        mockService.fetchProfiles.and.returnValue(of([NEW_PROFILE_MOCK]));
        riskAssessmentStore.saveProfile({
          profile: NEW_PROFILE_MOCK,
          onSave,
        });

        expect(store.dispatch).toHaveBeenCalledWith(
          setRiskProfiles({ riskProfiles: [NEW_PROFILE_MOCK] })
        );
        expect(onSave).toHaveBeenCalled();
      });
    });
  });
});
