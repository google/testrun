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

import { DeleteReportComponent } from './delete-report.component';
import { of } from 'rxjs';
import {
  MatDialogConfig,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { SimpleDialogComponent } from '../../../../components/simple-dialog/simple-dialog.component';
import { MOCK_PROGRESS_DATA_COMPLIANT } from '../../../../mocks/testrun.mock';

describe('DeleteReportComponent', () => {
  let compiled: HTMLElement;
  let component: DeleteReportComponent;
  let fixture: ComponentFixture<DeleteReportComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeleteReportComponent, MatDialogModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => ({}),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(DeleteReportComponent);
    component = fixture.componentInstance;
    component.data = MOCK_PROGRESS_DATA_COMPLIANT;
    compiled = fixture.nativeElement as HTMLElement;
  });

  describe('Class tests', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('#deleteReport should open delete dialog', () => {
      const deviceRemovedSpy = spyOn(component.removeDevice, 'emit');
      const openSpy = spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<typeof SimpleDialogComponent>);

      component.deleteReport(new Event('click'));

      expect(deviceRemovedSpy).toHaveBeenCalled();

      expect(openSpy).toHaveBeenCalledWith(SimpleDialogComponent, {
        ariaDescribedBy: jasmine.stringMatching(
          /^app-delete-report-dialog-content-/
        ),
        ariaModal: true,
        data: {
          title: 'Delete report?',
          content:
            'You are about to delete Delta 03-DIN-CPU 1.2.2 22 Jun 2023 9:20. Are you sure?',
          contentId: jasmine.stringMatching(
            /^app-delete-report-dialog-content-/
          ),
        },
        autoFocus: true,
        hasBackdrop: true,
        disableClose: true,
        panelClass: ['simple-dialog', 'delete-dialog'],
      });
      // The dialog is described by its own content.
      const config = openSpy.calls.mostRecent().args[1] as MatDialogConfig<{
        contentId: string;
      }>;
      expect(config.ariaDescribedBy).toBe(config.data?.contentId);
      openSpy.calls.reset();
    });
  });

  describe('DOM tests', () => {
    describe('with not data provided', () => {
      beforeEach(() => {
        (component.data as unknown) = null;
        fixture.detectChanges();
      });

      it('should not have content', () => {
        const deleteReportButton = compiled.querySelector(
          '.delete-report-button'
        );

        expect(deleteReportButton).toBeNull();
      });
    });

    describe('with data provided', () => {
      beforeEach(() => {
        component.data = MOCK_PROGRESS_DATA_COMPLIANT;
        fixture.detectChanges();
      });

      it('should have delete report button with interpolated aria-label', () => {
        const deleteReportButton = compiled.querySelector(
          '.delete-report-button'
        );

        expect(deleteReportButton).toBeTruthy();
        expect(deleteReportButton?.getAttribute('aria-label')).toBe(
          'Delete report for Testrun # Delta 03-DIN-CPU 1.2.2 22 Jun 2023 9:20'
        );
      });
    });
  });

  describe('delete report dialog accessibility', () => {
    const WARNING =
      'You are about to delete Delta 03-DIN-CPU 1.2.2 22 Jun 2023 9:20. Are you sure?';

    beforeEach(() => {
      fixture.detectChanges();
    });

    afterEach(() => {
      component.dialog.closeAll();
    });

    /** Activates Delete report and returns the `role="dialog"` element it opens. */
    async function openDeleteDialog(): Promise<HTMLElement> {
      (
        compiled.querySelector('.delete-report-button') as HTMLAnchorElement
      ).click();
      // The click runs in the Angular zone, which renders the dialog in the CDK
      // overlay; `mat-dialog-title` then registers its id in a microtask.
      await fixture.whenStable();
      return document.querySelector(
        '.delete-dialog mat-dialog-container'
      ) as HTMLElement;
    }

    it('should mark the dialog as modal', async () => {
      const dialog = await openDeleteDialog();

      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
    });

    it('should name the dialog by its visible heading', async () => {
      const dialog = await openDeleteDialog();
      const heading = dialog.querySelector('h2') as HTMLElement;

      expect(textOfIdRefs(dialog.getAttribute('aria-labelledby'))).toBe(
        'Delete report?'
      );
      expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
      // A static name would override the visible heading.
      expect(dialog.hasAttribute('aria-label')).toBeFalse();
    });

    it('should title the dialog with a single level 2 heading', async () => {
      const dialog = await openDeleteDialog();

      expect(dialog.querySelector('h2')?.textContent?.trim()).toBe(
        'Delete report?'
      );
      expect(
        dialog.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')
          .length
      ).toBe(1);
    });

    it('should describe the dialog by its warning', async () => {
      const dialog = await openDeleteDialog();
      const descriptionId = dialog.getAttribute('aria-describedby');

      expect(textOfIdRefs(descriptionId)).toBe(WARNING);
      // The id is unique and belongs to the warning inside this dialog.
      expect(document.querySelectorAll(`[id="${descriptionId}"]`).length).toBe(
        1
      );
      expect(dialog.querySelector(`[id="${descriptionId}"]`)).toBe(
        dialog.querySelector('.simple-dialog-content')
      );
    });
  });
});

/** Text of the elements referenced by an `aria-labelledby`/`aria-describedby` value. */
function textOfIdRefs(idRefs: string | null): string {
  return (idRefs ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
    .join(' ');
}
