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

      expect(modules).toBeTruthy();
      expect(error?.innerHTML.trim()).toEqual(
        'At least one test has to be selected to save a Device.'
      );
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
