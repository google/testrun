export interface Validation {
  required: boolean | undefined;
  max?: string;
}

export enum FormControlType {
  SELECT = 'select',
  TEXTAREA = 'text-long',
  EMAIL_MULTIPLE = 'email-multiple',
  SELECT_MULTIPLE = 'select-multiple',
  TEXT = 'text',
}

export interface QuestionFormat {
  question: string;
  type: FormControlType;
  description?: string;
  options?: OptionType[];
  default?: string;
  validation?: Validation;
}

export type OptionType = string | object;
