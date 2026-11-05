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
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';

import { ProfileItemComponent } from './profile-item.component';
import { PROFILE_MOCK } from '../../../mocks/profile.mock';
import { TestRunService } from '../../../services/test-run.service';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Profile, ProfileRisk, ProfileStatus } from '../../../model/profile';

describe('ProfileItemComponent', () => {
  let component: ProfileItemComponent;
  let fixture: ComponentFixture<ProfileItemComponent>;
  let compiled: HTMLElement;

  const testRunServiceMock = jasmine.createSpyObj(['getRiskClass']);
  const mockLiveAnnouncer = jasmine.createSpyObj('mockLiveAnnouncer', [
    'announce',
  ]);
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileItemComponent],
      providers: [
        { provide: TestRunService, useValue: testRunServiceMock },
        { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileItemComponent);
    component = fixture.componentInstance;
    component.profile = PROFILE_MOCK;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have profile name', () => {
    const name = compiled.querySelector('.profile-item-name');

    expect(name?.textContent?.trim()).toEqual(PROFILE_MOCK.name);
  });

  it('should have create date', () => {
    const date = compiled.querySelector('.profile-item-created');

    expect(date?.textContent?.trim()).toEqual('23 May 2024');
  });

  it('should emit click event on profile name clicked', () => {
    const profileClickedSpy = spyOn(component.profileClicked, 'emit');
    const profileName = fixture.nativeElement.querySelector(
      '.profile-item-name'
    ) as HTMLElement;

    profileName.click();

    expect(profileClickedSpy).toHaveBeenCalledWith(PROFILE_MOCK);
  });

  it('#getRiskClass should call getRiskClass on testRunService', () => {
    const MOCK_RISK = 'mock value';
    component.getRiskClass(MOCK_RISK);
    expect(testRunServiceMock.getRiskClass).toHaveBeenCalledWith(MOCK_RISK);
  });

  it('#enterProfileItem should emit profileClicked', () => {
    const profileClickedSpy = spyOn(component.profileClicked, 'emit');

    component.enterProfileItem(PROFILE_MOCK);

    expect(profileClickedSpy).toHaveBeenCalled();
  });

  it('should display check_circle icon for valid profile', () => {
    const icon = compiled.querySelector('.profile-item-icon');
    expect(icon?.textContent?.trim()).toBe('check_circle');
  });

  it('should display edit_note icon for draft profile', () => {
    fixture.componentRef.setInput('profile', {
      ...PROFILE_MOCK,
      status: ProfileStatus.DRAFT,
    });
    fixture.detectChanges();

    const icon = compiled.querySelector('.profile-item-icon');
    expect(icon?.textContent?.trim()).toBe('edit_note');
  });

  it('should display edit_note icon for copy profile', () => {
    fixture.componentRef.setInput('profile', {
      ...PROFILE_MOCK,
      status: ProfileStatus.COPY,
    });
    fixture.detectChanges();

    const icon = compiled.querySelector('.profile-item-icon');
    expect(icon?.textContent?.trim()).toBe('edit_note');
  });

  it('should display error icon for expired profile', () => {
    fixture.componentRef.setInput('profile', {
      ...PROFILE_MOCK,
      status: ProfileStatus.EXPIRED,
    });
    fixture.detectChanges();

    const icon = compiled.querySelector('.profile-item-icon');
    expect(icon?.textContent?.trim()).toBe('error');
  });

  describe('accessibility', () => {
    const getProfileButton = (): HTMLElement =>
      compiled.querySelector('.profile-item-info') as HTMLElement;

    const renderProfile = (overrides: Partial<Profile>): void => {
      fixture.componentRef.setInput('profile', {
        ...PROFILE_MOCK,
        ...overrides,
      });
      fixture.detectChanges();
    };

    it('should label a completed profile with status, risk level, name and date', () => {
      renderProfile({ risk: ProfileRisk.LIMITED });

      expect(getProfileButton().getAttribute('aria-label')).toBe(
        'Valid, Limited risk, Primary profile, 23 May 2024'
      );
    });

    // The API returns `risk: null` for draft profiles.
    const missingRiskValues: Array<[string, string | null | undefined]> = [
      ['null', null],
      ['undefined', undefined],
      ['empty', ''],
    ];
    missingRiskValues.forEach(([description, risk]) => {
      it(`should omit the risk level from the label when risk is ${description}`, () => {
        renderProfile({
          status: ProfileStatus.DRAFT,
          risk: risk as string | undefined,
        });

        const label = getProfileButton().getAttribute('aria-label');
        expect(label).toBe('Draft, Primary profile, 23 May 2024');
        expect(label).not.toMatch(/null|undefined/);
      });
    });

    it('should omit the date from the label when the profile has no creation date', () => {
      renderProfile({
        name: 'Copy of Primary profile',
        status: ProfileStatus.COPY,
        created: undefined,
      });

      expect(getProfileButton().getAttribute('aria-label')).toBe(
        'Copy, Copy of Primary profile'
      );
    });

    it('should not repeat the status in an aria-describedby description', async () => {
      renderProfile({ status: ProfileStatus.DRAFT });
      await fixture.whenStable();

      expect(getProfileButton().hasAttribute('aria-describedby')).toBeFalse();
    });

    it('should keep a visual tooltip that mirrors the accessible name', () => {
      renderProfile({ status: ProfileStatus.DRAFT });

      const tooltip = fixture.debugElement
        .query(By.css('.profile-item-info'))
        .injector.get(MatTooltip);
      expect(tooltip.message).toBe(
        getProfileButton().getAttribute('aria-label') as string
      );
    });

    it('should hide the decorative status icon from assistive technology', () => {
      const iconContainer = compiled.querySelector(
        '.profile-item-icon-container'
      );

      expect(iconContainer?.getAttribute('aria-hidden')).toBe('true');
      expect(iconContainer?.hasAttribute('aria-label')).toBeFalse();
    });
  });
});
