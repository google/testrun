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
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

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

  it('should emit click event on profile name clicked', () => {
    const profileClickedSpy = spyOn(component.profileClicked, 'emit');
    const profileName = fixture.nativeElement.querySelector(
      '.profile-item-name'
    ) as HTMLElement;

    profileName.click();

    expect(profileClickedSpy).toHaveBeenCalledWith(PROFILE_MOCK);
  });

  it('should change tooltip on focusout', fakeAsync(() => {
    component.profile = EXPIRED_PROFILE_MOCK;
    fixture.detectChanges();

    fixture.nativeElement.dispatchEvent(new Event('focusout'));
    tick();

    expect(component.tooltip().message).toEqual(
      'Expired. Please, create a new Risk profile.'
    );
  }));

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

  describe('with Expired profile', () => {
    beforeEach(() => {
      component.enterProfileItem(EXPIRED_PROFILE_MOCK);
    });

    it('should change tooltip on enterProfileItem', () => {
      expect(component.tooltip().message).toEqual(
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
