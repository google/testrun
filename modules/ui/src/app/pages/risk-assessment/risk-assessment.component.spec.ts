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

import { RiskAssessmentComponent } from './risk-assessment.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TestRunService } from '../../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { MatSidenavModule } from '@angular/material/sidenav';
import { PROFILE_MOCK } from '../../mocks/profile.mock';
import { of } from 'rxjs';
import { Component, Input } from '@angular/core';
import { Profile } from '../../model/profile';

describe('RiskAssessmentComponent', () => {
  let component: RiskAssessmentComponent;
  let fixture: ComponentFixture<RiskAssessmentComponent>;
  let mockService: SpyObj<TestRunService>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    mockService = jasmine.createSpyObj(['fetchProfiles']);

    await TestBed.configureTestingModule({
      declarations: [RiskAssessmentComponent, FakeProfileItemComponent],
      imports: [MatToolbarModule, MatSidenavModule, BrowserAnimationsModule],
      providers: [{ provide: TestRunService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(RiskAssessmentComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('with no data', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have toolbar with title', () => {
      const toolbarEl = compiled.querySelector('.risk-assessment-toolbar');
      const title = compiled.querySelector('h2.title');
      const titleContent = title?.innerHTML.trim();

      expect(toolbarEl).not.toBeNull();
      expect(title).toBeTruthy();
      expect(titleContent).toContain('Risk assessment');
    });

    it('should not have profiles drawer', () => {
      const profilesDrawer = compiled.querySelector('.profiles-drawer');

      expect(profilesDrawer).toBeFalsy();
    });
  });

  describe('with profiles data', () => {
    beforeEach(() => {
      component.viewModel$ = of({
        profiles: [PROFILE_MOCK, PROFILE_MOCK],
      });
      fixture.detectChanges();
    });

    it('should have profiles drawer', () => {
      const profilesDrawer = compiled.querySelector('.profiles-drawer');

      expect(profilesDrawer).toBeTruthy();
    });

    it('should have profile items', () => {
      const profileItems = compiled.querySelectorAll('app-profile-item');

      expect(profileItems.length).toEqual(2);
    });
  });
});

@Component({
  selector: 'app-profile-item',
  template: '<div></div>',
})
class FakeProfileItemComponent {
  @Input() profile!: Profile;
}
