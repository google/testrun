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
import {
  device,
  MOCK_TEST_MODULES,
  updated_device,
} from '../../mocks/device.mock';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import SpyObj = jasmine.SpyObj;
import { FocusManagerService } from '../../services/focus-manager.service';
import { DevicesStore } from './devices.store';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { Routes } from '../../model/routes';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ApplicationRef, Component, input, output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MOCK_PROGRESS_DATA_IN_PROGRESS } from '../../mocks/testrun.mock';
import { DeviceQualificationFromComponent } from './components/device-qualification-from/device-qualification-from.component';
import { TestrunDialogService } from '../../services/testrun-dialog.service';

describe('DevicesComponent', () => {
  let component: DevicesComponent;
  let fixture: ComponentFixture<DevicesComponent>;
  let compiled: HTMLElement;
  let mockDevicesStore: SpyObj<DevicesStore>;
  let router: Router;

  const stateServiceMock: jasmine.SpyObj<FocusManagerService> =
    jasmine.createSpyObj('stateServiceMock', ['focusFirstElementInContainer']);
  const testRunDialogServiceMock: jasmine.SpyObj<TestrunDialogService> =
    jasmine.createSpyObj('testRunDialogServiceMock', [
      'openInitiateDialog',
      'handleFocus',
    ]);

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
        { provide: TestrunDialogService, useValue: testRunDialogServiceMock },
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
    router = TestBed.inject(Router);
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
      const item = compiled.querySelector('app-device-item button');

      expect(item?.getAttribute('disabled')).not.toBeNull();
    });
  });

  describe('device card focus ring', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        devices: [device, updated_device],
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

    afterEach(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });

    /**
     * Focuses the card as a keyboard user would, then checks that the ring is
     * a solid outline with at least 3:1 contrast against the card and the
     * drawer around it (WCAG 1.4.11, 2.4.7), drawn fully inside the
     * `overflow: hidden` device list so that it is never clipped.
     */
    function expectHighContrastFocusRing(card: HTMLButtonElement): void {
      card.focus();

      expect(card.matches(':focus-visible'))
        .withContext(
          JSON.stringify({
            hasFocus: document.hasFocus(),
            activeTag: document.activeElement?.tagName,
          })
        )
        .toBeTrue();
      const style = getComputedStyle(card);
      // Not the browser default `auto` ring, whose platform-dependent color
      // (e.g. #a8c7fa) is only 1.38:1 to 1.69:1 on these backgrounds.
      expect(style.outlineStyle).toBe('solid');
      expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(2);

      const drawer = compiled.querySelector(
        '.layout-container-left-panel'
      ) as HTMLElement;
      const backgrounds = {
        card: effectiveBackground(card),
        drawer: getComputedStyle(drawer).backgroundColor,
      };
      for (const [name, background] of Object.entries(backgrounds)) {
        const ratio = contrastRatio(style.outlineColor, background);
        expect(ratio)
          .withContext(`${name} ${background}: ${ratio.toFixed(2)}:1`)
          .toBeGreaterThanOrEqual(3);
      }

      const ringExtent =
        parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
      const box = card.getBoundingClientRect();
      const list = (
        compiled.querySelector('.entity-list') as HTMLElement
      ).getBoundingClientRect();
      expect(box.left - ringExtent).toBeGreaterThanOrEqual(list.left);
      expect(box.top - ringExtent).toBeGreaterThanOrEqual(list.top);
      expect(box.right + ringExtent).toBeLessThanOrEqual(list.right);
      expect(box.bottom + ringExtent).toBeLessThanOrEqual(list.bottom);
    }

    it('should show a high-contrast focus ring on the selected device card', () => {
      const card = compiled.querySelector(
        'app-device-item.selected .button-edit'
      ) as HTMLButtonElement;
      // #d3e3fd, as in the report.
      expect(effectiveBackground(card)).toBe('rgb(211, 227, 253)');

      expectHighContrastFocusRing(card);
    });

    it('should show a high-contrast focus ring on an unselected device card', () => {
      const card = compiled.querySelector(
        'app-device-item:not(.selected) .button-edit'
      ) as HTMLButtonElement;
      // #f0f4f9 card on the #f8fafd drawer.
      expect(effectiveBackground(card)).toBe('rgb(240, 244, 249)');

      expectHighContrastFocusRing(card);
    });
  });

  describe('device card actions menu buttons', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        devices: [device, updated_device],
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
      fixture.detectChanges();
    });

    it('should give each card a distinct actions button name that identifies its device', () => {
      const names = Array.from(
        compiled.querySelectorAll('app-list-item .list-item > button'),
        button => button.getAttribute('aria-label')
      );

      expect(names).toEqual([
        'Actions for Delta O3-DIN-CPU',
        'Actions for Alpha O3-XYZ-CPU',
      ]);
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

  describe('delete device dialog accessibility', () => {
    const WARNING = `You are about to delete ${device.manufacturer} ${device.model}. Deleting this device configuration will also delete its testing history. Are you sure?`;

    beforeEach(() => {
      component.viewModel$ = of({
        devices: [device, updated_device],
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
      component.isOpenDeviceForm = true;
      fixture.detectChanges();
    });

    afterEach(() => {
      component.dialog.closeAll();
    });

    /** Returns the `role="dialog"` element of the open delete dialog. */
    function renderedDeleteDialog(): HTMLElement {
      // The dialog renders in the CDK overlay, outside the fixture's view.
      TestBed.inject(ApplicationRef).tick();
      return document.querySelector(
        '.delete-dialog mat-dialog-container'
      ) as HTMLElement;
    }

    /** Activates Delete in the first device card's Actions menu. */
    function openFromActionsMenu(): HTMLElement {
      (
        compiled.querySelector(
          'app-list-item .list-item > button'
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();
      (
        document.querySelector(
          '.list-item-menu-item[aria-label="Delete"]'
        ) as HTMLButtonElement
      ).click();
      return renderedDeleteDialog();
    }

    /** Activates Delete at the bottom of the device qualification form. */
    function openFromDeviceForm(): HTMLElement {
      const form = fixture.debugElement.query(
        By.directive(FakeDeviceQualificationComponent)
      ).componentInstance as FakeDeviceQualificationComponent;
      form.delete.emit(device);
      return renderedDeleteDialog();
    }

    it('should mark the dialog as modal', () => {
      const dialog = openFromActionsMenu();

      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
    });

    it('should describe the dialog by its data-loss warning', () => {
      const dialog = openFromActionsMenu();
      const descriptionId = dialog.getAttribute('aria-describedby');

      expect(textOfIdRefs(descriptionId)).toBe(WARNING);
      // The id is unique and belongs to the warning inside this dialog.
      expect(document.querySelectorAll(`[id="${descriptionId}"]`).length).toBe(
        1
      );
      expect(dialog.querySelector(`[id="${descriptionId}"]`)).toBe(
        dialog.querySelector('.simple-dialog-content')
      );
    });

    it('should title the dialog with a level 2 heading', () => {
      const dialog = openFromActionsMenu();

      expect(dialog.querySelector('h2')?.textContent?.trim()).toBe(
        'Delete device?'
      );
      expect(
        dialog.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')
          .length
      ).toBe(1);
      // The heading does not replace the name of the dialog.
      expect(dialog.getAttribute('aria-label')).toBe('Delete device');
    });

    it('should open the same accessible dialog from the device form Delete button', () => {
      const dialog = openFromDeviceForm();

      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(textOfIdRefs(dialog.getAttribute('aria-describedby'))).toBe(
        WARNING
      );
      expect(dialog.querySelector('h2')?.textContent?.trim()).toBe(
        'Delete device?'
      );
    });
  });

  describe('#openStartTestrun', () => {
    it('should open initiate test run modal', fakeAsync(() => {
      testRunDialogServiceMock.openInitiateDialog.and.returnValue(
        of(MOCK_PROGRESS_DATA_IN_PROGRESS)
      );

      fixture.ngZone?.run(() => {
        component.openStartTestrun(device, [device], MOCK_TEST_MODULES);

        expect(testRunDialogServiceMock.openInitiateDialog).toHaveBeenCalled();

        tick(100);

        expect(router.url).toBe(Routes.Testing);
        expect(testRunDialogServiceMock.handleFocus).toHaveBeenCalled();

        testRunDialogServiceMock.openInitiateDialog.calls.reset();
      });
    }));
  });

  describe('#menuItemClicked', () => {
    it('should show device item for StartNewTestrun action', fakeAsync(() => {
      const spyOpenDialog = spyOn(component, 'openStartTestrun');
      component.menuItemClicked(
        { action: DeviceAction.StartNewTestrun, entity: device, index: 1 },
        [],
        []
      );

      expect(spyOpenDialog).toHaveBeenCalled();
    }));

    it('should show device item for Delete action', fakeAsync(() => {
      const spyOpenDialog = spyOn(component, 'openDeleteDialog');
      component.menuItemClicked(
        { action: DeviceAction.Delete, entity: device, index: 1 },
        [],
        []
      );

      expect(spyOpenDialog).toHaveBeenCalled();
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

/** Text of the elements referenced by an `aria-labelledby`/`aria-describedby` value. */
function textOfIdRefs(idRefs: string | null): string {
  return (idRefs ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
    .join(' ');
}

type Rgb = [number, number, number];

/** Parses a computed `rgb()`/`rgba()` or `color(srgb …)` value; alpha is ignored. */
function parseColor(value: string): Rgb {
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(value);
  if (srgb) {
    return [
      Number(srgb[1]) * 255,
      Number(srgb[2]) * 255,
      Number(srgb[3]) * 255,
    ];
  }
  const rgb = /^rgba?\(([\d.]+),?\s*([\d.]+),?\s*([\d.]+)/.exec(value);
  if (!rgb) {
    throw new Error(`Unsupported color format: ${value}`);
  }
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}

/** WCAG 2.2 relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map(channel => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG contrast ratio (1–21) between two computed colors. */
function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [
    luminance(parseColor(foreground)),
    luminance(parseColor(background)),
  ].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/** First non-transparent background of the element or its ancestors. */
function effectiveBackground(element: Element): string {
  for (let el: Element | null = element; el; el = el.parentElement) {
    const background = getComputedStyle(el).backgroundColor;
    if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') {
      return background;
    }
  }
  return 'rgb(255, 255, 255)';
}
