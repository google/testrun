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

import { ProgramTypeIconComponent } from './program-type-icon.component';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('ProgramTypeIconComponent', () => {
  let component: ProgramTypeIconComponent;
  let fixture: ComponentFixture<ProgramTypeIconComponent>;
  let compiled: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProgramTypeIconComponent, MatIconTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(ProgramTypeIconComponent);
    component = fixture.componentInstance;
    component.type = 'pilot';
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should have svgIcon provided from type', () => {
    const iconEl = compiled.querySelector('.icon');

    expect(iconEl?.getAttribute('ng-reflect-svg-icon')).toEqual('pilot');
  });
});
