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
  TestBed,
  fakeAsync,
  flushMicrotasks,
  tick,
} from '@angular/core/testing';

import { GeneralSettingsComponent } from './general-settings.component';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { of } from 'rxjs';
import { MatRadioModule } from '@angular/material/radio';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import SpyObj = jasmine.SpyObj;
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';
import { LoaderService } from '../../services/loader.service';
import { GeneralSettingsStore } from './general-settings.store';
import {
  MOCK_INTERFACES,
  MOCK_SYSTEM_CONFIG_WITH_DATA,
} from '../../mocks/settings.mock';
import { SettingsDropdownComponent } from './components/settings-dropdown/settings-dropdown.component';
import { CalloutComponent } from '../../components/callout/callout.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { TestRunService } from '../../services/test-run.service';
import { MOCK_PROGRESS_DATA_COMPLIANT } from '../../mocks/testrun.mock';

describe('GeneralSettingsComponent', () => {
  let component: GeneralSettingsComponent;
  let fixture: ComponentFixture<GeneralSettingsComponent>;
  let compiled: HTMLElement;
  let mockLoaderService: SpyObj<LoaderService>;
  let mockTestRunService: SpyObj<TestRunService>;
  let mockSettingsStore: SpyObj<GeneralSettingsStore>;
  let mockLiveAnnouncer: SpyObj<LiveAnnouncer>;

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (<any>window).gtag = jasmine.createSpy('gtag');
    mockLoaderService = jasmine.createSpyObj('LoaderService', ['setLoading']);
    mockTestRunService = jasmine.createSpyObj('TesRunService', [
      'testrunInProgress',
    ]);
    mockSettingsStore = jasmine.createSpyObj('SettingsStore', [
      'getInterfaces',
      'refreshInterfaces',
      'updateSystemConfig',
      'setIsSubmitting',
      'setDefaultFormValues',
      'setFormDisable',
      'setFormEnable',
      'getSystemConfig',
      'viewModel$',
      'systemStatus$',
    ]);
    mockSettingsStore.systemStatus$ = of(MOCK_PROGRESS_DATA_COMPLIANT);
    mockLiveAnnouncer = jasmine.createSpyObj<LiveAnnouncer>('LiveAnnouncer', [
      'announce',
      'clear',
    ]);
    mockLiveAnnouncer.announce.and.resolveTo();

    await TestBed.configureTestingModule({
      providers: [
        { provide: LoaderService, useValue: mockLoaderService },
        { provide: TestRunService, useValue: mockTestRunService },
        { provide: GeneralSettingsStore, useValue: mockSettingsStore },
        { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
        provideMockStore(),
      ],
      imports: [
        GeneralSettingsComponent,
        BrowserAnimationsModule,
        MatButtonModule,
        MatIconModule,
        MatRadioModule,
        ReactiveFormsModule,
        MatIconTestingModule,
        MatIcon,
        MatInputModule,
        MatSelectModule,
        SettingsDropdownComponent,
        FakeSpinnerComponent,
        FakeCalloutComponent,
      ],
    })
      .overrideComponent(GeneralSettingsComponent, {
        remove: {
          imports: [CalloutComponent, SpinnerComponent],
        },
        add: {
          imports: [FakeSpinnerComponent, FakeCalloutComponent],
        },
      })
      .compileComponents();

    TestBed.overrideProvider(GeneralSettingsStore, {
      useValue: mockSettingsStore,
    });

    fixture = TestBed.createComponent(GeneralSettingsComponent);

    component = fixture.componentInstance;
    component.viewModel$ = of({
      systemConfig: { network: {} },
      hasConnectionSettings: false,
      isSubmitting: false,
      isLessThanOneInterface: false,
      interfaces: {},
      deviceOptions: {},
      internetOptions: {},
      logLevelOptions: {},
      monitoringPeriodOptions: {},
    });
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;

    component.ngOnInit();
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (<any>window).gtag = undefined;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('#reloadSetting should call setLoading in loaderService', () => {
    component.reloadSetting();

    expect(mockLoaderService.setLoading).toHaveBeenCalledWith(true);
  });

  describe('#settingsDisable', () => {
    it('should disable setting form when get settingDisable as true ', () => {
      component.settingsDisable = true;

      expect(mockSettingsStore.setFormDisable).toHaveBeenCalled();
    });

    it('should enable setting form when get settingDisable as false ', () => {
      component.settingsDisable = false;

      expect(mockSettingsStore.setFormEnable).toHaveBeenCalled();
    });

    it('should disable "Save" button when get settingDisable as true', () => {
      component.settingsDisable = true;

      const saveBtn = compiled.querySelector(
        '.save-button'
      ) as HTMLButtonElement;

      expect(saveBtn.disabled).toBeTrue();
    });
  });

  describe('#saveSetting', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should have form error if form has the same value', () => {
      const mockSameValue = { key: 'sameValue' };
      component.deviceControl.setValue(mockSameValue);
      component.internetControl.setValue(mockSameValue);

      component.saveSetting();

      expect(component.settingForm.invalid).toBeTrue();
      expect(component.isFormError).toBeTrue();
      expect(mockSettingsStore.setIsSubmitting).toHaveBeenCalledWith(true);
    });

    it('should call createSystemConfig when setting form valid', () => {
      const expectedResult = {
        network: {
          device_intf: 'mockDeviceKey',
          internet_intf: '',
        },
        log_level: 'INFO',
        monitor_period: 600,
      };

      component.deviceControl.setValue({
        key: 'mockDeviceKey',
        value: 'mockDeviceValue',
      });

      component.internetControl.setValue({
        key: '',
        value: 'defaultValue',
      });

      component.logLevel.setValue({
        key: 'INFO',
        value: '',
      });

      component.monitorPeriod.setValue({
        key: '600',
        value: '',
      });

      component.saveSetting();

      const args = mockSettingsStore.updateSystemConfig.calls.argsFor(0);
      // @ts-expect-error config is in object
      expect(args[0].config).toEqual(expectedResult);
      expect(component.settingForm.invalid).toBeFalse();
      expect(mockSettingsStore.updateSystemConfig).toHaveBeenCalled();
    });
  });

  describe('with no interfaces data', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        systemConfig: { network: {} },
        hasConnectionSettings: false,
        isSubmitting: false,
        isLessThanOneInterface: false,
        interfaces: {},
        deviceOptions: {},
        internetOptions: {},
        logLevelOptions: {},
        monitoringPeriodOptions: {},
      });
      fixture.detectChanges();
    });

    it('should have callout component', () => {
      const callout = compiled.querySelector('app-callout');

      expect(callout).toBeTruthy();
    });

    it('should have disabled "Save" button', () => {
      const saveBtn = compiled.querySelector(
        '.save-button'
      ) as HTMLButtonElement;

      expect(saveBtn.disabled).toBeTrue();
    });
  });

  describe('with interfaces length less than one', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        systemConfig: { network: {} },
        hasConnectionSettings: false,
        isSubmitting: false,
        isLessThanOneInterface: true,
        interfaces: {},
        deviceOptions: {},
        internetOptions: {},
        logLevelOptions: {},
        monitoringPeriodOptions: {},
      });
      fixture.detectChanges();
    });

    it('should have disabled "Save" button', () => {
      component.deviceControl.setValue(
        MOCK_SYSTEM_CONFIG_WITH_DATA?.network?.device_intf
      );
      component.internetControl.setValue(
        MOCK_SYSTEM_CONFIG_WITH_DATA?.network?.internet_intf
      );
      fixture.detectChanges();

      const saveBtn = compiled.querySelector(
        '.save-button'
      ) as HTMLButtonElement;

      expect(saveBtn.disabled).toBeTrue();
    });
  });

  describe('with interfaces length more then one', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        systemConfig: { network: {} },
        hasConnectionSettings: false,
        isSubmitting: false,
        isLessThanOneInterface: false,
        interfaces: MOCK_INTERFACES,
        deviceOptions: MOCK_INTERFACES,
        internetOptions: MOCK_INTERFACES,
        logLevelOptions: {},
        monitoringPeriodOptions: {},
      });
      fixture.detectChanges();
    });

    it('should not have callout component', () => {
      const callout = compiled.querySelector('app-callout');

      expect(callout).toBeFalsy();
    });

    it('should not have disabled "Save" button', () => {
      component.deviceControl.setValue({
        key: MOCK_SYSTEM_CONFIG_WITH_DATA?.network?.device_intf,
        value: 'value',
      });
      component.internetControl.setValue({
        key: MOCK_SYSTEM_CONFIG_WITH_DATA?.network?.internet_intf,
        value: 'value',
      });
      component.settingForm.markAsDirty();
      fixture.detectChanges();

      const saveBtn = compiled.querySelector(
        '.save-button'
      ) as HTMLButtonElement;

      expect(saveBtn.disabled).toBeFalse();
    });
  });

  describe('with the same value in device and internet ports', () => {
    const MOCK_SAME_PORT = { key: 'mockDeviceKey', value: 'mockDeviceValue' };
    let saveButton: HTMLButtonElement;
    let deviceSelect: HTMLElement;
    let internetSelect: HTMLElement;

    const renderViewModel = (isSubmitting: boolean): void => {
      component.viewModel$ = of({
        systemConfig: { network: {} },
        hasConnectionSettings: false,
        isSubmitting,
        isLessThanOneInterface: false,
        interfaces: MOCK_INTERFACES,
        deviceOptions: MOCK_INTERFACES,
        internetOptions: MOCK_INTERFACES,
        logLevelOptions: {},
        monitoringPeriodOptions: {},
      });
      // The component is OnPush, so it has to be marked for check to render
      // the new view model.
      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };

    beforeEach(() => {
      renderViewModel(false);
      component.deviceControl.setValue(MOCK_SAME_PORT);
      component.internetControl.setValue(MOCK_SAME_PORT);
      component.settingForm.markAsDirty();
      fixture.detectChanges();

      saveButton = compiled.querySelector('.save-button') as HTMLButtonElement;
      deviceSelect = compiled.querySelector('#device-group') as HTMLElement;
      internetSelect = compiled.querySelector('#internet-group') as HTMLElement;
    });

    it('should not show error or mark ports as invalid before submitting', () => {
      expect(compiled.querySelector('.error-message-container')).toBeNull();
      expect(deviceSelect.getAttribute('aria-invalid')).toEqual('false');
      expect(internetSelect.getAttribute('aria-invalid')).toEqual('false');
      expect(deviceSelect.getAttribute('aria-describedby')).toEqual(
        'device-description'
      );
      expect(internetSelect.getAttribute('aria-describedby')).toEqual(
        'internet-description'
      );
    });

    describe('after submitting', () => {
      beforeEach(() => {
        renderViewModel(true);
      });

      it('should announce error to screen readers', () => {
        const error = compiled.querySelector(
          'mat-error.error-message-container'
        ) as HTMLElement;

        expect(error.textContent?.trim()).toEqual(
          'Both interfaces must have different values'
        );
        expect(error.getAttribute('role')).toEqual('alert');
        expect(error.getAttribute('aria-live')).toEqual('assertive');
        expect(error.id).toEqual(component.portsErrorId);
      });

      it('should mark both ports as invalid', () => {
        expect(deviceSelect.getAttribute('aria-invalid')).toEqual('true');
        expect(internetSelect.getAttribute('aria-invalid')).toEqual('true');
      });

      it('should link both ports to the error', () => {
        expect(deviceSelect.getAttribute('aria-describedby')).toEqual(
          `device-description ${component.portsErrorId}`
        );
        expect(internetSelect.getAttribute('aria-describedby')).toEqual(
          `internet-description ${component.portsErrorId}`
        );
      });

      it('should have disabled "Save" button', () => {
        expect(saveButton.disabled).toBeTrue();
      });

      it('should restore ports state when error is hidden', () => {
        renderViewModel(false);

        expect(compiled.querySelector('.error-message-container')).toBeNull();
        expect(deviceSelect.getAttribute('aria-invalid')).toEqual('false');
        expect(internetSelect.getAttribute('aria-invalid')).toEqual('false');
        expect(deviceSelect.getAttribute('aria-describedby')).toEqual(
          'device-description'
        );
        expect(internetSelect.getAttribute('aria-describedby')).toEqual(
          'internet-description'
        );
      });
    });

    describe('#saveSetting', () => {
      it('should move focus to internet port before "Save" button gets disabled', () => {
        saveButton.focus();

        component.saveSetting();

        expect(document.activeElement).toBe(internetSelect);
        expect(saveButton.disabled).toBeFalse();
        expect(mockSettingsStore.setIsSubmitting).toHaveBeenCalledWith(true);

        renderViewModel(true);

        expect(saveButton.disabled).toBeTrue();
        expect(document.activeElement).toBe(internetSelect);
      });

      it('should move focus to device port when internet port is disabled', () => {
        component.internetControl.disable();
        fixture.detectChanges();
        saveButton.focus();

        component.saveSetting();

        expect(document.activeElement).toBe(deviceSelect);
      });

      it('should not move focus to ports when form is valid', () => {
        component.internetControl.setValue({
          key: 'mockInternetKey',
          value: 'mockInternetValue',
        });
        fixture.detectChanges();
        saveButton.focus();

        component.saveSetting();

        expect(document.activeElement).toBe(saveButton);
      });
    });
  });

  describe('"Save" button keyboard focus ring', () => {
    let saveButton: HTMLButtonElement;

    beforeEach(() => {
      component.viewModel$ = of({
        systemConfig: { network: {} },
        hasConnectionSettings: false,
        isSubmitting: false,
        isLessThanOneInterface: false,
        interfaces: MOCK_INTERFACES,
        deviceOptions: MOCK_INTERFACES,
        internetOptions: MOCK_INTERFACES,
        logLevelOptions: {},
        monitoringPeriodOptions: {},
      });
      // Changing a setting, e.g. the Google Analytics opt-out, enables "Save".
      component.analyticsForm.markAsDirty();
      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();

      saveButton = compiled.querySelector('.save-button') as HTMLButtonElement;
    });

    afterEach(() => {
      saveButton.blur();
    });

    it('should show a high-contrast focus ring when focused with the keyboard', () => {
      expect(saveButton.disabled).toBeFalse();
      expect(getComputedStyle(saveButton).outlineStyle)
        .withContext('no ring before the button is focused')
        .toBe('none');

      saveButton.focus();

      expect(saveButton.matches(':focus-visible'))
        .withContext(
          JSON.stringify({
            hasFocus: document.hasFocus(),
            activeTag: document.activeElement?.tagName,
            focus: saveButton.matches(':focus'),
          })
        )
        .toBeTrue();
      const style = getComputedStyle(saveButton);
      expect(style.outlineStyle).toBe('solid');
      expect(style.outlineWidth).toBe('2px');
      expect(style.outlineColor).toBe('rgb(0, 0, 0)');
      expect(style.outlineOffset)
        .withContext('the ring is separated from the blue button fill')
        .toBe('2px');
    });

    // On short viewports (e.g. 1440×900) the settings page scrolls inside the
    // `app-settings` host and cuts through "Save". Focusing a partially
    // visible element scrolls it only until its own edge is in view.
    describe('when focus scrolls the partially visible button into view', () => {
      let scrollContainer: HTMLElement;

      beforeEach(() => {
        scrollContainer = document.createElement('div');
        scrollContainer.style.overflow = 'auto';
        compiled.before(scrollContainer);
        scrollContainer.append(compiled);
        const button = saveButton.getBoundingClientRect();
        const page = scrollContainer.getBoundingClientRect();
        scrollContainer.style.height = `${button.top - page.top + button.height / 2}px`;
      });

      afterEach(() => {
        scrollContainer.remove();
      });

      it('should keep the whole focus ring visible', () => {
        saveButton.focus();

        const style = getComputedStyle(saveButton);
        const ringExtent =
          parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
        const button = saveButton.getBoundingClientRect();
        const visibleTop =
          scrollContainer.getBoundingClientRect().top +
          scrollContainer.clientTop;
        const visibleBottom = visibleTop + scrollContainer.clientHeight;

        expect(scrollContainer.scrollTop)
          .withContext('focus scrolled the page')
          .toBeGreaterThan(0);
        expect(style.outlineStyle).toBe('solid');
        expect(button.top - ringExtent).toBeGreaterThanOrEqual(visibleTop);
        expect(button.bottom + ringExtent)
          .withContext('bottom edge of the focus ring')
          .toBeLessThanOrEqual(visibleBottom);
      });
    });
  });

  /** Calls back like the store does once it has the refreshed interfaces. */
  function completeInterfacesRefresh(): void {
    const refresh = mockSettingsStore.refreshInterfaces.calls.mostRecent()
      ?.args[0] as { onInterfacesRefresh: () => void } | undefined;
    refresh?.onInterfacesRefresh();
  }

  /** Calls back like the store does once the settings are saved. */
  function completeSave(): void {
    const save = mockSettingsStore.updateSystemConfig.calls.mostRecent()
      ?.args[0] as { onSystemConfigUpdate: () => void } | undefined;
    save?.onSystemConfigUpdate();
  }

  describe('"Refresh" link', () => {
    let refreshLink: HTMLElement;

    beforeEach(() => {
      // Without ports, the link is shown next to the "No ports detected"
      // warning.
      refreshLink = compiled.querySelector(
        'a.message-link[role="button"]'
      ) as HTMLElement;
    });

    it('should politely announce that network interfaces were refreshed once they are loaded', () => {
      refreshLink.click();

      expect(mockLiveAnnouncer.announce)
        .withContext('the interfaces are still being fetched')
        .not.toHaveBeenCalled();

      completeInterfacesRefresh();

      expect(mockLiveAnnouncer.announce).toHaveBeenCalledOnceWith(
        'Network interfaces refreshed.',
        'polite'
      );
    });

    it('should announce refreshes activated with Enter and Space', () => {
      refreshLink.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
      completeInterfacesRefresh();
      refreshLink.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
      completeInterfacesRefresh();

      expect(mockLiveAnnouncer.announce.calls.allArgs()).toEqual([
        ['Network interfaces refreshed.', 'polite'],
        ['Network interfaces refreshed.', 'polite'],
      ]);
    });
  });

  describe('after saving valid settings', () => {
    let settingsPage: HTMLElement;
    let pageHeading: HTMLElement;
    let generalTab: HTMLElement;
    let saveButton: HTMLButtonElement;

    /** Presses the focused "Save" button, which then gets disabled. */
    const pressSave = (): void => {
      saveButton.click();
      fixture.detectChanges();
    };

    beforeEach(() => {
      // As in the app, the page is rendered inside `app-settings`, below the
      // page heading and the tabs.
      settingsPage = document.createElement('app-settings');
      settingsPage.innerHTML =
        '<h2 class="title" tabindex="-1">Settings</h2>' +
        '<div role="tab" tabindex="0">General</div>';
      compiled.before(settingsPage);
      settingsPage.append(compiled);
      pageHeading = settingsPage.querySelector('h2') as HTMLElement;
      generalTab = settingsPage.querySelector('[role="tab"]') as HTMLElement;

      component.viewModel$ = of({
        systemConfig: { network: {} },
        hasConnectionSettings: true,
        isSubmitting: false,
        isLessThanOneInterface: false,
        interfaces: MOCK_INTERFACES,
        deviceOptions: MOCK_INTERFACES,
        internetOptions: MOCK_INTERFACES,
        logLevelOptions: {},
        monitoringPeriodOptions: {},
      });
      component.deviceControl.setValue({
        key: 'mockDeviceKey',
        value: 'mockDeviceValue',
      });
      component.internetControl.setValue({
        key: 'mockInternetKey',
        value: 'mockInternetValue',
      });
      component.settingForm.markAsDirty();
      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();

      saveButton = compiled.querySelector('.save-button') as HTMLButtonElement;
      saveButton.focus();
    });

    afterEach(() => {
      settingsPage.remove();
    });

    it('should politely announce that general settings were saved once the save succeeds', () => {
      pressSave();

      expect(mockLiveAnnouncer.announce)
        .withContext('the settings are still being saved')
        .not.toHaveBeenCalled();

      completeSave();

      expect(mockLiveAnnouncer.announce).toHaveBeenCalledOnceWith(
        'General settings saved.',
        'polite'
      );
    });

    it('should move focus from the disabled "Save" button to the page heading only after the announcement', fakeAsync(() => {
      let finishAnnouncement = (): void => {};
      mockLiveAnnouncer.announce.and.returnValue(
        new Promise<void>(resolve => (finishAnnouncement = resolve))
      );

      pressSave();
      completeSave();
      tick(200);

      expect(saveButton.disabled).toBeTrue();
      expect(document.activeElement)
        .withContext('focus does not jump to the "General" tab')
        .not.toBe(generalTab);
      expect(document.activeElement)
        .withContext('focus waits for the announcement')
        .not.toBe(pageHeading);

      finishAnnouncement();
      flushMicrotasks();

      expect(document.activeElement).toBe(pageHeading);
    }));

    it('should leave focus where the user moved it while the settings were being saved', fakeAsync(() => {
      const deviceSelect = compiled.querySelector(
        '#device-group'
      ) as HTMLElement;
      pressSave();
      deviceSelect.focus();

      completeSave();
      flushMicrotasks();
      tick(200);

      expect(document.activeElement).toBe(deviceSelect);
    }));

    describe('while a help tip is open', () => {
      let helpTip: HTMLElement;

      beforeEach(() => {
        helpTip = document.createElement('app-help-tip');
        helpTip.innerHTML = '<button type="button">Close tip</button>';
        document.body.append(helpTip);
      });

      afterEach(() => {
        helpTip.remove();
      });

      it('should not move focus into the help tip', fakeAsync(() => {
        pressSave();
        completeSave();
        flushMicrotasks();
        tick(200);

        expect(helpTip.contains(document.activeElement))
          .withContext('focus moved into the help tip')
          .toBeFalse();
        expect(document.activeElement).toBe(pageHeading);
      }));
    });
  });
});

@Component({
  selector: 'app-spinner',
  template: '<div></div>',
})
class FakeSpinnerComponent {}

@Component({
  selector: 'app-callout',
  template: '<div></div>',
})
class FakeCalloutComponent {
  @Input() type = '';
}
