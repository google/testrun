import { ComponentFixture, TestBed } from '@angular/core/testing';

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
import { device, MOCK_TEST_MODULES } from '../../../../mocks/device.mock';
import { MatIconTestingModule } from '@angular/material/icon/testing';
describe('DeviceQualificationFromComponent', () => {
  let component: DeviceQualificationFromComponent;
  let fixture: ComponentFixture<DeviceQualificationFromComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
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
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceQualificationFromComponent);
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
    const form = compiled.querySelector('.device-qualification-form');

    expect(form).toBeTruthy();
  });

  it('should close dialog on "cancel" click', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const closeButton = compiled.querySelector(
      '.device-qualification-form-header-close-button'
    ) as HTMLButtonElement;

    closeButton?.click();

    expect(closeSpy).toHaveBeenCalledWith();

    closeSpy.calls.reset();
  });

  it('should not save data when fields are empty', () => {
    const forwardButton = compiled.querySelector(
      '.form-button-forward'
    ) as HTMLButtonElement;
    const model: HTMLInputElement = compiled.querySelector(
      '.device-qualification-form-model'
    ) as HTMLInputElement;
    const manufacturer: HTMLInputElement = compiled.querySelector(
      '.device-qualification-form-manufacturer'
    ) as HTMLInputElement;
    const macAddress: HTMLInputElement = compiled.querySelector(
      '.device-qualification-form-mac-address'
    ) as HTMLInputElement;

    ['', '                     '].forEach(value => {
      model.value = value;
      model.dispatchEvent(new Event('input'));
      manufacturer.value = value;
      manufacturer.dispatchEvent(new Event('input'));
      macAddress.value = value;
      macAddress.dispatchEvent(new Event('input'));
      forwardButton?.click();
      fixture.detectChanges();

      const requiredErrors = compiled.querySelectorAll('mat-error');
      expect(requiredErrors?.length).toEqual(3);

      requiredErrors.forEach(error => {
        expect(error?.innerHTML).toContain('required');
      });
    });
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
      expect(component.mac_addr.disabled).toBeFalse();
    });

    it('should not contain errors when input is correct', () => {
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
      component.data = {
        testModules: MOCK_TEST_MODULES,
        devices: [device],
      };
      component.ngOnInit();
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
      component.data = {
        devices: [device],
        testModules: MOCK_TEST_MODULES,
        device: {
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
        '.device-qualification-form-model'
      ) as HTMLInputElement;
      const manufacturer: HTMLInputElement = compiled.querySelector(
        '.device-qualification-form-manufacturer'
      ) as HTMLInputElement;

      expect(model.value).toEqual('O3-DIN-CPU');
      expect(manufacturer.value).toEqual('Delta');
    });
  });
});
