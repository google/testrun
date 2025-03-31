import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { HelpTipComponent } from './help-tip.component';
import { HelpTips } from '../../model/tip-config';
import SpyObj = jasmine.SpyObj;
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FocusManagerService } from '../../services/focus-manager.service';

describe('HelpTipComponent', () => {
  let component: HelpTipComponent;
  let fixture: ComponentFixture<HelpTipComponent>;
  let compiled: HTMLElement;

  const mockLiveAnnouncer: SpyObj<LiveAnnouncer> = jasmine.createSpyObj([
    'announce',
    'clear',
  ]);

  const mockFocusManagerService: SpyObj<FocusManagerService> =
    jasmine.createSpyObj('mockFocusManagerService', [
      'focusFirstElementInContainer',
    ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpTipComponent],
      providers: [
        { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
        { provide: FocusManagerService, useValue: mockFocusManagerService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpTipComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', HelpTips.step1);
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set focus to first focusable elem', fakeAsync(() => {
    component.ngOnInit();
    tick(200);

    expect(
      mockFocusManagerService.focusFirstElementInContainer
    ).toHaveBeenCalled();
  }));

  it('should have provided data', () => {
    const tipTitle = compiled.querySelector('.tip-container .title');
    const tipContent = compiled.querySelector('.tip-container .tip-content');

    expect(tipTitle?.innerHTML.trim()).toContain(HelpTips.step1.title);
    expect(tipContent?.innerHTML.trim()).toContain(HelpTips.step1.content);
  });

  it('should have class provided from arrowPosition', () => {
    const tipContainerEl = compiled.querySelector('.tip-container');

    expect(tipContainerEl?.classList).toContain('top');
  });

  describe('#updateTipPosition', () => {
    beforeEach(() => {
      const mockTarget = document.createElement('div');
      spyOn(mockTarget, 'getBoundingClientRect').and.returnValue({
        top: 100,
        left: 100,
        height: 100,
        width: 100,
        bottom: 100,
        right: 100,
      } as DOMRect);
      fixture.componentRef.setInput('target', mockTarget);
      fixture.detectChanges();
    });

    it('should update tip position when data.position as "bottom"', () => {
      component.ngOnInit();

      expect(component.tipPosition.left).toBe(22);
      expect(component.tipPosition.top).toBe(114);
    });

    it('should update tip position when data.position as "right"', fakeAsync(() => {
      fixture.componentRef.setInput('data', HelpTips.step2);
      tick();

      component.ngOnInit();

      expect(component.tipPosition.left).toBe(100);
      expect(component.tipPosition.top).toBe(68);
    }));

    it('should update tip position when data.position as "left"', fakeAsync(() => {
      const mockData = { ...HelpTips.step2, position: 'left' };
      fixture.componentRef.setInput('data', mockData);
      tick();

      component.ngOnInit();

      expect(component.tipPosition.left).toBe(-170);
      expect(component.tipPosition.top).toBe(150);
    }));

    it('should update tip position when data.position as "top"', fakeAsync(() => {
      const mockData = { ...HelpTips.step2, position: 'top' };
      fixture.componentRef.setInput('data', mockData);
      tick();

      component.ngOnInit();

      expect(component.tipPosition.left).toBe(22);
      expect(component.tipPosition.top).toBe(86);
    }));

    it('should call updateTipPosition on window resize', () => {
      spyOn(component, 'updateTipPosition');

      window.dispatchEvent(new Event('resize'));

      expect(component.updateTipPosition).toHaveBeenCalled();
    });
  });
});
