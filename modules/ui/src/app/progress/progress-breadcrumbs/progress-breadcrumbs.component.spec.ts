import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ProgressBreadcrumbsComponent} from './progress-breadcrumbs.component';
import {MatIconModule} from '@angular/material/icon';

describe('ProgressBreadcrumbsComponent', () => {
  let component: ProgressBreadcrumbsComponent;
  let fixture: ComponentFixture<ProgressBreadcrumbsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProgressBreadcrumbsComponent],
      imports: [MatIconModule]
    });
    fixture = TestBed.createComponent(ProgressBreadcrumbsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
