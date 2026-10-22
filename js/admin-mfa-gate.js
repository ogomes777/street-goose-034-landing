/* SG034 — second factor for privileged store management.
   The browser gate is only UX; SQL enforces AAL2 for admin RPCs and RLS. */
import { supabase } from "../src/lib/supabase.ts";
import "./admin-mfa-gate.css";

export async function mountAdminMfaGate(container, onUnlock) {
  if (!supabase) throw new Error("Supabase unavailable");

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error) throw assurance.error;
  // Ask for the temporary code on every fresh panel opening, even if the
  // signed-in user still has an AAL2 Supabase session.
  let disposed = false;
  let factorId = "";
  let busy = false;
  let enrolledImage = "";
  let passwordConfirmed = false;
  let captcha = null;
  let captchaEnabled = false;
  let captchaReady = false;
  let captchaFailed = false;
  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error) throw factors.error;
  const verified = (factors.data?.totp || []).find(f => f.status === "verified");
  if (verified) factorId = verified.id;

  container.innerHTML =
    '<section class="sg-admin-lock" aria-labelledby="sg-admin-lock-title">' +
      '<div class="sg-admin-lock__orbit" aria-hidden="true"><span>7</span><span>7</span><span>7</span></div>' +
      '<p class="sg-admin-lock__eyebrow">STREET GOOSE 034 / ACESSO PRIVADO</p>' +
      '<h2 id="sg-admin-lock-title">Confirme sua identidade.</h2>' +
      '<p class="sg-admin-lock__desc">Uma camada extra de proteção para a operação da loja. Seu acesso é individual.</p>' +
      '<p class="sg-admin-lock__instruction" data-mfa-instruction></p>' +
      '<form data-admin-password-form novalidate>' +
        '<label for="sg-admin-password">Senha da sua conta</label>' +
        '<input id="sg-admin-password" name="adminPassword" type="password" autocomplete="current-password" maxlength="256" required placeholder="Confirme sua senha" />' +
        '<div class="sg-admin-lock__captcha" data-admin-password-captcha></div>' +
        '<button class="sg-admin-lock__button" type="submit">Confirmar identidade <span aria-hidden="true">→</span></button>' +
        '<p class="sg-admin-lock__help">Use sua senha individual de acesso, não o código do autenticador. A equipe e o proprietário usam contas diferentes.</p>' +
      '</form>' +
      '<div class="sg-admin-lock__qr" data-mfa-qr hidden><img data-mfa-qr-image alt="QR code de configuração do autenticador" /></div>' +
      '<button type="button" data-mfa-enroll class="sg-admin-lock__button" hidden>Ativar proteção no celular <span aria-hidden="true">↗</span></button>' +
      '<form data-mfa-form hidden novalidate>' +
        '<label for="sg-admin-totp">Código do autenticador</label>' +
        '<input id="sg-admin-totp" type="text" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" minlength="6" required autocomplete="one-time-code" placeholder="000 000" aria-describedby="sg-admin-mfa-status" />' +
        '<button class="sg-admin-lock__button" type="submit">Desbloquear painel <span aria-hidden="true">→</span></button>' +
      '</form>' +
      '<p class="sg-admin-lock__status" role="status" id="sg-admin-mfa-status" data-mfa-status></p>' +
      '<div class="sg-admin-lock__footer"><span>ADMIN / 034</span><span>ACESSO PROTEGIDO</span></div>' +
    '</section>';

  const enrollButton = container.querySelector("[data-mfa-enroll]");
  const passwordForm = container.querySelector("[data-admin-password-form]");
  const passwordInput = passwordForm.querySelector("[name=adminPassword]");
  const captchaContainer = container.querySelector("[data-admin-password-captcha]");
  const form = container.querySelector("[data-mfa-form]");
  const status = container.querySelector("[data-mfa-status]");
  const instruction = container.querySelector("[data-mfa-instruction]");
  const qr = container.querySelector("[data-mfa-qr]");
  const qrImage = container.querySelector("[data-mfa-qr-image]");
  const input = container.querySelector("[name=code]");

  function message(value, isError = false) {
    if (disposed) return;
    status.textContent = value;
    status.classList.toggle("is-error", isError);
  }
  function lock(value) {
    busy = value;
    enrollButton.disabled = value;
    input.disabled = value;
    form.querySelector("button").disabled = value;
    passwordInput.disabled = value;
    passwordForm.querySelector("button").disabled = value;
  }
  function paint() {
    if (disposed) return;
    const hasFactor = Boolean(factorId);
    passwordForm.hidden = passwordConfirmed;
    enrollButton.hidden = !passwordConfirmed || hasFactor;
    form.hidden = !passwordConfirmed || !hasFactor;
    qr.hidden = !passwordConfirmed || !enrolledImage;
    if (enrolledImage && passwordConfirmed) qrImage.src = enrolledImage;
    instruction.textContent = !passwordConfirmed
      ? "ETAPA 01 / 02 — Confirme a senha individual da conta autorizada."
      : enrolledImage
        ? "ETAPA 02 / 02 — Escaneie o QR Code no aplicativo autenticador e confirme com os seis números."
        : hasFactor
          ? "ETAPA 02 / 02 — Abra o aplicativo autenticador vinculado à sua conta e informe o código temporário."
          : "ETAPA 02 / 02 — Ative a verificação no celular e confirme com o código temporário.";
    if (passwordConfirmed && hasFactor) input.focus();
    else if (!passwordConfirmed) passwordInput.focus();
  }

  async function enroll() {
    if (busy || disposed || !passwordConfirmed) return;
    lock(true);
    message("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Street Goose 034 · Painel"
      });
      if (error) throw error;
      if (!data?.id || !data?.totp?.qr_code) throw new Error("Invalid enrollment response");
      factorId = data.id;
      const imageUrl = data.totp.qr_code;
      if (!imageUrl.startsWith("data:image/")) throw new Error("Invalid QR");
      enrolledImage = imageUrl;
      paint();
    } catch (_) {
      message("Não foi possível iniciar a proteção. Atualize a página e tente novamente.", true);
    } finally {
      lock(false);
    }
  }

  async function verify(event) {
    event.preventDefault();
    if (busy || disposed || !factorId || !passwordConfirmed) return;
    const code = input.value.replace(/\D/g, "");
    if (!/^[0-9]{6}$/.test(code)) {
      message("Digite os seis números do autenticador.", true);
      return;
    }
    lock(true);
    message("Validando acesso seguro…");
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error || !challenge.data?.id) throw challenge.error || new Error("Challenge unavailable");
      const verified = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code
      });
      if (verified.error) throw verified.error;
      const updated = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (updated.error || updated.data?.currentLevel !== "aal2") throw new Error("AAL2 not confirmed");
      if (disposed) return;
      message("Acesso validado.");
      onUnlock();
    } catch (_) {
      input.value = "";
      message("Código inválido, expirado ou indisponível. Verifique o autenticador e tente novamente.", true);
      input.focus();
    } finally {
      lock(false);
    }
  }

  async function confirmPassword(event) {
    event.preventDefault();
    if (busy || disposed || passwordConfirmed) return;
    const password = passwordInput.value;
    if (!password) {
      message("Informe a senha da conta autorizada.", true);
      return;
    }
    if (!captchaReady || captchaFailed || (captchaEnabled && !captcha?.getToken())) {
      message("Conclua a verificação de segurança para confirmar a senha.", true);
      return;
    }

    lock(true);
    message("Confirmando sua identidade…");
    try {
      // Supabase Auth validates the password and any CAPTCHA server-side.
      // No PIN, shared password, hash or service-role key is stored in the UI.
      const { data: existing, error: existingError } = await supabase.auth.getUser();
      if (existingError || !existing?.user?.id || !existing.user.email) {
        throw new Error("Session invalid");
      }
      const expectedUserId = existing.user.id;
      const token = captcha?.getToken();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: existing.user.email,
        password,
        options: token ? { captchaToken: token } : undefined
      });
      if (error || !data?.user || data.user.id !== expectedUserId) {
        // If credentials somehow selected another account, never unlock it.
        if (data?.user && data.user.id !== expectedUserId) {
          await supabase.auth.signOut();
        }
        throw error || new Error("Identity mismatch");
      }
      if (disposed) return;
      passwordConfirmed = true;
      message("");
      paint();
    } catch (_) {
      message("Não foi possível confirmar a senha. Verifique a senha da sua conta e tente novamente.", true);
      if (!disposed) passwordInput.focus();
    } finally {
      passwordInput.value = "";
      captcha?.reset();
      lock(false);
    }
  }

  passwordForm.addEventListener("submit", confirmPassword);
  enrollButton.addEventListener("click", enroll);
  form.addEventListener("submit", verify);
  paint();
  // The store uses Cloudflare Turnstile for password sign-in. Honor exactly
  // the same protection when asking for the password again inside the CRM.
  void import("../src/lib/captcha.ts").then(async ({ mountCaptcha, captchaEnabled: enabled }) => {
    captchaEnabled = enabled;
    if (!enabled || disposed) { captchaReady = true; return; }
    try {
      const handle = await mountCaptcha(captchaContainer);
      if (disposed) { handle?.destroy(); return; }
      if (!handle) throw new Error("Turnstile unavailable");
      captcha = handle;
      captchaReady = true;
    } catch (_) {
      if (disposed) return;
      captchaFailed = true;
      message("A proteção contra tentativas automáticas não carregou. Reabra o painel e tente novamente.", true);
    }
  }).catch(() => {
    if (disposed) return;
    captchaFailed = true;
    message("Não foi possível carregar a verificação de segurança.", true);
  });
  return {
    authorized: false,
    dispose() {
      disposed = true;
      enrollButton.removeEventListener("click", enroll);
      passwordForm.removeEventListener("submit", confirmPassword);
      form.removeEventListener("submit", verify);
      captcha?.destroy();
      passwordInput.value = "";
      if (qrImage) qrImage.removeAttribute("src");
    }
  };
}
