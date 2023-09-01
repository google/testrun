export interface Device {
  manufacturer: string;
  model: string;
  mac_addr: string;
  test_modules?: TestModules
}

/**
 * Test Modules interface used to send on backend
 */
export interface TestModules {
  [key: string]: {
    enabled: boolean;
  }
}

/**
 * Test Module interface used on ui
 */
export interface TestModule {
  displayName: string,
  name: string,
  enabled: boolean,
}
