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
    const firstControl: HTMLElement | undefined | null =
      container?.querySelector(
        'button:not([disabled="true"]), a:not([disabled="true"]), table'
      );

    if (firstControl) {
      firstControl.focus();
    }
  }
}
