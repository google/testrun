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
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Device } from './model/device';
import { device } from './mocks/device.mock';
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
import { LoaderService } from './services/loader.service';
import { Routes } from './model/routes';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { State } from '@ngrx/store';
import { appFeatureKey } from './store/reducers';
import { FocusManagerService } from './services/focus-manager.service';
import { AppState } from './store/state';
import { toggleMenu, updateFocusNavigation } from './store/actions';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let compiled: HTMLElement;
  let router: Router;
  let mockService: SpyObj<TestRunService>;
  let mockLoaderService: SpyObj<LoaderService>;
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
      'getDevices',
      'fetchDevices',
      'getSystemStatus',
      'fetchHistory',
      'getSystemInterfaces',
      'setIsOpenAddDevice',
      'systemStatus$',
      'isTestrunStarted$',
      'hasConnectionSetting$',
      'setIsOpenStartTestrun',
    ]);

    mockLoaderService = jasmine.createSpyObj(['setLoading']);
    mockFocusManagerService = jasmine.createSpyObj('mockFocusManagerService', [
      'focusFirstElementInContainer',
    ]);

    mockService.getDevices.and.returnValue(
      new BehaviorSubject<Device[] | null>([device])
    );
    mockService.getSystemInterfaces.and.returnValue(of({}));
    (mockService.systemStatus$ as unknown) = of({});
    mockService.isTestrunStarted$ = of(true);
    mockService.hasConnectionSetting$ = of(true);

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
        { provide: LoaderService, useValue: mockLoaderService },
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
        provideMockStore({}),
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
    fixture.detectChanges();
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
    const button = compiled.querySelector(
      '.app-sidebar-button-devices'
    ) as HTMLButtonElement;

    button?.click();
    tick();

    expect(router.url).toBe(Routes.Devices);
  }));

  it('should navigate to the testrun when "testrun" button is clicked', fakeAsync(() => {
    const button = compiled.querySelector(
      '.app-sidebar-button-testrun'
    ) as HTMLButtonElement;

    button?.click();
    tick();

    expect(router.url).toBe(Routes.Testrun);
  }));

  it('should navigate to the reports when "reports" button is clicked', fakeAsync(() => {
    const button = compiled.querySelector(
      '.app-sidebar-button-reports'
    ) as HTMLButtonElement;

    button?.click();
    tick();

    expect(router.url).toBe(Routes.Reports);
  }));

  it('should call toggleSettingsBtn focus when settingsDrawer close on closeSetting', fakeAsync(() => {
    spyOn(component.settingsDrawer, 'close').and.returnValue(
      Promise.resolve('close')
    );
    spyOn(component.toggleSettingsBtn, 'focus');

    component.closeSetting();
    tick();

    component.settingsDrawer.close().then(() => {
      expect(component.toggleSettingsBtn.focus).toHaveBeenCalled();
    });
  }));

  it('should call focusFirstElementInContainer if settingsDrawer opened not from toggleBtn', fakeAsync(() => {
    spyOn(component.settingsDrawer, 'close').and.returnValue(
      Promise.resolve('close')
    );

    component.openGeneralSettings(false);
    tick();
    component.closeSetting();
    flush();

    component.settingsDrawer.close().then(() => {
      expect(
        mockFocusManagerService.focusFirstElementInContainer
      ).toHaveBeenCalled();
    });
  }));

  it('should call settingsDrawer open on openSetting', fakeAsync(() => {
    spyOn(component.settingsDrawer, 'open');

    component.openSetting();
    tick();

    expect(component.settingsDrawer.open).toHaveBeenCalledTimes(1);
  }));

  it('should call settingsDrawer open on click settings button', () => {
    const settingsBtn = compiled.querySelector(
      '.app-toolbar-button-general-settings'
    ) as HTMLButtonElement;
    spyOn(component.settingsDrawer, 'open');

    settingsBtn.click();

    expect(component.settingsDrawer.open).toHaveBeenCalledTimes(1);
  });

  it('#reloadInterfaces should call setLoading in loaderService', () => {
    component.reloadInterfaces();

    expect(mockLoaderService.setLoading).toHaveBeenCalledWith(true);
  });

  describe('menu button', () => {
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
    const version = compiled.querySelector('app-version');

    expect(version).toBeTruthy();
  });

  describe('Callout component visibility', () => {
    describe('with no connection settings', () => {
      beforeEach(() => {
        mockService.hasConnectionSetting$ = of(false);
        component.ngOnInit();
        fixture.detectChanges();
      });

      it('should have callout component with "Step 1" text', () => {
        const callout = compiled.querySelector('app-callout');
        const calloutContent = callout?.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutContent).toContain('Step 1');
      });

      it('should have callout content with "Connection settings" link ', () => {
        const calloutLinkEl = compiled.querySelector(
          '.message-link'
        ) as HTMLAnchorElement;
        const calloutLinkContent = calloutLinkEl.innerHTML.trim();

        expect(calloutLinkEl).toBeTruthy();
        expect(calloutLinkContent).toContain('Connection settings');
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
        mockService.hasConnectionSetting$ = of(true);
        mockService.getDevices.and.returnValue(
          new BehaviorSubject<Device[] | null>([device])
        );
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
        mockService.getDevices.and.returnValue(
          new BehaviorSubject<Device[] | null>(null)
        );
        component.ngOnInit();
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
        expect(mockService.setIsOpenAddDevice).toHaveBeenCalledWith(true);
      }));
    });

    describe('with devices setted but without systemStatus data', () => {
      beforeEach(() => {
        mockService.getDevices.and.returnValue(
          new BehaviorSubject<Device[] | null>([device])
        );
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

      it('should have callout component with "Testrun" link', () => {
        const callout = compiled.querySelector('app-callout');
        const calloutLinkEl = compiled.querySelector(
          '.message-link'
        ) as HTMLAnchorElement;
        const calloutLinkContent = calloutLinkEl.innerHTML.trim();

        expect(callout).toBeTruthy();
        expect(calloutLinkContent).toContain('Testrun');
      });

      keyboardCases.forEach(testCase => {
        it(`should navigate to the runtime on keydown ${testCase.name} "Run the Test" link`, fakeAsync(() => {
          const calloutLinkEl = compiled.querySelector(
            '.message-link'
          ) as HTMLAnchorElement;

          calloutLinkEl.dispatchEvent(testCase.event);
          flush();

          expect(router.url).toBe(Routes.Testrun);
        }));
      });
    });

    describe('with devices setted, without systemStatus data, but run the tests ', () => {
      beforeEach(() => {
        mockService.getDevices.and.returnValue(
          new BehaviorSubject<Device[] | null>([device])
        );
        mockService.isTestrunStarted$ = of(true);
        component.ngOnInit();
        fixture.detectChanges();
      });

      it('should not have callout component', () => {
        const callout = compiled.querySelector('app-callout');

        expect(callout).toBeNull();
      });
    });

    describe('with devices setted and systemStatus data ', () => {
      beforeEach(() => {
        mockService.getDevices.and.returnValue(
          new BehaviorSubject<Device[] | null>([device])
        );
        mockService.systemStatus$ = of(MOCK_PROGRESS_DATA_IN_PROGRESS);
        component.ngOnInit();
        fixture.detectChanges();
      });

      it('should not have callout component', () => {
        const callout = compiled.querySelector('app-callout');

        expect(callout).toBeNull();
      });
    });
  });

  it('should not call toggleSettingsBtn focus on closeSetting when device length is 0', async () => {
    mockService.getDevices.and.returnValue(
      new BehaviorSubject<Device[] | null>([])
    );
    component.ngOnInit();
    fixture.detectChanges();

    spyOn(component.settingsDrawer, 'close').and.returnValue(
      Promise.resolve('close')
    );
    const spyToggle = spyOn(component.toggleSettingsBtn, 'focus');

    await component.closeSetting();

    expect(spyToggle).toHaveBeenCalledTimes(0);
  });
});

@Component({
  selector: 'app-general-settings',
  template: '<div></div>',
})
class FakeGeneralSettingsComponent {
  @Input() interfaces = [];
  @Output() closeSettingEvent = new EventEmitter<void>();
  @Output() reloadInterfacesEvent = new EventEmitter<void>();
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
class FakeVersionComponent {}
