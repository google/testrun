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
import { provideMockStore } from '@ngrx/store/testing';
import { TestRunService } from '../../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RiskAssessmentStore } from './risk-assessment.store';
import { PROFILE_MOCK } from '../../mocks/profile.mock';

describe('RiskAssessmentStore', () => {
  let riskAssessmentStore: RiskAssessmentStore;
  let mockService: SpyObj<TestRunService>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj(['fetchProfiles']);

    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        RiskAssessmentStore,
        provideMockStore({}),
        { provide: TestRunService, useValue: mockService },
      ],
    });

    riskAssessmentStore = TestBed.inject(RiskAssessmentStore);
  });

  it('should be created', () => {
    expect(riskAssessmentStore).toBeTruthy();
  });

  describe('updaters', () => {
    it('should update profiles', (done: DoneFn) => {
      riskAssessmentStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.profiles).toEqual([PROFILE_MOCK]);
        done();
      });

      riskAssessmentStore.updateProfiles([PROFILE_MOCK]);
    });
  });

  describe('selectors', () => {
    it('should select state', done => {
      riskAssessmentStore.viewModel$.pipe(take(1)).subscribe(store => {
        expect(store).toEqual({
          profiles: [],
        });
        done();
      });
    });
  });

  describe('effects', () => {
    describe('getProfiles', () => {
      beforeEach(() => {
        mockService.fetchProfiles.and.returnValue(of([PROFILE_MOCK]));
      });

      it('should update profiles', done => {
        riskAssessmentStore.viewModel$
          .pipe(skip(1), take(1))
          .subscribe(store => {
            expect(store.profiles).toEqual([PROFILE_MOCK]);
            done();
          });

        riskAssessmentStore.getProfiles();
      });
    });
  });
});
