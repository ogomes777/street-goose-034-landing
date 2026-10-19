import { beforeEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ signInWithOtp: vi.fn(), verifyOtp: vi.fn(), signUp: vi.fn(), resend: vi.fn(), signInWithPassword: vi.fn(), getSession: vi.fn(), updateUser: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { auth }, isSupabaseConfigured: true }));
// The leak lookup is covered in password-check.test.ts; here it never reaches the network.
const passwords = vi.hoisted(() => ({ newPasswordProblem: vi.fn(async (_password: string): Promise<string | null> => null) }));
vi.mock('../lib/password-check', () => passwords);
import { AuthService } from './AuthService';
beforeEach(() => { vi.resetAllMocks(); passwords.newPasswordProblem.mockResolvedValue(null); vi.stubGlobal('window', { location: { origin: 'https://www.streetgoose034.com.br' } }); });
describe('email authentication', () => {
  it('does not create accounts when requesting a login code and passes CAPTCHA', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: null });
    expect(await AuthService.sendEmailCode('user@example.com', 'captcha')).toEqual({ ok: true });
    expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'user@example.com', options: { shouldCreateUser: false, emailRedirectTo: 'https://www.streetgoose034.com.br/', captchaToken: 'captcha' } });
  });
  it('explains how to register when OTP cannot create an account', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: { code: 'signup_disabled', message: 'Signups not allowed for otp' } });
    const result = await AuthService.sendEmailCode('new@example.com', 'captcha');
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ message: expect.stringContaining('Criar conta') });
  });
  it('asks for a fresh challenge when CAPTCHA fails', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: { code: 'captcha_failed', message: 'captcha failed' } });
    expect(await AuthService.sendEmailCode('user@example.com', 'expired')).toMatchObject({ ok: false, message: expect.stringContaining('Confirme novamente') });
  });
  it('does not report login success without a session', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: null });
    expect((await AuthService.verifyEmailCode('user@example.com', '123456')).ok).toBe(false);
  });
  it('verifies the code using email authentication', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null });
    expect((await AuthService.verifyEmailCode('user@example.com', '123456')).ok).toBe(true);
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'user@example.com', token: '123456', type: 'email' });
  });
  it('reports pending confirmation for a signup without a session', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(await AuthService.signUpWithEmail('User', 'user@example.com', 'password')).toEqual({ ok: true, confirmationRequired: true });
  });
});

it('resends signup confirmation with the security token', async () => {
  auth.resend.mockResolvedValue({ error: null });
  expect(await AuthService.resendConfirmation('user@example.com', 'challenge')).toEqual({ ok: true });
  expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'user@example.com', options: { emailRedirectTo: 'https://www.streetgoose034.com.br/', captchaToken: 'challenge' } });
});
it('explains pending email confirmation without claiming login success', async () => {
  auth.signInWithPassword.mockResolvedValue({ error: { code: 'email_not_confirmed' } });
  expect(await AuthService.signInWithEmail('user@example.com', 'password')).toMatchObject({ ok: false, message: expect.stringContaining('Confirme seu e-mail') });
});

it('does not change passwords without an authenticated session', async () => {
 auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
 expect((await AuthService.updatePassword('new-password')).ok).toBe(false);
 expect(auth.updateUser).not.toHaveBeenCalled();
});
it('updates a password only using the authenticated client', async () => {
 auth.getSession.mockResolvedValue({ data: { session: {} }, error: null });
 auth.updateUser.mockResolvedValue({ error: null });
 expect(await AuthService.updatePassword('new-password')).toEqual({ ok: true });
 expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' });
});

describe('new passwords', () => {
  it('refuses a weak password before calling Supabase', async () => {
    passwords.newPasswordProblem.mockResolvedValue('Use letras e números na senha.');
    const result = await AuthService.signUpWithEmail('User', 'user@example.com', 'abcdefgh');
    expect(result).toMatchObject({ ok: false, reason: 'weak_password' });
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it('refuses a weak new password before updating the account', async () => {
    passwords.newPasswordProblem.mockResolvedValue('Use letras e números na senha.');
    expect(await AuthService.updatePassword('abcdefgh')).toMatchObject({ ok: false, reason: 'weak_password' });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});
