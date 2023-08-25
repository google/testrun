import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ProgressInitiateFormComponent} from './progress-initiate-form.component';
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {TestRunService} from '../../test-run.service';
import {BehaviorSubject} from 'rxjs/internal/BehaviorSubject';
import {Device} from '../../model/device';
import {DeviceItemComponent} from '../../components/device-item/device-item.component';

const device = {
  "manufacturer": "Delta",
  "model": "O3-DIN-CPU",
  "mac_addr": "00:1e:42:35:73:c4",
  "test_modules": {
    "dns": {
      "enabled": true,
    }
  }
} as Device;

describe('ProgressInitiateFormComponent', () => {
  let component: ProgressInitiateFormComponent;
  let fixture: ComponentFixture<ProgressInitiateFormComponent>;
  let compiled: HTMLElement;
  let testRunServiceMock: jasmine.SpyObj<TestRunService>;

  testRunServiceMock = jasmine.createSpyObj(['getDevices', 'fetchDevices']);
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
      imports: [MatDialogModule, DeviceItemComponent]
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
  });

  describe('DOM tests', () => {
    it('should have device list', () => {
      const device = compiled.querySelectorAll('app-device-item');

      expect(device.length).toEqual(2);
    });
  });
});
