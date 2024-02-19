import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpinnerComponent } from './spinner.component';
import { LoaderService } from '../../services/loader.service';
import { of } from 'rxjs';
<<<<<<< HEAD
=======
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
>>>>>>> dev

describe('SpinnerComponent', () => {
  let component: SpinnerComponent;
  let fixture: ComponentFixture<SpinnerComponent>;
  const loaderServiceMock: jasmine.SpyObj<LoaderService> = jasmine.createSpyObj(
    ['getLoading']
  );

  beforeEach(() => {
    TestBed.configureTestingModule({
<<<<<<< HEAD
      imports: [SpinnerComponent],
=======
      imports: [SpinnerComponent, BrowserAnimationsModule],
>>>>>>> dev
      providers: [{ provide: LoaderService, useValue: loaderServiceMock }],
    });
    fixture = TestBed.createComponent(SpinnerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should not show spinner if loading is false', () => {
    loaderServiceMock.getLoading.and.returnValue(of(false));
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('.spinner-container');

    expect(spinner).toBeNull();
  });

  it('should not show spinner if loading is true', () => {
    loaderServiceMock.getLoading.and.returnValue(of(true));
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('.spinner-container');

    expect(spinner).toBeTruthy();
  });
});
