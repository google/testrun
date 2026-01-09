import { Component, inject } from '@angular/core';
import { FocusManagerService } from '../../services/focus-manager.service';
import { BypassComponent } from '../bypass/bypass.component';

@Component({
  selector: 'app-bypass-content',
  imports: [BypassComponent],
  templateUrl: './bypass-content.component.html',
  styleUrls: ['./bypass-content.component.scss'],
})
export class BypassContentComponent {
  private readonly focusManagerService = inject(FocusManagerService);
  skipToMainContent() {
    this.focusManagerService.focusFirstElementInContainer();
  }
}
