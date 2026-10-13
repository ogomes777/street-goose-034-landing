function onOpen(){SpreadsheetApp.getUi().createMenu('Street Goose').addItem('Atualizar CRM agora','syncStreetCrm').addItem('Ativar sincronização a cada hora','installStreetSync').addItem('Desativar sincronização','stopStreetSync').addToUi();}
function safeStreetValue(v){return typeof v==='string'&&/^[\s]*[=+@-]/.test(v)?"'"+v:v===null||v===undefined?'':v;}
function streetDate(v){return v?new Date(v):'';}
function syncStreetCrm(){
 const lock=LockService.getScriptLock();if(!lock.tryLock(10000))return;
 try{
 const response=UrlFetchApp.fetch('https://hfmzlieixfkisbyweprv.supabase.co/functions/v1/customer-sheet-export',{method:'post',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},contentType:'application/json',payload:'{}',muteHttpExceptions:true});
 if(response.getResponseCode()!==200)throw new Error('A sincronização não foi autorizada. Confira a conta Google conectada.');
 const data=JSON.parse(response.getContentText());if(!Array.isArray(data.customers))throw new Error('Resposta inválida.');
 const book=SpreadsheetApp.getActiveSpreadsheet(),clients=book.getSheetByName('Clientes'),consent=book.getSheetByName('Consentimentos'),dashboard=book.getSheetByName('Dashboard');
 if(!clients||!consent||!dashboard)throw new Error('As abas originais do CRM são necessárias.');
 const headers=['ID','Nome completo','CPF','E-mail','E-mail verificado','Celular','Nascimento','CEP','Rua / avenida','Número','Complemento','Bairro','Cidade','UF','Cadastro','XP','Ficha pessoal','Pedidos','Total pago (R$)','Última compra','Nível','Último acesso','Ficha atualizada'];
 const rows=data.customers.map(c=>[c.id,c.full_name,c.cpf,c.email,c.email_confirmed_at?'Sim':'Não',c.phone,c.birthday?new Date(c.birthday+'T12:00:00Z'):'',c.postal_code,c.street,c.address_number,c.complement,c.neighborhood,c.city,c.state,streetDate(c.created_at),Number(c.xp),c.full_name&&c.phone&&c.cpf&&c.street?'Completa':'Pendente',Number(c.order_count),Number(c.total_paid)/100,streetDate(c.last_order),Number(c.level),streetDate(c.last_seen),streetDate(c.updated_at)].map(safeStreetValue));
 const keys=['orderUpdates','levelUp','rewardUnlocked','couponUnlocked','postApproved','newsletter','emailEnabled','pushEnabled','rankingUp','inactivity','adminAlerts'];
 const choices=data.customers.map(c=>[safeStreetValue(c.id),safeStreetValue(c.email),...keys.map(k=>c.prefs[k]===undefined?!['newsletter','emailEnabled','pushEnabled','inactivity'].includes(k):Boolean(c.prefs[k]))]);
 for(const sheet of [clients,consent])if(sheet.getMaxRows()<rows.length+1)sheet.insertRowsAfter(sheet.getMaxRows(),rows.length+1-sheet.getMaxRows());
 clients.getRange(1,1,Math.max(clients.getLastRow(),rows.length+1),headers.length).clearContent();clients.getRange(1,1,1,headers.length).setValues([headers]);if(rows.length)clients.getRange(2,1,rows.length,headers.length).setValues(rows);
 const ph=['ID','E-mail','Pedidos','Evolução','Recompensas','Cupons','Comunidade','Promoções','E-mail ativo','Push ativo','Ranking','Retorno','Avisos ADM'];
 consent.getRange(1,1,Math.max(consent.getLastRow(),choices.length+1),ph.length).clearContent();consent.getRange(1,1,1,ph.length).setValues([ph]);if(choices.length){consent.getRange(2,3,choices.length,keys.length).insertCheckboxes();consent.getRange(2,1,choices.length,ph.length).setValues(choices);}
 for(const sheet of [clients,consent]){sheet.getRange(1,1,1,sheet===clients?headers.length:ph.length).setBackground('#242329').setFontColor('#ffffff').setFontWeight('bold');sheet.setFrozenRows(1);sheet.setFrozenColumns(2);}
 if(rows.length){clients.getRange(2,3,rows.length,1).setNumberFormat('@');for(const col of [7,15])clients.getRange(2,col,rows.length,1).setNumberFormat('dd/MM/yyyy');clients.getRange(2,19,rows.length,1).setNumberFormat('R$ #,##0.00');for(const col of [20,22,23])clients.getRange(2,col,rows.length,1).setNumberFormat('dd/MM/yyyy HH:mm');}
 dashboard.getRange('D5').setValue('Atualizado: '+Utilities.formatDate(new Date(),'America/Sao_Paulo','dd/MM/yyyy HH:mm'));dashboard.getRange('D7').setValue('Sincronização conectada · Supabase');SpreadsheetApp.flush();
 }catch(e){const d=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dashboard');if(d)d.getRange('D7').setValue('Falha ao atualizar. Últimos dados preservados.');throw e;}finally{lock.releaseLock();}
}
function installStreetSync(){syncStreetCrm();stopStreetSync();ScriptApp.newTrigger('syncStreetCrm').timeBased().everyHours(1).create();}
function stopStreetSync(){ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='syncStreetCrm').forEach(t=>ScriptApp.deleteTrigger(t));}
