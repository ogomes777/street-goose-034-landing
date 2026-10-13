import { beforeEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ signInWithOtp: vi.fn(), verifyOtp: vi.fn(), signUp: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { auth }, isSupabaseConfigured: true }));
import { AuthService } from './AuthService';
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('window', { location: { origin: 'https://www.streetgoose034.com.br' } }); });
describe('email authentication', () => {
  it('does not create accounts when requesting a login code and passes CAPTCHA', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: null });
    expect(await AuthService.sendEmailCode('user@example.com', 'captcha')).toEqual({ ok: true });
    expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'user@example.com', options: { shouldCreateUser: false, emailRedirectTo: 'https://www.streetgoose034.com.br/', captchaToken: 'captcha' } });
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
