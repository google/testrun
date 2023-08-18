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

const PROGRESS_DATA_RESPONSE = ((status: string, finished: string | null, tests: TestsData | IResult[]) => {
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
    tests
  }
});

export const MOCK_PROGRESS_DATA_IN_PROGRESS: TestrunStatus = PROGRESS_DATA_RESPONSE(StatusOfTestrun.InProgress, null, TEST_DATA);
export const MOCK_PROGRESS_DATA_COMPLIANT: TestrunStatus = PROGRESS_DATA_RESPONSE(StatusOfTestrun.Compliant, '2023-06-22T09:20:00.123Z', TEST_DATA_RESULT);

export const MOCK_PROGRESS_DATA_NOT_STARTED: TestrunStatus = {...MOCK_PROGRESS_DATA_IN_PROGRESS, status: StatusOfTestrun.Idle, started: null};
