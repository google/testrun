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
  PROFILE_FORM,
  PROFILE_MOCK,
  PROFILE_MOCK_2,
} from '../../../mocks/profile.mock';
import { FormControlType } from '../../../model/profile';

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
    component.profiles = [PROFILE_MOCK, PROFILE_MOCK_2];
    compiled = fixture.nativeElement as HTMLElement;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('DOM tests', () => {
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
        name.value = '';
        name.dispatchEvent(new Event('input'));
        component.nameControl.markAsTouched();
        fixture.detectChanges();

        const nameError = compiled.querySelector('mat-error')?.innerHTML;
        const error = component.nameControl.hasError('required');

        expect(error).toBeTruthy();
        expect(nameError).toContain('The Profile name is required');
      });

      it('should have "required" error when field is not filled', () => {
        const name: HTMLInputElement = compiled.querySelector(
          '.form-name'
        ) as HTMLInputElement;
        name.value = 'Profile name';
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
        it(`should have default value if provided`, () => {
          const fields = compiled.querySelectorAll('.profile-form-field');
          const select = fields[uiIndex].querySelector('mat-select');
          expect(select?.textContent?.trim()).toEqual(item.default || '');
        });
      }
    });
  });
});