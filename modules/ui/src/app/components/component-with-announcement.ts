import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FocusManagerService } from '../services/focus-manager.service';
import { timer } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T;

export function ComponentWithAnnouncement<T extends Constructor>(base: T) {
  return class extends base {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      const [dialogRef, title, liveAnnouncer, focusService] = args;
      super(...args);

      this.focusService = focusService;

      dialogRef.afterOpened().subscribe(() => {
        (liveAnnouncer as LiveAnnouncer).clear();
        (liveAnnouncer as LiveAnnouncer)
          .announce(title, 'assertive')
          .then(() => {
            timer(200).subscribe(() => {
              this.focusService.focusFirstElementInContainer();
            });
          });
      });

      dialogRef.beforeClosed().subscribe(() => {
        (liveAnnouncer as LiveAnnouncer).clear();
      });
    }

    focusService!: FocusManagerService;
  };
}
