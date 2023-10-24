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
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {GeneralSettingsComponent} from './general-settings.component';
import {TestRunService} from '../../services/test-run.service';
import {of} from 'rxjs';
import {SystemConfig} from '../../model/setting';
import {MatRadioModule} from '@angular/material/radio';
import {ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatIcon, MatIconModule} from '@angular/material/icon';
import {MatIconTestingModule} from '@angular/material/icon/testing';

const MOCK_SYSTEM_CONFIG_EMPTY: SystemConfig = {
  network: {
    device_intf: '',
    internet_intf: ''
  }
}

const MOCK_SYSTEM_CONFIG_WITH_DATA: SystemConfig = {
  network: {
    device_intf: 'mockDeviceValue',
    internet_intf: 'mockInternetValue'
  }
};

describe('GeneralSettingsComponent', () => {
  let component: GeneralSettingsComponent;
  let fixture: ComponentFixture<GeneralSettingsComponent>;
  let testRunServiceMock: jasmine.SpyObj<TestRunService>;

  beforeEach(async () => {
    testRunServiceMock = jasmine.createSpyObj(['getSystemInterfaces', 'getSystemConfig', 'setSystemConfig', 'createSystemConfig']);
    testRunServiceMock.getSystemInterfaces.and.returnValue(of([]));
    testRunServiceMock.getSystemConfig.and.returnValue(of(MOCK_SYSTEM_CONFIG_EMPTY));
    testRunServiceMock.createSystemConfig.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      declarations: [GeneralSettingsComponent, MatIcon],
      providers: [{provide: TestRunService, useValue: testRunServiceMock}],
      imports: [MatButtonModule, MatIconModule, MatRadioModule, ReactiveFormsModule, MatIconTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(GeneralSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call openSetting if not systemConfig data', () => {
    spyOn(component.openSettingEvent, 'emit');

    component.ngOnInit();

    expect(component.openSettingEvent.emit).toHaveBeenCalled();
  });

  it('should set default values to form if systemConfig data', () => {
    testRunServiceMock.getSystemConfig.and.returnValue(of(MOCK_SYSTEM_CONFIG_WITH_DATA));

    component.ngOnInit();

    expect(component.deviceControl.value).toBe(MOCK_SYSTEM_CONFIG_WITH_DATA.network.device_intf);
    expect(component.internetControl.value).toBe(MOCK_SYSTEM_CONFIG_WITH_DATA.network.internet_intf);
  });

  describe('#closeSetting', () => {
    beforeEach(() => {
      testRunServiceMock.systemConfig$ = of(MOCK_SYSTEM_CONFIG_WITH_DATA);
    });

    it('should emit closeSettingEvent', () => {
      spyOn(component.closeSettingEvent, 'emit');

      component.closeSetting();

      expect(component.closeSettingEvent.emit).toHaveBeenCalled();
    });

    it('should call reset settingForm', () => {
      spyOn(component.settingForm, 'reset');

      component.closeSetting();

      expect(component.settingForm.reset).toHaveBeenCalled();
    });

    it('should set value of settingForm on setSystemSetting', () => {
      component.closeSetting();

      expect(component.settingForm.value).toEqual(MOCK_SYSTEM_CONFIG_WITH_DATA.network);
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
      const {device_intf, internet_intf} = MOCK_SYSTEM_CONFIG_WITH_DATA.network;
      component.deviceControl.setValue(device_intf);
      component.internetControl.setValue(internet_intf);

      component.saveSetting();

      expect(component.settingForm.invalid).toBeFalse();
      expect(testRunServiceMock.createSystemConfig).toHaveBeenCalledWith(MOCK_SYSTEM_CONFIG_WITH_DATA);
    });
  });
});
