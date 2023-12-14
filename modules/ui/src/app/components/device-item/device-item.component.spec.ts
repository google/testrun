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
import { Device } from '../../model/device';

import { DeviceItemComponent } from './device-item.component';
import { DeviceRepositoryModule } from '../../device-repository/device-repository.module';

describe('DeviceItemComponent', () => {
  let component: DeviceItemComponent;
  let fixture: ComponentFixture<DeviceItemComponent>;
  let compiled: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeviceRepositoryModule, DeviceItemComponent],
    });
    fixture = TestBed.createComponent(DeviceItemComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    component.device = {
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

  it('should display information about device', () => {
    const name = compiled.querySelector('.item-name');
    const manufacturer = compiled.querySelector('.item-manufacturer');
    const mac = compiled.querySelector('.item-mac-address');

    expect(name?.textContent?.trim()).toEqual('O3-DIN-CPU');
    expect(manufacturer?.textContent?.trim()).toEqual('Delta');
    expect(mac?.textContent?.trim()).toEqual('00:1e:42:35:73:c4');
  });

  it('should emit mac address', () => {
    const clickSpy = spyOn(component.itemClicked, 'emit');
    const item = compiled.querySelector('.device-item') as HTMLElement;
    item.click();

    expect(clickSpy).toHaveBeenCalledWith(component.device);
  });

  it('should have tabindex', () => {
    component.tabIndex = -2;
    fixture.detectChanges();
    const item = compiled.querySelector('.device-item') as HTMLElement;

    expect(item.tabIndex).toBe(-2);
  });
});
