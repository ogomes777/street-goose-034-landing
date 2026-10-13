import {supabase,isSupabaseConfigured} from '../lib/supabase';
export interface NotificationPrefs {orderUpdates:boolean;couponUnlocked:boolean;rewardUnlocked:boolean;levelUp:boolean;postApproved:boolean;newsletter:boolean;emailEnabled:boolean;pushEnabled:boolean;rankingUp:boolean;inactivity:boolean;adminAlerts:boolean;}
const DEFAULTS:NotificationPrefs={orderUpdates:true,couponUnlocked:true,rewardUnlocked:true,levelUp:true,postApproved:true,newsletter:false,emailEnabled:false,pushEnabled:false,rankingUp:true,inactivity:false,adminAlerts:true};
let emailConfigured=false;
export const NotificationService={
 isConfigured:()=>isSupabaseConfigured,
 defaults:():NotificationPrefs=>({...DEFAULTS}),
 emailProviderConfigured:()=>emailConfigured,
 async refreshDeliveryStatus(){if(!supabase)return false;const {data,error}=await supabase.rpc('notification_delivery_status');emailConfigured=!error&&Boolean(data?.emailConfigured);return emailConfigured;},
 async getMine():Promise<NotificationPrefs>{if(!supabase)return {...DEFAULTS};const {data:{user}}=await supabase.auth.getUser();const prefs={...DEFAULTS};for(const key of Object.keys(DEFAULTS) as (keyof NotificationPrefs)[]){const value=user?.user_metadata?.notification_prefs?.[key];if(typeof value==='boolean')prefs[key]=value;}return prefs;},
 async updateMine(patch:Partial<NotificationPrefs>){if(!supabase)return false;const prefs=await this.getMine();for(const key of Object.keys(DEFAULTS) as (keyof NotificationPrefs)[])if(typeof patch[key]==='boolean')prefs[key]=patch[key]!;const {error}=await supabase.auth.updateUser({data:{notification_prefs:prefs}});return !error;}
};
