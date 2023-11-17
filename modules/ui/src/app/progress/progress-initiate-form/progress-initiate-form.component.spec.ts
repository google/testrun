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

import { ProgressInitiateFormComponent } from './progress-initiate-form.component';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TestRunService } from '../../services/test-run.service';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Device } from '../../model/device';
import { DeviceItemComponent } from '../../components/device-item/device-item.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DeviceTestsComponent } from '../../components/device-tests/device-tests.component';
import { device } from '../../mocks/device.mock';
import { of } from 'rxjs';
import {
  MOCK_PROGRESS_DATA_IN_PROGRESS,
  MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE,
} from '../../mocks/progress.mock';
import { NotificationService } from '../../services/notification.service';
import { SpinnerComponent } from '../../components/spinner/spinner.component';

describe('ProgressInitiateFormComponent', () => {
  let component: ProgressInitiateFormComponent;
  let fixture: ComponentFixture<ProgressInitiateFormComponent>;
  let compiled: HTMLElement;

  const notificationServiceMock = jasmine.createSpyObj(['notify', 'dismiss']);
  const testRunServiceMock = jasmine.createSpyObj([
    'getDevices',
    'fetchDevices',
    'getTestModules',
    'startTestrun',
    'systemStatus$',
    'getSystemStatus',
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
        { provide: NotificationService, useValue: notificationServiceMock },
        {
          provide: MatDialogRef,
          useValue: {
            close: () => ({}),
          },
        },
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
    notificationServiceMock.notify.calls.reset();
  });

  describe('when test run started', () => {
    beforeEach(() => {
      component.testRunStarted = true;
    });
    describe('with status "Waiting for device"', () => {
      beforeEach(async () => {
        testRunServiceMock.systemStatus$ = of(
          MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE
        );
      });

      it('should call again getSystemStatus', fakeAsync(() => {
        fixture.detectChanges();
        tick(10000);

        expect(testRunServiceMock.getSystemStatus).toHaveBeenCalledTimes(2);

        discardPeriodicTasks();
      }));

      it('should notify about status', fakeAsync(() => {
        fixture.detectChanges();

        expect(notificationServiceMock.notify).toHaveBeenCalledWith(
          'Waiting for Device',
          0
        );

        discardPeriodicTasks();
      }));
    });

    describe('with status not "Waiting for device"', () => {
      beforeEach(async () => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_IN_PROGRESS);
      });

      it('should call again getSystemStatus', fakeAsync(() => {
        spyOn(component.dialogRef, 'close');
        fixture.detectChanges();

        expect(notificationServiceMock.dismiss).toHaveBeenCalledWith();
        expect(component.dialogRef.close).toHaveBeenCalled();
      }));
    });
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

        describe('when result is success', () => {
          it('should call getSystemStatus', () => {
            testRunServiceMock.startTestrun.and.returnValue(of(true));
            component.startTestRun();

            expect(testRunServiceMock.getSystemStatus).toHaveBeenCalled();
          });
        });
      });
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
