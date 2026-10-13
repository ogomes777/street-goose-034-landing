import { supabase } from "../lib/supabase";
export const CUSTOMER_FIELDS = ["full_name", "cpf", "phone", "birthday", "postal_code", "street", "address_number", "complement", "neighborhood", "city", "state"] as const;
export type CustomerDetails = Partial<Record<typeof CUSTOMER_FIELDS[number], string | null>>;
export function validCpf(value: string): boolean {
 const digits = value.replace(/\D/g, "");
 if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
 for (const length of [9, 10]) {
  let sum = 0;
  for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
  const check = (sum * 10 % 11) % 10;
  if (check !== Number(digits[length])) return false;
 }
 return true;
}
export const CustomerService = {
 async getMine(): Promise<CustomerDetails> {
  if (!supabase) return {};
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return {};
  const {data, error} = await supabase.from("customer_details").select(CUSTOMER_FIELDS.join(",")).eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar seus dados pessoais.");
  return (data || {}) as CustomerDetails;
 },
 async saveMine(input: CustomerDetails): Promise<boolean> {
  if (!supabase) return false;
  if (input.cpf && !validCpf(input.cpf)) return false;
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return false;
  const fields = Object.fromEntries(CUSTOMER_FIELDS.map(k => [k, k === "birthday" ? input[k] || null : String(input[k] || "").trim()]));
  fields.cpf = String(input.cpf || "").replace(/\D/g, "");
  const {error} = await supabase.from("customer_details").upsert({...fields, user_id:user.id, updated_at:new Date().toISOString()});
  return !error;
 }
};
