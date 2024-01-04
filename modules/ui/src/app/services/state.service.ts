import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  focusFirstElementInMain() {
    const firstControl: HTMLElement | null = window.document.querySelector(
      '#main button:not([disabled="true"]), ' +
        '#main a:not([disabled="true"]), #main table'
    );

    if (firstControl) {
      firstControl.focus();
    }
  }
}
