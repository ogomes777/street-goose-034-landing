import {createClient} from 'npm:@supabase/supabase-js@2.112.4';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async request=>{
 if(request.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405});
 const authorization=request.headers.get('Authorization') || '';
 if(!authorization.startsWith('Bearer ') || authorization.length>4096)return Response.json({error:'unauthorized'},{status:401});
 try {
  const identityResponse=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:authorization},signal:AbortSignal.timeout(8000)});
  if(!identityResponse.ok)return Response.json({error:'invalid_google_identity'},{status:401});
  const identity=await identityResponse.json();
  if(!identity.verified_email || !identity.email)return Response.json({error:'unverified_identity'},{status:403});
  const {data,error}=await db.rpc('export_customer_sheet',{p_email:identity.email});
  if(error)return Response.json({error:'forbidden'},{status:403});
  return Response.json(data,{headers:{'Cache-Control':'no-store'}});
 }catch(_){return Response.json({error:'temporarily_unavailable'},{status:503});}
});

