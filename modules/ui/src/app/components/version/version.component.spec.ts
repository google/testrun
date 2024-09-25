/*
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

import { VersionComponent } from './version.component';
import {
  TestRunService,
  UNAVAILABLE_VERSION,
} from '../../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Version } from '../../model/version';
import { NEW_VERSION, VERSION } from '../../mocks/version.mock';
import { of } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { ConsentDialogComponent } from './consent-dialog/consent-dialog.component';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('VersionComponent', () => {
  let component: VersionComponent;
  let fixture: ComponentFixture<VersionComponent>;
  let compiled: HTMLElement;
  let mockService: SpyObj<TestRunService>;

  const versionBehaviorSubject$ = new BehaviorSubject<Version | null>(null);

  beforeEach(() => {
    // @ts-expect-error data layer should be defined
    window.dataLayer = window.dataLayer || [];
    mockService = jasmine.createSpyObj(['getVersion', 'fetchVersion']);
    mockService.getVersion.and.returnValue(versionBehaviorSubject$);
    TestBed.configureTestingModule({
      imports: [VersionComponent, MatIconTestingModule],
      providers: [{ provide: TestRunService, useValue: mockService }],
    });
    fixture = TestBed.createComponent(VersionComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get correct aria label for version button', () => {
    const labelUnavailableVersion =
      component.getVersionButtonLabel(UNAVAILABLE_VERSION);

    const labelAvailableVersion = component.getVersionButtonLabel(NEW_VERSION);

    const labelVersion = component.getVersionButtonLabel(VERSION);

    expect(labelUnavailableVersion).toContain(
      'Version temporarily unavailable.'
    );
    expect(labelAvailableVersion).toContain('New version is available.');
    expect(labelVersion).toEqual('v1. Click to open the Welcome modal');
  });

  it('should open consent window on start', () => {
    const openSpy = spyOn(component.dialog, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as MatDialogRef<typeof ConsentDialogComponent>);
    versionBehaviorSubject$.next(VERSION);
    mockService.getVersion.and.returnValue(versionBehaviorSubject$);
    fixture.detectChanges();
    component.ngOnInit();

    expect(openSpy).toHaveBeenCalled();
  });

  it('should open consent window when button clicked', () => {
    const openSpy = spyOn(component.dialog, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as MatDialogRef<typeof ConsentDialogComponent>);
    versionBehaviorSubject$.next(VERSION);
    mockService.getVersion.and.returnValue(versionBehaviorSubject$);
    fixture.detectChanges();
    const button = compiled.querySelector(
      '.version-content'
    ) as HTMLButtonElement;
    button.click();

    expect(openSpy).toHaveBeenCalled();
  });

  describe('update is not available', () => {
    beforeEach(() => {
      versionBehaviorSubject$.next(VERSION);
      mockService.getVersion.and.returnValue(versionBehaviorSubject$);
      fixture.detectChanges();
    });

    it('display button with information', () => {
      const button = compiled.querySelector(
        '.version-content'
      ) as HTMLButtonElement;

      expect(button.innerHTML).toContain('v1');
    });
  });

  describe('update is available', () => {
    beforeEach(() => {
      versionBehaviorSubject$.next(NEW_VERSION);
      mockService.getVersion.and.returnValue(versionBehaviorSubject$);
      fixture.detectChanges();
    });

    it('display button with information', () => {
      const button = compiled.querySelector(
        '.version-content-update'
      ) as HTMLButtonElement;

      expect(button.innerHTML).toContain('v1');
    });

    it('has version update text', () => {
      const text = compiled.querySelector(
        '.version-content-update-text'
      ) as HTMLSpanElement;

      expect(text.innerHTML.trim()).toEqual('New version is available');
    });
  });
});
