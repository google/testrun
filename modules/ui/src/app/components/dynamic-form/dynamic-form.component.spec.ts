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
      const hint = compiled.querySelector(
        '.mat-mdc-form-field-hint'
      ) as HTMLElement;
      const formFieldWithHint = hint.closest('mat-form-field');
      const wrapper = formFieldWithHint?.querySelector(
        '.mat-mdc-form-field-subscript-wrapper'
      ) as HTMLElement;

      expect(hint.offsetHeight).toBeGreaterThan(0);
      component.adjustSubscriptWrapperHeights();

      expect(wrapper?.style.height).toEqual(`${hint.offsetHeight}px`);
      expect(wrapper?.clientHeight).toEqual(hint.offsetHeight);
    });
  });

  describe('select multiple with "None of the above" option', () => {
    const multiSelectIndex = '5';

    beforeEach(() => {
      component.createProfileForm([
        ...PROFILE_FORM,
        {
          question: 'Which statements are true?',
          type: FormControlType.SELECT_MULTIPLE,
          options: ['Option 1', 'Option 2', 'None of the above'],
          validation: {
            required: true,
          },
        },
      ]);
      fixture.detectChanges();
    });

    it('should unselect "None of the above" when another option is selected after it', () => {
      const multiSelect = component.getFormGroup(multiSelectIndex);

      multiSelect.get('2')?.setValue(true);
      expect(multiSelect.value).toEqual({ 0: false, 1: false, 2: true });

      multiSelect.get('1')?.setValue(true);
      expect(multiSelect.value).toEqual({ 0: false, 1: true, 2: false });
    });

    it('should unselect other options when "None of the above" is selected, and unselect "None of the above" when another option is selected again', () => {
      const multiSelect = component.getFormGroup(multiSelectIndex);

      multiSelect.get('0')?.setValue(true);
      multiSelect.get('1')?.setValue(true);
      expect(multiSelect.value).toEqual({ 0: true, 1: true, 2: false });

      multiSelect.get('2')?.setValue(true);
      expect(multiSelect.value).toEqual({ 0: false, 1: false, 2: true });

      multiSelect.get('1')?.setValue(true);
      expect(multiSelect.value).toEqual({ 0: false, 1: true, 2: false });
    });

    it('should unselect "None of the above" when another option is selected after form reset', () => {
      const multiSelect = component.getFormGroup(multiSelectIndex);

      component.formGroup.reset();
      multiSelect.get('2')?.setValue(true);
      multiSelect.get('1')?.setValue(true);

      expect(multiSelect.get('1')?.value).toBeTrue();
      expect(multiSelect.get('2')?.value).toBeFalse();
    });

    it('should handle non-string option values without throwing an error', () => {
      expect(() =>
        component.createProfileForm([
          {
            question: 'Object options question',
            type: FormControlType.SELECT_MULTIPLE,
            options: [{ label: 'Option 1' }, { label: 'None of the above' }],
          },
        ])
      ).not.toThrow();
    });
  });

  describe('required checkbox groups', () => {
    const OPTIONAL_GROUP = {
      question: 'Which accessories are included?',
      type: FormControlType.SELECT_MULTIPLE,
      options: ['Power supply', 'Mounting kit'],
      validation: { required: false },
    };
    const FORMAT = [...PROFILE_FORM, OPTIONAL_GROUP];
    const REQUIRED_GROUP_INDEX = FORMAT.findIndex(
      item =>
        item.type === FormControlType.SELECT_MULTIPLE &&
        item.validation?.required
    );

    /** Accessible name from `aria-labelledby` (`aria-hidden` content skipped). */
    const nameFromLabelledBy = (element: Element): string =>
      (element.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .map(id => {
          const clone = document.getElementById(id)?.cloneNode(true) as
            Element | undefined;
          clone
            ?.querySelectorAll('[aria-hidden="true"]')
            .forEach(node => node.remove());
          return clone?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        })
        .join(' ');
    /** The checkbox group of the question at the given index. */
    const getGroup = (index: number) =>
      Array.from(compiled.querySelectorAll('[role="group"]')).find(
        group =>
          group.getAttribute('aria-labelledby')?.split(/\s+/)[0] ===
          `field-label-${index}`
      ) as HTMLElement;

    beforeEach(() => {
      // Adds the control for the optional group; existing controls are kept.
      component.createProfileForm(FORMAT);
      dummy.format = FORMAT;
      fixture.detectChanges();
    });

    it('should announce "required" in the name of required checkbox groups only', () => {
      const groups = FORMAT.map((item, index) => ({ item, index })).filter(
        ({ item }) => item.type === FormControlType.SELECT_MULTIPLE
      );

      expect(groups.length).toBe(2);
      groups.forEach(({ item, index }) => {
        const expectedName = item.validation?.required
          ? `${item.question} required`
          : item.question;

        expect(nameFromLabelledBy(getGroup(index)))
          .withContext(item.question)
          .toBe(expectedName);
      });
    });

    it('should keep the "required" text out of the visible label and the reading order', () => {
      const requiredText = compiled.querySelector(
        `#field-required-${REQUIRED_GROUP_INDEX}`
      ) as HTMLElement;
      const label = compiled.querySelector(
        `#field-label-${REQUIRED_GROUP_INDEX}`
      ) as HTMLElement;

      expect(requiredText?.hidden)
        .withContext('hidden from the reading order')
        .toBeTrue();
      expect(getComputedStyle(requiredText).display).toBe('none');
      expect(label.textContent).not.toContain('required');
    });
  });
});
