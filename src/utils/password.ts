import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  if (hash.startsWith('$2a$')) {
    return `$2y${hash.substring(3)}`;
  }

  return hash;
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  const normalizedHash = hashedPassword.startsWith('$2y$')
    ? `$2a${hashedPassword.substring(3)}`
    : hashedPassword;

  return bcrypt.compare(password, normalizedHash);
};

