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

import { EmptyMessageComponent } from './empty-message.component';

describe('EmptyMessageComponent', () => {
  let compiled: HTMLElement;
  let component: EmptyMessageComponent;
  let fixture: ComponentFixture<EmptyMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyMessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyMessageComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('image', 'image.csv');
    fixture.componentRef.setInput('header', 'header text');
    fixture.componentRef.setInput('message', 'message text');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have image', () => {
    const image = compiled.querySelector('img') as HTMLImageElement;

    expect(image?.src).toContain('image.csv');
  });

  it('should have header', () => {
    const text = compiled.querySelector('.empty-message-header');

    expect(text?.textContent?.trim()).toEqual('header text');
  });

  it('should have message', () => {
    const text = compiled.querySelector('.empty-message-main');

    expect(text?.textContent?.trim()).toEqual('message text');
  });
});
