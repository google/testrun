/**
 * Copyright 2026 Google LLC
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

import { ReportsPaginatorIntl } from './reports-paginator-intl';

describe('ReportsPaginatorIntl', () => {
  let intl: ReportsPaginatorIntl;

  beforeEach(() => {
    intl = new ReportsPaginatorIntl();
  });

  it('should be created with expected labels', () => {
    expect(intl).toBeTruthy();
    expect(intl.itemsPerPageLabel).toBe('Items per page:');
    expect(intl.nextPageLabel).toBe('Next page');
    expect(intl.previousPageLabel).toBe('Previous page');
    expect(intl.firstPageLabel).toBe('First page');
    expect(intl.lastPageLabel).toBe('Last page');
  });

  describe('getRangeLabel', () => {
    it('should return "Results 0 of 0" when length is 0', () => {
      expect(intl.getRangeLabel(0, 10, 0)).toBe('Results 0 of 0');
    });

    it('should return "Results 0 of 0" when pageSize is 0', () => {
      expect(intl.getRangeLabel(0, 0, 100)).toBe('Results 0 of 0');
    });

    it('should return "Results 1-50 of 485" for page 0 with pageSize 50 and length 485', () => {
      expect(intl.getRangeLabel(0, 50, 485)).toBe('Results 1-50 of 485');
    });

    it('should return "Results 11-20 of 25" for page 1 with pageSize 10 and length 25', () => {
      expect(intl.getRangeLabel(1, 10, 25)).toBe('Results 11-20 of 25');
    });

    it('should return "Results 21-25 of 25" for last page with pageSize 10 and length 25', () => {
      expect(intl.getRangeLabel(2, 10, 25)).toBe('Results 21-25 of 25');
    });

    it('should return "Results 1-1 of 1" when length is 1', () => {
      expect(intl.getRangeLabel(0, 10, 1)).toBe('Results 1-1 of 1');
    });
  });
});
