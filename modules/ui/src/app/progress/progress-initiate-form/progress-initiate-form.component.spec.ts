import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ProgressInitiateFormComponent} from './progress-initiate-form.component';
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {TestRunService} from '../../test-run.service';
import {BehaviorSubject} from 'rxjs/internal/BehaviorSubject';
import {Device} from '../../model/device';
import {DeviceItemComponent} from '../../components/device-item/device-item.component';
import {ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {DeviceTestsComponent} from '../../components/device-tests/device-tests.component';
import {device} from '../../mocks/device.mock';

describe('ProgressInitiateFormComponent', () => {
  let component: ProgressInitiateFormComponent;
  let fixture: ComponentFixture<ProgressInitiateFormComponent>;
  let compiled: HTMLElement;
  let testRunServiceMock: jasmine.SpyObj<TestRunService>;

  testRunServiceMock = jasmine.createSpyObj(['getDevices', 'fetchDevices', 'getTestModules']);
  testRunServiceMock.getTestModules.and.returnValue([
    {
      displayName: "Connection",
      name: "connection",
      enabled: true
    },
    {
      displayName: "DNS",
      name: "dns",
      enabled: false
    },
  ]);
  testRunServiceMock.getDevices.and.returnValue(new BehaviorSubject<Device[] | null>([device, device]));
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProgressInitiateFormComponent],
      providers: [
        {provide: TestRunService, useValue: testRunServiceMock},
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {
            }
          }
        }],
      imports: [
        MatDialogModule,
        DeviceItemComponent,
        ReactiveFormsModule,
        MatInputModule,
        BrowserAnimationsModule,
        DeviceTestsComponent,
      ]
    });
    fixture = TestBed.createComponent(ProgressInitiateFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  });

  describe('Class tests', () => {
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
        expect(res).toEqual([device, device])
      })
    });

    it('should update selectedDevice on deviceSelected', () => {
      const newDevice = Object.assign(device, {manufacturer: 'Gamma'})
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
        expect(component.firmware.errors ? component.firmware.errors['required'] : false).toEqual(true);
      });

      //test will be updated
      it('should close dialog if selectedDevice is present and firmware is filled', () => {
        spyOn(component.dialogRef, 'close');
        component.firmware.setValue('firmware');
        component.selectedDevice = device;
        component.startTestRun();

        expect(component.dialogRef.close).toHaveBeenCalled();
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
        const deviceList = compiled.querySelector('app-device-item button') as HTMLButtonElement;
        deviceList.click();

        expect(component.deviceSelected).toHaveBeenCalled();
      });

      it('should disable change device and start buttons', () => {
        const changeDevice = compiled.querySelector('.progress-initiate-form-actions-change-device') as HTMLButtonElement;
        const start = compiled.querySelector('.progress-initiate-form-actions-start') as HTMLButtonElement;

        expect(changeDevice.disabled).toEqual(true);
        expect(start.disabled).toEqual(true);
      });
    })

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
        const testsForm = compiled.querySelector('app-device-tests form');
        const tests = compiled.querySelectorAll('app-device-tests mat-checkbox');

        expect(testsForm).toBeTruthy();
        expect(testsForm?.classList.contains('disabled')).toEqual(true);
        expect(tests.length).toEqual(2);
      });

      it('should change device on change device button click', () => {
        spyOn(component, 'changeDevice');
        const button = compiled.querySelector('.progress-initiate-form-actions-change-device') as HTMLButtonElement;
        button.click();

        expect(component.changeDevice).toHaveBeenCalled();
      });

      it('should start test run on start button click', () => {
        spyOn(component, 'startTestRun');
        const button = compiled.querySelector('.progress-initiate-form-actions-start') as HTMLButtonElement;
        button.click();

        expect(component.startTestRun).toHaveBeenCalled();
      });

    });
  });
});
