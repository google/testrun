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
  DRAFT_COPY_PROFILE_MOCK,
  NEW_PROFILE_MOCK,
  NEW_PROFILE_MOCK_DRAFT,
  PROFILE_MOCK,
} from '../../mocks/profile.mock';
import { of, Subscription } from 'rxjs';
import { Component, Input, ViewEncapsulation } from '@angular/core';
import { Profile, ProfileAction, ProfileFormat } from '../../model/profile';
import { MatDialogRef } from '@angular/material/dialog';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import { RiskAssessmentStore } from './risk-assessment.store';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Observable } from 'rxjs/internal/Observable';
import { ProfileFormComponent } from './profile-form/profile-form.component';
import { MatIcon } from '@angular/material/icon';
import { MatIconTestingModule } from '@angular/material/icon/testing';

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
      'updateProfiles',
      'removeProfile',
      'isOpenCreateProfile$',
      'profileFormat$',
    ]);

    mockRiskAssessmentStore.profileFormat$ = of([]);

    await TestBed.configureTestingModule({
      declarations: [FakeProfileItemComponent, FakeProfileFormComponent],
      imports: [
        RiskAssessmentComponent,
        MatToolbarModule,
        MatSidenavModule,
        BrowserAnimationsModule,
        MatIconTestingModule,
        MatIcon,
      ],
      providers: [
        { provide: TestRunService, useValue: mockService },
        { provide: RiskAssessmentStore, useValue: mockRiskAssessmentStore },
        { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
      ],
    })
      .overrideComponent(RiskAssessmentComponent, {
        set: { encapsulation: ViewEncapsulation.None },
      })
      .compileComponents();

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

  it('should open form if isOpenAddDevice$ as true', () => {
    mockRiskAssessmentStore.profileFormat$ = of([], []);
    mockRiskAssessmentStore.isOpenCreateProfile$ = of(true);
    component.ngOnInit();

    expect(component.isOpenProfileForm).toBeTrue();
  });

  describe('with no profiles data', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        profiles: [] as Profile[],
        profileFormat: [],
        selectedProfile: null,
        actions: [
          { action: ProfileAction.Copy, icon: 'content_copy' },
          { action: ProfileAction.Delete, icon: 'delete' },
        ],
      });
      mockRiskAssessmentStore.profiles$ = of([]);
      fixture.detectChanges();
    });

    it('should have title', () => {
      const title = compiled.querySelector('h2.title');
      const titleContent = title?.innerHTML.trim();

      expect(title).toBeTruthy();
      expect(titleContent).toContain('Risk Assessment');
    });

    it('should have empty page with necessary content', () => {
      const emptyHeader = compiled.querySelector(
        'app-empty-page .empty-message-header'
      );
      const emptyMessage = compiled.querySelector(
        'app-empty-page .empty-message-main'
      );

      expect(emptyHeader).toBeTruthy();
      expect(emptyHeader?.innerHTML).toContain('Risk assessment');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage?.innerHTML).toContain(
        'complete a brief risk questionnaire'
      );
    });

    it('should have "Create Risk Profile" button', () => {
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

      const title = compiled.querySelector('h2.title');
      const titleContent = title?.innerHTML.trim();
      const profileForm = compiled.querySelectorAll('app-profile-form');

      expect(title).toBeTruthy();
      expect(titleContent).toContain('Risk Assessment');
      expect(profileForm).toBeTruthy();
    });
  });

  describe('with profiles data', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        profiles: [PROFILE_MOCK, PROFILE_MOCK],
        profileFormat: [],
        selectedProfile: null,
        actions: [
          { action: ProfileAction.Copy, icon: 'content_copy' },
          { action: ProfileAction.Delete, icon: 'delete' },
        ],
      });
      fixture.detectChanges();
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

        component.deleteProfile(PROFILE_MOCK, [PROFILE_MOCK], PROFILE_MOCK);
        tick();

        expect(openSpy).toHaveBeenCalledWith(SimpleDialogComponent, {
          data: {
            title: 'Delete risk profile?',
            content: `You are about to delete ${PROFILE_MOCK.name}. Are you sure?`,
          },
          autoFocus: 'dialog',
          hasBackdrop: true,
          disableClose: true,
          panelClass: ['simple-dialog', 'delete-dialog'],
        });

        openSpy.calls.reset();
      }));

      it('should close form and set selected profile to null if selected profile was deleted', fakeAsync(() => {
        spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof SimpleDialogComponent>);

        mockRiskAssessmentStore.deleteProfile.and.callFake(
          (
            observableOrValue:
              | { name: string; onDelete: (idx: number) => void }
              | Observable<{ name: string; onDelete: (idx: number) => void }>
          ) => {
            // @ts-expect-error onDelete exist in object
            observableOrValue?.onDelete(1);
            return new Subscription();
          }
        );

        tick();

        component.deleteProfile(PROFILE_MOCK, [PROFILE_MOCK], PROFILE_MOCK);
        tick();

        expect(
          mockRiskAssessmentStore.updateSelectedProfile
        ).toHaveBeenCalledWith(null);
        expect(component.isOpenProfileForm).toBeFalse();
      }));

      it('should remove copy and close form when unsaved copy is deleted', fakeAsync(() => {
        spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof SimpleDialogComponent>);
        component.isCopyProfile = true;
        component.deleteProfile(
          DRAFT_COPY_PROFILE_MOCK,
          [DRAFT_COPY_PROFILE_MOCK, PROFILE_MOCK],
          DRAFT_COPY_PROFILE_MOCK
        );
        tick();

        expect(mockRiskAssessmentStore.removeProfile).toHaveBeenCalled();
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
        expect(copy).toEqual(DRAFT_COPY_PROFILE_MOCK);
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

      component.copyProfileAndOpenForm(PROFILE_MOCK, [
        PROFILE_MOCK,
        PROFILE_MOCK,
      ]);
      tick();

      expect(component.openForm).toHaveBeenCalledWith(DRAFT_COPY_PROFILE_MOCK);
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
      beforeEach(async () => {
        await component.openForm();
      });

      it('should call openCloseDialog', () => {
        const openCloseDialogSpy = spyOn(
          <ProfileFormComponent>component.form(),
          'openCloseDialog'
        ).and.returnValue(of(true));

        component.discard(null, []);

        expect(openCloseDialogSpy).toHaveBeenCalled();

        openCloseDialogSpy.calls.reset();
      });

      describe('after dialog closed with discard selected', () => {
        beforeEach(() => {
          spyOn(
            <ProfileFormComponent>component.form(),
            'openCloseDialog'
          ).and.returnValue(of(true));
          component.discard(null, []);
        });

        it('should update selected profile', () => {
          expect(
            mockRiskAssessmentStore.updateSelectedProfile
          ).toHaveBeenCalledWith(null);
        });

        it('should close the form', () => {
          expect(component.isOpenProfileForm).toBeFalse();
        });
      });

      describe('with selected copy profile', () => {
        beforeEach(fakeAsync(() => {
          spyOn(
            <ProfileFormComponent>component.form(),
            'openCloseDialog'
          ).and.returnValue(of(true));
          component.isCopyProfile = true;
          component.discard(DRAFT_COPY_PROFILE_MOCK, [DRAFT_COPY_PROFILE_MOCK]);
          tick(100);
        }));

        it('should remove copy if not saved', () => {
          expect(mockRiskAssessmentStore.removeProfile).toHaveBeenCalled();
        });
      });
    });
  });
});

@Component({
  selector: 'app-profile-item',
  template: '<div></div>',
  standalone: false,
})
class FakeProfileItemComponent {
  @Input() profile!: Profile;
}

@Component({
  selector: 'app-profile-form',
  template: '<div></div>',
  standalone: false,
})
class FakeProfileFormComponent {
  @Input() profiles!: Profile[];
  @Input() isCopyProfile!: boolean;
  @Input() selectedProfile!: Profile;
  @Input() profileFormat!: ProfileFormat[];
}
