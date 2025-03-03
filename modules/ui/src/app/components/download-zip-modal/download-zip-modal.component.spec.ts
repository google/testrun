import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import {
  DialogCloseAction,
  DownloadZipModalComponent,
} from './download-zip-modal.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  PROFILE_MOCK,
  PROFILE_MOCK_2,
  PROFILE_MOCK_3,
} from '../../mocks/profile.mock';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestRunService } from '../../services/test-run.service';
import { Routes } from '../../model/routes';
import { Router } from '@angular/router';
import { FocusManagerService } from '../../services/focus-manager.service';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';

describe('DownloadZipModalComponent', () => {
  // @ts-expect-error data layer should be defined
  window.dataLayer = window.dataLayer || [];
  let component: DownloadZipModalComponent;
  let fixture: ComponentFixture<DownloadZipModalComponent>;
  let router: Router;
  const testRunServiceMock = jasmine.createSpyObj('testRunServiceMock', [
    'getRiskClass',
    'downloadZip',
  ]);
  const focusServiceMock: jasmine.SpyObj<FocusManagerService> =
    jasmine.createSpyObj('focusServiceMock', ['focusFirstElementInContainer']);
  const actionBehaviorSubject$ = new BehaviorSubject({
    action: DialogCloseAction.Close,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'risk-assessment', component: FakeRiskAssessmentComponent },
        ]),
        DownloadZipModalComponent,
        NoopAnimationsModule,
      ],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            keydownEvents: () => of(new KeyboardEvent('keydown', { code: '' })),
            close: () => ({}),
            beforeClosed: () => actionBehaviorSubject$.asObservable(),
          },
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            profiles: [PROFILE_MOCK_2, PROFILE_MOCK],
            report: 'localhost:8080',
            export: 'localhost:8080',
          },
        },
        { provide: TestRunService, useValue: testRunServiceMock },
        { provide: FocusManagerService, useValue: focusServiceMock },
      ],
    });
  });

  describe('with profiles', () => {
    beforeEach(() => {
      TestBed.overrideProvider(MAT_DIALOG_DATA, {
        useValue: {
          profiles: [PROFILE_MOCK_2, PROFILE_MOCK, PROFILE_MOCK_3],
          report: 'localhost:8080',
          export: 'localhost:8080',
          isPilot: true,
        },
      });

      TestBed.compileComponents();
      fixture = TestBed.createComponent(DownloadZipModalComponent);
      router = TestBed.get(Router);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should have dropdown with profiles', async () => {
      const select = fixture.nativeElement.querySelector('mat-select');

      expect(select).toBeTruthy();
    });

    it('should preselect "no profile" option', async () => {
      expect(component.selectedProfile.name).toEqual(
        'No Risk Profile selected'
      );
    });

    it('should close with Redirect action on redirect button click', fakeAsync(() => {
      const result = {
        action: DialogCloseAction.Redirect,
      };
      actionBehaviorSubject$.next(result);
      fixture.detectChanges();

      fixture.ngZone?.run(() => {
        const closeSpy = spyOn(component.dialogRef, 'close');
        const redirectLink = fixture.nativeElement.querySelector(
          '.redirect-link'
        ) as HTMLAnchorElement;

        redirectLink.click();

        tick(2000);

        expect(router.url).toBe(Routes.RiskAssessment);
        expect(
          focusServiceMock.focusFirstElementInContainer
        ).toHaveBeenCalled();
        expect(closeSpy).toHaveBeenCalledWith(result);

        closeSpy.calls.reset();
        discardPeriodicTasks();
      });
    }));

    it('should close with Close action on cancel button click', async () => {
      const result = {
        action: DialogCloseAction.Close,
      };
      const closeSpy = spyOn(component.dialogRef, 'close');
      actionBehaviorSubject$.next(result);
      fixture.detectChanges();

      const cancelButton = fixture.nativeElement.querySelector(
        '.cancel-button'
      ) as HTMLButtonElement;

      cancelButton.click();

      expect(closeSpy).toHaveBeenCalledWith(result);

      closeSpy.calls.reset();
    });

    it('should close with Download action and profile on download button click', async () => {
      const result = {
        action: DialogCloseAction.Download,
        profile: '',
      };
      actionBehaviorSubject$.next(result);
      fixture.detectChanges();
      const closeSpy = spyOn(component.dialogRef, 'close');
      const downloadButton = fixture.nativeElement.querySelector(
        '.download-button'
      ) as HTMLButtonElement;

      downloadButton.click();

      expect(closeSpy).toHaveBeenCalledWith(result);
      expect(testRunServiceMock.downloadZip).toHaveBeenCalled();
      expect(router.url).not.toBe(Routes.RiskAssessment);
      closeSpy.calls.reset();
    });

    it('should send GA event if report is for Pilot program', async () => {
      const result = {
        action: DialogCloseAction.Download,
        profile: '',
      };
      actionBehaviorSubject$.next(result);
      fixture.detectChanges();
      const closeSpy = spyOn(component.dialogRef, 'close');
      const downloadButton = fixture.nativeElement.querySelector(
        '.download-button'
      ) as HTMLButtonElement;

      downloadButton.click();

      expect(
        // @ts-expect-error data layer should be defined
        window.dataLayer.some(
          (item: { event: string }) => item.event === 'pilot_download_zip'
        )
      ).toBeTruthy();
      closeSpy.calls.reset();
    });

    it('should have filtered and sorted profiles', async () => {
      expect(component.profiles).toEqual([
        component.NO_PROFILE,
        PROFILE_MOCK,
        PROFILE_MOCK_2,
      ]);
    });

    it('#getRiskClass should call the service method getRiskClass"', () => {
      const expectedResult = {
        red: true,
        cyan: false,
      };

      testRunServiceMock.getRiskClass.and.returnValue(expectedResult);

      const result = component.getRiskClass('High');

      expect(testRunServiceMock.getRiskClass).toHaveBeenCalledWith('High');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('with no profiles', () => {
    beforeEach(() => {
      TestBed.overrideProvider(MAT_DIALOG_DATA, {
        useValue: {
          profiles: [],
          report: 'localhost:8080',
          export: 'localhost:8080',
        },
      });

      TestBed.compileComponents();
      fixture = TestBed.createComponent(DownloadZipModalComponent);
      router = TestBed.get(Router);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should have disabled dropdown', async () => {
      const select = fixture.nativeElement.querySelector('mat-select');

      expect(select.classList.contains('mat-mdc-select-disabled')).toBeTruthy();
    });

    it('should close with Redirect action on redirect button click', fakeAsync(() => {
      const result = {
        action: DialogCloseAction.Redirect,
      };
      actionBehaviorSubject$.next(result);
      fixture.detectChanges();

      fixture.ngZone?.run(() => {
        const closeSpy = spyOn(component.dialogRef, 'close');
        const redirectLink = fixture.nativeElement.querySelector(
          '.redirect-link'
        ) as HTMLAnchorElement;

        redirectLink.click();

        tick(2000);

        expect(router.url).toBe(Routes.RiskAssessment);
        expect(
          focusServiceMock.focusFirstElementInContainer
        ).toHaveBeenCalled();
        expect(closeSpy).toHaveBeenCalledWith(result);

        closeSpy.calls.reset();
        discardPeriodicTasks();
      });
    }));

    it('should close with Close action on cancel button click', async () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const cancelButton = fixture.nativeElement.querySelector(
        '.cancel-button'
      ) as HTMLButtonElement;

      cancelButton.click();

      expect(closeSpy).toHaveBeenCalledWith({
        action: DialogCloseAction.Close,
      });

      closeSpy.calls.reset();
    });

    it('should close with empty profile on download button click', async () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const downloadButton = fixture.nativeElement.querySelector(
        '.download-button'
      ) as HTMLButtonElement;

      downloadButton.click();

      expect(closeSpy).toHaveBeenCalledWith({
        action: DialogCloseAction.Download,
        profile: '',
      });

      closeSpy.calls.reset();
    });
  });
});

@Component({
  selector: 'app-fake-risk-assessment-component',
  template: '',
})
class FakeRiskAssessmentComponent {}
