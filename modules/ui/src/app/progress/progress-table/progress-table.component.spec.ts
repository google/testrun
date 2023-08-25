import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ProgressTableComponent} from './progress-table.component';
import {IResult, StatusOfTestResult} from '../../model/testrun-status';
import {MatTableModule} from '@angular/material/table';
import {of} from 'rxjs';
import {TEST_DATA} from '../../mocks/progress.mock';
import {TestRunService} from '../../test-run.service';

describe('ProgressTableComponent', () => {
  let component: ProgressTableComponent;
  let fixture: ComponentFixture<ProgressTableComponent>;
  let testRunServiceMock: jasmine.SpyObj<TestRunService>;

  testRunServiceMock = jasmine.createSpyObj(['getResultClass']);

  describe('Class tests', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [ProgressTableComponent],
        providers: [{provide: TestRunService, useValue: testRunServiceMock}],
      });
      fixture = TestBed.createComponent(ProgressTableComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('#getResultClass should call the service method getResultClass"', () => {
      const expectedResult = {
        green: false, red: true, grey: false
      };

      testRunServiceMock.getResultClass.and.returnValue(expectedResult);

      const result = component.getResultClass(StatusOfTestResult.NonCompliant);

      expect(testRunServiceMock.getResultClass).toHaveBeenCalledWith(StatusOfTestResult.NonCompliant);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('DOM tests', () => {
    let compiled: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        declarations: [ProgressTableComponent],
        providers: [{provide: TestRunService, useValue: testRunServiceMock}],
        imports: [MatTableModule]
      }).compileComponents();

      fixture = TestBed.createComponent(ProgressTableComponent);
      component = fixture.componentInstance;
      compiled = fixture.nativeElement as HTMLElement;
    });

    describe('with not dataSource$ data', () => {
      beforeEach(() => {
        component.dataSource$ = of(undefined);
        fixture.detectChanges();
      });

      it('should be unavailable', () => {
        const table = compiled.querySelector('.progress-table');

        expect(table).toBeNull();
      });
    });

    describe('with dataSource$ data', () => {
      beforeEach(() => {
        component.dataSource$ = of(TEST_DATA.results);
        fixture.detectChanges();
      });

      it('should be available', () => {
        const table = compiled.querySelector('.progress-table');

        expect(table).not.toBeNull();
      });

      it('should have table rows as provided from data', () => {
        const expectedRowsLength = (TEST_DATA.results as IResult[]).length;
        const tableRows = compiled.querySelectorAll('.table-row');

        expect(tableRows.length).toBe(expectedRowsLength);
      });
    });
  });
});
