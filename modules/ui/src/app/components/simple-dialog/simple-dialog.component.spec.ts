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

import { SimpleDialogComponent } from './simple-dialog.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { of } from 'rxjs';

describe('DeleteFormComponent', () => {
  let component: SimpleDialogComponent;
  let fixture: ComponentFixture<SimpleDialogComponent>;
  let compiled: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SimpleDialogComponent, MatDialogModule, MatButtonModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            keydownEvents: () => of(new KeyboardEvent('keydown', { code: '' })),
            close: () => ({}),
            afterOpened: () => of(void 0),
            beforeClosed: () => of(void 0),
          },
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(SimpleDialogComponent);
    component = fixture.componentInstance;
    component.data = {
      icon: 'favorite',
      title: 'title?',
      content: 'content',
    };
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should has icon', () => {
    const title = compiled.querySelector('mat-icon') as HTMLElement;

    expect(title.innerHTML).toEqual('favorite');
  });

  it('should has title', () => {
    const title = compiled.querySelector('.simple-dialog-title') as HTMLElement;

    expect(title.innerHTML).toEqual('title?');
  });

  it('should has content', () => {
    const content = compiled.querySelector(
      '.simple-dialog-content'
    ) as HTMLElement;

    expect(content.innerHTML.trim()).toEqual('content');
  });

  describe('title heading', () => {
    it('should render the title as a native level 2 heading', () => {
      const title = compiled.querySelector('h2.simple-dialog-title');

      expect(title?.textContent?.trim()).toBe('title?');
      // Native semantics leave no ARIA heading role to keep in sync.
      expect(title?.hasAttribute('role')).toBeFalse();
      expect(title?.hasAttribute('aria-level')).toBeFalse();
    });

    it('should keep the title text style of the dialog', () => {
      const title = compiled.querySelector(
        'h2.simple-dialog-title'
      ) as HTMLElement;
      expect(title).withContext('title heading').not.toBeNull();
      const style = getComputedStyle(title);

      // No default `<h2>` margin or bold weight, so the dialog looks the same.
      expect(style.marginTop).toBe('0px');
      expect(style.marginBottom).toBe('0px');
      expect(style.fontWeight).toBe('400');
      expect(style.fontSize).toBe('24px');
      expect(style.lineHeight).toBe('32px');
    });
  });

  describe('content description', () => {
    it('should give the content the id that the opener describes the dialog by', () => {
      const content = compiled.querySelector(
        '.simple-dialog-content'
      ) as HTMLElement;
      // Dialogs that are not described by their content get no stray id.
      expect(content.hasAttribute('id'))
        .withContext('without contentId')
        .toBeFalse();

      component.data = {
        ...component.data,
        contentId: 'app-delete-device-dialog-content-0',
      };
      fixture.detectChanges();

      expect(content.id).toBe('app-delete-device-dialog-content-0');
    });
  });

  it('should close dialog on "cancel" click', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const closeButton = compiled.querySelector(
      '.cancel-button'
    ) as HTMLButtonElement;

    closeButton?.click();

    expect(closeSpy).toHaveBeenCalledWith();

    closeSpy.calls.reset();
  });

  it('should close dialog with true on "confirm" click', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const confirmButton = compiled.querySelector(
      '.confirm-button'
    ) as HTMLButtonElement;

    confirmButton?.click();

    expect(closeSpy).toHaveBeenCalledWith(true);

    closeSpy.calls.reset();
  });

  describe('persistent mode', () => {
    beforeEach(() => {
      component.data = {
        icon: 'error',
        title: 'Connection Error',
        content: 'content',
        isPersistent: true,
      };
      component.disableEscape = true;
      fixture.detectChanges();
    });

    it('should not render cancel and confirm buttons', () => {
      expect(compiled.querySelector('.cancel-button')).toBeNull();
      expect(compiled.querySelector('.confirm-button')).toBeNull();
      expect(compiled.querySelector('mat-dialog-actions')).toBeNull();
    });

    it('should still render title and content', () => {
      expect(
        compiled.querySelector('.simple-dialog-title')?.textContent?.trim()
      ).toBe('Connection Error');
      expect(
        compiled.querySelector('.simple-dialog-content')?.textContent?.trim()
      ).toBe('content');
    });
  });

  it('should set disableEscape from persistent dialog data', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SimpleDialogComponent, MatDialogModule, MatButtonModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            keydownEvents: () => of(new KeyboardEvent('keydown', { code: '' })),
            close: () => ({}),
            afterOpened: () => of(void 0),
            beforeClosed: () => of(void 0),
          },
        },
        { provide: MAT_DIALOG_DATA, useValue: { isPersistent: true } },
      ],
    });
    const persistentFixture = TestBed.createComponent(SimpleDialogComponent);

    expect(persistentFixture.componentInstance.disableEscape).toBeTrue();
  });
});
