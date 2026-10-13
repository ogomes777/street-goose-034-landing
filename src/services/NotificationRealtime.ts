import {supabase} from '../lib/supabase';
import type {RealtimeChannel} from '@supabase/supabase-js';
let channel:RealtimeChannel|null=null,userId:string|null=null,revision=0;
export async function watchCustomerNotifications(id:string|null){
 if(!supabase || typeof document==='undefined' || id===userId)return;
 userId=id;const currentRevision=++revision;const oldChannel=channel;channel=null;
 if(oldChannel)await supabase.removeChannel(oldChannel);
 if(currentRevision!==revision || !id)return;
 channel=supabase.channel('customer-notices:'+id).on('postgres_changes',{event:'INSERT',schema:'public',table:'customer_notifications',filter:'user_id=eq.'+id},()=>{if(userId===id)document.dispatchEvent(new CustomEvent('sg:notification'));}).subscribe();
}
