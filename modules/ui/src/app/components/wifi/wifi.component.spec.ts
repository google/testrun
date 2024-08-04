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

import { WifiComponent } from './wifi.component';

describe('WifiComponent', () => {
  let component: WifiComponent;
  let fixture: ComponentFixture<WifiComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WifiComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WifiComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Class tests', () => {
    describe('with internet connection', () => {
      it('should return label', () => {
        expect(component.getLabel(true)).toEqual(
          'Testrun detects a working internet connection for the device under test.'
        );
      });
    });

    describe('with no internet connection', () => {
      it('should return label', () => {
        expect(component.getLabel(false)).toEqual(
          'No internet connection detected for the device under test.'
        );
      });
    });

    describe('with N/A internet connection', () => {
      it('should return label', () => {
        expect(component.getLabel(false, true)).toEqual(
          'Internet connection is not being monitored.'
        );
      });
    });
  });

  describe('DOM tests', () => {
    describe('with internet connection', () => {
      it('should have wifi icon', () => {
        component.on = true;
        fixture.detectChanges();

        const icon = compiled.querySelector('mat-icon')?.textContent?.trim();

        expect(icon).toEqual('wifi');
      });
    });

    describe('should have no wifi icon', () => {
      it('should have no wifi icon', () => {
        component.on = false;
        fixture.detectChanges();

        const icon = compiled.querySelector('mat-icon')?.textContent?.trim();

        expect(icon).toEqual('wifi_off');
      });
    });

    it('button should be disabled', () => {
      component.disable = true;
      fixture.detectChanges();

      const shutdownButton = compiled.querySelector(
        '.wifi-button'
      ) as HTMLButtonElement;

      expect(shutdownButton?.classList.contains('disabled')).toBeTrue();
    });
  });
});
