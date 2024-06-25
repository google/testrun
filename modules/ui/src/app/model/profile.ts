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
interface ProfileResponse {
  question: string;
  type: string;
  options: string[];
}

interface ProfileSection {
  name: string;
  responses: ProfileResponse[];
}

export interface Profile {
  name: string;
  sections: ProfileSection[];
}

export interface ProfileRequestBody {
  name: string;
  questions: Question[];
}

export interface Question {
  question?: string;
  answer?: string | number[];
}

export enum FormControlType {
  SELECT = 'select',
  TEXTAREA = 'text-long',
  EMAIL_MULTIPLE = 'email-multiple',
  SELECT_MULTIPLE = 'select-multiple',
  TEXT = 'text',
}

export interface Validation {
  required?: boolean;
  max?: string;
}

export interface ProfileFormat {
  question: string;
  type: FormControlType;
  description?: string;
  options?: string[];
  default?: string;
  validation?: Validation;
}
