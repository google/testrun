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
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileFormComponent } from './profile-form.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  COPY_PROFILE_MOCK,
  NEW_PROFILE_MOCK,
  NEW_PROFILE_MOCK_DRAFT,
  OUTDATED_DRAFT_PROFILE_MOCK,
  PROFILE_FORM,
  PROFILE_MOCK,
  PROFILE_MOCK_2,
  PROFILE_MOCK_3,
  RENAME_PROFILE_MOCK,
} from '../../../mocks/profile.mock';
import { FormControlType, ProfileStatus } from '../../../model/profile';

describe('ProfileFormComponent', () => {
  let component: ProfileFormComponent;
  let fixture: ComponentFixture<ProfileFormComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileFormComponent, BrowserAnimationsModule],
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
          'This Profile name is already used for another Risk Assessment profile'
        );
      });
    });

    PROFILE_FORM.forEach((item, index) => {
      const uiIndex = index + 1; // as Profile name is at 0 position, the json items start from 1 i

      it(`should have form field with specific type"`, () => {
        const fields = compiled.querySelectorAll('.profile-form-field');

        if (item.type === FormControlType.SELECT) {
          const select = fields[uiIndex].querySelector('mat-select');
          expect(select).toBeTruthy();
        } else if (item.type === FormControlType.SELECT_MULTIPLE) {
          const select = fields[uiIndex].querySelector('mat-checkbox');
          expect(select).toBeTruthy();
        } else if (item.type === FormControlType.TEXTAREA) {
          const input = fields[uiIndex]?.querySelector('textarea');
          expect(input).toBeTruthy();
        } else {
          const input = fields[uiIndex]?.querySelector('input');
          expect(input).toBeTruthy();
        }
      });

      it('should have label', () => {
        const labels = compiled.querySelectorAll('.field-label');
        const uiIndex = index + 1; // as Profile name is at 0 position, the json items start from 1 i

        const label = item?.validation?.required
          ? item.question + ' *'
          : item.question;
        expect(labels[uiIndex].textContent?.trim()).toEqual(label);
      });

      it('should have hint', () => {
        const fields = compiled.querySelectorAll('.profile-form-field');
        const uiIndex = index + 1; // as Profile name is at 0 position, the json items start from 1 i
        const hint = fields[uiIndex].querySelector('mat-hint');

        if (item.description) {
          expect(hint?.textContent?.trim()).toEqual(item.description);
        } else {
          expect(hint).toBeNull();
        }
      });

      if (item.type === FormControlType.SELECT) {
        describe('select', () => {
          it(`should have default value if provided`, () => {
            const fields = compiled.querySelectorAll('.profile-form-field');
            const select = fields[uiIndex].querySelector('mat-select');
            expect(select?.textContent?.trim()).toEqual(item.default || '');
          });

          it('should have "required" error when field is not filled', () => {
            const fields = compiled.querySelectorAll('.profile-form-field');

            component.getControl(index).setValue('');
            component.getControl(index).markAsTouched();

            fixture.detectChanges();

            const error = fields[uiIndex].querySelector('mat-error')?.innerHTML;

            expect(error).toContain('The field is required');
          });
        });
      }

      if (item.type === FormControlType.SELECT_MULTIPLE) {
        describe('select multiple', () => {
          it(`should mark form group as dirty while tab navigation`, () => {
            const fields = compiled.querySelectorAll('.profile-form-field');
            const checkbox = fields[uiIndex].querySelector(
              '.field-select-checkbox:last-of-type mat-checkbox'
            );
            checkbox?.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'Tab' })
            );
            fixture.detectChanges();

            expect(component.getControl(index).dirty).toBeTrue();
          });
        });
      }

      if (
        item.type === FormControlType.TEXT ||
        item.type === FormControlType.TEXTAREA ||
        item.type === FormControlType.EMAIL_MULTIPLE
      ) {
        describe('text or text-long or email-multiple', () => {
          if (item.validation?.required) {
            it('should have "required" error when field is not filled', () => {
              const fields = compiled.querySelectorAll('.profile-form-field');
              const uiIndex = index + 1; // as Profile name is at 0 position, the json items start from 1 i
              const input = fields[uiIndex].querySelector(
                '.mat-mdc-input-element'
              ) as HTMLInputElement;
              ['', '     '].forEach(value => {
                input.value = value;
                input.dispatchEvent(new Event('input'));
                component.getControl(index).markAsTouched();
                fixture.detectChanges();
                const errors = fields[uiIndex].querySelectorAll('mat-error');
                let hasError = false;
                errors.forEach(error => {
                  if (error.textContent === 'The field is required') {
                    hasError = true;
                  }
                });

                expect(hasError).toBeTrue();
              });
            });
          }

          it('should have "invalid_format" error when field does not satisfy validation rules', () => {
            const fields = compiled.querySelectorAll('.profile-form-field');
            const uiIndex = index + 1; // as Profile name is at 0 position, the json items start from 1 i
            const input: HTMLInputElement = fields[uiIndex].querySelector(
              '.mat-mdc-input-element'
            ) as HTMLInputElement;
            input.value = 'as\\\\\\\\\\""""""""';
            input.dispatchEvent(new Event('input'));
            component.getControl(index).markAsTouched();
            fixture.detectChanges();
            const result =
              item.type === FormControlType.EMAIL_MULTIPLE
                ? 'Please, check the email address. Valid e-mail can contain only latin letters, numbers, @ and . (dot).'
                : 'Please, check. “ and \\ are not allowed.';
            const errors = fields[uiIndex].querySelectorAll('mat-error');
            let hasError = false;
            errors.forEach(error => {
              if (error.textContent === result) {
                hasError = true;
              }
            });

            expect(hasError).toBeTrue();
          });

          if (item.validation?.max) {
            it('should have "maxlength" error when field is exceeding max length', () => {
              const fields = compiled.querySelectorAll('.profile-form-field');
              const uiIndex = index + 1; // as Profile name is at 0 position, the json items start from 1 i
              const input: HTMLInputElement = fields[uiIndex].querySelector(
                '.mat-mdc-input-element'
              ) as HTMLInputElement;
              input.value =
                'very long value very long value very long value very long value very long value very long value very long value very long value very long value very long value';
              input.dispatchEvent(new Event('input'));
              component.getControl(index).markAsTouched();
              fixture.detectChanges();

              const errors = fields[uiIndex].querySelectorAll('mat-error');
              let hasError = false;
              errors.forEach(error => {
                if (
                  error.textContent ===
                  `The field must be a maximum of ${item.validation?.max} characters.`
                ) {
                  hasError = true;
                }
              });
              expect(hasError).toBeTrue();
            });
          }
        });
      }
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

      it('should have an error when uses the name of copy profile', () => {
        component.selectedProfile = COPY_PROFILE_MOCK;
        component.profiles = [PROFILE_MOCK, PROFILE_MOCK_2, COPY_PROFILE_MOCK];

        expect(
          component.nameControl.hasError('has_same_profile_name')
        ).toBeTrue();
      });
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
