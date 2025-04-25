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

import { DynamicFormComponent } from './dynamic-form.component';
import { Component, ViewEncapsulation, viewChild, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { PROFILE_FORM } from '../../mocks/profile.mock';
import { FormControlType } from '../../model/question';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  template:
    '<form><app-dynamic-form #dynamicForm [format]="format"></app-dynamic-form></form>',
  standalone: false,
})
class DummyComponent {
  private readonly fb = inject(FormBuilder);

  readonly dynamicForm =
    viewChild.required<DynamicFormComponent>('dynamicForm');
  public testForm!: FormGroup;
  public format = PROFILE_FORM;
  constructor() {
    this.testForm = this.fb.group({
      test: [''],
    });
  }
}

describe('DynamicFormComponent', () => {
  let dummy: DummyComponent;
  let fixture: ComponentFixture<DummyComponent>;
  let compiled: HTMLElement;
  let component: DynamicFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DummyComponent],
      imports: [
        DynamicFormComponent,
        ReactiveFormsModule,
        FormsModule,
        NoopAnimationsModule,
      ],
    })
      .overrideComponent(DummyComponent, {
        set: { encapsulation: ViewEncapsulation.None },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DummyComponent);

    dummy = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    component = dummy.dynamicForm();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  PROFILE_FORM.forEach((item, index) => {
    it(`should have form field with specific type"`, () => {
      const fields = compiled.querySelectorAll('.form-field');

      if (item.type === FormControlType.SELECT) {
        const select = fields[index].querySelector('mat-select');
        expect(select).toBeTruthy();
      } else if (item.type === FormControlType.SELECT_MULTIPLE) {
        const select = fields[index].querySelector('mat-checkbox');
        expect(select).toBeTruthy();
      } else if (item.type === FormControlType.TEXTAREA) {
        const input = fields[index]?.querySelector('textarea');
        expect(input).toBeTruthy();
      } else {
        const input = fields[index]?.querySelector('input');
        expect(input).toBeTruthy();
      }
    });

    it('should have label', () => {
      const labels = compiled.querySelectorAll('.field-label');

      const label = item.question;
      expect(labels[index].textContent?.trim()).toEqual(label);
    });

    it('should have hint', () => {
      const fields = compiled.querySelectorAll('.form-field');
      const hint = fields[index].querySelector('mat-hint');

      if (item.description) {
        expect(hint?.textContent?.trim()).toEqual(item.description);
      } else {
        expect(hint).toBeNull();
      }
    });

    if (item.type === FormControlType.SELECT) {
      describe('select', () => {
        it(`should have default value if provided`, () => {
          const fields = compiled.querySelectorAll('.form-field');
          const select = fields[index].querySelector('mat-select');
          expect(select?.textContent?.trim()).toEqual(item.default || '');
        });

        it('should have "required" error when field is not filled', () => {
          const fields = compiled.querySelectorAll('.form-field');

          component.getControl(index).setValue('');
          component.getControl(index).markAsTouched();

          fixture.detectChanges();

          const error = fields[index].querySelector('mat-error')?.innerHTML;

          expect(error).toContain('The field is required');
        });
      });
    }

    if (item.type === FormControlType.SELECT_MULTIPLE) {
      describe('select multiple', () => {
        it(`should mark form group as dirty while tab navigation`, () => {
          const fields = compiled.querySelectorAll('.form-field');
          const checkbox = fields[index].querySelector(
            '.field-select-checkbox:last-of-type mat-checkbox'
          );
          checkbox?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
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
            const fields = compiled.querySelectorAll('.form-field');
            const input = fields[index].querySelector(
              '.mat-mdc-input-element'
            ) as HTMLInputElement;
            ['', '     '].forEach(value => {
              input.value = value;
              input.dispatchEvent(new Event('input'));
              component.getControl(index).markAsTouched();
              fixture.detectChanges();
              const errors = fields[index].querySelectorAll('mat-error');
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
          const fields = compiled.querySelectorAll('.form-field');
          const input: HTMLInputElement = fields[index].querySelector(
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
          const errors = fields[index].querySelectorAll('mat-error');
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
            const fields = compiled.querySelectorAll('.form-field');
            const input: HTMLInputElement = fields[index].querySelector(
              '.mat-mdc-input-element'
            ) as HTMLInputElement;
            input.value =
              'very long value very long value very long value very long value very long value very long value very long value very long value very long value very long value';
            input.dispatchEvent(new Event('input'));
            component.getControl(index).markAsTouched();
            fixture.detectChanges();

            const errors = fields[index].querySelectorAll('mat-error');
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

  describe('adjustSubscriptWrapperHeights', () => {
    it('should set height for hint wrapper', () => {
      component.adjustSubscriptWrapperHeights();

      const wrapper = compiled.querySelector(
        '.mat-mdc-form-field-subscript-wrapper'
      );
      expect(wrapper?.clientHeight).toEqual(20);
    });
  });
});
