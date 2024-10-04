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
  TestBed,
  tick,
} from '@angular/core/testing';
import { of } from 'rxjs';
import { Device } from '../../model/device';

import { DevicesComponent, FormAction } from './devices.component';
import { DevicesModule } from './devices.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { device, MOCK_TEST_MODULES } from '../../mocks/device.mock';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import SpyObj = jasmine.SpyObj;
import { FocusManagerService } from '../../services/focus-manager.service';
import { DevicesStore } from './devices.store';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { TestrunInitiateFormComponent } from '../testrun/components/testrun-initiate-form/testrun-initiate-form.component';
import { Routes } from '../../model/routes';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { MOCK_PROGRESS_DATA_IN_PROGRESS } from '../../mocks/testrun.mock';
import { DeviceQualificationFromComponent } from './components/device-qualification-from/device-qualification-from.component';

describe('DevicesComponent', () => {
  let component: DevicesComponent;
  let fixture: ComponentFixture<DevicesComponent>;
  let compiled: HTMLElement;
  let mockDevicesStore: SpyObj<DevicesStore>;
  let router: Router;

  const stateServiceMock: jasmine.SpyObj<FocusManagerService> =
    jasmine.createSpyObj('stateServiceMock', ['focusFirstElementInContainer']);

  beforeEach(async () => {
    // @ts-expect-error data layer should be defined
    window.dataLayer = window.dataLayer || [];
    mockDevicesStore = jasmine.createSpyObj('DevicesStore', [
      'setIsOpenAddDevice',
      'selectDevice',
      'setStatus',
      'getTestModules',
      'deleteDevice',
    ]);

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'testing', component: FakeProgressComponent },
        ]),
        DevicesModule,
        BrowserAnimationsModule,
        MatIconTestingModule,
      ],
      providers: [
        { provide: DevicesStore, useValue: mockDevicesStore },
        { provide: FocusManagerService, useValue: stateServiceMock },
      ],
      declarations: [DevicesComponent, FakeProgressComponent],
    }).compileComponents();

    TestBed.overrideProvider(DevicesStore, { useValue: mockDevicesStore });

    fixture = TestBed.createComponent(DevicesComponent);
    component = fixture.componentInstance;
    router = TestBed.get(Router);
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
        deviceInProgress: null,
        testModules: [],
      });
      mockDevicesStore.devices$ = of([]);
      mockDevicesStore.testModules$ = of([]);
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
        deviceInProgress: device,
        testModules: [],
      });
      fixture.detectChanges();
    });

    it('should show device item', fakeAsync(() => {
      const item = compiled.querySelectorAll('app-device-item');

      expect(item.length).toEqual(3);
    }));

    it('should open device dialog on "add device button" click', () => {
      const openSpy = spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(true),
        beforeClosed: () => of(true),
      } as MatDialogRef<typeof DeviceQualificationFromComponent>);
      fixture.detectChanges();
      const button = compiled.querySelector(
        '.device-add-button'
      ) as HTMLButtonElement;
      button?.click();

      expect(button).toBeTruthy();
      expect(openSpy).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalledWith(DeviceQualificationFromComponent, {
        ariaLabel: 'Create Device',
        data: {
          device: null,
          initialDevice: undefined,
          title: 'Create Device',
          testModules: [],
          devices: [device, device, device],
          index: 0,
          isCreate: true,
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
          beforeClosed: () => of(true),
        } as MatDialogRef<typeof DeviceQualificationFromComponent>);
        fixture.detectChanges();

        component.openDialog([device], MOCK_TEST_MODULES, device, device, true);

        expect(openSpy).toHaveBeenCalled();
        expect(openSpy).toHaveBeenCalledWith(DeviceQualificationFromComponent, {
          ariaLabel: 'Edit device',
          data: {
            device: device,
            initialDevice: device,
            title: 'Edit device',
            devices: [device],
            testModules: MOCK_TEST_MODULES,
            index: 0,
            isCreate: false,
          },
          autoFocus: true,
          hasBackdrop: true,
          disableClose: true,
          panelClass: 'device-form-dialog',
        });

        openSpy.calls.reset();
      });
    });

    it('should disable device if deviceInProgress is exist', () => {
      const item = compiled.querySelector('app-device-item');

      expect(item?.getAttribute('ng-reflect-disabled')).toBeTruthy();
    });
  });

  it('should call setIsOpenAddDevice if dialog closes with null', () => {
    spyOn(component.dialog, 'open').and.returnValue({
      beforeClosed: () => of(null),
    } as MatDialogRef<typeof DeviceQualificationFromComponent>);

    component.openDialog([], MOCK_TEST_MODULES);

    expect(mockDevicesStore.setIsOpenAddDevice).toHaveBeenCalled();
  });

  describe('close dialog', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        devices: [device, device, device],
        selectedDevice: device,
        deviceInProgress: null,
        testModules: [],
      });
      fixture.detectChanges();
    });

    it('should show device item', fakeAsync(() => {
      const item = compiled.querySelectorAll('app-device-item');

      expect(item.length).toEqual(3);
    }));

    it('should open device dialog when dialog return null', () => {
      const openDeviceDialogSpy = spyOn(component, 'openDialog');
      spyOn(component.dialog, 'open').and.returnValue({
        beforeClosed: () => of(null),
      } as MatDialogRef<typeof SimpleDialogComponent>);

      component.openCloseDialog([device], MOCK_TEST_MODULES, device);

      expect(openDeviceDialogSpy).toHaveBeenCalledWith(
        [device],
        MOCK_TEST_MODULES,
        device,
        undefined,
        false,
        0
      );
    });
  });

  it('should delete device if dialog closes with object, action delete and selected device', () => {
    spyOn(component.dialog, 'open').and.returnValue({
      beforeClosed: () =>
        of({
          device,
          action: FormAction.Delete,
        }),
    } as MatDialogRef<typeof DeviceQualificationFromComponent>);

    component.openDialog([device], MOCK_TEST_MODULES, device);

    expect(mockDevicesStore.deleteDevice).toHaveBeenCalled();
  });

  describe('delete device dialog', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        devices: [device, device, device],
        selectedDevice: device,
        deviceInProgress: null,
        testModules: [],
      });
      fixture.detectChanges();
    });

    it('should delete device when dialog return true', () => {
      spyOn(component.dialog, 'open').and.returnValue({
        beforeClosed: () => of(true),
      } as MatDialogRef<typeof SimpleDialogComponent>);

      component.openDeleteDialog(
        [device],
        MOCK_TEST_MODULES,
        device,
        device,
        false,
        0,
        0
      );

      const args = mockDevicesStore.deleteDevice.calls.argsFor(0);
      // @ts-expect-error config is in object
      expect(args[0].device).toEqual(device);
      expect(mockDevicesStore.deleteDevice).toHaveBeenCalled();
    });

    it('should open device dialog when dialog return null', () => {
      const openDeviceDialogSpy = spyOn(component, 'openDialog');
      spyOn(component.dialog, 'open').and.returnValue({
        beforeClosed: () => of(null),
      } as MatDialogRef<typeof SimpleDialogComponent>);

      component.openDeleteDialog(
        [device],
        MOCK_TEST_MODULES,
        device,
        device,
        false,
        0,
        0
      );

      expect(openDeviceDialogSpy).toHaveBeenCalledWith(
        [device],
        MOCK_TEST_MODULES,
        device,
        device,
        false,
        0,
        0
      );
    });
  });

  describe('#openStartTestrun', () => {
    it('should open initiate test run modal', fakeAsync(() => {
      const openSpy = spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(MOCK_PROGRESS_DATA_IN_PROGRESS),
      } as MatDialogRef<typeof TestrunInitiateFormComponent>);

      fixture.ngZone?.run(() => {
        component.openStartTestrun(device, [device], MOCK_TEST_MODULES);

        expect(openSpy).toHaveBeenCalledWith(TestrunInitiateFormComponent, {
          ariaLabel: 'Initiate testrun',
          data: {
            devices: [device],
            device: device,
            testModules: MOCK_TEST_MODULES,
          },
          autoFocus: 'dialog',
          hasBackdrop: true,
          disableClose: true,
          panelClass: 'initiate-test-run-dialog',
        });

        tick();
        expect(router.url).toBe(Routes.Testing);
        expect(mockDevicesStore.setStatus).toHaveBeenCalledWith(
          MOCK_PROGRESS_DATA_IN_PROGRESS
        );

        openSpy.calls.reset();
      });
    }));
  });
});

@Component({
  selector: 'app-fake-progress-component',
  template: '',
})
class FakeProgressComponent {}
