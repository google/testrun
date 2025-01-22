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
import {
  Device,
  DeviceStatus,
  DeviceView,
  TestingType,
} from '../../model/device';

import { DeviceItemComponent } from './device-item.component';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('DeviceItemComponent', () => {
  let component: DeviceItemComponent;
  let fixture: ComponentFixture<DeviceItemComponent>;
  let compiled: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        DeviceItemComponent,
        MatIconTestingModule,
        BrowserAnimationsModule,
      ],
    });
    fixture = TestBed.createComponent(DeviceItemComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    component.device = {
      status: DeviceStatus.VALID,
      manufacturer: 'Delta',
      model: 'O3-DIN-CPU',
      mac_addr: '00:1e:42:35:73:c4',
      test_modules: {
        dns: {
          enabled: true,
        },
      },
    } as Device;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('with device view as Basic', () => {
    beforeEach(() => {
      component.deviceView = DeviceView.Basic;
      fixture.detectChanges();
    });

    it('should display information about device', () => {
      const name = compiled.querySelector('.item-name');
      const manufacturer = compiled.querySelector('.item-manufacturer');

      expect(name?.textContent?.trim()).toEqual('O3-DIN-CPU');
      expect(manufacturer?.textContent?.trim()).toEqual('Delta');
    });

    it('should have qualification icon if testing type is qualification', () => {
      component.device.test_pack = TestingType.Qualification;
      fixture.detectChanges();
      const icon = compiled.querySelector('app-program-type-icon');

      expect(icon).toBeTruthy();
      expect(icon?.getAttribute('ng-reflect-type')).toEqual('qualification');
    });

    it('should have pilot icon if testing type is pilot', () => {
      component.device.test_pack = TestingType.Pilot;
      fixture.detectChanges();
      const icon = compiled.querySelector('app-program-type-icon');

      expect(icon).toBeTruthy();
      expect(icon?.getAttribute('ng-reflect-type')).toEqual('pilot');
    });

    it('should emit mac address', () => {
      const clickSpy = spyOn(component.itemClicked, 'emit');
      const item = compiled.querySelector('.device-item') as HTMLElement;
      item.click();

      expect(clickSpy).toHaveBeenCalledWith(component.device);
    });
  });

  describe('with device view as WithActions', () => {
    beforeEach(() => {
      component.deviceView = DeviceView.WithActions;
      fixture.detectChanges();
    });

    describe('with device status as invalid', () => {
      beforeEach(() => {
        component.device.status = DeviceStatus.INVALID;
        fixture.detectChanges();
      });

      it('should have item status as Outdated', () => {
        component.device.status = DeviceStatus.INVALID;
        fixture.detectChanges();
        const status = compiled.querySelector('.item-status');

        expect(status).toBeTruthy();
        expect(status?.textContent?.trim()).toEqual('Outdated');
      });

      it('should have error icon', () => {
        const icon = compiled.querySelector('mat-icon')?.textContent?.trim();

        expect(icon).toEqual('error');
      });
    });

    it('should have item status as Under test', () => {
      component.disabled = true;
      fixture.detectChanges();
      const status = compiled.querySelector('.item-status');

      expect(status).toBeTruthy();
      expect(status?.textContent?.trim()).toEqual('Under test');
    });

    it('should emit device on click edit button', () => {
      const clickSpy = spyOn(component.itemClicked, 'emit');
      const editBtn = compiled.querySelector('.button-edit') as HTMLElement;
      editBtn.click();

      expect(clickSpy).toHaveBeenCalledWith(component.device);
    });

    it('should disable buttons if disable set to true', () => {
      component.disabled = true;
      fixture.detectChanges();

      const editBtn = compiled.querySelector('.button-edit') as HTMLElement;

      expect(editBtn.getAttribute('disabled')).not.toBeNull();
    });

    it('should not disable buttons if disable set to false', () => {
      component.disabled = false;
      fixture.detectChanges();

      const editBtn = compiled.querySelector('.button-edit') as HTMLElement;

      expect(editBtn.getAttribute('disabled')).toBeNull();
    });
  });
});
