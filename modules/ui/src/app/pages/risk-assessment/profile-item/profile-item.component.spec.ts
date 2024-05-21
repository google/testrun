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
import { PROFILE_MOCK } from '../../../mocks/profile.mock';

describe('ProfileItemComponent', () => {
  let component: ProfileItemComponent;
  let fixture: ComponentFixture<ProfileItemComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileItemComponent],
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

    expect(name?.textContent?.trim()).toEqual('Profile name');
  });

  it('should emit delete event on delete button clicked', () => {
    const deleteSpy = spyOn(component.deleteButtonClicked, 'emit');
    const deleteButton = fixture.nativeElement.querySelector(
      '.profile-item-button.delete'
    ) as HTMLButtonElement;

    deleteButton.click();

    expect(deleteSpy).toHaveBeenCalledWith('Profile name');
  });
});
