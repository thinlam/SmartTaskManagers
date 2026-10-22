import bcrypt from 'bcryptjs';

export const PASSWORD_RULE_MESSAGE = 'Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số.';

export function passwordOk(password: unknown): password is string {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, 10);
export const checkPassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);
