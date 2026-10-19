/* Street Goose 034 — regras compartilhadas pelos dois checkouts.
   Só valida formato, sem supor entrega disponível ou confirmar pagamento. */
var BRAZIL_UFS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

export function checkoutFieldErrors(data) {
  var d = {};
  Object.keys(data).forEach(function (key) { d[key] = String(data[key] || "").trim(); });
  var numbers = function (v) { return (v || "").replace(/\D/g, ""); };
  var errors = {};
  if ("name" in d && d.name.length < 2) errors.name = "Informe seu nome.";
  if ("email" in d && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) || d.email.length > 254))
    errors.email = "Informe um e-mail válido.";
  if ("phone" in d && !/^(\d{10}|\d{11})$/.test(numbers(d.phone)))
    errors.phone = "Informe telefone com DDD (10 ou 11 dígitos).";
  if ("cep" in d && numbers(d.cep).length !== 8)
    errors.cep = "Informe um CEP com 8 dígitos.";
  for (var field of ["street", "number", "neighborhood", "city"]) {
    if (field in d && !d[field]) errors[field] = "Preencha este campo para continuar.";
  }
  if ("state" in d && !BRAZIL_UFS.has(d.state.toUpperCase()))
    errors.state = "Informe uma UF válida (ex.: MG, SP).";
  return errors;
}
