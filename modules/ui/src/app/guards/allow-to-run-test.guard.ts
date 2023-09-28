/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
