import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HelpTipComponent } from './help-tip.component';

describe('HelpTipComponent', () => {
  let component: HelpTipComponent;
  let fixture: ComponentFixture<HelpTipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpTipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpTipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
