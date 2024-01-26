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
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Device } from '../../model/device';
import { TestRunService } from '../../services/test-run.service';

import { DeviceRepositoryComponent } from './device-repository.component';
import { DeviceRepositoryModule } from './device-repository.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  DeviceFormComponent,
  FormAction,
} from './components/device-form/device-form.component';
import { MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { device } from '../../mocks/device.mock';
import { DeleteFormComponent } from '../../components/delete-form/delete-form.component';
import SpyObj = jasmine.SpyObj;
import { FocusManagerService } from '../../services/focus-manager.service';

describe('DeviceRepositoryComponent', () => {
  let component: DeviceRepositoryComponent;
  let fixture: ComponentFixture<DeviceRepositoryComponent>;
  let compiled: HTMLElement;
  let mockService: SpyObj<TestRunService>;

  const stateServiceMock: jasmine.SpyObj<FocusManagerService> =
    jasmine.createSpyObj('stateServiceMock', ['focusFirstElementInContainer']);

  beforeEach(() => {
    mockService = jasmine.createSpyObj([
      'getDevices',
      'fetchDevices',
      'setDevices',
      'getTestModules',
      'addDevice',
      'updateDevice',
      'deleteDevice',
      'removeDevice',
      'isOpenAddDevice$',
    ]);
    mockService.isOpenAddDevice$ = new BehaviorSubject(false);
    mockService.getDevices.and.returnValue(
      new BehaviorSubject<Device[] | null>([])
    );
    mockService.getTestModules.and.returnValue([
      {
        displayName: 'Connection',
        name: 'connection',
        enabled: true,
      },
      {
        displayName: 'Smart Ready',
        name: 'udmi',
        enabled: false,
      },
    ]);
    TestBed.configureTestingModule({
      imports: [DeviceRepositoryModule, BrowserAnimationsModule],
      providers: [
        { provide: TestRunService, useValue: mockService },
        { provide: FocusManagerService, useValue: stateServiceMock },
      ],
      declarations: [DeviceRepositoryComponent],
    });
    fixture = TestBed.createComponent(DeviceRepositoryComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('with no devices devices', () => {
    beforeEach(() => {
      mockService.getDevices = jasmine.createSpy().and.returnValue(of([]));
      mockService.isOpenAddDevice$ = new BehaviorSubject(true);
      component.ngOnInit();
    });

    it('should show only add device button if no device added', () => {
      fixture.detectChanges();
      const button = compiled.querySelector(
        '.device-repository-content-empty button'
      );

      expect(button).toBeTruthy();
    });

    it('should open the modal if isOpenAddDevice$ as true', () => {
      const openDialogSpy = spyOn(component, 'openDialog');

      component.ngOnInit();

      expect(openDialogSpy).toHaveBeenCalled();
    });
  });

  describe('with devices', () => {
    beforeEach(() => {
      mockService.getDevices.and.returnValue(
        new BehaviorSubject<Device[] | null>([device, device, device])
      );
      component.ngOnInit();
    });

    it('should show device item', fakeAsync(() => {
      fixture.detectChanges();
      const item = compiled.querySelectorAll('app-device-item');

      expect(item.length).toEqual(3);
    }));

    it('should add device-item-selected class for selected device', fakeAsync(() => {
      component.selectedDevice = device;
      fixture.detectChanges();
      const item = compiled.querySelector('app-device-item');

      expect(item?.classList.contains('device-item-selected')).toBeTrue();
    }));

    describe('#openDialog', () => {
      it('should open device dialog on item click', () => {
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof DeviceFormComponent>);
        fixture.detectChanges();

        component.openDialog(device);

        expect(openSpy).toHaveBeenCalled();
        expect(openSpy).toHaveBeenCalledWith(DeviceFormComponent, {
          ariaLabel: 'Edit device',
          data: {
            device: device,
            title: 'Edit device',
          },
          autoFocus: true,
          hasBackdrop: true,
          disableClose: true,
          panelClass: 'device-form-dialog',
        });

        openSpy.calls.reset();
      });

      it('should open device dialog with delete-button focus element', () => {
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof DeviceFormComponent>);
        fixture.detectChanges();

        component.openDialog(device, true);

        expect(openSpy).toHaveBeenCalledWith(DeviceFormComponent, {
          ariaLabel: 'Edit device',
          data: {
            device: device,
            title: 'Edit device',
          },
          autoFocus: '.delete-button',
          hasBackdrop: true,
          disableClose: true,
          panelClass: 'device-form-dialog',
        });

        openSpy.calls.reset();
      });
    });
  });

  it('should open device dialog on "add device button" click', () => {
    const openSpy = spyOn(component.dialog, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as MatDialogRef<typeof DeviceFormComponent>);
    fixture.detectChanges();
    const button = compiled.querySelector(
      '.device-repository-content-empty button'
    ) as HTMLButtonElement;
    button?.click();

    expect(button).toBeTruthy();
    expect(openSpy).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(DeviceFormComponent, {
      ariaLabel: 'Create device',
      data: { device: null, title: 'Create device' },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'device-form-dialog',
    });

    openSpy.calls.reset();
  });

  it('should not add device if dialog closes with null', () => {
    spyOn(component.dialog, 'open').and.returnValue({
      afterClosed: () => of(null),
    } as MatDialogRef<typeof DeviceFormComponent>);
    mockService.addDevice.and.callThrough();

    component.openDialog();

    expect(mockService.addDevice).not.toHaveBeenCalled();
  });

  it('should add device if dialog closes with object and save action', () => {
    spyOn(component.dialog, 'open').and.returnValue({
      afterClosed: () =>
        of({
          device,
          action: FormAction.Save,
        }),
    } as MatDialogRef<typeof DeviceFormComponent>);
    mockService.addDevice.and.callThrough();

    component.openDialog();

    expect(mockService.addDevice).toHaveBeenCalledWith(device);
  });

  it('should update device if dialog closes with object, action save and selected device', () => {
    spyOn(component.dialog, 'open').and.returnValue({
      afterClosed: () =>
        of({
          device,
          action: FormAction.Save,
        }),
    } as MatDialogRef<typeof DeviceFormComponent>);
    mockService.updateDevice.and.callThrough();

    component.openDialog(device);

    expect(mockService.updateDevice).toHaveBeenCalledWith(device, device);
  });

  it('should delete device if dialog closes with object, action delete and selected device', () => {
    const openDeleteDialogSpy = spyOn(component, 'openDeleteDialog');
    spyOn(component.dialog, 'open').and.returnValue({
      afterClosed: () =>
        of({
          device,
          action: FormAction.Delete,
        }),
    } as MatDialogRef<typeof DeviceFormComponent>);

    component.openDialog(device);

    expect(openDeleteDialogSpy).toHaveBeenCalledWith(device);
  });

  describe('delete device dialog', () => {
    beforeEach(() => {
      mockService.getDevices.and.returnValue(
        new BehaviorSubject<Device[] | null>([device, device, device])
      );
      component.ngOnInit();
    });

    it('should show device item', fakeAsync(() => {
      fixture.detectChanges();
      const item = compiled.querySelectorAll('app-device-item');

      expect(item.length).toEqual(3);
    }));

    it('should delete device when dialog return true', () => {
      spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<typeof DeleteFormComponent>);
      mockService.deleteDevice.and.returnValue(of(true));
      mockService.removeDevice.and.callThrough();

      component.openDeleteDialog(device);

      expect(mockService.deleteDevice).toHaveBeenCalledWith(device);
      expect(mockService.removeDevice).toHaveBeenCalledWith(device);
    });

    it('should focus next device when dialog return true and next device is exist', fakeAsync(() => {
      spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<typeof DeleteFormComponent>);
      component.selectedDevice = device;
      mockService.deleteDevice.and.returnValue(of(true));
      mockService.removeDevice.and.callThrough();
      fixture.detectChanges();
      const deviceButton = compiled.querySelector(
        '.device-item-selected + app-device-item button'
      ) as HTMLButtonElement;
      const buttonFocusSpy = spyOn(deviceButton, 'focus');

      component.openDeleteDialog(device);

      expect(buttonFocusSpy).toHaveBeenCalled();
    }));

    it('should focus add button when dialog return true and next device is not exist', fakeAsync(() => {
      spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<typeof DeleteFormComponent>);
      component.selectedDevice = null;
      mockService.deleteDevice.and.returnValue(of(true));
      mockService.removeDevice.and.callThrough();
      fixture.detectChanges();

      component.openDeleteDialog(device);

      expect(
        document.activeElement?.classList.contains('device-add-button')
      ).toBeTrue();
    }));

    it('should open device dialog when dialog return null', () => {
      const openDeleteDialogSpy = spyOn(component, 'openDialog');
      spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(null),
      } as MatDialogRef<typeof DeleteFormComponent>);

      component.openDeleteDialog(device);

      expect(openDeleteDialogSpy).toHaveBeenCalledWith(device, true);
    });
  });
});
