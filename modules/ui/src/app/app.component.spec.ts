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
import SpyObj = jasmine.SpyObj;
import { BypassComponent } from './components/bypass/bypass.component';
import { CalloutComponent } from './components/callout/callout.component';
import {
  MOCK_PROGRESS_DATA_IDLE,
  MOCK_PROGRESS_DATA_IN_PROGRESS,
} from './mocks/testrun.mock';
import { Routes } from './model/routes';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { State } from '@ngrx/store';
import { FocusManagerService } from './services/focus-manager.service';
import { AppState } from './store/state';
import { setIsOpenAddDevice } from './store/actions';
import {
  selectHasConnectionSettings,
  selectHasDevices,
  selectHasExpiredDevices,
  selectHasRiskProfiles,
  selectInterfaces,
  selectInternetConnection,
  selectIsAllDevicesOutdated,
  selectIsOpenStartTestrun,
  selectIsOpenWaitSnackBar,
  selectIsTestingComplete,
  selectReports,
  selectRiskProfiles,
  selectStatus,
  selectSystemConfig,
  selectSystemStatus,
} from './store/selectors';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { of } from 'rxjs';
import { WINDOW } from './providers/window.provider';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { HISTORY } from './mocks/reports.mock';
import { TestRunMqttService } from './services/test-run-mqtt.service';
import { MOCK_ADAPTERS } from './mocks/settings.mock';
import { WifiComponent } from './components/wifi/wifi.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Profile } from './model/profile';
import { TestrunStatus } from './model/testrun-status';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { ShutdownAppComponent } from './components/shutdown-app/shutdown-app.component';
import { TestingCompleteComponent } from './components/testing-complete/testing-complete.component';
import { VersionComponent } from './components/version/version.component';

const windowMock = {
  location: {
    href: '',
  },
};

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let compiled: HTMLElement;
  let router: Router;
  let mockService: SpyObj<TestRunService>;
  let store: MockStore<AppState>;
  let mockFocusManagerService: SpyObj<FocusManagerService>;
  let mockLiveAnnouncer: SpyObj<LiveAnnouncer>;
  let mockMqttService: SpyObj<TestRunMqttService>;

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
      'testrunInProgress',
      'fetchProfiles',
      'getHistory',
    ]);

    mockFocusManagerService = jasmine.createSpyObj('mockFocusManagerService', [
      'focusFirstElementInContainer',
    ]);
    mockLiveAnnouncer = jasmine.createSpyObj('mockLiveAnnouncer', ['announce']);
    mockMqttService = jasmine.createSpyObj(['getNetworkAdapters']);

    TestBed.configureTestingModule({
      imports: [
        AppComponent,
        RouterTestingModule,
        HttpClientTestingModule,
        MatButtonModule,
        BrowserAnimationsModule,
        MatIconModule,
        MatToolbarModule,
        MatSidenavModule,
        BypassComponent,
        CalloutComponent,
        MatIconTestingModule,
        WifiComponent,
        MatTooltipModule,
        FakeSpinnerComponent,
        FakeShutdownAppComponent,
        FakeVersionComponent,
        FakeTestingCompleteComponent,
        RouterTestingModule.withRoutes([
          { path: 'devices', children: [] },
          { path: 'settings', children: [] },
          { path: 'testing', children: [] },
          { path: 'reports', children: [] },
        ]),
      ],
      providers: [
        { provide: TestRunService, useValue: mockService },
        { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
        { provide: TestRunMqttService, useValue: mockMqttService },
        {
          provide: State,
          useValue: {},
        },
        provideMockStore({
          selectors: [
            { selector: selectInterfaces, value: {} },
            { selector: selectHasConnectionSettings, value: true },
            { selector: selectInternetConnection, value: true },
            { selector: selectSystemConfig, value: { network: {} } },
            { selector: selectHasDevices, value: false },
            { selector: selectIsAllDevicesOutdated, value: false },
            { selector: selectHasExpiredDevices, value: false },
            { selector: selectHasRiskProfiles, value: false },
            { selector: selectStatus, value: null },
            { selector: selectSystemStatus, value: null },
            { selector: selectIsTestingComplete, value: false },
            { selector: selectRiskProfiles, value: [] },
            { selector: selectIsOpenStartTestrun, value: false },
            { selector: selectIsOpenWaitSnackBar, value: false },
            { selector: selectReports, value: [] },
          ],
        }),
        { provide: FocusManagerService, useValue: mockFocusManagerService },
        { provide: WINDOW, useValue: windowMock },
      ],
    }).overrideComponent(AppComponent, {
      remove: {
        imports: [
          SpinnerComponent,
          ShutdownAppComponent,
          TestingCompleteComponent,
          VersionComponent,
        ],
      },
      add: {
        imports: [
          FakeSpinnerComponent,
          FakeShutdownAppComponent,
          FakeVersionComponent,
          FakeTestingCompleteComponent,
        ],
      },
    });

    mockMqttService.getNetworkAdapters.and.returnValue(of(MOCK_ADAPTERS));
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    router = TestBed.get(Router);
    compiled = fixture.nativeElement as HTMLElement;
    spyOn(store, 'dispatch').and.callFake(() => {});
    component.appStore.updateSettingMissedError(null);
  });

  it('should create the app', () => {
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render side bar', () => {
    const sideBar = compiled.querySelector('.app-sidebar');

    expect(sideBar).toBeDefined();
  });

  it('should render side button menu', () => {
    const sideButtonMenu = compiled.querySelector('app-side-button-menu');

    expect(sideButtonMenu).toBeDefined();
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

  it('should navigate to the settings when "settings" button is clicked', fakeAsync(() => {
    fixture.detectChanges();

    const settingsButton = compiled.querySelector(
      '.app-toolbar-button-general-settings'
    ) as HTMLButtonElement;
    settingsButton?.click();
    tick();

    expect(router.url).toBe(Routes.Settings);
  }));

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
    component.ngAfterViewInit();
    fixture.detectChanges();
    const version = compiled.querySelector('app-version');
    fixture.detectChanges();

    expect(version).toBeTruthy();
  });

  it('should internet icon', fakeAsync(() => {
    tick(200);
    fixture.detectChanges();
    // await fixture.whenStable();
    tick(200);
    // await component.ngAfterViewInit();
    const internet = compiled.querySelector('app-wifi');

    expect(internet).toBeTruthy();
  }));

  describe('Testing complete', () => {
    beforeEach(() => {
      store.overrideSelector(selectIsTestingComplete, true);
      fixture.detectChanges();
    });

    it('should have testing complete component', () => {
      const testingCompleteComp = compiled.querySelector(
        'app-testing-complete'
      );

      expect(testingCompleteComp).toBeTruthy();
    });
  });

  describe('Callout component visibility', () => {
    describe('with no connection settings', () => {
      beforeEach(() => {
        store.overrideSelector(selectHasConnectionSettings, false);
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
          '.callout-action-link'
        ) as HTMLAnchorElement;
        const calloutLinkContent = calloutLinkEl.innerHTML.trim();

        expect(calloutLinkEl).toBeTruthy();
        expect(calloutLinkContent).toContain('System settings');
      });
    });

    describe('with system status as "Idle"', () => {
      beforeEach(() => {
        component.appStore.updateIsStatusLoaded(true);
        store.overrideSelector(selectHasConnectionSettings, true);
        store.overrideSelector(selectHasDevices, true);
        store.overrideSelector(selectSystemStatus, MOCK_PROGRESS_DATA_IDLE);

        fixture.detectChanges();
      });

      it('should have callout component with "Step 3" text', () => {
        const callout = compiled.querySelector('app-callout');
        const calloutContent = callout?.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutContent).toContain('Step 3');
      });

      it('should NOT have callout component with "Step 3" if has reports', () => {
        store.overrideSelector(selectReports, [...HISTORY]);
        store.refreshState();
        fixture.detectChanges();

        const callout = compiled.querySelector('app-callout');

        expect(callout).toBeFalsy();
      });
    });

    describe('with systemStatus data IN Progress and without riskProfiles', () => {
      beforeEach(() => {
        store.overrideSelector(selectHasConnectionSettings, true);
        store.overrideSelector(selectHasDevices, true);
        store.overrideSelector(selectHasRiskProfiles, false);
        store.overrideSelector(
          selectStatus,
          MOCK_PROGRESS_DATA_IN_PROGRESS.status
        );
        fixture.detectChanges();
      });

      it('should have callout component with "The device is now being tested" text', () => {
        const callout = compiled.querySelector('app-callout');
        const calloutContent = callout?.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutContent).toContain('The device is now being tested');
      });

      it('should have callout component with "Risk Assessment" link', () => {
        const callout = compiled.querySelector('app-callout');
        const calloutLinkEl = compiled.querySelector(
          '.callout-action-link'
        ) as HTMLAnchorElement;
        const calloutLinkContent = calloutLinkEl.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutLinkContent).toContain('Create risk Assessment');
      });
    });

    describe('with systemStatus data IN Progress and without riskProfiles', () => {
      beforeEach(() => {
        store.overrideSelector(selectHasConnectionSettings, true);
        store.overrideSelector(selectHasDevices, true);
        store.overrideSelector(selectHasRiskProfiles, false);
        store.overrideSelector(
          selectStatus,
          MOCK_PROGRESS_DATA_IN_PROGRESS.status
        );
        fixture.detectChanges();
      });

      it('should have callout component with "The device is now being tested" text', () => {
        const callout = compiled.querySelector('app-callout');
        const calloutContent = callout?.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutContent).toContain('The device is now being tested');
      });

      it('should have callout component with "Risk Assessment" link', () => {
        const callout = compiled.querySelector('app-callout');
        const calloutLinkEl = compiled.querySelector(
          '.callout-action-link'
        ) as HTMLAnchorElement;
        const calloutLinkContent = calloutLinkEl.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutLinkContent).toContain('Create risk Assessment');
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
          '.callout-action-link'
        ) as HTMLAnchorElement;
        const calloutLinkContent = calloutLinkEl.innerHTML.trim();

        expect(calloutLinkEl).toBeTruthy();
        expect(calloutLinkContent).toContain('Devices');
      });

      keyboardCases.forEach(testCase => {
        it(`should navigate to the device-repository on keydown ${testCase.name} "Create a Device" link`, fakeAsync(() => {
          const calloutLinkEl = compiled.querySelector(
            '.callout-action-link'
          ) as HTMLAnchorElement;

          calloutLinkEl.dispatchEvent(testCase.event);
          flush();

          expect(router.url).toBe(Routes.Devices);
        }));
      });

      it('should navigate to the device-repository on click "Create a Device" link', fakeAsync(() => {
        const calloutLinkEl = compiled.querySelector(
          '.callout-action-link'
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
        component.appStore.updateIsStatusLoaded(true);
        store.overrideSelector(selectHasConnectionSettings, true);
        store.overrideSelector(selectSystemStatus, null);

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
          '.callout-action-link'
        ) as HTMLAnchorElement;
        const calloutLinkContent = calloutLinkEl.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutLinkContent).toContain('Testing');
      });

      keyboardCases.forEach(testCase => {
        it(`should navigate to the runtime on keydown ${testCase.name} "Run the Test" link`, fakeAsync(() => {
          const calloutLinkEl = compiled.querySelector(
            '.callout-action-link'
          ) as HTMLAnchorElement;

          calloutLinkEl.dispatchEvent(testCase.event);
          flush();

          expect(router.url).toBe(Routes.Testing);
        }));
      });
    });

    describe('with devices setted, without systemStatus data, but run the tests', () => {
      beforeEach(() => {
        store.overrideSelector(selectHasDevices, true);
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
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_IN_PROGRESS
        );
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
          component.appStore.updateSettingMissedError({
            isSettingMissed: true,
            devicePortMissed: true,
            internetPortMissed: false,
          });
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
          component.appStore.updateSettingMissedError({
            isSettingMissed: true,
            devicePortMissed: true,
            internetPortMissed: true,
          });
          fixture.detectChanges();
        });

        it('should have callout component', () => {
          const callout = compiled.querySelector('app-callout');
          const calloutContent = callout?.innerHTML.trim();

          expect(callout).toBeTruthy();
          expect(calloutContent).toContain('No ports detected.');
        });
      });

      describe('with no settingMissedError', () => {
        beforeEach(() => {
          component.appStore.updateSettingMissedError(null);
          store.overrideSelector(selectHasDevices, true);
          fixture.detectChanges();
        });
        it('should not have callout component', () => {
          const callout = compiled.querySelector('app-callout');

          expect(callout).toBeNull();
        });
      });
    });

    describe('with expired devices', () => {
      beforeEach(() => {
        store.overrideSelector(selectHasExpiredDevices, true);
        fixture.detectChanges();
      });

      it('should have callout component', () => {
        const callouts = compiled.querySelectorAll('app-callout');
        let hasExpiredDeviceCallout = false;
        callouts.forEach(callout => {
          if (
            callout?.innerHTML
              .trim()
              .includes(
                'Further information is required in your device configurations.'
              )
          ) {
            hasExpiredDeviceCallout = true;
          }
        });

        expect(hasExpiredDeviceCallout).toBeTrue();
      });
    });
  });

  it('should set focus to first focusable elem when close callout', fakeAsync(() => {
    component.calloutClosed('mockId');
    tick(100);

    expect(
      mockFocusManagerService.focusFirstElementInContainer
    ).toHaveBeenCalled();
  }));
});

@Component({
  selector: 'app-spinner',
  template: '<div></div>',
})
class FakeSpinnerComponent {}

@Component({
  selector: 'app-shutdown-app',
  template: '<div></div>',
})
class FakeShutdownAppComponent {
  @Input() disable!: boolean;
}

@Component({
  selector: 'app-version',
  template: '<div></div>',
})
class FakeVersionComponent {
  @Input() consentShown!: boolean;
  @Output() consentShownEvent = new EventEmitter<void>();
}

@Component({
  selector: 'app-testing-complete',
  template: '<div></div>',
})
class FakeTestingCompleteComponent {
  @Input() profiles: Profile[] = [];
  @Input() data!: TestrunStatus | null;
}
