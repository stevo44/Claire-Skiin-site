// /**
//  * Mock Auth Layer
//  * ---------------
//  * Intercepts login/register calls before they reach the real API.
//  * Swap DEV_MODE to false when the backend is ready — zero other changes needed.
//  *
//  * Mock admin credentials:  admin@claireskiin.cm / admin123
//  * Mock user credentials:   any other email / any password (min 8 chars)
//  */

// // Set to true ONLY when backend/DB is unavailable for local UI-only development.
// // Keep false in production and when backend is running.
// const DEV_MODE = false;

// const MOCK_DELAY = 900; // ms — simulates network latency

// const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// const MOCK_ADMIN = {
//   id: 1,
//   email: 'admin@claireskiin.cm',
//   full_name: 'Claire Admin',
//   role: 'admin',
//   avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCju31J9E1L_iw1uRMh5RLu-g9UeonjCR__hge7so9CMkbxV0UVwzAZg2espXk-Vt-bVQ7vTgqhb9bS77d0k6ZneBRBwRKV7BbK590jyrwBRUqlvcophAGjw2W_MBCE3a264iTwK-WJMBspwbRNSd0lM1pkGlaOGGau9PMZmXkWB6ABBpMbRybUgsfvUsSByfPnhqOse15U91-9gdCeE2nmDoeamJgrEuLsLnKWAUiJP0z5navocuv00rzOrnOoWd_qQS09dpVpJaY',
// };

// export const mockLogin = async (credentials: { email: string; password: string }) => {
//   await delay(MOCK_DELAY);

//   if (!credentials.email || !credentials.password) {
//     throw { message: 'Email and password are required.' };
//   }

//   if (credentials.password.length < 6) {
//     throw { message: 'Invalid credentials. Please try again.' };
//   }

//   const isAdmin = credentials.email === MOCK_ADMIN.email;
//   const user = isAdmin
//     ? MOCK_ADMIN
//     : {
//         id: Math.floor(Math.random() * 9000) + 1000,
//         email: credentials.email,
//         full_name: credentials.email.split('@')[0],
//         role: 'user',
//         avatar_url: null,
//       };

//   const token = `mock-token-${user.role}-${Date.now()}`;
//   localStorage.setItem('token', token);
//   localStorage.setItem('user', JSON.stringify(user));

//   return { token, user };
// };

// export const mockRegister = async (userData: {
//   email: string;
//   password: string;
//   full_name: string;
// }) => {
//   await delay(MOCK_DELAY);

//   if (!userData.email || !userData.password || !userData.full_name) {
//     throw { message: 'All fields are required.' };
//   }

//   // Simulate duplicate email check
//   if (userData.email === MOCK_ADMIN.email) {
//     throw { message: 'An account with this email already exists.' };
//   }

//   return { success: true, message: 'Account created successfully.' };
// };

// export const isMockMode = () => DEV_MODE;


/**
 * Mock Auth Layer
 * ---------------
 * DEV_MODE = false  → all calls go to the real backend  ← PRODUCTION
 * DEV_MODE = true   → intercepts calls locally (no backend needed)
 *
 * Mock admin:  admin@claireskiin.cm / admin123
 * Mock user:   any other email / any password (6+ chars)
 */
const DEV_MODE = false; // ← set to true for local dev without a backend

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const MOCK_ADMIN = {
  id: 1, email: 'admin@claireskiin.cm',
  full_name: 'Claire Admin', role: 'admin', avatar_url: '',
};

export const mockLogin = async (c: { email: string; password: string }) => {
  await delay(800);
  if (!c.email || !c.password) throw { message: 'Email and password are required.' };
  if (c.password.length < 6)   throw { message: 'Invalid credentials. Please try again.' };
  const isAdmin = c.email === MOCK_ADMIN.email;
  const user = isAdmin
    ? MOCK_ADMIN
    : { id: Math.floor(Math.random() * 9000) + 1000, email: c.email,
        full_name: c.email.split('@')[0], role: 'user', avatar_url: null };
  const token = `mock-token-${user.role}-${Date.now()}`;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  return { token, user };
};

export const mockRegister = async (d: { email: string; password: string; full_name: string }) => {
  await delay(800);
  if (!d.email || !d.password || !d.full_name) throw { message: 'All fields are required.' };
  if (d.email === MOCK_ADMIN.email) throw { message: 'An account with this email already exists.' };
  return { success: true, message: 'Account created successfully.' };
};

export const isMockMode = () => DEV_MODE;
