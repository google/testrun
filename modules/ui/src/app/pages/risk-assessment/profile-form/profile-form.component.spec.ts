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
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';

import { ProfileFormComponent } from './profile-form.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  COPY_PROFILE_MOCK,
  DRAFT_COPY_PROFILE_MOCK,
  NEW_PROFILE_MOCK,
  NEW_PROFILE_MOCK_DRAFT,
  OUTDATED_DRAFT_PROFILE_MOCK,
  PROFILE_FORM,
  PROFILE_MOCK,
  PROFILE_MOCK_2,
  PROFILE_MOCK_3,
  RENAME_PROFILE_MOCK,
} from '../../../mocks/profile.mock';
import { ProfileStatus } from '../../../model/profile';
import { RiskAssessmentStore } from '../risk-assessment.store';
import { TestRunService } from '../../../services/test-run.service';
import { of } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { SimpleDialogComponent } from '../../../components/simple-dialog/simple-dialog.component';
import SpyObj = jasmine.SpyObj;

describe('ProfileFormComponent', () => {
  let component: ProfileFormComponent;
  let fixture: ComponentFixture<ProfileFormComponent>;
  let compiled: HTMLElement;

  const testrunServiceMock: jasmine.SpyObj<TestRunService> =
    jasmine.createSpyObj('testrunServiceMock', [
      'fetchQuestionnaireFormat',
      'saveDevice',
    ]);

  const mockRiskAssessmentStore: SpyObj<RiskAssessmentStore> =
    jasmine.createSpyObj('RiskAssessmentStore', [
      'updateSelectedProfile',
      'setIsOpenProfile',
    ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileFormComponent, BrowserAnimationsModule],
      providers: [
        { provide: TestRunService, useValue: testrunServiceMock },
        { provide: RiskAssessmentStore, useValue: mockRiskAssessmentStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileFormComponent);
    component = fixture.componentInstance;
    component.profileFormat = PROFILE_FORM;
    component.profiles = [PROFILE_MOCK, PROFILE_MOCK_2, PROFILE_MOCK_3];
    compiled = fixture.nativeElement as HTMLElement;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('DOM tests', () => {
    beforeEach(() => {
      component.selectedProfile = null;
      fixture.detectChanges();
    });

    describe('Profile name input', () => {
      it('should be present', () => {
        const name: HTMLInputElement = compiled.querySelector(
          '.form-name'
        ) as HTMLInputElement;

        expect(name).toBeTruthy();
      });

      it('should not contain errors when input is correct', () => {
        const name: HTMLInputElement = compiled.querySelector(
          '.form-name'
        ) as HTMLInputElement;
        ['name', 'Gebäude', 'jardín'].forEach(value => {
          name.value = value;
          name.dispatchEvent(new Event('input'));

          const errors = component.nameControl.errors;
          const uiValue = name.value;
          const formValue = component.nameControl.value;

          expect(uiValue).toEqual(formValue);
          expect(errors).toBeNull();
        });
      });

      it('should have "invalid_format" error when field does not satisfy validation rules', () => {
        [
          'very long value very long value very long value very long value very long value very long value very long value',
          'as&@3$',
          'test/',
          'test[',
          ':test',
        ].forEach(value => {
          const name: HTMLInputElement = compiled.querySelector(
            '.form-name'
          ) as HTMLInputElement;
          name.value = value;
          name.dispatchEvent(new Event('input'));
          component.nameControl.markAsTouched();
          fixture.detectChanges();

          const nameError = compiled.querySelector('mat-error')?.innerHTML;
          const error = component.nameControl.hasError('invalid_format');

          expect(error).toBeTruthy();
          expect(nameError).toContain(
            'Please, check. The Profile name must be a maximum of 28 characters. Only letters, numbers, and accented letters are permitted.'
          );
        });
      });

      it('should have "required" error when field is not filled', () => {
        const name: HTMLInputElement = compiled.querySelector(
          '.form-name'
        ) as HTMLInputElement;
        ['', '     '].forEach(value => {
          name.value = value;
          name.dispatchEvent(new Event('input'));
          component.nameControl.markAsTouched();
          fixture.detectChanges();

          const nameError = compiled.querySelector('mat-error')?.innerHTML;
          const error = component.nameControl.hasError('required');

          expect(error).toBeTruthy();
          expect(nameError).toContain('The Profile name is required');
        });
      });

      it('should have different profile name error when profile with name is exist', () => {
        const name: HTMLInputElement = compiled.querySelector(
          '.form-name'
        ) as HTMLInputElement;
        name.value = 'Primary profile';
        name.dispatchEvent(new Event('input'));
        component.nameControl.markAsTouched();

        fixture.detectChanges();

        const nameError = compiled.querySelector('mat-error')?.innerHTML;
        const error = component.nameControl.hasError('has_same_profile_name');

        expect(error).toBeTruthy();
        expect(nameError).toContain(
          'This Profile name is already used for another profile'
        );
      });
    });

    describe('Draft button', () => {
      it('should be disabled when profile name is empty', () => {
        component.nameControl.setValue('');
        fixture.detectChanges();
        const draftButton = compiled.querySelector(
          '.save-draft-button'
        ) as HTMLButtonElement;

        expect(draftButton.disabled).toBeTrue();
      });

      it('should be disabled when profile name is not empty but other fields in wrong format', () => {
        component.nameControl.setValue('New profile');
        component.getControl('0').setValue('test');
        fixture.detectChanges();
        const draftButton = compiled.querySelector(
          '.save-draft-button'
        ) as HTMLButtonElement;

        expect(draftButton.disabled).toBeTrue();
      });

      it('should be enabled when profile name is not empty; other fields are empty or in correct format', () => {
        component.nameControl.setValue('New profile');
        component.getControl('0').setValue('a@test.te;b@test.te, c@test.te');
        fixture.detectChanges();
        const draftButton = compiled.querySelector(
          '.save-draft-button'
        ) as HTMLButtonElement;

        expect(draftButton.disabled).toBeFalse();
      });

      it('should emit new profile in draft status', () => {
        component.nameControl.setValue('New profile');
        fixture.detectChanges();
        const emitSpy = spyOn(component.saveProfile, 'emit');
        const draftButton = compiled.querySelector(
          '.save-draft-button'
        ) as HTMLButtonElement;
        draftButton.click();

        expect(emitSpy).toHaveBeenCalledWith({
          ...NEW_PROFILE_MOCK_DRAFT,
        });
      });
    });

    describe('Save button', () => {
      beforeEach(() => {
        fillForm(component);
        fixture.detectChanges();
      });

      it('should be enabled when required fields are present', () => {
        const saveButton = compiled.querySelector(
          '.save-profile-button'
        ) as HTMLButtonElement;

        expect(saveButton.disabled).toBeFalse();
      });

      it('should emit new profile', () => {
        const emitSpy = spyOn(component.saveProfile, 'emit');
        const saveButton = compiled.querySelector(
          '.save-profile-button'
        ) as HTMLButtonElement;
        saveButton.click();

        expect(emitSpy).toHaveBeenCalledWith({
          ...NEW_PROFILE_MOCK,
        });
      });
    });

    describe('Discard button', () => {
      beforeEach(() => {
        fillForm(component);
        fixture.detectChanges();
      });

      it('should be enabled when form is filled', () => {
        const discardButton = compiled.querySelector(
          '.discard-button'
        ) as HTMLButtonElement;

        expect(discardButton.disabled).toBeFalse();
      });

      it('should emit discard', () => {
        const emitSpy = spyOn(component.discard, 'emit');
        const discardButton = compiled.querySelector(
          '.discard-button'
        ) as HTMLButtonElement;
        discardButton.click();

        expect(emitSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Class tests', () => {
    describe('with outdated draft profile', () => {
      beforeEach(() => {
        component.selectedProfile = OUTDATED_DRAFT_PROFILE_MOCK;
        fixture.detectChanges();
      });

      it('should have an error when uses the name of copy profile', () => {
        expect(component.profileForm.value).toEqual({
          0: '',
          1: 'IoT Sensor',
          2: '',
          3: { 0: false, 1: false, 2: false },
          4: '',
          name: 'Outdated profile',
        });
      });
    });

    describe('with profile', () => {
      beforeEach(() => {
        component.selectedProfile = PROFILE_MOCK;
        fixture.detectChanges();
      });

      it('save profile should have rename field', () => {
        const emitSpy = spyOn(component.saveProfile, 'emit');
        fillForm(component);
        component.onSaveClick(ProfileStatus.VALID);

        expect(emitSpy).toHaveBeenCalledWith(RENAME_PROFILE_MOCK);
      });

      it('should not have an error when uses the name of removed profile', () => {
        component.profiles = [PROFILE_MOCK, PROFILE_MOCK_2, PROFILE_MOCK_3];
        component.nameControl.setValue('Third profile name');

        expect(
          component.nameControl.hasError('has_same_profile_name')
        ).toBeTrue();

        component.profiles = [PROFILE_MOCK, PROFILE_MOCK_2];
        expect(
          component.nameControl.hasError('has_same_profile_name')
        ).toBeFalse();
      });

      it('should have an error when uses the name of added profile', () => {
        component.profiles = [PROFILE_MOCK, PROFILE_MOCK_2];
        component.nameControl.setValue('Third profile name');

        expect(
          component.nameControl.hasError('has_same_profile_name')
        ).toBeFalse();

        component.profiles = [PROFILE_MOCK, PROFILE_MOCK_2, PROFILE_MOCK_3];
        expect(
          component.nameControl.hasError('has_same_profile_name')
        ).toBeTrue();
      });

      it('should have an error when uses the name of copy profile', fakeAsync(() => {
        component.selectedProfile = DRAFT_COPY_PROFILE_MOCK;
        component.profiles = [PROFILE_MOCK, PROFILE_MOCK_2, COPY_PROFILE_MOCK];
        fixture.detectChanges();

        expect(
          component.nameControl.hasError('has_same_profile_name')
        ).toBeTrue();
      }));
    });

    describe('with no profile', () => {
      beforeEach(() => {
        component.selectedProfile = null;
        fixture.detectChanges();
      });

      it('save profile should not have rename field', () => {
        const emitSpy = spyOn(component.saveProfile, 'emit');
        fillForm(component);
        component.onSaveClick(ProfileStatus.VALID);

        expect(emitSpy).toHaveBeenCalledWith(NEW_PROFILE_MOCK);
      });
    });

    describe('openCloseDialog', () => {
      it('should open discard modal', fakeAsync(() => {
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof SimpleDialogComponent>);

        component.openCloseDialog();

        expect(openSpy).toHaveBeenCalledWith(SimpleDialogComponent, {
          ariaLabel: 'Discard the Risk Assessment changes',
          data: {
            title: 'Discard changes?',
            content: `You have unsaved changes that would be permanently lost.`,
            confirmName: 'Discard',
          },
          autoFocus: true,
          hasBackdrop: true,
          disableClose: true,
          panelClass: ['simple-dialog', 'discard-dialog'],
        });

        openSpy.calls.reset();
      }));
    });

    describe('close method', () => {
      let storeSpy: jasmine.Spy;
      let openDialogSpy: jasmine.Spy;
      let deleteCopyEmitSpy: jasmine.Spy;

      beforeEach(() => {
        mockRiskAssessmentStore.setIsOpenProfile.calls.reset();
        storeSpy = mockRiskAssessmentStore.setIsOpenProfile;
        openDialogSpy = spyOn(component, 'openCloseDialog');
        deleteCopyEmitSpy = spyOn(component.deleteCopy, 'emit');
      });

      it('should set isOpenProfile to false and return of(true) if profileHasNoChanges is true and not isCopyProfile', done => {
        spyOn(component, 'profileHasNoChanges').and.returnValue(true);
        component.isCopyProfile = false;
        component.profileForm.markAsDirty();

        component.close().subscribe(result => {
          expect(result).toBeTrue();
          expect(storeSpy).toHaveBeenCalledWith(false);
          expect(openDialogSpy).not.toHaveBeenCalled();
          expect(deleteCopyEmitSpy).not.toHaveBeenCalled();
          done();
        });
      });

      it('should set isOpenProfile to false and return of(true) if profileForm is pristine and not isCopyProfile', done => {
        spyOn(component, 'profileHasNoChanges').and.returnValue(false);
        component.profileForm.markAsPristine();
        component.isCopyProfile = false;

        component.close().subscribe(result => {
          expect(result).toBeTrue();
          expect(storeSpy).toHaveBeenCalledWith(false);
          expect(openDialogSpy).not.toHaveBeenCalled();
          expect(deleteCopyEmitSpy).not.toHaveBeenCalled();
          done();
        });
      });

      it('should open dialog if there are changes and not isCopyProfile, and dialog confirms (returns true)', done => {
        spyOn(component, 'profileHasNoChanges').and.returnValue(false);
        component.profileForm.markAsDirty();
        component.isCopyProfile = false;
        openDialogSpy.and.returnValue(of(true));

        component.close().subscribe(result => {
          expect(result).toBeTrue();
          expect(openDialogSpy).toHaveBeenCalled();
          expect(storeSpy).toHaveBeenCalledWith(false);
          expect(deleteCopyEmitSpy).not.toHaveBeenCalled();
          done();
        });
      });

      it('should open dialog if there are changes and not isCopyProfile, and dialog cancels (returns false)', done => {
        spyOn(component, 'profileHasNoChanges').and.returnValue(false);
        component.profileForm.markAsDirty();
        component.isCopyProfile = false;
        openDialogSpy.and.returnValue(of(false));

        component.close().subscribe(result => {
          expect(result).toBeFalse();
          expect(openDialogSpy).toHaveBeenCalled();
          // store.setIsOpenProfile should NOT be called if dialog is cancelled
          expect(storeSpy).not.toHaveBeenCalled();
          expect(deleteCopyEmitSpy).not.toHaveBeenCalled();
          done();
        });
      });

      it('should open dialog if isCopyProfile is true, dialog confirms, and emit deleteCopy', done => {
        spyOn(component, 'profileHasNoChanges').and.returnValue(false);
        component.profileForm.markAsDirty();
        component.isCopyProfile = true;
        component.selectedProfile = { ...PROFILE_MOCK };
        openDialogSpy.and.returnValue(of(true));

        component.close().subscribe(result => {
          expect(result).toBeTrue();
          expect(openDialogSpy).toHaveBeenCalled();
          expect(storeSpy).toHaveBeenCalledWith(false);
          expect(deleteCopyEmitSpy).toHaveBeenCalledWith(
            component.selectedProfile
          );
          done();
        });
      });

      it('should open dialog if isCopyProfile is true, and dialog cancels', done => {
        spyOn(component, 'profileHasNoChanges').and.returnValue(false);
        component.profileForm.markAsDirty();
        component.isCopyProfile = true;
        component.selectedProfile = { ...PROFILE_MOCK };
        openDialogSpy.and.returnValue(of(false));

        component.close().subscribe(result => {
          expect(result).toBeFalse();
          expect(openDialogSpy).toHaveBeenCalled();
          expect(storeSpy).not.toHaveBeenCalled();
          expect(deleteCopyEmitSpy).not.toHaveBeenCalled();
          done();
        });
      });
    });
  });

  function fillForm(component: ProfileFormComponent) {
    component.nameControl.setValue('New profile');
    component.getControl('0').setValue('a@test.te;b@test.te, c@test.te');
    component.getControl('1').setValue('test');
    component.getControl('2').setValue('test');
    component.getControl('3').setValue({ 0: true, 1: true, 2: true });
    component.getControl('4').setValue('test');
    component.profileForm.markAsDirty();
    fixture.detectChanges();
  }
});
