import {inject} from '@angular/core';
import {TestRunService} from '../test-run.service';
import {Router} from '@angular/router';
import {Device} from '../model/device';
import {map} from 'rxjs';

export const allowToRunTestGuard = () => {
  const testRunService = inject(TestRunService);
  const router = inject(Router);

  return testRunService.getDevices().pipe(
    map((devices: Device[] | null) => {
      return !(devices?.length)
        ? router.parseUrl('/device-repository')
        : !!devices;
    }),
  );
};
