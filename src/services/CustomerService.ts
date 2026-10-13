import { supabase } from "../lib/supabase";
export const CUSTOMER_FIELDS = ["full_name", "phone", "birthday", "postal_code", "street", "address_number", "complement", "neighborhood", "city", "state"] as const;
export type CustomerDetails = Partial<Record<typeof CUSTOMER_FIELDS[number], string | null>>;
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
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return false;
  const fields = Object.fromEntries(CUSTOMER_FIELDS.map(k => [k, k === "birthday" ? input[k] || null : String(input[k] || "").trim()]));
  const {error} = await supabase.from("customer_details").upsert({...fields, user_id:user.id, updated_at:new Date().toISOString()});
  return !error;
 }
};
