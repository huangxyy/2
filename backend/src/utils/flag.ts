import * as bcrypt from 'bcrypt';

export async function hashFlag(flag: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(flag, salt);
}

export async function verifyFlag(flag: string, hash: string): Promise<boolean> {
  return bcrypt.compare(flag, hash);
}