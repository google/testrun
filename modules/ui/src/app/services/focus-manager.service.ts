import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FocusManagerService {
  focusFirstElementInContainer(
    container: Document | Element | null = window.document.querySelector(
      '#main'
    )
  ) {
    const dialogOpened = window.document.querySelector('.mdc-dialog--open');
    const parentElem = dialogOpened ? dialogOpened : container;
    const firstInteractiveElem = this.findFirstInteractiveElem(parentElem);
    if (firstInteractiveElem) {
      firstInteractiveElem.focus();
    }
  }

  focusTitle() {
    const title = window.document.querySelector('.title') as HTMLHeadingElement;
    if (title) {
      title.focus();
    } else {
      this.focusFirstElementInContainer();
    }
  }

  private findFirstInteractiveElem(
    parentEl: Document | Element | null
  ): HTMLElement | undefined | null {
    return parentEl?.querySelector(
      'button:not([disabled="true"]):not([tabindex="-1"]), a:not([disabled="true"]), input:not([disabled="true"]), table, [tabindex="0"]'
    );
  }
}
