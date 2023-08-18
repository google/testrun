import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {Device} from '../model/device';
import {TestRunService} from '../test-run.service';

import {DeviceRepositoryComponent} from './device-repository.component';
import {DeviceRepositoryModule} from './device-repository.module';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {DeviceFormComponent} from './device-form/device-form.component';
import {MatDialogRef} from '@angular/material/dialog';
import SpyObj = jasmine.SpyObj;

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

describe('DeviceRepositoryComponent', () => {
  let service: TestRunService;
  let component: DeviceRepositoryComponent;
  let fixture: ComponentFixture<DeviceRepositoryComponent>;
  let compiled: HTMLElement;
  let mockService: SpyObj<TestRunService>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj(['getDevices', 'fetchDevices', 'setDevices', 'getTestModules', 'addDevice', 'updateDevice']);
    mockService.getDevices.and.returnValue(of([]));
    mockService.getTestModules.and.returnValue([
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
      imports: [DeviceRepositoryModule, BrowserAnimationsModule],
      providers: [{provide: TestRunService, useValue: mockService}],
      declarations: [DeviceRepositoryComponent]
    });
    fixture = TestBed.createComponent(DeviceRepositoryComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    service = fixture.debugElement.injector.get(TestRunService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('with no devices devices', () => {
    beforeEach(() => {
      mockService.getDevices = jasmine.createSpy().and.returnValue(of([]));
      component.ngOnInit();
    });

    it('should show only add device button if no device added', () => {
      fixture.detectChanges();
      const button = compiled.querySelector('.device-repository-content-empty button');

      expect(button).toBeTruthy();
    });
  });

  describe('with devices', () => {
    beforeEach(() => {
      mockService.getDevices.and.returnValue(of([device, device, device]));
      component.ngOnInit();
    });

    it('should show device item', fakeAsync(() => {
      fixture.detectChanges();
      const item = compiled.querySelectorAll('app-device-item');

      expect(item.length).toEqual(3);
    }));

    it('should open device dialog on item click', () => {
      const openSpy = spyOn(component.dialog, 'open').and
        .returnValue({
          afterClosed: () => of(true)
        } as MatDialogRef<typeof DeviceFormComponent>);
      fixture.detectChanges();

      component.openDialog(device);

      expect(openSpy).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalledWith(DeviceFormComponent, {
        data: {
          device: device,
          title: 'Edit device'
        },
        autoFocus: true,
        hasBackdrop: true,
        disableClose: true,
        panelClass: 'device-form-dialog'
      });

      openSpy.calls.reset();
    });
  });

  it('should open device dialog on "add device button click"', () => {
    const openSpy = spyOn(component.dialog, 'open').and
      .returnValue({
        afterClosed: () => of(true)
      } as MatDialogRef<typeof DeviceFormComponent>);
    fixture.detectChanges();
    const button = compiled.querySelector('.device-repository-content-empty button') as HTMLButtonElement;
    button?.click();

    expect(button).toBeTruthy();
    expect(openSpy).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(DeviceFormComponent, {
      data: {device: null, title: 'Create device'},
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'device-form-dialog'
    });

    openSpy.calls.reset();
  });

  it('should not add device if dialog closes with null', () => {
    spyOn(component.dialog, 'open').and
      .returnValue({
        afterClosed: () => of(null)
      } as MatDialogRef<typeof DeviceFormComponent>);
    mockService.addDevice.and.callThrough();

    component.openDialog();

    expect(mockService.addDevice).not.toHaveBeenCalled();
  });

  it('should add device if dialog closes with object', () => {
    const device = {
      "manufacturer": "Delta",
      "model": "O3-DIN-CPU",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
        "dns": {
          "enabled": false
        },
        "connection": {
          "enabled": true
        },
        "ntp": {
          "enabled": false
        },
        "baseline": {
          "enabled": false
        },
        "nmap": {
          "enabled": false
        }
      }
    } as Device;
    spyOn(component.dialog, 'open').and
      .returnValue({
        afterClosed: () => of(device)
      } as MatDialogRef<typeof DeviceFormComponent>);
    mockService.addDevice.and.callThrough();

    component.openDialog();

    expect(mockService.addDevice).toHaveBeenCalledWith(device);
  });

});
