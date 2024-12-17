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

import { CalloutComponent } from './callout.component';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('CalloutComponent', () => {
  let component: CalloutComponent;
  let fixture: ComponentFixture<CalloutComponent>;
  let compiled: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CalloutComponent, MatIconTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(CalloutComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('type', 'mockValue');
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have class provided from type', () => {
    const calloutContainerdEl = compiled.querySelector('.callout-container');

    expect(calloutContainerdEl?.classList).toContain('mockValue');
  });

  describe('closeable', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('closable', true);
      fixture.detectChanges();
    });

    it('should have close button', () => {
      const closeButton = compiled.querySelector('.callout-close-button');

      expect(closeButton).toBeTruthy();
    });

    it('should emit event', () => {
      const calloutClosedSpy = spyOn(component.calloutClosed, 'emit');
      const closeButton = compiled.querySelector(
        '.callout-close-button'
      ) as HTMLButtonElement;
      closeButton?.click();

      expect(calloutClosedSpy).toHaveBeenCalled();
    });
  });

  describe('action', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('action', 'action');
      fixture.detectChanges();
    });

    it('should have action link', () => {
      const closeButton = compiled.querySelector('.callout-action-link');

      expect(closeButton).toBeTruthy();
    });

    it('should emit event', () => {
      const calloutClosedSpy = spyOn(component.onAction, 'emit');
      const actionLink = compiled.querySelector(
        '.callout-action-link'
      ) as HTMLAnchorElement;
      actionLink?.click();

      expect(calloutClosedSpy).toHaveBeenCalled();
    });
  });
});
