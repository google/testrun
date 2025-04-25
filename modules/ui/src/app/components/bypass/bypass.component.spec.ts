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

import { BypassComponent } from './bypass.component';
import { Component } from '@angular/core';
import { FocusManagerService } from '../../services/focus-manager.service';
import SpyObj = jasmine.SpyObj;

@Component({
  selector: 'app-test-bypass',
  template:
    '<app-bypass></app-bypass>' +
    '<div id="main"><button id="test-button"></button></div>',
  standalone: false,
})
class TestBypassComponent {}

describe('BypassComponent', () => {
  let component: TestBypassComponent;
  let fixture: ComponentFixture<TestBypassComponent>;
  let mockService: SpyObj<FocusManagerService>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj(['focusFirstElementInContainer']);
    TestBed.configureTestingModule({
      imports: [BypassComponent],
      declarations: [TestBypassComponent],
      providers: [{ provide: FocusManagerService, useValue: mockService }],
    });
    fixture = TestBed.createComponent(TestBypassComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('DOM tests', () => {
    it('should emit event on button click', () => {
      const button = fixture.nativeElement.querySelector(
        '.navigation-bypass-button'
      ) as HTMLButtonElement;

      button?.click();

      expect(mockService.focusFirstElementInContainer).toHaveBeenCalled();
    });
  });
});
