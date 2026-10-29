import bcrypt from 'bcrypt';

export async function hash(
  plaintext: string,
  salt: number = Number(process.env.SALT),
): Promise<string> {
  return await bcrypt.hash(plaintext, salt);
}

export async function compare(
  plaintext: string,
  hashData: string,
): Promise<boolean> {
  return await bcrypt.compare(plaintext, hashData);
}
