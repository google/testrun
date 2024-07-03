import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DownloadZipModalComponent } from './download-zip-modal.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  PROFILE_MOCK,
  PROFILE_MOCK_2,
  PROFILE_MOCK_3,
} from '../../mocks/profile.mock';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestRunService } from '../../services/test-run.service';

describe('DownloadZipModalComponent', () => {
  let component: DownloadZipModalComponent;
  let fixture: ComponentFixture<DownloadZipModalComponent>;

  const testRunServiceMock = jasmine.createSpyObj(['getRiskClass']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DownloadZipModalComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            keydownEvents: () => of(new KeyboardEvent('keydown', { code: '' })),
            close: () => ({}),
          },
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            hasProfiles: true,
            profiles: [PROFILE_MOCK_2, PROFILE_MOCK],
          },
        },
        { provide: TestRunService, useValue: testRunServiceMock },
      ],
    });
  });

  describe('with profiles', () => {
    beforeEach(() => {
      TestBed.overrideProvider(MAT_DIALOG_DATA, {
        useValue: {
          hasProfiles: true,
          profiles: [PROFILE_MOCK_2, PROFILE_MOCK, PROFILE_MOCK_3],
        },
      });

      TestBed.compileComponents();
      fixture = TestBed.createComponent(DownloadZipModalComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should have dropdown with profiles', async () => {
      const select = fixture.nativeElement.querySelector('mat-select');

      expect(select).toBeTruthy();
    });

    it('should preselect first profile', async () => {
      const select = fixture.nativeElement.querySelector(
        'mat-select'
      ) as HTMLElement;

      expect(select.getAttribute('ng-reflect-value')).toEqual(
        'Primary profile'
      );
    });

    it('should close with null on redirect button click', async () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const redirectButton = fixture.nativeElement.querySelector(
        '.redirect-button'
      ) as HTMLButtonElement;

      redirectButton.click();

      expect(closeSpy).toHaveBeenCalledWith(null);

      closeSpy.calls.reset();
    });

    it('should close with undefined on cancel button click', async () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const cancelButton = fixture.nativeElement.querySelector(
        '.cancel-button'
      ) as HTMLButtonElement;

      cancelButton.click();

      expect(closeSpy).toHaveBeenCalledWith(undefined);

      closeSpy.calls.reset();
    });

    it('should close with profile on download button click', async () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const downloadButton = fixture.nativeElement.querySelector(
        '.download-button'
      ) as HTMLButtonElement;

      downloadButton.click();

      expect(closeSpy).toHaveBeenCalledWith('Primary profile');

      closeSpy.calls.reset();
    });

    it('should have filtered and sorted profiles', async () => {
      expect(component.profiles).toEqual([PROFILE_MOCK, PROFILE_MOCK_2]);
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
          hasProfiles: false,
          profiles: [],
        },
      });

      TestBed.compileComponents();
      fixture = TestBed.createComponent(DownloadZipModalComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should have no dropdown with profiles', async () => {
      const select = fixture.nativeElement.querySelector('mat-select');

      expect(select).toEqual(null);
    });

    it('should close with null on redirect button click', async () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const redirectButton = fixture.nativeElement.querySelector(
        '.redirect-button'
      ) as HTMLButtonElement;

      redirectButton.click();

      expect(closeSpy).toHaveBeenCalledWith(null);

      closeSpy.calls.reset();
    });

    it('should close with undefined on cancel button click', async () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const cancelButton = fixture.nativeElement.querySelector(
        '.cancel-button'
      ) as HTMLButtonElement;

      cancelButton.click();

      expect(closeSpy).toHaveBeenCalledWith(undefined);

      closeSpy.calls.reset();
    });

    it('should close with empty profile on download button click', async () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const downloadButton = fixture.nativeElement.querySelector(
        '.download-button'
      ) as HTMLButtonElement;

      downloadButton.click();

      expect(closeSpy).toHaveBeenCalledWith('');

      closeSpy.calls.reset();
    });
  });
});
