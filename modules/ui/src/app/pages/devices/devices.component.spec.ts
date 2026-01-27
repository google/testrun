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
import { Device, DeviceAction, TestModule } from '../../model/device';

import { DevicesComponent } from './devices.component';
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
import { Component, input, output } from '@angular/core';
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
    mockDevicesStore.isOpenAddDevice$ = of(false);

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'testing', component: FakeProgressComponent },
        ]),
        BrowserAnimationsModule,
        MatIconTestingModule,
        DevicesComponent,
        FakeProgressComponent,
        FakeDeviceQualificationComponent,
      ],
      providers: [
        { provide: DevicesStore, useValue: mockDevicesStore },
        { provide: FocusManagerService, useValue: stateServiceMock },
      ],
    })
      .overrideComponent(DevicesComponent, {
        remove: {
          imports: [DeviceQualificationFromComponent],
        },
        add: {
          imports: [FakeDeviceQualificationComponent],
        },
      })
      .compileComponents();

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
        actions: [
          {
            action: DeviceAction.StartNewTestrun,
            svgIcon: 'testrun_logo_small',
          },
          { action: DeviceAction.Delete, icon: 'delete' },
        ],
      });
      mockDevicesStore.devices$ = of([]);
      mockDevicesStore.testModules$ = of([]);
      fixture.detectChanges();
    });

    it('should show only add device button if no device added', () => {
      const button = compiled.querySelector('app-empty-page button');

      expect(button).toBeTruthy();
    });

    it('should open form if isOpenAddDevice$ as true', () => {
      mockDevicesStore.isOpenAddDevice$ = of(true);
      component.ngOnInit();

      expect(component.isOpenDeviceForm).toBeTrue();
    });
  });

  describe('with devices', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        devices: [device, device, device],
        selectedDevice: device,
        deviceInProgress: device,
        testModules: [],
        actions: [
          {
            action: DeviceAction.StartNewTestrun,
            svgIcon: 'testrun_logo_small',
          },
          { action: DeviceAction.Delete, icon: 'delete' },
        ],
      });
      fixture.detectChanges();
    });

    it('should show device item', fakeAsync(() => {
      const item = compiled.querySelectorAll('app-device-item');

      expect(item.length).toEqual(3);
    }));

    it('should open form on "add device button" click', () => {
      fixture.detectChanges();
      const button = compiled.querySelector(
        '.add-entity-button'
      ) as HTMLButtonElement;
      button?.click();

      expect(button).toBeTruthy();
      expect(component.isOpenDeviceForm).toBeTrue();
    });

    it('should disable device if deviceInProgress is exist', () => {
      const item = compiled.querySelector('app-device-item');

      expect(item?.getAttribute('ng-reflect-disabled')).toBeTruthy();
    });
  });

  describe('close dialog', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        devices: [device, device, device],
        selectedDevice: device,
        deviceInProgress: null,
        testModules: [],
        actions: [
          {
            action: DeviceAction.StartNewTestrun,
            svgIcon: 'testrun_logo_small',
          },
          { action: DeviceAction.Delete, icon: 'delete' },
        ],
      });
      fixture.detectChanges();
    });

    it('should show device item', fakeAsync(() => {
      const item = compiled.querySelectorAll('app-device-item');

      expect(item.length).toEqual(3);
    }));
  });

  describe('delete device dialog', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        devices: [device, device, device],
        selectedDevice: device,
        deviceInProgress: null,
        testModules: [],
        actions: [
          {
            action: DeviceAction.StartNewTestrun,
            svgIcon: 'testrun_logo_small',
          },
          { action: DeviceAction.Delete, icon: 'delete' },
        ],
      });
      fixture.detectChanges();
    });

    it('should delete device when dialog return true', () => {
      spyOn(component.dialog, 'open').and.returnValue({
        beforeClosed: () => of(true),
      } as MatDialogRef<typeof SimpleDialogComponent>);

      component.openDeleteDialog(device);

      const args = mockDevicesStore.deleteDevice.calls.argsFor(0);
      // @ts-expect-error config is in object
      expect(args[0].device).toEqual(device);
      expect(mockDevicesStore.deleteDevice).toHaveBeenCalled();
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

        tick(100);

        expect(router.url).toBe(Routes.Testing);
        expect(mockDevicesStore.setStatus).toHaveBeenCalledWith(
          MOCK_PROGRESS_DATA_IN_PROGRESS
        );
        expect(
          stateServiceMock.focusFirstElementInContainer
        ).toHaveBeenCalled();

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

@Component({
  selector: 'app-device-qualification-from',
  template: '<div></div>',
})
class FakeDeviceQualificationComponent {
  initialDevice = input<Device | null>(null);
  devices = input<Device[]>([]);
  testModules = input<TestModule[]>([]);
  isCreate = input<boolean>(true);

  save = output<Device>();
  delete = output<Device>();
  cancel = output<void>();
}
