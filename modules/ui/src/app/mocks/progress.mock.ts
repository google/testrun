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
import {IResult, StatusOfTestrun, TestrunStatus, TestsData} from '../model/testrun-status';

const TEST_DATA_RESULT: IResult[] = [
  {
    name: 'dns.network.hostname_resolution',
    description: 'The device should resolve hostnames',
    result: 'Compliant'
  },
  {
    name: 'dns.network.from_dhcp',
    description: 'The device should use the DNS server provided by the DHCP server',
    result: 'Non-Compliant'
  }
]

export const TEST_DATA: TestsData = {
  total: 26,
  results: TEST_DATA_RESULT
}

const PROGRESS_DATA_RESPONSE = ((status: string, finished: string | null, tests: TestsData | IResult[], report?: string) => {
  return {
    status,
    device: {
      manufacturer: 'Delta',
      model: '03-DIN-CPU',
      mac_addr: '01:02:03:04:05:06',
      firmware: '1.2.2'
    },
    started: '2023-06-22T09:20:00.123Z',
    finished,
    tests,
    report
  }
});

export const MOCK_PROGRESS_DATA_IN_PROGRESS: TestrunStatus = PROGRESS_DATA_RESPONSE(StatusOfTestrun.InProgress, null, TEST_DATA);
export const MOCK_PROGRESS_DATA_COMPLIANT: TestrunStatus = PROGRESS_DATA_RESPONSE(
  StatusOfTestrun.Compliant, '2023-06-22T09:20:00.123Z', TEST_DATA_RESULT, 'https://api.testrun.io/report.pdf'
);

export const MOCK_PROGRESS_DATA_CANCELLED: TestrunStatus = PROGRESS_DATA_RESPONSE(StatusOfTestrun.Cancelled, null, TEST_DATA);

export const MOCK_PROGRESS_DATA_NOT_STARTED: TestrunStatus = {
  ...MOCK_PROGRESS_DATA_IN_PROGRESS,
  status: StatusOfTestrun.Idle,
  started: null
};

export const MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE: TestrunStatus = {
  ...MOCK_PROGRESS_DATA_IN_PROGRESS,
  status: StatusOfTestrun.WaitingForDevice,
  started: null
};
