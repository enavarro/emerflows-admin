import { SignJWT } from 'jose';

// Claim shape MUST stay in sync with terenure-proyect/frontend/src/lib/demo-jwt.ts.
// The middleware over there verifies what we sign here.
export interface DemoJwtClaims {
  jti: string;
  source: 'admin_link' | 'linkedin_oauth';
  generatedBy?: string;
  maxSubmissions: number;
  maxConversationSec: number;
  label?: string;
}

function secret(): Uint8Array {
  const s = process.env.DEMO_JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('DEMO_JWT_SECRET missing or too short (<32)');
  }
  return new TextEncoder().encode(s);
}

export async function signDemoJwt(claims: DemoJwtClaims, ttlSec = 24 * 60 * 60): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(claims.jti)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSec)
    .sign(secret());
}
