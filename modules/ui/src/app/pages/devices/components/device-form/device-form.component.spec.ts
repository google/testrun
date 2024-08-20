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
  flush,
  TestBed,
} from '@angular/core/testing';

import { DeviceFormComponent } from './device-form.component';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Device, DeviceStatus } from '../../../../model/device';
import { of } from 'rxjs';
import { DeviceTestsComponent } from '../../../../components/device-tests/device-tests.component';
import { SpinnerComponent } from '../../../../components/spinner/spinner.component';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { DevicesStore } from '../../devices.store';
import { device, MOCK_TEST_MODULES } from '../../../../mocks/device.mock';
import SpyObj = jasmine.SpyObj;
import { FormAction } from '../../devices.component';

describe('DeviceFormComponent', () => {
  let component: DeviceFormComponent;
  let fixture: ComponentFixture<DeviceFormComponent>;
  let mockDevicesStore: SpyObj<DevicesStore>;
  let compiled: HTMLElement;

  beforeEach(() => {
    mockDevicesStore = jasmine.createSpyObj('DevicesStore', [
      'editDevice',
      'saveDevice',
    ]);

    TestBed.configureTestingModule({
      declarations: [DeviceFormComponent],
      providers: [
        { provide: DevicesStore, useValue: mockDevicesStore },
        {
          provide: MatDialogRef,
          useValue: {
            keydownEvents: () => of(new KeyboardEvent('keydown', { code: '' })),
            close: () => ({}),
          },
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        provideNgxMask(),
      ],
      imports: [
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
      ],
    });
    TestBed.overrideProvider(DevicesStore, { useValue: mockDevicesStore });

    fixture = TestBed.createComponent(DeviceFormComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    component.data = {
      testModules: MOCK_TEST_MODULES,
      devices: [],
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should contain device form', () => {
    const form = compiled.querySelector('.device-form');

    expect(form).toBeTruthy();
  });

  it('should close dialog on "cancel" click', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const closeButton = compiled.querySelector(
      '.close-button'
    ) as HTMLButtonElement;

    closeButton?.click();

    expect(closeSpy).toHaveBeenCalledWith();

    closeSpy.calls.reset();
  });

  it('should not save data when fields are empty', () => {
    const saveButton = compiled.querySelector(
      '.save-button'
    ) as HTMLButtonElement;
    const model: HTMLInputElement = compiled.querySelector(
      '.device-form-model'
    ) as HTMLInputElement;
    const manufacturer: HTMLInputElement = compiled.querySelector(
      '.device-form-manufacturer'
    ) as HTMLInputElement;
    const macAddress: HTMLInputElement = compiled.querySelector(
      '.device-form-mac-address'
    ) as HTMLInputElement;

    ['', '                     '].forEach(value => {
      model.value = value;
      model.dispatchEvent(new Event('input'));
      manufacturer.value = value;
      manufacturer.dispatchEvent(new Event('input'));
      macAddress.value = value;
      macAddress.dispatchEvent(new Event('input'));
      saveButton?.click();
      fixture.detectChanges();

      const requiredErrors = compiled.querySelectorAll('mat-error');
      expect(requiredErrors?.length).toEqual(3);

      requiredErrors.forEach(error => {
        expect(error?.innerHTML).toContain('required');
      });
    });
  });

  it('should not save data if no test selected', fakeAsync(() => {
    component.model.setValue('model');
    component.manufacturer.setValue('manufacturer');
    component.mac_addr.setValue('07:07:07:07:07:07');
    component.test_modules.setValue([false, false]);

    component.saveDevice();
    fixture.detectChanges();

    const error = compiled.querySelector('mat-error');
    expect(error?.innerHTML).toContain(
      'At least one test has to be selected to save a Device.'
    );

    flush();
  }));

  it('should save data when form is valid', () => {
    const device: Device = {
      status: DeviceStatus.VALID,
      manufacturer: 'manufacturer',
      model: 'model',
      mac_addr: '07:07:07:07:07:07',
      test_modules: {
        connection: {
          enabled: true,
        },
        udmi: {
          enabled: false,
        },
      },
    };
    component.model.setValue('model');
    component.manufacturer.setValue('manufacturer');
    component.mac_addr.setValue('07:07:07:07:07:07');

    component.saveDevice();

    const args = mockDevicesStore.saveDevice.calls.argsFor(0);
    // @ts-expect-error config is in object
    expect(args[0].device).toEqual(device);
    expect(mockDevicesStore.saveDevice).toHaveBeenCalled();
  });

  describe('test modules', () => {
    it('should be present', () => {
      const test = compiled.querySelectorAll('mat-checkbox');

      expect(test.length).toEqual(2);
    });

    it('should be enabled', () => {
      const tests = compiled.querySelectorAll('.device-form-test-modules p');

      expect(tests[0].classList.contains('disabled')).toEqual(false);
    });
  });

  describe('device model', () => {
    it('should not contain errors when input is correct', () => {
      const model: HTMLInputElement = compiled.querySelector(
        '.device-form-model'
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
      ].forEach(value => {
        const model: HTMLInputElement = compiled.querySelector(
          '.device-form-model'
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
    it('should not contain errors when input is correct', () => {
      const manufacturer: HTMLInputElement = compiled.querySelector(
        '.device-form-manufacturer'
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
      ].forEach(value => {
        const manufacturer: HTMLInputElement = compiled.querySelector(
          '.device-form-manufacturer'
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
      expect(component.mac_addr.disabled).toBeFalse();
    });

    it('should not contain errors when input is correct', () => {
      const macAddress: HTMLInputElement = compiled.querySelector(
        '.device-form-mac-address'
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
      ['value', 'q01e423573c4'].forEach(value => {
        const macAddress: HTMLInputElement = compiled.querySelector(
          '.device-form-mac-address'
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
      component.data = {
        testModules: MOCK_TEST_MODULES,
        devices: [device],
      };
      component.ngOnInit();
      fixture.detectChanges();

      const macAddress: HTMLInputElement = compiled.querySelector(
        '.device-form-mac-address'
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

  it('should have hidden delete device button', () => {
    const deleteButton = compiled.querySelector(
      '.delete-button'
    ) as HTMLButtonElement;

    expect(deleteButton.classList.contains('hidden')).toBeTrue();
  });

  describe('when device is present', () => {
    beforeEach(() => {
      component.data = {
        devices: [device],
        testModules: MOCK_TEST_MODULES,
        device: {
          status: DeviceStatus.VALID,
          manufacturer: 'Delta',
          model: 'O3-DIN-CPU',
          mac_addr: '00:1e:42:35:73:c4',
          test_modules: {
            udmi: {
              enabled: true,
            },
          },
        },
      };
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should fill form values with device values', () => {
      const model: HTMLInputElement = compiled.querySelector(
        '.device-form-model'
      ) as HTMLInputElement;
      const manufacturer: HTMLInputElement = compiled.querySelector(
        '.device-form-manufacturer'
      ) as HTMLInputElement;

      expect(model.value).toEqual('O3-DIN-CPU');
      expect(manufacturer.value).toEqual('Delta');
    });

    it('should save data even mac address already exist', fakeAsync(() => {
      // fill the test controls
      component.test_modules.push(new FormControl(false));
      component.test_modules.push(new FormControl(true));
      component.saveDevice();
      fixture.detectChanges();

      fixture.whenStable().then(() => {
        const error = compiled.querySelector('mat-error');
        expect(error).toBeFalse();
      });

      const args = mockDevicesStore.editDevice.calls.argsFor(0);
      // @ts-expect-error config is in object
      expect(args[0].device).toEqual({
        status: DeviceStatus.VALID,
        manufacturer: 'Delta',
        model: 'O3-DIN-CPU',
        mac_addr: '00:1e:42:35:73:c4',
        test_modules: {
          connection: {
            enabled: false,
          },
          udmi: {
            enabled: true,
          },
        },
      });
      expect(mockDevicesStore.editDevice).toHaveBeenCalled();

      flush();
    }));

    it('should have delete device button', () => {
      const deleteButton = compiled.querySelector(
        '.delete-button'
      ) as HTMLButtonElement;

      expect(deleteButton.classList.contains('hidden')).toBeFalse();
      expect(deleteButton).toBeTruthy();
    });

    it('should close dialog with delete action on "delete" click', () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const closeButton = compiled.querySelector(
        '.delete-button'
      ) as HTMLButtonElement;

      closeButton?.click();

      expect(closeSpy).toHaveBeenCalledWith({ action: FormAction.Delete });

      closeSpy.calls.reset();
    });
  });

  it('should has loader element', () => {
    const spinner = compiled.querySelector('app-spinner');

    expect(spinner).toBeTruthy();
  });
});
