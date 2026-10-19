import { expect, test } from "@playwright/test";

test("Segurança: cabeçalhos essenciais e política CSP na resposta", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("Segurança: página de checkout não expõe dados pessoais no HTML inicial", async ({ request }) => {
  const response = await request.get("/checkout");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('name="robots" content="noindex"');
  expect(html).not.toMatch(/(Cliente de Teste|cliente@example\.com)/);
});

test("Performance: a cena interativa fica fora do grafo de entrada e sob demanda", async ({ request }) => {
  const response = await request.get("/");
  const html = await response.text();
  // Não devemos antecipar o chunk da cena no HTML de entrada do site.
  expect(html).not.toMatch(/<link[^>]+(?:modulepreload|preload)[^>]+InteractiveCharacterHero/i);
  expect(html).toContain('id="interactive-character-root"');
});
