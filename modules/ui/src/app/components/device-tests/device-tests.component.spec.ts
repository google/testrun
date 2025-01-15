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

import { DeviceTestsComponent } from './device-tests.component';
import { TestModule } from '../../model/device';
import { FormArray, FormBuilder } from '@angular/forms';

describe('DeviceTestsComponent', () => {
  let component: DeviceTestsComponent;
  let fixture: ComponentFixture<DeviceTestsComponent>;
  let compiled: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeviceTestsComponent],
      providers: [FormBuilder],
    });
    fixture = TestBed.createComponent(DeviceTestsComponent);
    component = fixture.componentInstance;
    component.testModules = [
      {
        displayName: 'Connection',
        name: 'connection',
        enabled: true,
      },
      {
        displayName: 'DNS',
        name: 'dns',
        enabled: false,
      },
    ] as TestModule[];
    component.deviceForm = new FormBuilder().group({
      test_modules: new FormArray([]),
    });
    compiled = fixture.nativeElement;
  });

  describe('component tests', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should fill tests with default values if device is not present', () => {
      expect(component.test_modules.controls.length).toEqual(2);
      expect(component.test_modules.controls[0].value).toEqual(true);
      expect(component.test_modules.controls[1].value).toEqual(false);
    });

    it('should fill tests with device test values if device not present', () => {
      fixture.componentRef.setInput('deviceTestModules', {
        connection: {
          enabled: false,
        },
        dns: {
          enabled: true,
        },
      });
      component.ngOnInit();

      expect(component.test_modules.controls[0].value).toEqual(false);
      expect(component.test_modules.controls[1].value).toEqual(true);
    });
  });

  describe('DOM tests', () => {
    it('should have checkboxes', () => {
      fixture.detectChanges();
      const test = compiled.querySelectorAll('mat-checkbox input');
      const testLabel = compiled.querySelectorAll('mat-checkbox label');

      expect(test.length).toEqual(2);
      expect((test[0] as HTMLInputElement).checked).toBeTrue();
      expect((test[1] as HTMLInputElement).checked).toBeFalse();
      expect(testLabel[0].innerHTML.trim()).toEqual('Connection');
      expect(testLabel[1].innerHTML.trim()).toEqual('DNS');
    });

    it('should have tabindex -1 if disabled', () => {
      component.disabled = true;
      fixture.detectChanges();
      const test = compiled.querySelectorAll('mat-checkbox input');

      expect((test[0] as HTMLElement).tabIndex).toEqual(-1);
    });

    it('should have tabindex 0 if enabled', () => {
      component.disabled = false;
      fixture.detectChanges();
      const test = compiled.querySelectorAll('mat-checkbox input');

      expect((test[0] as HTMLElement).tabIndex).toEqual(0);
    });
  });
});
