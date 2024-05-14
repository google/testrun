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
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralSettingsComponent } from './general-settings.component';
import { of } from 'rxjs';
import { MatRadioModule } from '@angular/material/radio';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { Component, Input } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import SpyObj = jasmine.SpyObj;
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';
import { LoaderService } from '../../services/loader.service';
import { SettingsStore } from './settings.store';
import {
  MOCK_INTERFACES,
  MOCK_INTERNET_OPTIONS,
  MOCK_SYSTEM_CONFIG_WITH_DATA,
} from '../../mocks/settings.mock';
import { SettingsDropdownComponent } from './components/settings-dropdown/settings-dropdown.component';

describe('GeneralSettingsComponent', () => {
  let component: GeneralSettingsComponent;
  let fixture: ComponentFixture<GeneralSettingsComponent>;
  let mockLiveAnnouncer: SpyObj<LiveAnnouncer>;
  let compiled: HTMLElement;
  let mockLoaderService: SpyObj<LoaderService>;
  let mockSettingsStore: SpyObj<SettingsStore>;

  beforeEach(async () => {
    mockLiveAnnouncer = jasmine.createSpyObj(['announce']);
    mockLoaderService = jasmine.createSpyObj('LoaderService', ['setLoading']);
    mockSettingsStore = jasmine.createSpyObj('SettingsStore', [
      'getInterfaces',
      'updateSystemConfig',
      'setIsSubmitting',
      'setDefaultFormValues',
      'getSystemConfig',
      'viewModel$',
    ]);

    await TestBed.configureTestingModule({
      declarations: [
        GeneralSettingsComponent,
        FakeSpinnerComponent,
        FakeCalloutComponent,
      ],
      providers: [
        { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
        { provide: LoaderService, useValue: mockLoaderService },
        { provide: SettingsStore, useValue: mockSettingsStore },
        provideMockStore(),
      ],
      imports: [
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
      ],
    }).compileComponents();

    TestBed.overrideProvider(SettingsStore, { useValue: mockSettingsStore });

    fixture = TestBed.createComponent(GeneralSettingsComponent);

    component = fixture.componentInstance;
    component.viewModel$ = of({
      systemConfig: {},
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('#reloadSetting should call setLoading in loaderService', () => {
    component.reloadSetting();

    expect(mockLoaderService.setLoading).toHaveBeenCalledWith(true);
  });

  describe('#settingsDisable', () => {
    it('should disable setting form when get settingDisable as true ', () => {
      spyOn(component.settingForm, 'disable');

      component.settingsDisable = true;

      expect(component.settingForm.disable).toHaveBeenCalled();
    });

    it('should enable setting form when get settingDisable as false ', () => {
      spyOn(component.settingForm, 'enable');

      component.settingsDisable = false;

      expect(component.settingForm.enable).toHaveBeenCalled();
    });

    it('should disable "Save" button when get settingDisable as true', () => {
      component.settingsDisable = true;

      const saveBtn = compiled.querySelector(
        '.save-button'
      ) as HTMLButtonElement;

      expect(saveBtn.disabled).toBeTrue();
    });

    it('should disable "Refresh" link when settingDisable', () => {
      component.settingsDisable = true;

      const refreshLink = compiled.querySelector(
        '.message-link'
      ) as HTMLAnchorElement;

      refreshLink.click();

      expect(refreshLink.hasAttribute('aria-disabled')).toBeTrue();
      expect(mockLoaderService.setLoading).not.toHaveBeenCalled();
    });
  });

  describe('#closeSetting', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should emit closeSettingEvent', () => {
      spyOn(component.closeSettingEvent, 'emit');

      component.closeSetting('Message');

      expect(component.closeSettingEvent.emit).toHaveBeenCalled();
    });

    it('should call liveAnnouncer with provided message', () => {
      const mockMessage = 'mock event';

      component.closeSetting(mockMessage);

      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        `The ${mockMessage} finished. The system settings panel is closed.`
      );
    });

    it('should call reset settingForm', () => {
      spyOn(component.settingForm, 'reset');

      component.closeSetting('Message');

      expect(component.settingForm.reset).toHaveBeenCalled();
    });

    it('should call setDefaultFormValues', () => {
      component.closeSetting('Message');

      expect(mockSettingsStore.setDefaultFormValues).toHaveBeenCalled();
    });
  });

  describe('#saveSetting', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should have form error if form has the same value', () => {
      const mockSameValue = 'sameValue';
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
        systemConfig: {},
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
        systemConfig: {},
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

    it('should have callout component', () => {
      const callout = compiled.querySelector('app-callout');

      expect(callout).toBeTruthy();
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
        systemConfig: {},
        hasConnectionSettings: false,
        isSubmitting: false,
        isLessThanOneInterface: false,
        interfaces: MOCK_INTERFACES,
        deviceOptions: MOCK_INTERFACES,
        internetOptions: MOCK_INTERNET_OPTIONS,
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
      fixture.detectChanges();

      const saveBtn = compiled.querySelector(
        '.save-button'
      ) as HTMLButtonElement;

      expect(saveBtn.disabled).toBeFalse();
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
