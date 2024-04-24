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

import { ShutdownAppModalComponent } from './shutdown-app-modal.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('ShutdownAppModalComponent', () => {
  let component: ShutdownAppModalComponent;
  let fixture: ComponentFixture<ShutdownAppModalComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ShutdownAppModalComponent,
        MatDialogModule,
        MatButtonModule,
        BrowserAnimationsModule,
      ],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            keydownEvents: () => of(new KeyboardEvent('keydown', { code: '' })),
            close: () => ({}),
          },
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShutdownAppModalComponent);
    component = fixture.componentInstance;
    component.data = {
      title: 'title',
      content: 'content',
    };
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should has title and content', () => {
    const title = compiled.querySelector('.modal-title') as HTMLElement;
    const content = compiled.querySelector('.modal-content') as HTMLElement;

    expect(title.innerHTML.trim()).toEqual('title?');
    expect(content.innerHTML.trim()).toEqual('content');
  });

  it('should close dialog on click "cancel" button', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const closeButton = compiled.querySelector(
      '.cancel-button'
    ) as HTMLButtonElement;

    closeButton.click();

    expect(closeSpy).toHaveBeenCalledWith();

    closeSpy.calls.reset();
  });

  it('should close dialog with true on click "confirm" button', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const confirmButton = compiled.querySelector(
      '.confirm-button'
    ) as HTMLButtonElement;

    confirmButton.click();

    expect(closeSpy).toHaveBeenCalledWith(true);

    closeSpy.calls.reset();
  });
});
