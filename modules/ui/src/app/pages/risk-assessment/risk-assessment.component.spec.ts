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
import {
  COPY_PROFILE_MOCK,
  NEW_PROFILE_MOCK,
  NEW_PROFILE_MOCK_DRAFT,
  PROFILE_MOCK,
} from '../../mocks/profile.mock';
import { of } from 'rxjs';
import { Component, Input } from '@angular/core';
import { Profile, ProfileFormat } from '../../model/profile';
import { MatDialogRef } from '@angular/material/dialog';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import { RiskAssessmentStore } from './risk-assessment.store';
import { LiveAnnouncer } from '@angular/cdk/a11y';

describe('RiskAssessmentComponent', () => {
  let component: RiskAssessmentComponent;
  let fixture: ComponentFixture<RiskAssessmentComponent>;
  let mockService: SpyObj<TestRunService>;
  let mockRiskAssessmentStore: SpyObj<RiskAssessmentStore>;

  const mockLiveAnnouncer: SpyObj<LiveAnnouncer> = jasmine.createSpyObj([
    'announce',
    'clear',
  ]);
  let compiled: HTMLElement;

  beforeEach(async () => {
    mockService = jasmine.createSpyObj(['fetchProfiles', 'deleteProfile']);
    mockService.deleteProfile.and.returnValue(of(true));

    mockRiskAssessmentStore = jasmine.createSpyObj('RiskAssessmentStore', [
      'deleteProfile',
      'setFocus',
      'getProfilesFormat',
      'saveProfile',
      'updateSelectedProfile',
      'setFocusOnCreateButton',
      'setFocusOnSelectedProfile',
      'setFocusOnProfileForm',
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
        { provide: RiskAssessmentStore, useValue: mockRiskAssessmentStore },
        { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
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
        selectedProfile: null,
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
        selectedProfile: null,
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
        } as MatDialogRef<typeof SimpleDialogComponent>);
        tick();

        component.deleteProfile(PROFILE_MOCK.name, 0, null);
        tick();

        expect(openSpy).toHaveBeenCalledWith(SimpleDialogComponent, {
          data: {
            title: 'Delete risk profile?',
            content: `You are about to delete ${PROFILE_MOCK.name}. Are you sure?`,
          },
          autoFocus: 'dialog',
          hasBackdrop: true,
          disableClose: true,
        });

        openSpy.calls.reset();
      }));

      it('should close form and set selected profile to null if selected profile was deleted', fakeAsync(() => {
        spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof SimpleDialogComponent>);
        tick();

        component.deleteProfile(PROFILE_MOCK.name, 0, PROFILE_MOCK);
        tick();

        expect(
          mockRiskAssessmentStore.updateSelectedProfile
        ).toHaveBeenCalledWith(null);
        expect(component.isOpenProfileForm).toBeFalse();
      }));
    });

    describe('#openForm', () => {
      it('should open the form', () => {
        component.openForm();
        expect(component.isOpenProfileForm).toBeTrue();
      });

      it('should announce', () => {
        component.openForm();
        expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
          'Risk assessment questionnaire'
        );
      });

      it('should focus first element in profile form', async () => {
        await component.openForm();
        expect(
          mockRiskAssessmentStore.setFocusOnProfileForm
        ).toHaveBeenCalled();
      });
    });

    describe('#getCopyOfProfile', () => {
      it('should open the form with copy of profile', () => {
        const copy = component.getCopyOfProfile(PROFILE_MOCK);
        expect(copy).toEqual(COPY_PROFILE_MOCK);
      });
    });

    it('#profileClicked should call openForm with profile', fakeAsync(() => {
      spyOn(component, 'openForm');

      component.profileClicked(PROFILE_MOCK);
      tick();

      expect(component.openForm).toHaveBeenCalledWith(PROFILE_MOCK);
    }));

    it('#copyProfileAndOpenForm should call openForm with copy of profile', fakeAsync(() => {
      spyOn(component, 'openForm');

      component.copyProfileAndOpenForm(PROFILE_MOCK);
      tick();

      expect(component.openForm).toHaveBeenCalledWith(COPY_PROFILE_MOCK);
    }));

    describe('#saveProfile', () => {
      describe('with no profile selected', () => {
        beforeEach(() => {
          component.saveProfileClicked({ name: 'test', questions: [] }, null);
        });

        it('should call store saveProfile when it is new profile', () => {
          const args = mockRiskAssessmentStore.saveProfile.calls.argsFor(0);
          // @ts-expect-error config is in object
          expect(args[0].profile).toEqual({
            name: 'test',
            questions: [],
          });
          expect(mockRiskAssessmentStore.saveProfile).toHaveBeenCalled();
        });

        it('should close the form', () => {
          expect(component.isOpenProfileForm).toBeFalse();
        });
      });

      describe('with profile selected', () => {
        it('should open save profile modal for valid profile', fakeAsync(() => {
          const openSpy = spyOn(component.dialog, 'open').and.returnValue({
            afterClosed: () => of(true),
          } as MatDialogRef<typeof SimpleDialogComponent>);

          component.saveProfileClicked(NEW_PROFILE_MOCK, PROFILE_MOCK);

          expect(openSpy).toHaveBeenCalledWith(SimpleDialogComponent, {
            data: {
              title: 'Save profile',
              content: `You are about to save changes in Primary profile. Are you sure?`,
            },
            autoFocus: 'dialog',
            hasBackdrop: true,
            disableClose: true,
          });

          openSpy.calls.reset();
        }));

        it('should open save draft profile modal', fakeAsync(() => {
          const openSpy = spyOn(component.dialog, 'open').and.returnValue({
            afterClosed: () => of(true),
          } as MatDialogRef<typeof SimpleDialogComponent>);

          component.saveProfileClicked(NEW_PROFILE_MOCK_DRAFT, PROFILE_MOCK);

          expect(openSpy).toHaveBeenCalledWith(SimpleDialogComponent, {
            data: {
              title: 'Save draft profile',
              content: `You are about to save changes in Primary profile. Are you sure?`,
            },
            autoFocus: 'dialog',
            hasBackdrop: true,
            disableClose: true,
          });

          openSpy.calls.reset();
        }));

        it('should call store saveProfile', fakeAsync(() => {
          const openSpy = spyOn(component.dialog, 'open').and.returnValue({
            afterClosed: () => of(true),
          } as MatDialogRef<typeof SimpleDialogComponent>);

          component.saveProfileClicked(NEW_PROFILE_MOCK, PROFILE_MOCK);

          tick();

          const args = mockRiskAssessmentStore.saveProfile.calls.argsFor(0);
          // @ts-expect-error config is in object
          expect(args[0].profile).toEqual(NEW_PROFILE_MOCK);
          expect(mockRiskAssessmentStore.saveProfile).toHaveBeenCalled();
          openSpy.calls.reset();
        }));

        it('should call store saveProfile and should not open save draft profile modal when profile does not have changes', fakeAsync(() => {
          const openSpy = spyOn(component.dialog, 'open').and.returnValue({
            afterClosed: () => of(true),
          } as MatDialogRef<typeof SimpleDialogComponent>);

          component.saveProfileClicked(PROFILE_MOCK, PROFILE_MOCK);

          expect(openSpy).not.toHaveBeenCalled();
          expect(mockRiskAssessmentStore.saveProfile).toHaveBeenCalled();
          openSpy.calls.reset();
        }));

        it('should close the form', fakeAsync(() => {
          spyOn(component.dialog, 'open').and.returnValue({
            afterClosed: () => of(true),
          } as MatDialogRef<typeof SimpleDialogComponent>);

          component.saveProfileClicked(NEW_PROFILE_MOCK, PROFILE_MOCK);
          tick();

          expect(component.isOpenProfileForm).toBeFalse();
        }));
      });
    });

    describe('#discard', () => {
      describe('with no selected profile', () => {
        beforeEach(() => {
          component.discard(null);
        });

        it('should call setFocusOnCreateButton', () => {
          expect(
            mockRiskAssessmentStore.setFocusOnCreateButton
          ).toHaveBeenCalled();
        });

        it('should close the form', () => {
          expect(component.isOpenProfileForm).toBeFalse();
        });
      });

      describe('with selected profile', () => {
        beforeEach(fakeAsync(() => {
          component.discard(PROFILE_MOCK);
          tick(100);
        }));

        it('should call setFocusOnCreateButton', fakeAsync(() => {
          expect(
            mockRiskAssessmentStore.setFocusOnSelectedProfile
          ).toHaveBeenCalled();
        }));

        it('should update selected profile', () => {
          expect(
            mockRiskAssessmentStore.updateSelectedProfile
          ).toHaveBeenCalledWith(null);
        });
      });
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
  @Input() isCopyProfile!: boolean;
  @Input() selectedProfile!: Profile;
  @Input() profileFormat!: ProfileFormat[];
}
