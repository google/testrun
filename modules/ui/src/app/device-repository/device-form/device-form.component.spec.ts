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
<<<<<<< HEAD
import {ComponentFixture, fakeAsync, flush, TestBed} from '@angular/core/testing';

import {DeviceFormComponent} from './device-form.component';
import {TestRunService} from '../../test-run.service';
=======
import {ComponentFixture, fakeAsync, flush, TestBed, waitForAsync} from '@angular/core/testing';

import {DeviceFormComponent, FormAction} from './device-form.component';
import {TestRunService} from '../../services/test-run.service';
>>>>>>> dev
import {MatButtonModule} from '@angular/material/button';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatInputModule} from '@angular/material/input';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {Device} from '../../model/device';
import {of, throwError} from 'rxjs';
import {DeviceTestsComponent} from '../../components/device-tests/device-tests.component';
<<<<<<< HEAD
=======
import {SpinnerComponent} from '../../components/spinner/spinner.component';
import {NgxMaskDirective, NgxMaskPipe, provideNgxMask} from 'ngx-mask';
>>>>>>> dev

describe('DeviceFormComponent', () => {
  let component: DeviceFormComponent;
  let fixture: ComponentFixture<DeviceFormComponent>;
  let testRunServiceMock: jasmine.SpyObj<TestRunService>;
  let compiled: HTMLElement;

  beforeEach(() => {
    testRunServiceMock = jasmine.createSpyObj(['getTestModules', 'hasDevice', 'saveDevice']);
    testRunServiceMock.getTestModules.and.returnValue([
      {
        displayName: "Connection",
        name: "connection",
        enabled: true
      },
      {
        displayName: "Smart Ready",
        name: "udmi",
        enabled: false
      },
    ]);
    TestBed.configureTestingModule({
      declarations: [DeviceFormComponent],
      providers: [
        {
          provide: TestRunService,
          useValue: testRunServiceMock
        },
        {
          provide: MatDialogRef,
          useValue: {
            close: (result: any) => {
            }
          }
        },
<<<<<<< HEAD
        {provide: MAT_DIALOG_DATA, useValue: {}},],
      imports: [MatButtonModule, ReactiveFormsModule, MatCheckboxModule, MatInputModule, MatDialogModule, BrowserAnimationsModule, DeviceTestsComponent]
=======
        {provide: MAT_DIALOG_DATA, useValue: {}},
        provideNgxMask()
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
      ]
>>>>>>> dev
    });
    fixture = TestBed.createComponent(DeviceFormComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    component.data = {};
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
    const closeButton = compiled.querySelector('.close-button') as HTMLButtonElement;

    closeButton?.click();

    expect(closeSpy).toHaveBeenCalledWith();

    closeSpy.calls.reset();
  });

  it('should not save data when fields are empty', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const saveButton = compiled.querySelector('.save-button') as HTMLButtonElement;
    const model: HTMLInputElement = compiled.querySelector('.device-form-model')!;
    const manufacturer: HTMLInputElement = compiled.querySelector('.device-form-manufacturer')!;
    const macAddress: HTMLInputElement = compiled.querySelector('.device-form-mac-address')!;

    ['', '                     '].forEach(value => {
      model.value = value;
      model.dispatchEvent(new Event('input'));
      manufacturer.value = value;
      manufacturer.dispatchEvent(new Event('input'));
      macAddress.value = value;
      macAddress.dispatchEvent(new Event('input'));
      saveButton?.click();
      fixture.detectChanges();

      fixture.whenStable().then(() => {
        const requiredErrors = compiled.querySelectorAll('mat-error')!;
        expect(requiredErrors.length).toEqual(3);

        requiredErrors.forEach(error => {
          expect(error?.innerHTML).toContain('required');
        })
      });

      expect(closeSpy).not.toHaveBeenCalled();

      closeSpy.calls.reset();
    });
  });

  it('should not save data if no test selected', fakeAsync(() => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    component.model.setValue('model');
    component.manufacturer.setValue('manufacturer');
    component.mac_addr.setValue('07:07:07:07:07:07');
    component.test_modules.setValue([false, false]);
    testRunServiceMock.hasDevice.and.returnValue(true);

    component.saveDevice();
    fixture.detectChanges();

    fixture.whenStable().then(() => {
      const error = compiled.querySelector('mat-error')!;
      expect(error.innerHTML).toContain('At least one test has to be selected.');
    });

    expect(closeSpy).not.toHaveBeenCalled();

    closeSpy.calls.reset();
    flush();
  }));

  it('should not save data when server response with error', fakeAsync(() => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    component.model.setValue('model');
    component.manufacturer.setValue('manufacturer');
    component.mac_addr.setValue('07:07:07:07:07:07');
    testRunServiceMock.hasDevice.and.returnValue(false);
    testRunServiceMock.saveDevice.and.returnValue(throwError({error: 'some error'}));

    component.saveDevice();
    fixture.detectChanges();

    fixture.whenStable().then(() => {
      const error = compiled.querySelector('mat-error')!;
      expect(error.innerHTML).toContain('some error');
    });
    expect(closeSpy).not.toHaveBeenCalled();

    closeSpy.calls.reset();
    flush();
  }));

  it('should save data when form is valid', () => {
    const device: Device = {
      "manufacturer": "manufacturer",
      "model": "model",
      "mac_addr": "07:07:07:07:07:07",
      "test_modules": {
        "connection": {
          "enabled": true
        },
        "udmi": {
          "enabled": false
        }
      }
    };
    const closeSpy = spyOn(component.dialogRef, 'close');
    component.model.setValue('model');
    component.manufacturer.setValue('manufacturer');
    component.mac_addr.setValue('07:07:07:07:07:07');
    testRunServiceMock.hasDevice.and.returnValue(false);
    testRunServiceMock.saveDevice.and.returnValue(of(true));

    component.saveDevice();

    expect(closeSpy).toHaveBeenCalledTimes(1);
<<<<<<< HEAD
    expect(closeSpy).toHaveBeenCalledWith(device);
=======
    expect(closeSpy).toHaveBeenCalledWith({
      action: FormAction.Save,
      device
    });
>>>>>>> dev

    closeSpy.calls.reset();
  });

  describe('test modules', () => {
    it('should be present', () => {
      const test = compiled.querySelectorAll('mat-checkbox');

      expect(test.length).toEqual(2);
    });

    it('should be enabled', () => {
      const testsForm = compiled.querySelector('app-device-tests form');

      expect(testsForm?.classList.contains('disabled')).toEqual(false);
    });
  });

  describe('device model', () => {
<<<<<<< HEAD
    it('should not contain errors when input is correct', fakeAsync(() => {
=======
    it('should not contain errors when input is correct', waitForAsync(() => {
>>>>>>> dev
      const model: HTMLInputElement = compiled.querySelector('.device-form-model')!;
      ['model', 'Gebäude', 'jardín'].forEach(value => {
        model.value = value;
        model.dispatchEvent(new Event('input'));

        fixture.detectChanges();

        fixture.whenStable().then(() => {
          const errors = component.model.errors;
          const uiValue = model.value;
          const formValue = component.model.value;

          expect(uiValue).toEqual(formValue);
          expect(errors).toBeNull();
        });
<<<<<<< HEAD

        flush();
=======
>>>>>>> dev
      });

    }));
  });

  describe('device manufacturer', () => {
<<<<<<< HEAD
    it('should not contain errors when input is correct', fakeAsync(() => {
=======
    it('should not contain errors when input is correct', () => {
>>>>>>> dev
      const manufacturer: HTMLInputElement = compiled.querySelector('.device-form-manufacturer')!;
      ['manufacturer', 'Gebäude', 'jardín'].forEach(value => {
        manufacturer.value = value;
        manufacturer.dispatchEvent(new Event('input'));

<<<<<<< HEAD
        fixture.whenStable().then(() => {
          const errors = component.manufacturer.errors;
          const uiValue = manufacturer.value;
          const formValue = component.manufacturer.value;

          expect(uiValue).toEqual(formValue);
          expect(errors).toBeNull();
        });

        flush();
      })
    }));
=======
        const errors = component.manufacturer.errors;
        const uiValue = manufacturer.value;
        const formValue = component.manufacturer.value;

        expect(uiValue).toEqual(formValue);
        expect(errors).toBeNull();

      })
    });
>>>>>>> dev
  });

  describe('mac address', () => {
    it('should not be disabled', () => {
      expect(component.mac_addr.disabled).toBeFalse();
    });

<<<<<<< HEAD
    it('should not contain errors when input is correct', fakeAsync(() => {
=======
    it('should not contain errors when input is correct', () => {
>>>>>>> dev
      const macAddress: HTMLInputElement = compiled.querySelector('.device-form-mac-address')!;
      ['07:07:07:07:07:07', '     07:07:07:07:07:07     '].forEach(value => {
        macAddress.value = value;
        macAddress.dispatchEvent(new Event('input'));

<<<<<<< HEAD
        fixture.detectChanges();

        fixture.whenStable().then(() => {
          const errors = component.mac_addr.errors;
          const uiValue = macAddress.value;
          const formValue = component.mac_addr.value;

          expect(uiValue).toEqual(formValue);
          expect(errors).toBeNull();
        });

        flush();
      })
    }));

    it('should have "pattern" error when field does not satisfy pattern', fakeAsync(() => {
      const macAddress: HTMLInputElement = compiled.querySelector('.device-form-mac-address')!;
      ['value', '001e423573c4', '          '].forEach(value => {
        macAddress.value = value;
        macAddress.dispatchEvent(new Event('input'));
        component.mac_addr.markAsTouched();

        fixture.detectChanges();

        fixture.whenStable().then(() => {
          const macAddressError = compiled.querySelector('mat-error')!.innerHTML;
          const error = component.mac_addr.errors!['pattern'];

          expect(error).toBeTruthy();
          expect(macAddressError).toContain('Please, check. A MAC address consists of 12 hexadecimal digits (0 to 9, a to f, or A to F).');
        });

        flush();
      })
    }));

    it('should have "has_same_mac_address" error when MAC address is already used', fakeAsync(() => {
=======
        const errors = component.mac_addr.errors;
        const formValue = component.mac_addr.value;

        expect(macAddress.value).toEqual(formValue);
        expect(errors).toBeNull();
      })
    });

    it('should have "pattern" error when field does not satisfy pattern', () => {
      ['value', 'q01e423573c4'].forEach(value => {
        const macAddress: HTMLInputElement = compiled.querySelector('.device-form-mac-address')!;
        macAddress.value = value;
        macAddress.dispatchEvent(new Event('input'));
        component.mac_addr.markAsTouched();
        fixture.detectChanges();

        const macAddressError = compiled.querySelector('mat-error')!.innerHTML;
        const error = component.mac_addr.errors!['pattern'];

        expect(error).toBeTruthy();
        expect(macAddressError).toContain('Please, check. A MAC address consists of 12 hexadecimal digits (0 to 9, a to f, or A to F).');
      })
    });

    it('should have "has_same_mac_address" error when MAC address is already used', () => {
>>>>>>> dev
      testRunServiceMock.hasDevice.and.returnValue(true);
      const macAddress: HTMLInputElement = compiled.querySelector('.device-form-mac-address')!;
      macAddress.value = '07:07:07:07:07:07';
      macAddress.dispatchEvent(new Event('input'));
      component.mac_addr.markAsTouched();
      fixture.detectChanges();

<<<<<<< HEAD
      fixture.whenStable().then(() => {
        const macAddressError = compiled.querySelector('mat-error')!.innerHTML;
        const error = component.mac_addr.errors!['has_same_mac_address'];

        expect(error).toBeTruthy();
        expect(macAddressError).toContain('This MAC address is already used for another device in the repository.');
      });

      flush();
    }));
=======
      const macAddressError = compiled.querySelector('mat-error')!.innerHTML;
      const error = component.mac_addr.errors!['has_same_mac_address'];

      expect(error).toBeTruthy();
      expect(macAddressError).toContain('This MAC address is already used for another device in the repository.');
    });
  });

  it('should have no delete device button', () => {
    const deleteButton = compiled.querySelector('.delete-button')!;

    expect(deleteButton).toBeNull();
>>>>>>> dev
  });

  describe('when device is present', () => {
    beforeEach(() => {
      component.data = {
        device: {
          "manufacturer": "Delta",
          "model": "O3-DIN-CPU",
          "mac_addr": "00:1e:42:35:73:c4",
          "test_modules": {
            "udmi": {
              "enabled": true,
            }
          }
        }
      }
      component.ngOnInit();
      fixture.detectChanges();
    });

<<<<<<< HEAD
    it('should fill form values with device values', () => {
      const model: HTMLInputElement = compiled.querySelector('.device-form-model')!;
      const manufacturer: HTMLInputElement = compiled.querySelector('.device-form-manufacturer')!;
      const macAddress: HTMLInputElement = compiled.querySelector('.device-form-mac-address')!;

      expect(model.value).toEqual('O3-DIN-CPU');
      expect(manufacturer.value).toEqual('Delta');
      expect(macAddress.value).toEqual('00:1e:42:35:73:c4');
    });
=======
    it('should fill form values with device values', waitForAsync(() => {
      fixture.whenStable().then(() => {
        const model: HTMLInputElement = compiled.querySelector('.device-form-model')!;
        const manufacturer: HTMLInputElement = compiled.querySelector('.device-form-manufacturer')!;
        const macAddress: HTMLInputElement = compiled.querySelector('.device-form-mac-address')!;
        expect(model.value).toEqual('O3-DIN-CPU');
        expect(manufacturer.value).toEqual('Delta');
        expect(macAddress.value).toEqual('00:1e:42:35:73:c4');
      });
    }));
>>>>>>> dev

    it('should save data even mac address already exist', fakeAsync(() => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      testRunServiceMock.saveDevice.and.returnValue(of(true));
      testRunServiceMock.hasDevice.and.returnValue(true);
      // fill the test controls
      component.test_modules.push(new FormControl(false));
      component.test_modules.push(new FormControl(true));
      component.saveDevice();
      fixture.detectChanges();

      fixture.whenStable().then(() => {
        const error = compiled.querySelector('mat-error')!;
        expect(error).toBeFalse();
      });

      expect(closeSpy).toHaveBeenCalledWith({
<<<<<<< HEAD
        "manufacturer": "Delta",
        "model": "O3-DIN-CPU",
        "mac_addr": "00:1e:42:35:73:c4",
        "test_modules": {
          "connection": {
            "enabled": false,
          },
          "udmi": {
            "enabled": true,
=======
        action: FormAction.Save,
        device: {
          "manufacturer": "Delta",
          "model": "O3-DIN-CPU",
          "mac_addr": "00:1e:42:35:73:c4",
          "test_modules": {
            "connection": {
              "enabled": false,
            },
            "udmi": {
              "enabled": true,
            }
>>>>>>> dev
          }
        }
      });

      closeSpy.calls.reset();
      flush();
    }));

    it('should disable mac address', () => {
      expect(component.mac_addr.disabled).toBeTrue();
    });
<<<<<<< HEAD
=======

    it('should have delete device button', () => {
      const deleteButton = compiled.querySelector('.delete-button')!;

      expect(deleteButton).toBeTruthy();
    });

    it('should close dialog with delete action on "delete" click', () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const closeButton = compiled.querySelector('.delete-button') as HTMLButtonElement;

      closeButton?.click();

      expect(closeSpy).toHaveBeenCalledWith({action: FormAction.Delete});

      closeSpy.calls.reset();
    });
  });

  it('should has loader element', () => {
    const spinner = compiled.querySelector('app-spinner');

    expect(spinner).toBeTruthy();
>>>>>>> dev
  });
});
