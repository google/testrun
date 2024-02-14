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
import {
  SystemInterfaces,
  TestRunService,
} from '../../services/test-run.service';
import { of } from 'rxjs';
import { SystemConfig } from '../../model/setting';
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

const MOCK_SYSTEM_CONFIG_EMPTY: SystemConfig = {
  network: {
    device_intf: '',
    internet_intf: '',
  },
};

const MOCK_SYSTEM_CONFIG_WITH_DATA: SystemConfig = {
  network: {
    device_intf: 'mockDeviceKey',
    internet_intf: 'mockInternetKey',
  },
};

const MOCK_INTERFACES: SystemInterfaces = {
  mockDeviceKey: 'mockDeviceValue',
  mockInternetKey: 'mockInternetValue',
};

describe('GeneralSettingsComponent', () => {
  let component: GeneralSettingsComponent;
  let fixture: ComponentFixture<GeneralSettingsComponent>;
  let testRunServiceMock: SpyObj<TestRunService>;
  let mockLiveAnnouncer: SpyObj<LiveAnnouncer>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    testRunServiceMock = jasmine.createSpyObj([
      'getSystemInterfaces',
      'getSystemConfig',
      'setSystemConfig',
      'createSystemConfig',
      'hasConnectionSetting$',
      'setHasConnectionSetting',
      'systemConfig$',
    ]);
    testRunServiceMock.getSystemInterfaces.and.returnValue(of({}));
    testRunServiceMock.getSystemConfig.and.returnValue(
      of(MOCK_SYSTEM_CONFIG_EMPTY)
    );
    testRunServiceMock.createSystemConfig.and.returnValue(
      of(MOCK_SYSTEM_CONFIG_WITH_DATA)
    );
    testRunServiceMock.systemConfig$ = of(MOCK_SYSTEM_CONFIG_EMPTY);
    testRunServiceMock.hasConnectionSetting$ = of(true);

    mockLiveAnnouncer = jasmine.createSpyObj(['announce']);

    await TestBed.configureTestingModule({
      declarations: [
        GeneralSettingsComponent,
        MatIcon,
        FakeSpinnerComponent,
        FakeCalloutComponent,
      ],
      providers: [
        { provide: TestRunService, useValue: testRunServiceMock },
        { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
      ],
      imports: [
        BrowserAnimationsModule,
        MatButtonModule,
        MatIconModule,
        MatRadioModule,
        ReactiveFormsModule,
        MatIconTestingModule,
        MatInputModule,
        MatSelectModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GeneralSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set default values to form if systemConfig data', () => {
    testRunServiceMock.getSystemConfig.and.returnValue(
      of(MOCK_SYSTEM_CONFIG_WITH_DATA)
    );
    component.interfaces = { mockDeviceKey: 'mockDeviceValue' };

    const expectedDevice = { key: 'mockDeviceKey', value: 'mockDeviceValue' };

    component.ngOnInit();

    expect(component.deviceControl.value).toEqual(expectedDevice);
    expect(component.internetControl.value).toEqual(
      component.defaultInternetOption
    );
  });

  it('#reloadSetting should emit reloadInterfacesEvent', () => {
    spyOn(component.reloadInterfacesEvent, 'emit');

    component.reloadSetting();

    expect(component.reloadInterfacesEvent.emit).toHaveBeenCalled();
  });

  describe('#closeSetting', () => {
    beforeEach(() => {
      testRunServiceMock.systemConfig$ = of(MOCK_SYSTEM_CONFIG_WITH_DATA);
      component.interfaces = MOCK_INTERFACES;
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
        `The ${mockMessage} finished. The connection setting panel is closed.`
      );
    });

    it('should call reset settingForm', () => {
      spyOn(component.settingForm, 'reset');

      component.closeSetting('Message');

      expect(component.settingForm.reset).toHaveBeenCalled();
    });

    it('should set value of settingForm on setSystemSetting', () => {
      component.closeSetting('Message');

      const expectedDevice = { key: 'mockDeviceKey', value: 'mockDeviceValue' };
      const expectedInternet = {
        key: 'mockInternetKey',
        value: 'mockInternetValue',
      };

      expect(component.settingForm.value.device_intf).toEqual(expectedDevice);

      expect(component.settingForm.value.internet_intf).toEqual(
        expectedInternet
      );
    });
  });

  describe('#saveSetting', () => {
    beforeEach(() => {
      testRunServiceMock.systemConfig$ = of(MOCK_SYSTEM_CONFIG_WITH_DATA);
    });

    it('should have form error if form has the same value', () => {
      const mockSameValue = 'sameValue';
      component.deviceControl.setValue(mockSameValue);
      component.internetControl.setValue(mockSameValue);

      component.saveSetting();

      expect(component.settingForm.invalid).toBeTrue();
      expect(component.isSubmitting).toBeTrue();
      expect(component.isFormError).toBeTrue();
    });

    it('should call createSystemConfig when setting form valid', () => {
      const expectedResult = {
        network: {
          device_intf: 'mockDeviceKey',
          internet_intf: '',
        },
      };

      component.deviceControl.setValue({
        key: 'mockDeviceKey',
        value: 'mockDeviceValue',
      });
      component.internetControl.setValue(component.defaultInternetOption);

      component.saveSetting();

      expect(component.settingForm.invalid).toBeFalse();
      expect(testRunServiceMock.createSystemConfig).toHaveBeenCalledWith(
        expectedResult
      );
    });
  });

  describe('with no intefaces data', () => {
    beforeEach(() => {
      component.interfaces = {};
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
      component.interfaces = {};
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
      component.interfaces = {
        mockDeviceValue: 'mockDeviceValue',
        mockInterfaceValue: 'mockInterfaceValue',
      };
      testRunServiceMock.systemConfig$ = of(MOCK_SYSTEM_CONFIG_WITH_DATA);
      testRunServiceMock.getSystemConfig.and.returnValue(
        of(MOCK_SYSTEM_CONFIG_WITH_DATA)
      );
      fixture.detectChanges();
    });

    it('should not have callout component', () => {
      const callout = compiled.querySelector('app-callout');

      expect(callout).toBeFalsy();
    });

    it('should not have disabled "Save" button', () => {
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
