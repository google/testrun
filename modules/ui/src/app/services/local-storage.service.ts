import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  private readonly GA_CONSENT_KEY = 'GA_CONSENT';

  getGAConsent() {
    const consent = this.getItem(this.GA_CONSENT_KEY);
    console.log(window.localStorage.getItem(this.GA_CONSENT_KEY));
    return consent !== null ? consent === 'true' : true;
  }

  setGAConsent(value: boolean) {
    this.setItem(this.GA_CONSENT_KEY, value);
  }

  private getItem(key: string) {
    return localStorage.getItem(key);
  }

  private setItem(key: string, value: unknown) {
    localStorage.setItem(key, String(value));
  }
}
