"use server";

// TODO (PC-74): Implement TOTP verification
// - Read mfa_nonce cookie, validate HMAC signature
// - Look up PendingMfaChallenge, verify not expired
// - Call verifyTotp() from lib/totp.ts
// - Delete challenge, clear cookie
// - Mint session via encode() + cookies().set() with correct salt
// - Redirect to /tenants

export async function verifyMfaAction(
  _input: unknown,
): Promise<{ error: string } | undefined> {
  return { error: "TOTP verification not yet implemented — see PC-74" };
}
