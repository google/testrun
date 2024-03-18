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
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
  tick,
} from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { TestRunService } from './services/test-run.service';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { of } from 'rxjs/internal/observable/of';
import SpyObj = jasmine.SpyObj;
import { BypassComponent } from './components/bypass/bypass.component';
import { CalloutComponent } from './components/callout/callout.component';
import {
  MOCK_PROGRESS_DATA_IDLE,
  MOCK_PROGRESS_DATA_IN_PROGRESS,
} from './mocks/progress.mock';
import { Routes } from './model/routes';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { State } from '@ngrx/store';
import { appFeatureKey } from './store/reducers';
import { FocusManagerService } from './services/focus-manager.service';
import { AppState } from './store/state';
import {
  setIsOpenAddDevice,
  toggleMenu,
  updateFocusNavigation,
} from './store/actions';
import {
  selectError,
  selectHasConnectionSettings,
  selectHasDevices,
  selectInterfaces,
  selectMenuOpened,
} from './store/selectors';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let compiled: HTMLElement;
  let router: Router;
  let mockService: SpyObj<TestRunService>;
  let store: MockStore<AppState>;
  let focusNavigation = true;
  let mockFocusManagerService: SpyObj<FocusManagerService>;

  const enterKeyEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
  });

  const spaceKeyEvent = new KeyboardEvent('keydown', {
    key: 'Space',
  });

  const keyboardCases = [
    { name: 'enter', event: enterKeyEvent },
    { name: 'space', event: spaceKeyEvent },
  ];

  beforeEach(() => {
    mockService = jasmine.createSpyObj([
      'getSystemStatus',
      'systemStatus$',
      'isTestrunStarted$',
      'setIsOpenStartTestrun',
      'fetchDevices',
      'getTestModules',
    ]);

    mockFocusManagerService = jasmine.createSpyObj('mockFocusManagerService', [
      'focusFirstElementInContainer',
    ]);

    (mockService.systemStatus$ as unknown) = of({});
    mockService.isTestrunStarted$ = of(true);

    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        AppRoutingModule,
        MatButtonModule,
        BrowserAnimationsModule,
        MatIconModule,
        MatToolbarModule,
        MatSidenavModule,
        BypassComponent,
        CalloutComponent,
      ],
      providers: [
        { provide: TestRunService, useValue: mockService },
        {
          provide: State,
          useValue: {
            getValue: () => ({
              [appFeatureKey]: {
                appComponent: {
                  focusNavigation: focusNavigation,
                },
              },
            }),
          },
        },
        provideMockStore({
          selectors: [
            { selector: selectInterfaces, value: {} },
            { selector: selectHasConnectionSettings, value: true },
            { selector: selectError, value: null },
            { selector: selectMenuOpened, value: false },
            { selector: selectHasDevices, value: false },
          ],
        }),
        { provide: FocusManagerService, useValue: mockFocusManagerService },
      ],
      declarations: [
        AppComponent,
        FakeGeneralSettingsComponent,
        FakeSpinnerComponent,
        FakeVersionComponent,
      ],
    });

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    router = TestBed.get(Router);
    compiled = fixture.nativeElement as HTMLElement;
    spyOn(store, 'dispatch').and.callFake(() => {});
  });

  it('should create the app', () => {
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render side bar', () => {
    const sideBar = compiled.querySelector('.app-sidebar');

    expect(sideBar).toBeDefined();
  });

  it('should render menu button', () => {
    const button = compiled.querySelector('.app-sidebar-button-menu');

    expect(button).toBeDefined();
  });

  it('should render runtime button', () => {
    const button = compiled.querySelector('.app-sidebar-button-runtime');

    expect(button).toBeDefined();
  });

  it('should render device repository button', () => {
    const button = compiled.querySelector(
      '.app-sidebar-button-device-repository'
    );

    expect(button).toBeDefined();
  });

  it('should render results button', () => {
    const button = compiled.querySelector('.app-sidebar-button-results');

    expect(button).toBeDefined();
  });

  it('should render toolbar', () => {
    const toolBar = compiled.querySelector('.app-toolbar');

    expect(toolBar).toBeDefined();
  });

  it('should render logo link', () => {
    const logoLink = compiled.querySelector('.logo-link');

    expect(logoLink).toBeDefined();
  });

  it('should render general settings button', () => {
    const generalSettingsButton = compiled.querySelector(
      '.app-toolbar-button-general-settings'
    );

    expect(generalSettingsButton).toBeDefined();
  });

  it('should navigate to the devices when "devices" button is clicked', fakeAsync(() => {
    fixture.detectChanges();

    const button = compiled.querySelector(
      '.app-sidebar-button-devices'
    ) as HTMLButtonElement;

    button?.click();
    tick();

    expect(router.url).toBe(Routes.Devices);
  }));

  it('should navigate to the testrun when "testrun" button is clicked', fakeAsync(() => {
    fixture.detectChanges();

    const button = compiled.querySelector(
      '.app-sidebar-button-testrun'
    ) as HTMLButtonElement;

    button?.click();
    tick();

    expect(router.url).toBe(Routes.Testing);
  }));

  it('should navigate to the reports when "reports" button is clicked', fakeAsync(() => {
    fixture.detectChanges();

    const button = compiled.querySelector(
      '.app-sidebar-button-reports'
    ) as HTMLButtonElement;

    button?.click();
    tick();

    expect(router.url).toBe(Routes.Reports);
  }));

  it('should call toggleSettingsBtn focus when settingsDrawer close on closeSetting', fakeAsync(() => {
    fixture.detectChanges();

    spyOn(component.settingsDrawer, 'close').and.returnValue(
      Promise.resolve('close')
    );
    spyOn(component.toggleSettingsBtn, 'focus');

    component.closeSetting(true);
    tick();

    component.settingsDrawer.close().then(() => {
      expect(component.toggleSettingsBtn.focus).toHaveBeenCalled();
    });
  }));

  it('should call focusFirstElementInContainer if settingsDrawer opened not from toggleBtn', fakeAsync(() => {
    fixture.detectChanges();

    spyOn(component.settingsDrawer, 'close').and.returnValue(
      Promise.resolve('close')
    );

    component.openGeneralSettings(false);
    tick();
    component.closeSetting(false);
    flush();

    component.settingsDrawer.close().then(() => {
      expect(
        mockFocusManagerService.focusFirstElementInContainer
      ).toHaveBeenCalled();
    });
  }));

  it('should update interfaces', () => {
    fixture.detectChanges();

    spyOn(component.settings, 'getSystemInterfaces');

    component.openGeneralSettings(false);

    expect(component.settings.getSystemInterfaces).toHaveBeenCalled();
  });

  it('should call settingsDrawer open on openSetting', fakeAsync(() => {
    fixture.detectChanges();
    spyOn(component.settingsDrawer, 'open');

    component.openSetting();
    tick();

    expect(component.settingsDrawer.open).toHaveBeenCalledTimes(1);
  }));

  it('should call settingsDrawer open on click settings button', () => {
    fixture.detectChanges();

    const settingsBtn = compiled.querySelector(
      '.app-toolbar-button-general-settings'
    ) as HTMLButtonElement;
    spyOn(component.settingsDrawer, 'open');

    settingsBtn.click();

    expect(component.settingsDrawer.open).toHaveBeenCalledTimes(1);
  });

  describe('menu button', () => {
    beforeEach(() => {
      store.overrideSelector(selectHasDevices, false);
      fixture.detectChanges();
    });

    it('should dispatch toggleMenu action', () => {
      const menuBtn = compiled.querySelector(
        '.app-toolbar-button-menu'
      ) as HTMLButtonElement;

      menuBtn.click();

      expect(store.dispatch).toHaveBeenCalledWith(toggleMenu());
    });

    it('should focus navigation on tab press if menu button was clicked', () => {
      focusNavigation = true;
      const menuBtn = compiled.querySelector(
        '.app-toolbar-button-menu'
      ) as HTMLButtonElement;

      menuBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      const navigation = compiled.querySelector('.app-sidebar');

      expect(store.dispatch).toHaveBeenCalledWith(
        updateFocusNavigation({ focusNavigation: false })
      );
      expect(
        mockFocusManagerService.focusFirstElementInContainer
      ).toHaveBeenCalledWith(navigation);
    });

    it('should not focus navigation button on tab press if menu button was not clicked', () => {
      focusNavigation = false;
      const menuBtn = compiled.querySelector(
        '.app-toolbar-button-menu'
      ) as HTMLButtonElement;

      menuBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

      expect(document.activeElement).toBe(document.body);
    });
  });

  it('should have spinner', () => {
    const spinner = compiled.querySelector('app-spinner');

    expect(spinner).toBeTruthy();
  });

  it('should have bypass', () => {
    const bypass = compiled.querySelector('app-bypass');

    expect(bypass).toBeTruthy();
  });

  it('should have version', () => {
    fixture.detectChanges();
    const version = compiled.querySelector('app-version');

    expect(version).toBeTruthy();
  });

  describe('Callout component visibility', () => {
    describe('with no connection settings', () => {
      beforeEach(() => {
        component.hasConnectionSetting$ = of(false);
        component.ngOnInit();
        fixture.detectChanges();
      });

      it('should have callout component with "Step 1" text', () => {
        const callout = compiled.querySelector('app-callout');
        const calloutContent = callout?.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutContent).toContain('Step 1');
      });

      it('should have callout content with "System settings" link ', () => {
        const calloutLinkEl = compiled.querySelector(
          '.message-link'
        ) as HTMLAnchorElement;
        const calloutLinkContent = calloutLinkEl.innerHTML.trim();

        expect(calloutLinkEl).toBeTruthy();
        expect(calloutLinkContent).toContain('System settings');
      });

      keyboardCases.forEach(testCase => {
        it(`should call openSetting on keydown ${testCase.name} "Connection settings" link`, fakeAsync(() => {
          const spyOpenSetting = spyOn(component, 'openSetting');
          const calloutLinkEl = compiled.querySelector(
            '.message-link'
          ) as HTMLAnchorElement;

          calloutLinkEl.dispatchEvent(testCase.event);
          flush();

          expect(spyOpenSetting).toHaveBeenCalled();
        }));
      });
    });

    describe('with system status as "Idle"', () => {
      beforeEach(() => {
        component.hasConnectionSetting$ = of(true);
        store.overrideSelector(selectHasDevices, true);
        mockService.systemStatus$ = of(MOCK_PROGRESS_DATA_IDLE);
        mockService.isTestrunStarted$ = of(false);
        component.ngOnInit();
        fixture.detectChanges();
      });

      it('should have callout component with "Step 3" text', () => {
        const callout = compiled.querySelector('app-callout');
        const calloutContent = callout?.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutContent).toContain('Step 3');
      });
    });

    describe('with no devices setted', () => {
      beforeEach(() => {
        store.overrideSelector(selectHasDevices, false);
        fixture.detectChanges();
      });

      it('should have callout component', () => {
        const callout = compiled.querySelector('app-callout');

        expect(callout).toBeTruthy();
      });

      it('should have callout component with "Step 2" text', () => {
        const callout = compiled.querySelector('app-callout');
        const calloutContent = callout?.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutContent).toContain('Step 2');
      });

      it('should have callout content with "Create a Device" link ', () => {
        const calloutLinkEl = compiled.querySelector(
          '.message-link'
        ) as HTMLAnchorElement;
        const calloutLinkContent = calloutLinkEl.innerHTML.trim();

        expect(calloutLinkEl).toBeTruthy();
        expect(calloutLinkContent).toContain('Create a Device');
      });

      keyboardCases.forEach(testCase => {
        it(`should navigate to the device-repository on keydown ${testCase.name} "Create a Device" link`, fakeAsync(() => {
          const calloutLinkEl = compiled.querySelector(
            '.message-link'
          ) as HTMLAnchorElement;

          calloutLinkEl.dispatchEvent(testCase.event);
          flush();

          expect(router.url).toBe(Routes.Devices);
        }));
      });

      it('should navigate to the device-repository on click "Create a Device" link', fakeAsync(() => {
        const calloutLinkEl = compiled.querySelector(
          '.message-link'
        ) as HTMLAnchorElement;

        calloutLinkEl.click();
        flush();

        expect(router.url).toBe(Routes.Devices);
        expect(store.dispatch).toHaveBeenCalledWith(
          setIsOpenAddDevice({ isOpenAddDevice: true })
        );
      }));
    });

    describe('with devices setted but without systemStatus data', () => {
      beforeEach(() => {
        store.overrideSelector(selectHasDevices, true);
        mockService.isTestrunStarted$ = of(false);
        fixture.detectChanges();
      });

      it('should have callout component with "Step 3" text', () => {
        const callout = compiled.querySelector('app-callout');
        const calloutContent = callout?.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutContent).toContain('Step 3');
      });

      it('should have callout component with "testing" link', () => {
        const callout = compiled.querySelector('app-callout');
        const calloutLinkEl = compiled.querySelector(
          '.message-link'
        ) as HTMLAnchorElement;
        const calloutLinkContent = calloutLinkEl.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutLinkContent).toContain('testing');
      });

      keyboardCases.forEach(testCase => {
        it(`should navigate to the runtime on keydown ${testCase.name} "Run the Test" link`, fakeAsync(() => {
          const calloutLinkEl = compiled.querySelector(
            '.message-link'
          ) as HTMLAnchorElement;

          calloutLinkEl.dispatchEvent(testCase.event);
          flush();

          expect(router.url).toBe(Routes.Testing);
        }));
      });
    });

    describe('with devices setted, without systemStatus data, but run the tests ', () => {
      beforeEach(() => {
        store.overrideSelector(selectHasDevices, true);
        mockService.isTestrunStarted$ = of(true);
        fixture.detectChanges();
      });

      it('should not have callout component', () => {
        const callout = compiled.querySelector('app-callout');

        expect(callout).toBeNull();
      });
    });

    describe('with devices setted and systemStatus data', () => {
      beforeEach(() => {
        store.overrideSelector(selectHasDevices, true);
        mockService.systemStatus$ = of(MOCK_PROGRESS_DATA_IN_PROGRESS);
        fixture.detectChanges();
      });

      it('should not have callout component', () => {
        const callout = compiled.querySelector('app-callout');

        expect(callout).toBeNull();
      });
    });

    describe('error', () => {
      describe('with settingMissedError with one port is missed', () => {
        beforeEach(() => {
          component.settingMissedError$ = of({
            isSettingMissed: true,
            devicePortMissed: true,
            internetPortMissed: false,
          });
          component.ngOnInit();
          fixture.detectChanges();
        });

        it('should have callout component', () => {
          const callout = compiled.querySelector('app-callout');
          const calloutContent = callout?.innerHTML.trim();

          expect(callout).toBeTruthy();
          expect(calloutContent).toContain('Selected port is missing!');
        });
      });

      describe('with settingMissedError with two ports are missed', () => {
        beforeEach(() => {
          component.settingMissedError$ = of({
            isSettingMissed: true,
            devicePortMissed: true,
            internetPortMissed: true,
          });
          component.ngOnInit();
          fixture.detectChanges();
        });

        it('should have callout component', () => {
          const callout = compiled.querySelector('app-callout');
          const calloutContent = callout?.innerHTML.trim();

          expect(callout).toBeTruthy();
          expect(calloutContent).toContain('No ports are detected.');
        });
      });

      describe('with no settingMissedError', () => {
        beforeEach(() => {
          component.settingMissedError$ = of(null);
          store.overrideSelector(selectHasDevices, true);
          fixture.detectChanges();
        });
        it('should not have callout component', () => {
          const callout = compiled.querySelector('app-callout');

          expect(callout).toBeNull();
        });
      });
    });
  });

  it('should not call toggleSettingsBtn focus on closeSetting when device length is 0', async () => {
    fixture.detectChanges();

    spyOn(component.settingsDrawer, 'close').and.returnValue(
      Promise.resolve('close')
    );
    const spyToggle = spyOn(component.toggleSettingsBtn, 'focus');

    await component.closeSetting(false);

    expect(spyToggle).toHaveBeenCalledTimes(0);
  });
});

@Component({
  selector: 'app-general-settings',
  template: '<div></div>',
})
class FakeGeneralSettingsComponent {
  @Input() interfaces = [];
  @Input() hasConnectionSettings = false;
  @Output() closeSettingEvent = new EventEmitter<void>();
  @Output() reloadInterfacesEvent = new EventEmitter<void>();
  getSystemInterfaces = () => {};
}

@Component({
  selector: 'app-spinner',
  template: '<div></div>',
})
class FakeSpinnerComponent {}

@Component({
  selector: 'app-version',
  template: '<div></div>',
})
class FakeVersionComponent {
  @Input() consentShown!: boolean;
  @Output() consentShownEvent = new EventEmitter<void>();
}
