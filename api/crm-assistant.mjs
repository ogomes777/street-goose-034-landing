export default function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 return res.status(410).json({error:'paid_ai_disabled',message:'Serviços pagos de IA desativados. Use o assistente da loja no CRM.'});
}
