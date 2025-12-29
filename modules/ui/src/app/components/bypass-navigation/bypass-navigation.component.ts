import { Component, inject } from '@angular/core';
import { FocusManagerService } from '../../services/focus-manager.service';
import { BypassComponent } from '../bypass/bypass.component';

@Component({
  selector: 'app-bypass-navigation',
  imports: [BypassComponent],
  templateUrl: './bypass-navigation.component.html',
  styleUrls: ['../bypass-content/bypass-content.component.scss'],
})
export class BypassNavigationComponent {
  private readonly focusManagerService = inject(FocusManagerService);
  skipToNavigation() {
    this.focusManagerService.focusFirstElementInContainer(
      window.document.querySelector('.nav-items-container')
    );
  }
}
