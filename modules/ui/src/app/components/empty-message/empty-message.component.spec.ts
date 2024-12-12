import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyMessageComponent } from './empty-message.component';

describe('EmptyMessageComponent', () => {
  let compiled: HTMLElement;
  let component: EmptyMessageComponent;
  let fixture: ComponentFixture<EmptyMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyMessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyMessageComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('image', 'image.csv');
    fixture.componentRef.setInput('header', 'header text');
    fixture.componentRef.setInput('message', 'message text');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have image', () => {
    const image = compiled.querySelector('img') as HTMLImageElement;

    expect(image?.src).toContain('image.csv');
  });

  it('should have header', () => {
    const text = compiled.querySelector('.empty-message-header');

    expect(text?.textContent?.trim()).toEqual('header text');
  });

  it('should have message', () => {
    const text = compiled.querySelector('.empty-message-main');

    expect(text?.textContent?.trim()).toEqual('message text');
  });
});
