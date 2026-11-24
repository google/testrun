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
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { DeviceQualificationFromComponent } from './device-qualification-from.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { of } from 'rxjs';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DeviceTestsComponent } from '../../../../components/device-tests/device-tests.component';
import { SpinnerComponent } from '../../../../components/spinner/spinner.component';
import {
  device,
  DEVICES_FORM,
  MOCK_TEST_MODULES,
} from '../../../../mocks/device.mock';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { TestRunService } from '../../../../services/test-run.service';
import { DevicesStore } from '../../devices.store';
import { provideMockStore } from '@ngrx/store/testing';
import { DeviceStatus, TestingType } from '../../../../model/device';
import { Component, Input } from '@angular/core';
import { QuestionFormat } from '../../../../model/question';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { selectDevices } from '../../../../store/selectors';
import { SimpleDialogComponent } from '../../../../components/simple-dialog/simple-dialog.component';

/** Text of an element as exposed to assistive technology (`aria-hidden` content skipped). */
function accessibleText(element: Element): string {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
  return clone.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

/** Text of the elements referenced by an `aria-labelledby`/`aria-describedby` value. */
function textOfIdRefs(idRefs: string | null): string {
  return (idRefs ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
    .join(' ');
}

/** Markup of descendants rendered with a different font weight than `element`, e.g. bold emphasis. */
function descendantsWithDifferentFontWeight(element: Element): string[] {
  const fontWeight = getComputedStyle(element).fontWeight;
  return Array.from(element.querySelectorAll('*'))
    .filter(child => getComputedStyle(child).fontWeight !== fontWeight)
    .map(child => child.outerHTML);
}

type Rgb = [number, number, number];

/** Parses a computed `rgb()`/`rgba()` color; alpha is ignored. */
function parseColor(value: string): Rgb {
  const rgb = /^rgba?\(([\d.]+),?\s*([\d.]+),?\s*([\d.]+)/.exec(value);
  if (!rgb) {
    throw new Error(`Unsupported color format: ${value}`);
  }
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}

/** WCAG 2.2 relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map(channel => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG contrast ratio (1–21) between two computed colors. */
function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [
    luminance(parseColor(foreground)),
    luminance(parseColor(background)),
  ].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/** First non-transparent background of the element or its ancestors. */
function effectiveBackground(element: Element): string {
  for (let el: Element | null = element; el; el = el.parentElement) {
    const background = getComputedStyle(el).backgroundColor;
    if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') {
      return background;
    }
  }
  return 'rgb(255, 255, 255)';
}

describe('DeviceQualificationFromComponent', () => {
  let component: DeviceQualificationFromComponent;
  let fixture: ComponentFixture<DeviceQualificationFromComponent>;
  let compiled: HTMLElement;
  const testrunServiceMock: jasmine.SpyObj<TestRunService> =
    jasmine.createSpyObj('testrunServiceMock', [
      'fetchQuestionnaireFormat',
      'saveDevice',
    ]);
  const keyboardEvent = new BehaviorSubject<KeyboardEvent>(
    new KeyboardEvent('keydown', { code: '' })
  );

  const MOCK_DEVICE = {
    status: DeviceStatus.VALID,
    manufacturer: 'manufacturer',
    model: 'model',
    mac_addr: '01:01:01:01:01:01',
    test_pack: TestingType.Qualification,
    type: '',
    technology: '',
    test_modules: {
      udmi: {
        enabled: true,
      },
      connection: {
        enabled: true,
      },
    },
    additional_info: [
      { question: 'What type of device is this?', answer: '' },
      {
        question: 'Does your device process any sensitive information? ',
        answer: '',
      },
      {
        question: 'Please select the technology this device falls into',
        answer: '',
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FakeDynamicFormComponent],
      imports: [
        DeviceQualificationFromComponent,
        MatButtonModule,
        ReactiveFormsModule,
        MatCheckboxModule,
        MatInputModule,
        MatDialogModule,
        BrowserAnimationsModule,
        DeviceTestsComponent,
        SpinnerComponent,
        NgxMaskDirective,
        NgxMaskPipe,
        MatIconTestingModule,
      ],
      providers: [
        DevicesStore,
        {
          provide: MatDialogRef,
          useValue: {
            keydownEvents: () => keyboardEvent.asObservable(),
            close: () => ({}),
          },
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: TestRunService, useValue: testrunServiceMock },
        provideNgxMask(),
        provideMockStore({
          selectors: [{ selector: selectDevices, value: [device, device] }],
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceQualificationFromComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;

    fixture.componentRef.setInput('testModules', MOCK_TEST_MODULES);
    fixture.componentRef.setInput('devices', []);
    fixture.componentRef.setInput('isCreate', true);

    testrunServiceMock.fetchQuestionnaireFormat.and.returnValue(
      of(DEVICES_FORM)
    );

    testrunServiceMock.saveDevice.and.returnValue(of(true));
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should contain device form', () => {
    fixture.detectChanges();
    const form = compiled.querySelector('.device-qualification-form');

    expect(form).toBeTruthy();
  });

  it('should fetch devices format', () => {
    const getQuestionnaireFormatSpy = spyOn(
      component.devicesStore,
      'getQuestionnaireFormat'
    );
    fixture.detectChanges();

    expect(getQuestionnaireFormatSpy).toHaveBeenCalled();
  });

  describe('test modules', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should be present', () => {
      const test = compiled.querySelectorAll('mat-checkbox');

      expect(test.length).toEqual(2);
    });

    it('should be enabled', () => {
      const tests = compiled.querySelectorAll('.device-form-test-modules p');

      expect(tests[0].classList.contains('disabled')).toEqual(false);
    });

    it('should have error when no modules selected', () => {
      component.test_modules.setValue([false, false]);
      component.test_modules.markAsTouched();
      fixture.detectChanges();
      const modules = compiled.querySelector(
        '.device-qualification-form-test-modules-container-error'
      );
      const error = compiled.querySelector(
        '.device-qualification-form-test-modules-error'
      );
      const section = compiled.querySelector('.device-form-test-modules');
      const checkboxInputs =
        compiled.querySelectorAll<HTMLInputElement>('mat-checkbox input');

      expect(modules).toBeTruthy();
      expect(error?.innerHTML.trim()).toEqual(
        'At least one test has to be selected to save a Device.'
      );
      expect(error?.getAttribute('role')).toEqual('alert');
      expect(error?.getAttribute('aria-live')).toEqual('polite');
      expect(error?.id).toBeTruthy();
      expect(section?.getAttribute('aria-invalid')).toEqual('true');
      expect(section?.getAttribute('aria-describedby')).toEqual(
        `device-tests-description ${error?.id}`
      );
      checkboxInputs.forEach(input => {
        expect(input.getAttribute('aria-invalid')).toEqual('true');
        expect(input.getAttribute('aria-describedby')).toEqual(
          error?.id || null
        );
      });
    });

    it('should clear error aria attributes when at least one module is selected', () => {
      component.test_modules.setValue([false, false]);
      component.test_modules.markAsTouched();
      fixture.detectChanges();

      component.test_modules.setValue([true, false]);
      fixture.detectChanges();

      const section = compiled.querySelector('.device-form-test-modules');
      const checkboxInputs =
        compiled.querySelectorAll<HTMLInputElement>('mat-checkbox input');

      expect(section?.getAttribute('aria-invalid')).toBeNull();
      expect(section?.getAttribute('aria-describedby')).toEqual(
        'device-tests-description'
      );
      checkboxInputs.forEach(input => {
        expect(input.getAttribute('aria-invalid')).toBeNull();
        expect(input.getAttribute('aria-describedby')).toBeNull();
      });
    });
  });

  describe('device model', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should not contain errors when input is correct', () => {
      const model: HTMLInputElement = compiled.querySelector(
        '.device-qualification-form-model'
      ) as HTMLInputElement;
      ['model', 'Gebäude', 'jardín'].forEach(value => {
        model.value = value;
        model.dispatchEvent(new Event('input'));

        const errors = component.model.errors;
        const uiValue = model.value;
        const formValue = component.model.value;

        expect(uiValue).toEqual(formValue);
        expect(errors).toBeNull();
      });
    });

    it('should have "invalid_format" error when field does not satisfy validation rules', () => {
      [
        'very long value very long value very long value very long value very long value very long value very long value',
        'as&@3$',
        'test/',
        'test|',
        'test[',
        ':test',
      ].forEach(value => {
        const model: HTMLInputElement = compiled.querySelector(
          '.device-qualification-form-model'
        ) as HTMLInputElement;
        model.value = value;
        model.dispatchEvent(new Event('input'));
        component.model.markAsTouched();
        fixture.detectChanges();

        const modelError = compiled.querySelector('mat-error')?.innerHTML;
        const error = component.model.hasError('invalid_format');

        expect(error).toBeTruthy();
        expect(modelError).toContain(
          'The device model name must be a maximum of 28 characters. Only letters, numbers, and accented letters are permitted.'
        );
      });
    });
  });

  describe('device manufacturer', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should not contain errors when input is correct', () => {
      const manufacturer: HTMLInputElement = compiled.querySelector(
        '.device-qualification-form-manufacturer'
      ) as HTMLInputElement;
      ['manufacturer', 'Gebäude', 'jardín'].forEach(value => {
        manufacturer.value = value;
        manufacturer.dispatchEvent(new Event('input'));

        const errors = component.manufacturer.errors;
        const uiValue = manufacturer.value;
        const formValue = component.manufacturer.value;

        expect(uiValue).toEqual(formValue);
        expect(errors).toBeNull();
      });
    });

    it('should have "invalid_format" error when field does not satisfy validation', () => {
      [
        'very long value very long value very long value very long value very long value very long value very long value',
        'as&@3$',
        'test/',
        'test|',
        'test[',
        ':test',
      ].forEach(value => {
        const manufacturer: HTMLInputElement = compiled.querySelector(
          '.device-qualification-form-manufacturer'
        ) as HTMLInputElement;
        manufacturer.value = value;
        manufacturer.dispatchEvent(new Event('input'));
        component.manufacturer.markAsTouched();
        fixture.detectChanges();

        const manufacturerError =
          compiled.querySelector('mat-error')?.innerHTML;
        const error = component.manufacturer.hasError('invalid_format');

        expect(error).toBeTruthy();
        expect(manufacturerError).toContain(
          'The manufacturer name must be a maximum of 28 characters. Only letters, numbers, and accented letters are permitted.'
        );
      });
    });
  });

  describe('mac address', () => {
    it('should not be disabled', () => {
      fixture.detectChanges();
      expect(component.mac_addr.disabled).toBeFalse();
    });

    it('should not contain errors when input is correct', () => {
      fixture.detectChanges();
      const macAddress: HTMLInputElement = compiled.querySelector(
        '.device-qualification-form-mac-address'
      ) as HTMLInputElement;
      ['07:07:07:07:07:07', '     07:07:07:07:07:07     '].forEach(value => {
        macAddress.value = value;
        macAddress.dispatchEvent(new Event('input'));

        const errors = component.mac_addr.errors;
        const formValue = component.mac_addr.value;

        expect(macAddress.value).toEqual(formValue);
        expect(errors).toBeNull();
      });
    });

    it('should have "pattern" error when field does not satisfy pattern', () => {
      fixture.detectChanges();
      ['value', 'q01e423573c4'].forEach(value => {
        const macAddress: HTMLInputElement = compiled.querySelector(
          '.device-qualification-form-mac-address'
        ) as HTMLInputElement;
        macAddress.value = value;
        macAddress.dispatchEvent(new Event('input'));
        component.mac_addr.markAsTouched();
        fixture.detectChanges();

        const macAddressError = compiled.querySelector('mat-error')?.innerHTML;
        const error = component.mac_addr.hasError('pattern');

        expect(error).toBeTruthy();
        expect(macAddressError).toContain(
          'Please, check. A MAC address consists of 12 hexadecimal digits (0 to 9, a to f, or A to F).'
        );
      });
    });

    it('should have "has_same_mac_address" error when MAC address is already used', () => {
      fixture.componentRef.setInput('testModules', MOCK_TEST_MODULES);
      fixture.componentRef.setInput('devices', [device]);
      fixture.componentRef.setInput('isCreate', true);

      fixture.detectChanges();

      const macAddress: HTMLInputElement = compiled.querySelector(
        '.device-qualification-form-mac-address'
      ) as HTMLInputElement;
      macAddress.value = '00:1e:42:35:73:c4';
      macAddress.dispatchEvent(new Event('input'));
      component.mac_addr.markAsTouched();
      fixture.detectChanges();

      const macAddressError = compiled.querySelector('mat-error')?.innerHTML;
      const error = component.mac_addr.hasError('has_same_mac_address');

      expect(error).toBeTruthy();
      expect(macAddressError).toContain(
        'This MAC address is already used for another device in the repository.'
      );
    });
  });

  describe('required fields', () => {
    const REQUIRED_TEXT_FIELDS = [
      {
        id: 'device-qualification-form-manufacturer',
        label: 'Device manufacturer',
        controlName: 'manufacturer',
        requiredError: 'Device Manufacturer is required',
      },
      {
        id: 'device-qualification-form-model',
        label: 'Device model',
        controlName: 'model',
        requiredError: 'Device Model is required',
      },
      {
        id: 'device-qualification-form-mac-address',
        label: 'MAC address',
        controlName: 'mac_addr',
        requiredError: 'MAC address is required',
      },
    ];
    // Every question of the device questionnaire is required.
    const REQUIRED_QUESTIONNAIRE: QuestionFormat[] = DEVICES_FORM.map(
      question => ({ ...question, validation: { required: true } })
    );

    beforeEach(() => {
      testrunServiceMock.fetchQuestionnaireFormat.and.returnValue(
        of(REQUIRED_QUESTIONNAIRE)
      );
      fixture.detectChanges();
    });

    it('should explain the required field marker in visible text at the top of the form', () => {
      const form = compiled.querySelector(
        'form.device-qualification-form'
      ) as HTMLFormElement;
      const instruction = form.querySelector(
        '.device-qualification-form-required-instruction'
      ) as HTMLElement;
      const firstField = form.querySelector('input, mat-select') as HTMLElement;

      expect(instruction.textContent?.trim()).toBe(
        'Fields marked with an asterisk (*) are required.'
      );
      expect(
        instruction.compareDocumentPosition(firstField) &
          Node.DOCUMENT_POSITION_FOLLOWING
      )
        .withContext('the instruction precedes the first field')
        .toBeTruthy();
      expect(instruction.getBoundingClientRect().height).toBeGreaterThan(0);
      expect(instruction.closest('[aria-hidden="true"]')).toBeNull();
      const ratio = contrastRatio(
        getComputedStyle(instruction).color,
        effectiveBackground(instruction)
      );
      expect(ratio)
        .withContext(`contrast ${ratio.toFixed(2)}:1`)
        .toBeGreaterThanOrEqual(4.5);
    });

    REQUIRED_TEXT_FIELDS.forEach(({ id, label }) => {
      it(`should expose the "${label}" input as required`, () => {
        const input = compiled.querySelector(`#${id}`) as HTMLInputElement;

        expect(input.required).withContext('native required').toBeTrue();
        expect(input.getAttribute('aria-required')).toBe('true');
      });

      it(`should mark the "${label}" label with an asterisk hidden from assistive technology`, () => {
        const fieldLabel = compiled.querySelector(
          `label[for="${id}"]`
        ) as HTMLLabelElement;
        const marker = fieldLabel.querySelector('.field-required-marker');

        expect(marker?.textContent?.trim()).toBe('*');
        expect(marker?.getAttribute('aria-hidden')).toBe('true');
        expect(accessibleText(fieldLabel)).toBe(label);
      });
    });

    REQUIRED_TEXT_FIELDS.forEach(({ id, controlName, requiredError }) => {
      it(`should show "${requiredError}" as plain text, styled like the other errors`, () => {
        component.deviceQualificationForm.get(controlName)?.markAsTouched();
        fixture.detectChanges();

        const error = compiled
          .querySelector(`#${id}`)
          ?.closest('mat-form-field')
          ?.querySelector('mat-error') as HTMLElement;

        expect(error.textContent?.trim()).toBe(requiredError);
        expect(error.querySelector('strong, b'))
          .withContext('bold markup inside the error')
          .toBeNull();
        expect(descendantsWithDifferentFontWeight(error)).toEqual([]);
      });
    });

    it('should expose every questionnaire dropdown as required without changing its name', () => {
      const selects = compiled.querySelectorAll('mat-select');

      expect(selects.length).toBe(REQUIRED_QUESTIONNAIRE.length);
      selects.forEach((select, index) => {
        expect(select.getAttribute('aria-required'))
          .withContext(select.id)
          .toBe('true');
        expect(select.getAttribute('aria-label')?.trim()).toBe(
          REQUIRED_QUESTIONNAIRE[index].question.trim()
        );
      });
    });

    it('should mark every questionnaire label with an asterisk hidden from assistive technology', () => {
      REQUIRED_QUESTIONNAIRE.forEach((question, index) => {
        const fieldLabel = compiled.querySelector(
          `#field-label-${index}`
        ) as HTMLLabelElement;
        const marker = fieldLabel.querySelector('.field-required-marker');

        expect(marker?.textContent?.trim())
          .withContext(question.question)
          .toBe('*');
        expect(marker?.getAttribute('aria-hidden')).toBe('true');
        expect(accessibleText(fieldLabel)).toBe(question.question.trim());
      });
    });

    it('should announce an empty required field as required and describe it by its error', async () => {
      const input = compiled.querySelector(
        '#device-qualification-form-manufacturer'
      ) as HTMLInputElement;

      component.manufacturer.markAsTouched();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges(); // Material syncs aria-describedby after content is checked

      expect(input.getAttribute('aria-required')).toBe('true');
      expect(textOfIdRefs(input.getAttribute('aria-describedby'))).toContain(
        'Device Manufacturer is required'
      );
    });
  });

  describe('when device is present', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('testModules', MOCK_TEST_MODULES);
      fixture.componentRef.setInput('devices', [device]);
      fixture.componentRef.setInput('isCreate', false);
      fixture.componentRef.setInput('initialDevice', {
        status: DeviceStatus.VALID,
        manufacturer: 'Delta',
        model: 'O3-DIN-CPU',
        mac_addr: '00:1e:42:35:73:c4',
        test_modules: {
          udmi: {
            enabled: true,
          },
        },
      });
    });

    it('should fill form values with device values', fakeAsync(() => {
      fixture.detectChanges();

      testrunServiceMock.fetchQuestionnaireFormat.and.returnValue(
        of(DEVICES_FORM)
      );

      tick(1);

      const model: HTMLInputElement = compiled.querySelector(
        '.device-qualification-form-model'
      ) as HTMLInputElement;
      const manufacturer: HTMLInputElement = compiled.querySelector(
        '.device-qualification-form-manufacturer'
      ) as HTMLInputElement;

      expect(model.value).toEqual('O3-DIN-CPU');
      expect(manufacturer.value).toEqual('Delta');

      discardPeriodicTasks();
    }));

    it('should have enabled delete button', () => {
      fixture.detectChanges();
      const button = compiled.querySelector(
        '.delete-button'
      ) as HTMLButtonElement;

      expect(button.disabled).toBeFalse();
    });

    it('should open cancel dialog when device is changed', () => {
      const openSpy = spyOn(component.dialog, 'open').and.returnValue({
        beforeClosed: () => of(true),
      } as MatDialogRef<typeof SimpleDialogComponent>);
      fixture.detectChanges();
      fixture.componentRef.setInput('initialDevice', {
        status: DeviceStatus.VALID,
        manufacturer: 'Alpha',
        model: 'O3-DIN-CPU',
        mac_addr: '00:22:42:35:73:c4',
        test_modules: {
          udmi: {
            enabled: true,
          },
        },
      });
      fixture.detectChanges();

      expect(openSpy).toHaveBeenCalledWith(SimpleDialogComponent, {
        ariaLabel: 'Discard the Device changes',
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
    });
  });

  describe('when device is null', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('testModules', MOCK_TEST_MODULES);
      fixture.componentRef.setInput('devices', [device]);
      fixture.componentRef.setInput('isCreate', true);
      fixture.componentRef.setInput('initialDevice', null);
    });

    it('should have disabled delete button', () => {
      fixture.detectChanges();
      const button = compiled.querySelector(
        '.delete-button'
      ) as HTMLButtonElement;

      expect(button.disabled).toBeTrue();
    });
  });

  describe('with changes', () => {
    it('should have enabled cancel button', () => {
      fixture.detectChanges();
      component.model.setValue('new value');
      fixture.detectChanges();
      const button = compiled.querySelector(
        '.close-button'
      ) as HTMLButtonElement;

      expect(button.disabled).toBeFalse();
    });
  });

  describe('onSaveClicked', () => {
    it('should emit device', () => {
      fixture.detectChanges();
      const saveSpy = spyOn(component.save, 'emit');
      component.manufacturer.setValue('manufacturer');
      component.model.setValue('model');
      component.mac_addr.setValue('01:01:01:01:01:01');
      component.deviceQualificationForm.markAsDirty();

      component.onSaveClicked();
      expect(saveSpy).toHaveBeenCalledWith(MOCK_DEVICE);
    });
  });

  describe('compareDevices', () => {
    it('should return false if manufacturer has changes', () => {
      const updated_device = {
        ...device,
        manufacturer: 'new manufacturer',
      };

      expect(component.compareDevices(device, updated_device)).toBeFalse();
    });
  });

  it('should return false if model has changes', () => {
    const updated_device = {
      ...device,
      model: 'new model',
    };

    expect(component.compareDevices(device, updated_device)).toBeFalse();
  });

  it('should return false if mac_addr has changes', () => {
    const updated_device = {
      ...device,
      mac_addr: 'new mac_addr',
    };

    expect(component.compareDevices(device, updated_device)).toBeFalse();
  });

  it('should return false if type has changes', () => {
    const updated_device = {
      ...device,
      type: 'new type',
    };

    expect(component.compareDevices(device, updated_device)).toBeFalse();
  });

  it('should return false if technology has changes', () => {
    const updated_device = {
      ...device,
      technology: 'new technology',
    };

    expect(component.compareDevices(device, updated_device)).toBeFalse();
  });

  it('should return false if test_pack has changes', () => {
    const updated_device = {
      ...device,
      test_pack: TestingType.Qualification,
    };

    expect(component.compareDevices(device, updated_device)).toBeFalse();
  });

  it('should return false if test modules has changes', () => {
    const updated_device = {
      ...device,
      test_modules: {
        dns: {
          enabled: true,
        },
        connection: {
          enabled: true,
        },
      },
    };

    expect(component.compareDevices(device, updated_device)).toBeFalse();
  });

  it('should return false if additional info has changes', () => {
    const updated_device = {
      ...device,
      additional_info: [
        {
          question: 'Please select the technology this device falls into',
          answer: 'Building Automation',
        },
      ],
    };

    expect(component.compareDevices(device, updated_device)).toBeFalse();
  });

  it('should return true if device has no changes', () => {
    const new_device = {
      ...device,
      additional_info: [
        {
          question: 'Please select the technology this device falls into',
          answer: 'Building Automation',
        },
      ],
    };
    expect(component.compareDevices(new_device, new_device)).toBeTrue();
  });
});

@Component({
  selector: 'app-dynamic-form',
  template: '<div></div>',
  standalone: false,
})
class FakeDynamicFormComponent {
  @Input() format: QuestionFormat[] = [];
  @Input() optionKey: string | undefined;
}
