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

import { ProfileItemComponent } from './profile-item.component';
import {
  EXPIRED_PROFILE_MOCK,
  PROFILE_MOCK,
} from '../../../mocks/profile.mock';
import { TestRunService } from '../../../services/test-run.service';
import { LiveAnnouncer } from '@angular/cdk/a11y';

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

  it('should have profile name as part of buttons aria-label', () => {
    const deleteButton = fixture.nativeElement.querySelector(
      '.profile-item-button.delete'
    );
    const copyButton = fixture.nativeElement.querySelector(
      '.profile-item-button.copy'
    );

    expect(deleteButton?.ariaLabel?.trim()).toContain(PROFILE_MOCK.name);
    expect(copyButton?.ariaLabel?.trim()).toContain(PROFILE_MOCK.name);
  });

  it('should emit delete event on delete button clicked', () => {
    const deleteSpy = spyOn(component.deleteButtonClicked, 'emit');
    const deleteButton = fixture.nativeElement.querySelector(
      '.profile-item-button.delete'
    ) as HTMLButtonElement;

    deleteButton.click();

    expect(deleteSpy).toHaveBeenCalledWith(PROFILE_MOCK.name);
  });

  it('should emit click event on profile name clicked', () => {
    const profileClickedSpy = spyOn(component.profileClicked, 'emit');
    const profileName = fixture.nativeElement.querySelector(
      '.profile-item-name'
    ) as HTMLElement;

    profileName.click();

    expect(profileClickedSpy).toHaveBeenCalledWith(PROFILE_MOCK);
  });

  describe('with Expired profile', () => {
    beforeEach(() => {
      component.enterProfileItem(EXPIRED_PROFILE_MOCK);
    });

    it('should change tooltip on enterProfileItem', () => {
      expect(component.tooltip.message).toEqual(
        'This risk profile is outdated. Please create a new risk profile.'
      );
    });

    it('should announce', () => {
      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        'This risk profile is outdated. Please create a new risk profile.'
      );
    });
  });
});
