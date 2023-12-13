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

import { GeneralSettingsComponent } from './general-settings.component';
import { TestRunService } from '../../services/test-run.service';
import { of } from 'rxjs';
import { SystemConfig } from '../../model/setting';
import { MatRadioModule } from '@angular/material/radio';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { Component, Input } from '@angular/core';

const MOCK_SYSTEM_CONFIG_EMPTY: SystemConfig = {
  network: {
    device_intf: '',
    internet_intf: '',
  },
};

const MOCK_SYSTEM_CONFIG_WITH_DATA: SystemConfig = {
  network: {
    device_intf: 'mockDeviceValue',
    internet_intf: 'mockInternetValue',
  },
};

const MOCK_SYSTEM_CONFIG_WITH_ONE_SETTING: SystemConfig = {
  network: {
    device_intf: 'mockDeviceValue',
  },
};

describe('GeneralSettingsComponent', () => {
  let component: GeneralSettingsComponent;
  let fixture: ComponentFixture<GeneralSettingsComponent>;
  let testRunServiceMock: jasmine.SpyObj<TestRunService>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    testRunServiceMock = jasmine.createSpyObj([
      'getSystemInterfaces',
      'getSystemConfig',
      'setSystemConfig',
      'createSystemConfig',
      'setIsOpenAddDevice',
      'hasConnectionSetting$',
      'setHasConnectionSetting',
    ]);
    testRunServiceMock.getSystemInterfaces.and.returnValue(of([]));
    testRunServiceMock.getSystemConfig.and.returnValue(
      of(MOCK_SYSTEM_CONFIG_EMPTY)
    );
    testRunServiceMock.createSystemConfig.and.returnValue(
      of(MOCK_SYSTEM_CONFIG_WITH_DATA)
    );
    testRunServiceMock.hasConnectionSetting$ = of(true);

    await TestBed.configureTestingModule({
      declarations: [
        GeneralSettingsComponent,
        MatIcon,
        FakeSpinnerComponent,
        FakeCalloutComponent,
      ],
      providers: [{ provide: TestRunService, useValue: testRunServiceMock }],
      imports: [
        MatButtonModule,
        MatIconModule,
        MatRadioModule,
        ReactiveFormsModule,
        MatIconTestingModule,
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

    component.ngOnInit();

    expect(component.deviceControl.value).toBe(
      MOCK_SYSTEM_CONFIG_WITH_DATA?.network?.device_intf
    );
    expect(component.internetControl.value).toBe(
      MOCK_SYSTEM_CONFIG_WITH_DATA?.network?.internet_intf
    );
  });

  it('#reloadSetting should emit reloadInterfacesEvent', () => {
    spyOn(component.reloadInterfacesEvent, 'emit');

    component.reloadSetting();

    expect(component.reloadInterfacesEvent.emit).toHaveBeenCalled();
  });

  describe('#openSetting', () => {
    it('should call openSetting if device and internet data are unavailable', () => {
      spyOn(component.openSettingEvent, 'emit');

      component.ngOnInit();

      expect(component.openSettingEvent.emit).toHaveBeenCalled();
    });

    it('should call openSetting if not systemConfig data', fakeAsync(() => {
      spyOn(component.openSettingEvent, 'emit');
      testRunServiceMock.getSystemConfig.and.returnValue(of({}));
      tick();

      component.ngOnInit();

      expect(component.openSettingEvent.emit).toHaveBeenCalled();
    }));

    it('should call openSetting if only one setting available', fakeAsync(() => {
      spyOn(component.openSettingEvent, 'emit');
      testRunServiceMock.getSystemConfig.and.returnValue(
        of(MOCK_SYSTEM_CONFIG_WITH_ONE_SETTING)
      );
      tick();

      component.ngOnInit();

      expect(component.openSettingEvent.emit).toHaveBeenCalled();
    }));

    it('should not call openSetting if device and internet data are available', fakeAsync(() => {
      spyOn(component.openSettingEvent, 'emit');
      testRunServiceMock.getSystemConfig.and.returnValue(
        of(MOCK_SYSTEM_CONFIG_WITH_DATA)
      );
      tick();

      component.ngOnInit();

      expect(component.openSettingEvent.emit).not.toHaveBeenCalled();
    }));
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

      expect(component.settingForm.value).toEqual(
        MOCK_SYSTEM_CONFIG_WITH_DATA.network
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
      component.deviceControl.setValue(
        MOCK_SYSTEM_CONFIG_WITH_DATA?.network?.device_intf
      );
      component.internetControl.setValue(
        MOCK_SYSTEM_CONFIG_WITH_DATA?.network?.internet_intf
      );

      component.saveSetting();

      expect(component.settingForm.invalid).toBeFalse();
      expect(testRunServiceMock.createSystemConfig).toHaveBeenCalledWith(
        MOCK_SYSTEM_CONFIG_WITH_DATA
      );
    });

    it('should setIsOpenAddDevice as true on first save setting', () => {
      component.deviceControl.setValue(
        MOCK_SYSTEM_CONFIG_WITH_DATA.network?.device_intf
      );
      component.internetControl.setValue(
        MOCK_SYSTEM_CONFIG_WITH_DATA.network?.internet_intf
      );

      component.saveSetting();

      expect(testRunServiceMock.setIsOpenAddDevice).toHaveBeenCalledWith(true);
    });
  });

  describe('with no intefaces data', () => {
    beforeEach(() => {
      component.interfaces = [];
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

  describe('with intefaces lenght less then two', () => {
    beforeEach(() => {
      component.interfaces = ['mockDeviceValue'];
      testRunServiceMock.systemConfig$ = of(MOCK_SYSTEM_CONFIG_WITH_DATA);
      testRunServiceMock.getSystemConfig.and.returnValue(
        of(MOCK_SYSTEM_CONFIG_WITH_DATA)
      );
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

  describe('with intefaces lenght more then one', () => {
    beforeEach(() => {
      component.interfaces = ['mockDeviceValue', 'mockInternetValue'];
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
