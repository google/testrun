import { TestBed } from '@angular/core/testing';

import { LocalStorageService } from './local-storage.service';

const mock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: string) => {
      store[key] = value + '';
    },
    clear: () => {
      store = {};
    },
  };
})();
const localMock = { ...mock };

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let getItemSpy: jasmine.Spy;
  let setItemSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalStorageService],
    });
    service = TestBed.inject(LocalStorageService);
    // @ts-expect-error getItem is defined
    getItemSpy = spyOn(service, 'getItem').and.callThrough();
    // @ts-expect-error getItem is defined
    setItemSpy = spyOn(service, 'setItem').and.callThrough();

    window.localStorage.clear();

    Object.defineProperty(window, 'localStorage', {
      value: localMock,
      writable: true,
    });
  });

  afterEach(() => {
    mock.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getGAConsent', () => {
    const GA_CONSENT_KEY = 'GA_CONSENT';

    it('should return true when GA_CONSENT is not set in localStorage', () => {
      expect(service.getGAConsent()).toBeTrue();
      expect(getItemSpy).toHaveBeenCalledWith(GA_CONSENT_KEY);
    });

    it('should return true when GA_CONSENT is set to "true" in localStorage', () => {
      mock.setItem(GA_CONSENT_KEY, 'true');
      expect(service.getGAConsent()).toBeTrue();
      expect(getItemSpy).toHaveBeenCalledWith(GA_CONSENT_KEY);
    });

    it('should return false when GA_CONSENT is set to "false" in localStorage', () => {
      mock.setItem(GA_CONSENT_KEY, 'false');
      expect(service.getGAConsent()).toBeFalse();
      expect(getItemSpy).toHaveBeenCalledWith(GA_CONSENT_KEY);
    });
  });

  describe('setGAConsent', () => {
    const GA_CONSENT_KEY = 'GA_CONSENT';

    it('should set "true" in localStorage when called with true', () => {
      service.setGAConsent(true);
      expect(setItemSpy).toHaveBeenCalledWith(GA_CONSENT_KEY, true);
      expect(mock.getItem(GA_CONSENT_KEY)).toBe('true');
    });

    it('should set "false" in localStorage when called with false', () => {
      service.setGAConsent(false);
      expect(setItemSpy).toHaveBeenCalledWith(GA_CONSENT_KEY, false);
      expect(mock.getItem(GA_CONSENT_KEY)).toBe('false');
    });
  });
});
