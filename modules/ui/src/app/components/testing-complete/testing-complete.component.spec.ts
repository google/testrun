import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { TestingCompleteComponent } from './testing-complete.component';
import { TestRunService } from '../../services/test-run.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { MOCK_PROGRESS_DATA_COMPLIANT } from '../../mocks/testrun.mock';
import { of } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { DownloadZipModalComponent } from '../download-zip-modal/download-zip-modal.component';
import { Routes } from '../../model/routes';

describe('TestingCompleteComponent', () => {
  let component: TestingCompleteComponent;
  let fixture: ComponentFixture<TestingCompleteComponent>;
  let router: Router;

  const testrunServiceMock: jasmine.SpyObj<TestRunService> =
    jasmine.createSpyObj('testrunServiceMock', ['downloadZip']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'risk-assessment', component: FakeRiskAssessmentComponent },
        ]),
        TestingCompleteComponent,
        BrowserAnimationsModule,
      ],
      providers: [{ provide: TestRunService, useValue: testrunServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestingCompleteComponent);
    component = fixture.componentInstance;
    router = TestBed.get(Router);
    component.data = MOCK_PROGRESS_DATA_COMPLIANT;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('#onInit', () => {
    beforeEach(() => {
      testrunServiceMock.downloadZip.calls.reset();
    });

    it('should call downloadZip on service if profile is a string', fakeAsync(() => {
      const openSpy = spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(''),
      } as MatDialogRef<typeof DownloadZipModalComponent>);

      component.ngOnInit();
      tick(1000);

      expect(openSpy).toHaveBeenCalledWith(DownloadZipModalComponent, {
        ariaLabel: 'Testing complete',
        data: {
          profiles: [],
          testrunStatus: MOCK_PROGRESS_DATA_COMPLIANT,
          isTestingComplete: true,
        },
        autoFocus: 'first-tabbable',
        ariaDescribedBy: 'testing-result-main-info',
        hasBackdrop: true,
        disableClose: true,
        panelClass: 'initiate-test-run-dialog',
      });

      tick();

      expect(testrunServiceMock.downloadZip).toHaveBeenCalled();
      expect(router.url).not.toBe(Routes.RiskAssessment);
      openSpy.calls.reset();
    }));
  });
});

@Component({
  selector: 'app-fake-risk-assessment-component',
  template: '',
})
class FakeRiskAssessmentComponent {}
