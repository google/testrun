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

import { DeviceRepositoryComponent } from './device-repository.component';
import { DeviceRepositoryModule } from './device-repository.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  DeviceFormComponent,
  FormAction,
} from './components/device-form/device-form.component';
import { MatDialogRef } from '@angular/material/dialog';
import { device, MOCK_TEST_MODULES } from '../../mocks/device.mock';
import { DeleteFormComponent } from '../../components/delete-form/delete-form.component';
import SpyObj = jasmine.SpyObj;
import { FocusManagerService } from '../../services/focus-manager.service';
import { DevicesStore } from './devices.store';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('DeviceRepositoryComponent', () => {
  let component: DeviceRepositoryComponent;
  let fixture: ComponentFixture<DeviceRepositoryComponent>;
  let compiled: HTMLElement;
  let mockDevicesStore: SpyObj<DevicesStore>;

  const stateServiceMock: jasmine.SpyObj<FocusManagerService> =
    jasmine.createSpyObj('stateServiceMock', ['focusFirstElementInContainer']);

  beforeEach(async () => {
    mockDevicesStore = jasmine.createSpyObj('DevicesStore', [
      'setIsOpenAddDevice',
      'selectDevice',
      'deleteDevice',
    ]);

    mockDevicesStore.testModules = MOCK_TEST_MODULES;

    await TestBed.configureTestingModule({
      imports: [
        DeviceRepositoryModule,
        BrowserAnimationsModule,
        MatIconTestingModule,
      ],
      providers: [
        { provide: DevicesStore, useValue: mockDevicesStore },
        { provide: FocusManagerService, useValue: stateServiceMock },
      ],
      declarations: [DeviceRepositoryComponent],
    }).compileComponents();

    TestBed.overrideProvider(DevicesStore, { useValue: mockDevicesStore });

    fixture = TestBed.createComponent(DeviceRepositoryComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('with no devices', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        devices: [] as Device[],
        selectedDevice: null,
      });
      mockDevicesStore.devices$ = of([]);
      mockDevicesStore.isOpenAddDevice$ = of(true);
      fixture.detectChanges();
    });

    it('should show only add device button if no device added', () => {
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
      component.viewModel$ = of({
        devices: [device, device, device],
        selectedDevice: device,
      });
      fixture.detectChanges();
    });

    it('should show device item', fakeAsync(() => {
      const item = compiled.querySelectorAll('app-device-item');

      expect(item.length).toEqual(3);
    }));

    it('should add device-item-selected class for selected device', fakeAsync(() => {
      const item = compiled.querySelector('app-device-item');

      expect(item?.classList.contains('device-item-selected')).toBeTrue();
    }));

    it('should open device dialog on "add device button" click', () => {
      const openSpy = spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<typeof DeviceFormComponent>);
      fixture.detectChanges();
      const button = compiled.querySelector(
        '.device-add-button'
      ) as HTMLButtonElement;
      button?.click();

      expect(button).toBeTruthy();
      expect(openSpy).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalledWith(DeviceFormComponent, {
        ariaLabel: 'Create device',
        data: {
          device: null,
          title: 'Create device',
          testModules: MOCK_TEST_MODULES,
          devices: [],
        },
        autoFocus: true,
        hasBackdrop: true,
        disableClose: true,
        panelClass: 'device-form-dialog',
      });

      openSpy.calls.reset();
    });

    describe('#openDialog', () => {
      it('should open device dialog on item click', () => {
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof DeviceFormComponent>);
        fixture.detectChanges();

        component.openDialog([device], device);

        expect(openSpy).toHaveBeenCalled();
        expect(openSpy).toHaveBeenCalledWith(DeviceFormComponent, {
          ariaLabel: 'Edit device',
          data: {
            device: device,
            title: 'Edit device',
            devices: [device],
            testModules: MOCK_TEST_MODULES,
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

        component.openDialog([device], device, true);

        expect(openSpy).toHaveBeenCalledWith(DeviceFormComponent, {
          ariaLabel: 'Edit device',
          data: {
            device: device,
            title: 'Edit device',
            devices: [device],
            testModules: MOCK_TEST_MODULES,
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

  it('should call setIsOpenAddDevice if dialog closes with null', () => {
    spyOn(component.dialog, 'open').and.returnValue({
      afterClosed: () => of(null),
    } as MatDialogRef<typeof DeviceFormComponent>);

    component.openDialog();

    expect(mockDevicesStore.setIsOpenAddDevice).toHaveBeenCalled();
  });

  it('should delete device if dialog closes with object, action delete and selected device', () => {
    spyOn(component.dialog, 'open').and.returnValue({
      afterClosed: () =>
        of({
          device,
          action: FormAction.Delete,
        }),
    } as MatDialogRef<typeof DeviceFormComponent>);

    component.openDialog([device], device);

    expect(mockDevicesStore.deleteDevice).toHaveBeenCalled();
  });

  describe('delete device dialog', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        devices: [device, device, device],
        selectedDevice: device,
      });
      fixture.detectChanges();
    });

    it('should show device item', fakeAsync(() => {
      const item = compiled.querySelectorAll('app-device-item');

      expect(item.length).toEqual(3);
    }));

    it('should delete device when dialog return true', () => {
      spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<typeof DeleteFormComponent>);

      component.openDeleteDialog([device], device);

      const args = mockDevicesStore.deleteDevice.calls.argsFor(0);
      // @ts-expect-error config is in object
      expect(args[0].device).toEqual(device);
      expect(mockDevicesStore.deleteDevice).toHaveBeenCalled();
    });

    it('should open device dialog when dialog return null', () => {
      const openDeviceDialogSpy = spyOn(component, 'openDialog');
      spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(null),
      } as MatDialogRef<typeof DeleteFormComponent>);

      component.openDeleteDialog([device], device);

      expect(openDeviceDialogSpy).toHaveBeenCalledWith([device], device, true);
    });
  });
});
