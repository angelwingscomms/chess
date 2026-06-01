import { Google, generateState, generateCodeVerifier } from 'arctic';
import { GOOGLE_ID, GOOGLE_SECRET } from '$env/static/private';

const redirect_uri = 'http://localhost:5173/login/google/callback';

export const google = new Google(GOOGLE_ID, GOOGLE_SECRET, redirect_uri);
export { generateState, generateCodeVerifier };
