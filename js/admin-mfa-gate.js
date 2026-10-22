/* SG034 — second factor for privileged store management.
   The browser gate is only UX; SQL enforces AAL2 for admin RPCs and RLS. */
import { supabase } from "../src/lib/supabase.ts";
import "./admin-mfa-gate.css";

export async function mountAdminMfaGate(container, onUnlock) {
  if (!supabase) throw new Error("Supabase unavailable");

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error) throw assurance.error;
  if (assurance.data?.currentLevel === "aal2") {
    return { authorized: true, dispose() {} };
  }

  let disposed = false;
  let factorId = "";
  let busy = false;
  let enrolledImage = "";
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
      '<div class="sg-admin-lock__qr" data-mfa-qr hidden><img data-mfa-qr-image alt="QR code de configuração do autenticador" /></div>' +
      '<p class="sg-admin-lock__instruction" data-mfa-instruction></p>' +
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
  }
  function paint() {
    if (disposed) return;
    const hasFactor = Boolean(factorId);
    enrollButton.hidden = hasFactor;
    form.hidden = !hasFactor;
    qr.hidden = !enrolledImage;
    if (enrolledImage) qrImage.src = enrolledImage;
    instruction.textContent = enrolledImage
      ? "Escaneie o QR Code no aplicativo autenticador e digite o código de seis dígitos para ativar."
      : hasFactor
        ? "Abra o aplicativo autenticador vinculado à sua conta e informe o código temporário."
        : "Ative a verificação pelo celular para proteger o painel. Utilize um aplicativo autenticador.";
    if (hasFactor) input.focus();
  }

  async function enroll() {
    if (busy || disposed) return;
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
    if (busy || disposed || !factorId) return;
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

  enrollButton.addEventListener("click", enroll);
  form.addEventListener("submit", verify);
  paint();
  return {
    authorized: false,
    dispose() {
      disposed = true;
      enrollButton.removeEventListener("click", enroll);
      form.removeEventListener("submit", verify);
      if (qrImage) qrImage.removeAttribute("src");
    }
  };
}
