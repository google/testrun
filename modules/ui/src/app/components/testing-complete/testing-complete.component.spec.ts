import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { TestingCompleteComponent } from './testing-complete.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { MOCK_PROGRESS_DATA_COMPLIANT } from '../../mocks/testrun.mock';
import { of } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import {
  DialogCloseAction,
  DownloadZipModalComponent,
} from '../download-zip-modal/download-zip-modal.component';
import { FocusManagerService } from '../../services/focus-manager.service';

describe('TestingCompleteComponent', () => {
  let component: TestingCompleteComponent;
  let fixture: ComponentFixture<TestingCompleteComponent>;
  const mockFocusManagerService = jasmine.createSpyObj(
    'mockFocusManagerService',
    ['focusFirstElementInContainer']
  );
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'risk-assessment', component: FakeRiskAssessmentComponent },
        ]),
        TestingCompleteComponent,
        BrowserAnimationsModule,
      ],
      providers: [
        { provide: FocusManagerService, useValue: mockFocusManagerService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestingCompleteComponent);
    component = fixture.componentInstance;
    component.data = MOCK_PROGRESS_DATA_COMPLIANT;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('#onInit', () => {
    it('should focus first element in container when dialog closes with Close action', fakeAsync(() => {
      const openSpy = spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of({ action: DialogCloseAction.Close }),
      } as MatDialogRef<typeof DownloadZipModalComponent>);

      component.ngOnInit();

      tick(1000);

      expect(openSpy).toHaveBeenCalledWith(DownloadZipModalComponent, {
        ariaLabel: 'Testing complete',
        data: {
          profiles: [],
          testrunStatus: MOCK_PROGRESS_DATA_COMPLIANT,
          isTestingComplete: true,
          report: 'https://api.testrun.io/report.pdf',
          export: '',
          isPilot: false,
        },
        autoFocus: 'first-tabbable',
        ariaDescribedBy: 'testing-result-main-info',
        hasBackdrop: true,
        disableClose: true,
        panelClass: 'initiate-test-run-dialog',
      });

      tick(1000);

      expect(
        mockFocusManagerService.focusFirstElementInContainer
      ).toHaveBeenCalled();
      openSpy.calls.reset();
    }));
  });
});

@Component({
  selector: 'app-fake-risk-assessment-component',
  template: '',
})
class FakeRiskAssessmentComponent {}
