import {ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick} from '@angular/core/testing';

import {ProgressComponent} from './progress.component';
import {TestRunService} from '../test-run.service';
import {of} from 'rxjs';
import {MOCK_PROGRESS_DATA_CANCELLED, MOCK_PROGRESS_DATA_COMPLIANT, MOCK_PROGRESS_DATA_IN_PROGRESS, MOCK_PROGRESS_DATA_NOT_STARTED, TEST_DATA} from '../mocks/progress.mock';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatToolbarModule} from '@angular/material/toolbar';
import {Component, Input} from '@angular/core';
import {Observable} from 'rxjs/internal/Observable';
import {IResult, TestrunStatus} from '../model/testrun-status';

describe('ProgressComponent', () => {
  let component: ProgressComponent;
  let fixture: ComponentFixture<ProgressComponent>;
  let compiled: HTMLElement;
  let testRunServiceMock: jasmine.SpyObj<TestRunService>;

  testRunServiceMock = jasmine.createSpyObj(['getSystemStatus', 'setSystemStatus', 'systemStatus$', 'stopTestrun']);

  describe('Class tests', () => {
    beforeEach(() => {
      testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_IN_PROGRESS);
      testRunServiceMock.stopTestrun.and.returnValue(of(true));

      TestBed.configureTestingModule({
        declarations: [ProgressComponent],
        providers: [{provide: TestRunService, useValue: testRunServiceMock}],
        imports: [MatButtonModule, MatIconModule, MatToolbarModule]
      });
      fixture = TestBed.createComponent(ProgressComponent);
      component = fixture.componentInstance;
    });

    afterEach(() => {
      testRunServiceMock.getSystemStatus.calls.reset();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('#stopTestrun should call service method stopTestrun', () => {
      component.stopTestrun();

      expect(testRunServiceMock.stopTestrun).toHaveBeenCalled();
    })

    describe('#ngOnInit', () => {
      it('should set systemStatus$ value', () => {
        component.ngOnInit();

        component.systemStatus$.subscribe(res => {
          expect(res).toEqual(MOCK_PROGRESS_DATA_IN_PROGRESS)
        })
      });

      it('should set breadcrumbs$ value', () => {
        const expectedResult = [
          MOCK_PROGRESS_DATA_IN_PROGRESS.device.manufacturer,
          MOCK_PROGRESS_DATA_IN_PROGRESS.device.model,
          MOCK_PROGRESS_DATA_IN_PROGRESS.device.firmware
        ]

        component.ngOnInit();

        component.breadcrumbs$.subscribe(res => {
          expect(res).toEqual(expectedResult);
        })
      });

      it('should set dataSource$ value', () => {
        const expectedResult = TEST_DATA.results;

        component.ngOnInit();

        component.dataSource$.subscribe(res => {
          expect(res).toEqual(expectedResult);
        })
      });
    });
  });

  describe('DOM tests', () => {
    beforeEach(async () => {
      testRunServiceMock.stopTestrun.and.returnValue(of(true));

      await TestBed.configureTestingModule({
        declarations: [
          ProgressComponent,
          FakeProgressBreadcrumbsComponent,
          FakeProgressStatusCardComponent,
          FakeProgressTableComponent],
        providers: [{provide: TestRunService, useValue: testRunServiceMock}],
        imports: [MatButtonModule, MatIconModule, MatToolbarModule]
      }).compileComponents();

      fixture = TestBed.createComponent(ProgressComponent);
      compiled = fixture.nativeElement as HTMLElement;
    });

    afterEach(() => {
      testRunServiceMock.getSystemStatus.calls.reset();
    });

    describe('with not systemStatus$ data', () => {
      beforeEach(() => {
        (testRunServiceMock.systemStatus$ as any) = of(null);
        fixture.detectChanges();
      });

      it('should have empty state content', () => {
        const emptyContentEl = compiled.querySelector('.progress-content-empty');
        const toolbarEl = compiled.querySelector('.progress-toolbar');

        expect(emptyContentEl).not.toBeNull();
        expect(toolbarEl).toBeNull();
      });

      it('should have anabled "Start" button', () => {
        const startBtn = compiled.querySelector('.start-button') as HTMLButtonElement;

        expect(startBtn.disabled).toBeFalse();
      });
    });

    describe('with available systemStatus$ data, status "In Progress"', () => {
      beforeEach(() => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_IN_PROGRESS);
        fixture.detectChanges();
      });

      it('should have toolbar content', () => {
        const emptyContentEl = compiled.querySelector('.progress-content-empty');
        const toolbarEl = compiled.querySelector('.progress-toolbar');

        expect(toolbarEl).not.toBeNull();
        expect(emptyContentEl).toBeNull();
      });

      it('should have "Stop" button', () => {
        const stopBtn = compiled.querySelector('.stop-button');

        expect(stopBtn).not.toBeNull();
      });

      it('should call stopTestrun on click "Stop" button', () => {
        const stopBtn = compiled.querySelector('.stop-button') as HTMLButtonElement;

        stopBtn.click();

        expect(testRunServiceMock.stopTestrun).toHaveBeenCalled();
      })

      it('should have disabled "Start" button', () => {
        const startBtn = compiled.querySelector('.start-button') as HTMLButtonElement;

        expect(startBtn.disabled).toBeTrue();
      });

      it('should not have "Download Report" button', () => {
        const reportBtn = compiled.querySelector('.report-button');

        expect(reportBtn).toBeNull();
      });
    });

    describe('pullingSystemStatusData with available status "In Progress"', () => {
      it('should call again getSystemStatus)', fakeAsync(() => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_IN_PROGRESS);
        fixture.detectChanges();
        tick(5000);

        expect(testRunServiceMock.getSystemStatus).toHaveBeenCalledTimes(2);
        discardPeriodicTasks();
      }));
    })

    describe('with available systemStatus$ data, as Completed', () => {
      beforeEach(() => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_COMPLIANT);
        fixture.detectChanges();
      });

      it('should not have "Stop" button', () => {
        const stopBtn = compiled.querySelector('.stop-button');

        expect(stopBtn).toBeNull();
      });

      it('should have anable "Start" button', () => {
        const startBtn = compiled.querySelector('.start-button') as HTMLButtonElement;

        expect(startBtn.disabled).toBeFalse();
      });

      it('should have "Download Report" button', () => {
        const reportBtn = compiled.querySelector('.report-button');

        expect(reportBtn).not.toBeNull();
      });
    });

    describe('with available systemStatus$ data, as Cancelled', () => {
      beforeEach(() => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_CANCELLED);
        fixture.detectChanges();
      });

      it('should have anable "Start" button', () => {
        const startBtn = compiled.querySelector('.start-button') as HTMLButtonElement;

        expect(startBtn.disabled).toBeFalse();
      });

      it('should not have "Download Report" button', () => {
        const reportBtn = compiled.querySelector('.report-button');

        expect(reportBtn).toBeNull();
      });
    });

    describe('with available systemStatus$ data, when Testrun not started on Idle status', () => {
      beforeEach(() => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_NOT_STARTED);
        fixture.detectChanges();
      });

      it('should have empty state content', () => {
        const emptyContentEl = compiled.querySelector('.progress-content-empty');
        const toolbarEl = compiled.querySelector('.progress-toolbar');

        expect(emptyContentEl).not.toBeNull();
        expect(toolbarEl).toBeNull();
      });
    });
  });
});

@Component({
  selector: 'app-progress-breadcrumbs',
  template: '<div></div>'
})
class FakeProgressBreadcrumbsComponent {
  @Input() breadcrumbs$!: Observable<string[]>;
}

@Component({
  selector: 'app-progress-status-card',
  template: '<div></div>'
})
class FakeProgressStatusCardComponent {
  @Input() systemStatus$!: Observable<TestrunStatus>;
}

@Component({
  selector: 'app-progress-table',
  template: '<div></div>'
})
class FakeProgressTableComponent {
  @Input() dataSource$!: Observable<IResult[] | undefined>;
}
