import { AfterViewInit, Directive, Renderer2, ElementRef } from '@angular/core';

@Directive({
  selector: '[appDynamicTop]',
  standalone: true,
})
export class DynamicTopDirective implements AfterViewInit {
  constructor(
    private renderer: Renderer2,
    private element: ElementRef
  ) {
    const resizeObserver = new ResizeObserver(() => {
      this.setTop();
    });

    resizeObserver.observe(element.nativeElement);
  }

  ngAfterViewInit() {
    this.setTop();
  }

  private setTop() {
    const firstCallout =
      this.element.nativeElement.parentNode?.firstElementChild;
    if (firstCallout === this.element.nativeElement) {
      const next = this.element.nativeElement.nextElementSibling;
      let el = next.nodeName === 'APP-CALLOUT' ? next : null;
      while (el) {
        this.renderer.setStyle(
          el,
          'top',
          `${firstCallout.offsetHeight - 36}px`
        );
        el =
          el.nextElementSibling.nodeName === 'APP-CALLOUT'
            ? el.nextElementSibling
            : null;
      }
    }
  }
}
