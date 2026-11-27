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
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';

import { DownloadReportZipComponent } from './download-report-zip.component';
import { of } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  DialogCloseAction,
  DownloadZipModalComponent,
} from '../download-zip-modal/download-zip-modal.component';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { MOCK_PROGRESS_DATA_COMPLIANT } from '../../mocks/testrun.mock';
import { PROFILE_MOCK } from '../../mocks/profile.mock';
import { DeviceStatus } from '../../model/device';

describe('DownloadReportZipComponent', () => {
  let component: DownloadReportZipComponent;
  let fixture: ComponentFixture<DownloadReportZipComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'risk-assessment', component: FakeRiskAssessmentComponent },
        ]),
        DownloadReportZipComponent,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DownloadReportZipComponent);
    compiled = fixture.nativeElement as HTMLElement;
    component = fixture.componentInstance;
    component.report = 'localhost:8080';
    component.export = 'localhost:8080';
    component.data = MOCK_PROGRESS_DATA_COMPLIANT;
  });

  describe('Class tests', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('#onClick', () => {
      it('should open zip modal dialog', fakeAsync(() => {
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () =>
            of({ action: DialogCloseAction.Download, profile: '' }),
        } as MatDialogRef<typeof DownloadZipModalComponent>);
        component.onClick(new Event('click'));

        expect(openSpy).toHaveBeenCalledWith(DownloadZipModalComponent, {
          ariaModal: true,
          data: {
            profiles: [],
            report: 'localhost:8080',
            export: 'localhost:8080',
            isPilot: false,
            device: {
              status: DeviceStatus.VALID,
              manufacturer: 'Delta',
              model: '03-DIN-CPU',
              mac_addr: '01:02:03:04:05:06',
              firmware: '1.2.2',
            },
            started: '2023-06-22T09:20:00.123Z',
          },
          autoFocus: true,
          restoreFocus: true,
          hasBackdrop: true,
          disableClose: true,
          panelClass: 'initiate-test-run-dialog',
        });
        openSpy.calls.reset();
      }));

      it('should return focus to the given element when the dialog closes', () => {
        const openSpy = spyOn(component.dialog, 'open');
        fixture.componentRef.setInput('restoreFocus', '#download-button');

        component.onClick(new Event('click'));

        expect(openSpy).toHaveBeenCalledWith(
          DownloadZipModalComponent,
          jasmine.objectContaining({ restoreFocus: '#download-button' })
        );
      });
    });

    it('should have title and accessible role and label', () => {
      component.ngOnInit();
      fixture.detectChanges();

      expect(component.tooltip.message).toEqual(
        'Download zip for Testrun # Delta 03-DIN-CPU 1.2.2 22 Jun 2023 9:20'
      );
      expect(compiled.getAttribute('role')).toEqual('button');
      expect(compiled.getAttribute('aria-label')).toEqual(
        'Download zip for Testrun # Delta 03-DIN-CPU 1.2.2 22 Jun 2023 9:20'
      );
    });

    it('should take the role of a menu item inside a menu', () => {
      fixture.componentRef.setInput('role', 'menuitem');
      fixture.detectChanges();

      expect(compiled.getAttribute('role')).toEqual('menuitem');
    });
  });

  describe('DOM tests', () => {
    it('should open risk profiles modal on click', () => {
      const openSpy = spyOn(component.dialog, 'open');
      compiled.click();

      expect(openSpy).toHaveBeenCalled();

      openSpy.calls.reset();
    });

    describe('tooltip', () => {
      it('should be shown on mouseenter', () => {
        const spyOnShow = spyOn(component.tooltip, 'show');
        fixture.nativeElement.dispatchEvent(new Event('mouseenter'));

        expect(spyOnShow).toHaveBeenCalled();
      });

      it('should be shown on keyup', () => {
        const spyOnShow = spyOn(component.tooltip, 'show');
        fixture.nativeElement.dispatchEvent(new Event('keyup'));

        expect(spyOnShow).toHaveBeenCalled();
      });

      it('should be hidden on mouseleave', () => {
        const spyOnHide = spyOn(component.tooltip, 'hide');
        fixture.nativeElement.dispatchEvent(new Event('mouseleave'));

        expect(spyOnHide).toHaveBeenCalled();
      });

      it('should be hidden on keydown', () => {
        const spyOnHide = spyOn(component.tooltip, 'hide');
        fixture.nativeElement.dispatchEvent(new Event('keydown'));

        expect(spyOnHide).toHaveBeenCalled();
      });
    });
  });

  describe('"Download ZIP file" dialog (WCAG 1.3.1, 4.1.2)', () => {
    afterEach(() => {
      // Closes as Cancel does: the dialog expects a close action.
      TestBed.inject(MatDialog).openDialogs.forEach(dialogRef =>
        dialogRef.close({ action: DialogCloseAction.Close })
      );
    });

    /** Activates the control and returns the `role="dialog"` element it opens. */
    async function openZipDialog(): Promise<HTMLElement> {
      fixture.detectChanges();
      compiled.click();
      // The click runs in the Angular zone, which renders the dialog in the CDK
      // overlay; `mat-dialog-title` then registers its id in a microtask.
      await fixture.whenStable();
      return document.querySelector(
        '.initiate-test-run-dialog mat-dialog-container'
      ) as HTMLElement;
    }

    it('should mark the dialog as modal', async () => {
      const dialog = await openZipDialog();

      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
    });

    it('should name the dialog by its visible "Download ZIP file" heading', async () => {
      const dialog = await openZipDialog();
      const heading = dialog.querySelector('h2') as HTMLElement;

      expect(textOfIdRefs(dialog.getAttribute('aria-labelledby'))).toBe(
        'Download ZIP file'
      );
      expect(dialog.getAttribute('aria-labelledby')).toBe(heading?.id);
      // A static name would override the visible heading.
      expect(dialog.hasAttribute('aria-label')).toBeFalse();
    });

    it('should keep the Risk Profile options reachable in the modal dialog', async () => {
      component.profiles = [PROFILE_MOCK];
      const dialog = await openZipDialog();
      const select = dialog.querySelector('mat-select') as HTMLElement;

      (dialog.querySelector('.mat-mdc-select-trigger') as HTMLElement).click();
      await fixture.whenStable();

      // Some screen readers hide content outside an `aria-modal` dialog, so
      // the dialog owns the options panel that renders in another overlay.
      const panelId = `${select.id}-panel`;
      expect(idRefsOf(dialog, 'aria-owns')).toContain(panelId);
      expect(document.getElementById(panelId)?.getAttribute('role')).toBe(
        'listbox'
      );
    });
  });
});

@Component({
  selector: 'app-fake-risk-assessment-component',
  template: '',
})
class FakeRiskAssessmentComponent {}

/** IDs referenced by an ID reference list attribute, e.g. `aria-owns`. */
function idRefsOf(element: Element, attribute: string): string[] {
  return (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean);
}

/** Text of the elements referenced by an `aria-labelledby`/`aria-describedby` value. */
function textOfIdRefs(idRefs: string | null): string {
  return (idRefs ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
    .join(' ');
}
