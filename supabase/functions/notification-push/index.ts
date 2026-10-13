import {createClient} from 'npm:@supabase/supabase-js@2.112.4';
import webpush from 'npm:web-push@3.6.7';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async request=>{
 if(request.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405});
 const {data:config,error}=await db.rpc('push_worker_config');
 const supplied=request.headers.get('Authorization');
 if(error || !config?.street_push_worker || supplied!=='Bearer '+config.street_push_worker)return Response.json({error:'unauthorized'},{status:401});
 webpush.setVapidDetails('mailto:avisos@streetgoose034.com.br',config.street_push_public,config.street_push_private);
 const {data:jobs,error:claimError}=await db.rpc('claim_push_jobs');
 if(claimError)return Response.json({error:'queue_unavailable'},{status:503});
 let accepted=0;
 for(const job of jobs || []){
  try{
   const endpoint=new URL(job.endpoint);
   if(endpoint.protocol!=='https:' || endpoint.port || endpoint.username || endpoint.password || !/^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([A-Za-z0-9-]+\.)*push\.apple\.com|([A-Za-z0-9-]+\.)*notify\.windows\.com)$/.test(endpoint.hostname))throw {statusCode:400};
   await webpush.sendNotification({endpoint:job.endpoint,keys:job.keys},JSON.stringify({id:job.notification_id,title:job.title,body:job.body,url:'/conta'}),{TTL:3600,timeout:8000});
   await db.from('push_delivery_jobs').update({state:'accepted'}).eq('notification_id',job.notification_id).eq('subscription_id',job.subscription_id);accepted++;
  }catch(error){
   const status=(error as {statusCode?:number}).statusCode;
   if(status===404 || status===410)await db.from('push_subscriptions').delete().eq('id',job.subscription_id);
   else await db.from('push_delivery_jobs').update({state:job.attempts>=5 || (status && status>=400 && status<500 && status!==429)?'failed':'pending'}).eq('notification_id',job.notification_id).eq('subscription_id',job.subscription_id);
  }
 }
 return Response.json({accepted,processed:jobs?.length || 0});
});

