const FILE_SIZE = 4;
export const FILE_NAME_LENGTH = 24;
const FILE_NAME_REGEXP = new RegExp('^[\\w .-]{1,24}$', 'u');
const FILE_EXT_REGEXP = new RegExp('(\\.cert|\\.crt|\\.pem|\\.cer)$', 'i');

export const getValidationErrors = (file: File): string[] => {
  const errors = [];
  errors.push(validateFileName(file.name));
  errors.push(validateExtension(file.name));
  errors.push(validateFileNameLength(file.name));
  errors.push(validateSize(file.size));
  return errors.filter(error => error !== null);
};
const validateFileName = (name: string): string | null => {
  const result = FILE_NAME_REGEXP.test(name);
  return !result
    ? 'The file name should be alphanumeric, symbols  -_. are allowed.'
    : null;
};

const validateExtension = (name: string): string | null => {
  const result = FILE_EXT_REGEXP.test(name);
  return !result ? 'File extension must be .cert, .crt, .pem, .cer.' : null;
};

const validateFileNameLength = (name: string): string | null => {
  return name.length > FILE_NAME_LENGTH
    ? `Max name length is ${FILE_NAME_LENGTH} characters.`
    : null;
};

const validateSize = (size: number): string | null => {
  const result = size > FILE_SIZE * 1000;
  return result ? `File size should be a max of ${FILE_SIZE}KB` : null;
};
