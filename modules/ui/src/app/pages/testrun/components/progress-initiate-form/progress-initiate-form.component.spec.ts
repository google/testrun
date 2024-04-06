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

import { ProgressInitiateFormComponent } from './progress-initiate-form.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { TestRunService } from '../../../../services/test-run.service';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Device } from '../../../../model/device';
import { DeviceItemComponent } from '../../../../components/device-item/device-item.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DeviceTestsComponent } from '../../../../components/device-tests/device-tests.component';
import { device } from '../../../../mocks/device.mock';
import { of } from 'rxjs';
import { MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE } from '../../../../mocks/progress.mock';
import { SpinnerComponent } from '../../../../components/spinner/spinner.component';
import { provideMockStore } from '@ngrx/store/testing';
import { selectDevices } from '../../../../store/selectors';

describe('ProgressInitiateFormComponent', () => {
  let component: ProgressInitiateFormComponent;
  let fixture: ComponentFixture<ProgressInitiateFormComponent>;
  let compiled: HTMLElement;

  const testRunServiceMock = jasmine.createSpyObj([
    'getDevices',
    'fetchDevices',
    'getTestModules',
    'startTestrun',
    'systemStatus$',
    'getSystemStatus',
    'fetchVersion',
    'setIsOpenStartTestrun',
  ]);
  testRunServiceMock.getTestModules.and.returnValue([
    {
      displayName: 'Connection',
      name: 'connection',
      enabled: true,
    },
    {
      displayName: 'DNS',
      name: 'dns',
      enabled: false,
    },
  ]);
  testRunServiceMock.getDevices.and.returnValue(
    new BehaviorSubject<Device[] | null>([device, device])
  );
  testRunServiceMock.startTestrun.and.returnValue(of(true));
  testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE);

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProgressInitiateFormComponent],
      providers: [
        { provide: TestRunService, useValue: testRunServiceMock },
        {
          provide: MatDialogRef,
          useValue: {
            keydownEvents: () => of(new KeyboardEvent('keydown', { code: '' })),
            close: () => ({}),
          },
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        provideMockStore({
          selectors: [{ selector: selectDevices, value: [device, device] }],
        }),
      ],
      imports: [
        MatDialogModule,
        DeviceItemComponent,
        ReactiveFormsModule,
        MatInputModule,
        BrowserAnimationsModule,
        DeviceTestsComponent,
        SpinnerComponent,
      ],
    });
    fixture = TestBed.createComponent(ProgressInitiateFormComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    testRunServiceMock.getSystemStatus.calls.reset();
  });

  describe('Class tests', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should close dialog', () => {
      spyOn(component.dialogRef, 'close');
      component.cancel();
      expect(component.dialogRef.close).toHaveBeenCalled();
    });

    it('should call setIsOpenAddDevice on cancel', () => {
      component.cancel();

      expect(testRunServiceMock.setIsOpenStartTestrun).toHaveBeenCalledWith(
        false
      );
    });

    it('should set devices$ value', () => {
      component.ngOnInit();

      component.devices$.subscribe(res => {
        expect(res).toEqual([device, device]);
      });
    });

    it('should update selectedDevice on deviceSelected', () => {
      const newDevice = Object.assign({}, device, { manufacturer: 'Gamma' });
      component.deviceSelected(newDevice);

      expect(component.selectedDevice).toEqual(newDevice);
    });

    it('should reset selectedDevice and firmware on changeDevice', () => {
      component.changeDevice();

      expect(component.selectedDevice).toEqual(null);
      expect(component.firmware.value).toEqual('');
    });

    describe('#startNewTestRun', () => {
      it('should add required error if firmware is empty', () => {
        component.firmware.setValue('');
        component.startTestRun();

        expect(component.firmware.errors).toBeTruthy();
        expect(
          component.firmware.errors
            ? component.firmware.errors['required']
            : false
        ).toEqual(true);
      });

      it('should have "invalid_format" error when field does not meet validation rules', () => {
        [
          'very long value very long value very long value very long value very long value very long value very long value',
          '!as&@3$',
        ].forEach(value => {
          const firmware: HTMLInputElement = compiled.querySelector(
            '.firmware-input'
          ) as HTMLInputElement;
          firmware.value = value;
          firmware.dispatchEvent(new Event('input'));
          component.firmware.markAsTouched();
          fixture.detectChanges();

          const firmwareError = compiled.querySelector('mat-error')?.innerHTML;
          const error = component.firmware.hasError('invalid_format');

          expect(error).toBeTruthy();
          expect(firmwareError).toContain(
            'The firmware value must be a maximum of 64 characters. Only letters, numbers, and accented letters are permitted.'
          );
        });
      });

      describe('when selectedDevice is present and firmware is filled', () => {
        beforeEach(() => {
          component.firmware.setValue('firmware');
          component.selectedDevice = device;
        });

        it('should call startTestRun with device', () => {
          component.startTestRun();

          expect(testRunServiceMock.startTestrun).toHaveBeenCalledWith({
            manufacturer: 'Delta',
            model: 'O3-DIN-CPU',
            mac_addr: '00:1e:42:35:73:c4',
            firmware: 'firmware',
            test_modules: {
              dns: {
                enabled: true,
              },
            },
          });
        });

        it('should call fetchVersion', () => {
          component.startTestRun();

          expect(testRunServiceMock.fetchVersion).toHaveBeenCalled();
        });

        describe('when result is success', () => {
          it('should call getSystemStatus', () => {
            testRunServiceMock.startTestrun.and.returnValue(of(true));
            component.startTestRun();

            expect(testRunServiceMock.getSystemStatus).toHaveBeenCalled();
          });
        });
      });
    });

    describe('#ngAfterViewChecked', () => {
      it('should focus button with previously selected device', () => {
        component.prevDevice = device;
        const buttonSpy = spyOn(component, 'focusButton');
        component.ngAfterViewChecked();
        fixture.detectChanges();

        expect(component.prevDevice).toBeNull();
        expect(buttonSpy).toHaveBeenCalled();
      });

      it('should focus firmware', () => {
        component.selectedDevice = device;
        component.setFirmwareFocus = true;
        const firmwareSpy = spyOn(
          component.firmwareInput.nativeElement,
          'focus'
        );
        component.ngAfterViewChecked();
        fixture.detectChanges();

        expect(firmwareSpy).toHaveBeenCalled();
      });
    });

    it('should focus element on focusButton ', function () {
      const deviceButton = compiled.querySelector(
        'app-device-item button'
      ) as HTMLButtonElement;
      const buttonFocusSpy = spyOn(deviceButton, 'focus');
      component.focusButton(deviceButton);

      expect(buttonFocusSpy).toHaveBeenCalled();
    });
  });

  describe('DOM tests', () => {
    describe('empty device', () => {
      beforeEach(() => {
        component.selectedDevice = null;
        fixture.detectChanges();
      });

      it('should have device list', () => {
        const deviceList = compiled.querySelectorAll('app-device-item');

        expect(deviceList.length).toEqual(2);
      });

      it('should select device on device click', () => {
        spyOn(component, 'deviceSelected');
        const deviceList = compiled.querySelector(
          'app-device-item button'
        ) as HTMLButtonElement;
        deviceList.click();

        expect(component.deviceSelected).toHaveBeenCalled();
      });

      it('should disable change device and start buttons', () => {
        const changeDevice = compiled.querySelector(
          '.progress-initiate-form-actions-change-device'
        ) as HTMLButtonElement;
        const start = compiled.querySelector(
          '.progress-initiate-form-actions-start'
        ) as HTMLButtonElement;

        expect(changeDevice.disabled).toEqual(true);
        expect(start.disabled).toEqual(true);
      });
    });

    describe('with device', () => {
      beforeEach(() => {
        component.selectedDevice = device;
        fixture.detectChanges();
      });

      it('should display selected device if device selected', () => {
        const deviceItem = compiled.querySelector('app-device-item');

        expect(deviceItem).toBeTruthy();
      });

      it('should have tabindex -1 for device item', () => {
        const deviceItem = compiled.querySelector('app-device-item button');

        expect((deviceItem as HTMLElement).tabIndex).toBe(-1);
      });

      it('should display firmware if device selected', () => {
        const firmware = compiled.querySelector('input');

        expect(firmware).toBeTruthy();
      });

      it('should display tests if device selected', () => {
        const testsForm = compiled.querySelector('.device-form-test-modules');
        const tests = compiled.querySelectorAll('.device-form-test-modules p');

        expect(testsForm).toBeTruthy();
        expect(tests[0].classList.contains('disabled')).toEqual(true);
        expect(tests.length).toEqual(2);
      });

      it('should change device on change device button click', () => {
        spyOn(component, 'changeDevice');
        const button = compiled.querySelector(
          '.progress-initiate-form-actions-change-device'
        ) as HTMLButtonElement;
        button.click();

        expect(component.changeDevice).toHaveBeenCalled();
      });

      it('should start test run on start button click', () => {
        spyOn(component, 'startTestRun');
        const button = compiled.querySelector(
          '.progress-initiate-form-actions-start'
        ) as HTMLButtonElement;
        button.click();

        expect(component.startTestRun).toHaveBeenCalled();
      });
    });

    it('should has loader element', () => {
      const spinner = compiled.querySelector('app-spinner');

      expect(spinner).toBeTruthy();
    });
  });
});
