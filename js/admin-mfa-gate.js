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
  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error) throw factors.error;
  const verified = (factors.data?.totp || []).find(f => f.status === "verified");
  if (verified) factorId = verified.id;

  container.innerHTML =
    '<section class="sg-admin-lock" aria-labelledby="sg-admin-lock-title">' +
      '<div class="sg-admin-lock__topline"><span class="sg-admin-lock__serial">S.G. / 034</span><span class="sg-admin-lock__restricted"><span class="sg-admin-lock__dot"></span> ACESSO RESTRITO</span></div>' +
      '<div class="sg-admin-lock__orbit" aria-hidden="true"><span>7</span><span>7</span><span>7</span></div>' +
      '<p class="sg-admin-lock__eyebrow">THE PRIVATE DISTRICT / 034</p>' +
      '<h2 id="sg-admin-lock-title">O acesso é exclusivo.</h2>' +
      '<p class="sg-admin-lock__desc">Confirme sua credencial e finalize a verificação no autenticador para entrar no painel da loja.</p>' +
      '<div class="sg-admin-lock__steps" aria-hidden="true"><span class="is-current" data-step-one>01 <i></i> CHAVE</span><span class="sg-admin-lock__steps-line"></span><span data-step-two>02 <i></i> AUTENTICADOR</span></div>' +
      '<p class="sg-admin-lock__instruction" data-mfa-instruction></p>' +
      '<form data-admin-password-form novalidate>' +
        '<label for="sg-admin-phrase">Senha do painel</label>' +
        '<input id="sg-admin-phrase" name="adminPhrase" type="password" autocomplete="off" spellcheck="false" autocapitalize="off" maxlength="32" required placeholder="Insira a chave privada" />' +
        '<button class="sg-admin-lock__button" type="submit">CONTINUAR PARA AUTENTICADOR <span aria-hidden="true">↗</span></button>' +
        '<p class="sg-admin-lock__help">Somente contas autorizadas podem usar este painel. A segurança real depende do login e do aplicativo autenticador.</p>' +
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
  const phraseInput = passwordForm.querySelector("[name=adminPhrase]");
  const stepOne = container.querySelector("[data-step-one]");
  const stepTwo = container.querySelector("[data-step-two]");
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
    phraseInput.disabled = value;
    passwordForm.querySelector("button").disabled = value;
  }
  function paint() {
    if (disposed) return;
    const hasFactor = Boolean(factorId);
    passwordForm.hidden = passwordConfirmed;
    stepOne.classList.toggle("is-current", !passwordConfirmed);
    stepTwo.classList.toggle("is-current", passwordConfirmed);
    enrollButton.hidden = !passwordConfirmed || hasFactor;
    form.hidden = !passwordConfirmed || !hasFactor;
    qr.hidden = !passwordConfirmed || !enrolledImage;
    if (enrolledImage && passwordConfirmed) qrImage.src = enrolledImage;
    instruction.textContent = !passwordConfirmed
      ? "ETAPA 01 / 02 — Informe a senha de acesso do painel."
      : enrolledImage
        ? "ETAPA 02 / 02 — Escaneie o QR Code no aplicativo autenticador e confirme com os seis números."
        : hasFactor
          ? "ETAPA 02 / 02 — Abra o aplicativo autenticador vinculado à sua conta e informe o código temporário."
          : "ETAPA 02 / 02 — Ative a verificação no celular e confirme com o código temporário.";
    if (passwordConfirmed && hasFactor) input.focus();
    else if (!passwordConfirmed) phraseInput.focus();
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

  function confirmPassword(event) {
    event.preventDefault();
    if (busy || disposed || passwordConfirmed) return;
    // Decorative shared phrase requested by the client. It is inspectable in
    // JavaScript and MUST NOT be trusted for API authorization. Access is
    // enforced by Supabase account login, verified TOTP and database AAL2/RLS.
    if (phraseInput.value !== "777 admin") {
      phraseInput.value = "";
      message("Senha do painel incorreta.", true);
      phraseInput.focus();
      return;
    }
    phraseInput.value = "";
    passwordConfirmed = true;
    message("");
    paint();
  }

  passwordForm.addEventListener("submit", confirmPassword);
  enrollButton.addEventListener("click", enroll);
  form.addEventListener("submit", verify);
  paint();
  return {
    authorized: false,
    dispose() {
      disposed = true;
      enrollButton.removeEventListener("click", enroll);
      passwordForm.removeEventListener("submit", confirmPassword);
      form.removeEventListener("submit", verify);
      phraseInput.value = "";
      if (qrImage) qrImage.removeAttribute("src");
    }
  };
}
