/**
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
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { RiskAssessmentComponent } from './risk-assessment.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TestRunService } from '../../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { MatSidenavModule } from '@angular/material/sidenav';
import { PROFILE_MOCK } from '../../mocks/profile.mock';
import { of } from 'rxjs';
import { Component, Input } from '@angular/core';
import { Profile, ProfileFormat } from '../../model/profile';
import { MatDialogRef } from '@angular/material/dialog';
import { DeleteFormComponent } from '../../components/delete-form/delete-form.component';
import { FocusManagerService } from '../../services/focus-manager.service';
import { RiskAssessmentStore } from './risk-assessment.store';

describe('RiskAssessmentComponent', () => {
  let component: RiskAssessmentComponent;
  let fixture: ComponentFixture<RiskAssessmentComponent>;
  let mockService: SpyObj<TestRunService>;
  let mockFocusManagerService: SpyObj<FocusManagerService>;
  let mockRiskAssessmentStore: SpyObj<RiskAssessmentStore>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    mockService = jasmine.createSpyObj(['fetchProfiles', 'deleteProfile']);
    mockService.deleteProfile.and.returnValue(of(true));

    mockFocusManagerService = jasmine.createSpyObj([
      'focusFirstElementInContainer',
    ]);

    mockRiskAssessmentStore = jasmine.createSpyObj('RiskAssessmentStore', [
      'deleteProfile',
      'setFocus',
      'getProfilesFormat',
    ]);

    await TestBed.configureTestingModule({
      declarations: [
        RiskAssessmentComponent,
        FakeProfileItemComponent,
        FakeProfileFormComponent,
      ],
      imports: [MatToolbarModule, MatSidenavModule, BrowserAnimationsModule],
      providers: [
        { provide: TestRunService, useValue: mockService },
        { provide: FocusManagerService, useValue: mockFocusManagerService },
        { provide: RiskAssessmentStore, useValue: mockRiskAssessmentStore },
      ],
    }).compileComponents();

    TestBed.overrideProvider(RiskAssessmentStore, {
      useValue: mockRiskAssessmentStore,
    });

    fixture = TestBed.createComponent(RiskAssessmentComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('with no data', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        profiles: [] as Profile[],
        profileFormat: [],
      });
      mockRiskAssessmentStore.profiles$ = of([]);
      fixture.detectChanges();
    });

    it('should have "New Risk Assessment" button', () => {
      const newRiskAssessmentBtn = compiled.querySelector(
        '.risk-assessment-add-button'
      );

      expect(newRiskAssessmentBtn).not.toBeNull();
    });

    it('should have title and profile form when "New Risk Assessment" button is clicked', () => {
      const newRiskAssessmentBtn = compiled.querySelector(
        '.risk-assessment-add-button'
      ) as HTMLButtonElement;

      newRiskAssessmentBtn.click();
      fixture.detectChanges();

      const toolbarEl = compiled.querySelector('.risk-assessment-toolbar');
      const title = compiled.querySelector('h2.title');
      const titleContent = title?.innerHTML.trim();
      const profileForm = compiled.querySelectorAll('app-profile-form');

      expect(toolbarEl).not.toBeNull();
      expect(title).toBeTruthy();
      expect(titleContent).toContain('Risk assessment');
      expect(profileForm).toBeTruthy();
    });

    it('should not have profiles drawer', () => {
      const profilesDrawer = compiled.querySelector('.profiles-drawer');

      expect(profilesDrawer).toBeFalsy();
    });
  });

  describe('with profiles data', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        profiles: [PROFILE_MOCK, PROFILE_MOCK],
        profileFormat: [],
      });
      fixture.detectChanges();
    });

    it('should have profiles drawer', () => {
      const profilesDrawer = compiled.querySelector('.profiles-drawer');

      expect(profilesDrawer).toBeTruthy();
    });

    it('should have profile items', () => {
      const profileItems = compiled.querySelectorAll('app-profile-item');

      expect(profileItems.length).toEqual(2);
    });

    describe('#deleteProfile', () => {
      it('should open delete profile modal', fakeAsync(() => {
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof DeleteFormComponent>);
        tick();

        component.deleteProfile(PROFILE_MOCK.name, 0);
        tick();

        expect(openSpy).toHaveBeenCalledWith(DeleteFormComponent, {
          ariaLabel: 'Delete risk profile',
          data: {
            title: 'Delete risk profile',
            content: `You are about to delete ${PROFILE_MOCK.name}. Are you sure?`,
          },
          autoFocus: true,
          hasBackdrop: true,
          disableClose: true,
          panelClass: 'delete-form-dialog',
        });

        openSpy.calls.reset();
      }));
    });
  });
});

@Component({
  selector: 'app-profile-item',
  template: '<div></div>',
})
class FakeProfileItemComponent {
  @Input() profile!: Profile;
}

@Component({
  selector: 'app-profile-form',
  template: '<div></div>',
})
class FakeProfileFormComponent {
  @Input() profiles!: Profile[];
  @Input() profileFormat!: ProfileFormat[];
}
