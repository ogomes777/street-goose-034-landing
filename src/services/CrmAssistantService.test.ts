import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),isAdmin:vi.fn(),financeSummary:vi.fn()}));
vi.mock('../lib/supabase',()=>({supabase:{rpc:mocks.rpc}}));
vi.mock('./AdminService',()=>({AdminService:{isAdmin:mocks.isAdmin,financeSummary:mocks.financeSummary}}));
import {CrmAssistantService,interpretQuestion,makePeriod} from './CrmAssistantService';
beforeEach(()=>vi.resetAllMocks());
it('routes all guided CRM areas and explicit periods',()=>{
 expect(interpretQuestion('Quanto entrou e saiu nos últimos 30 dias?')).toMatchObject({topic:'finance',days:30});
 for(const [q,topic] of [['cupons e recompensas','coupons'],['comunidade','community'],['clientes','customers'],['XP','xp'],['catálogo','products'],['newsletter','newsletter'],['pedidos','orders']])expect(interpretQuestion('Resuma '+q).topic).toBe(topic);
});
it('does not pretend to answer unsupported requests',async()=>{mocks.isAdmin.mockResolvedValue(true);await expect(CrmAssistantService.ask('apague todos os dados')).rejects.toThrow('Escolha');expect(mocks.rpc).not.toHaveBeenCalled();});
it('blocks non-admins before report queries',async()=>{mocks.isAdmin.mockResolvedValue(false);await expect(CrmAssistantService.ask('resuma o financeiro')).rejects.toThrow('exclusivo');expect(mocks.rpc).not.toHaveBeenCalled();});
it('uses Brazilian calendar boundaries',()=>{const now=new Date('2026-10-14T03:00:00Z');expect(makePeriod(30,true,false,now).from).toBe('2026-10-01T03:00:00.000Z');expect(makePeriod(30,false,true,now).from).toBe('2026-10-14T03:00:00.000Z');});
it('uses period flow rather than all-time balance',async()=>{mocks.isAdmin.mockResolvedValue(true);mocks.rpc.mockResolvedValue({data:{generated_at:'2026-10-14T03:00:00Z'},error:null});mocks.financeSummary.mockResolvedValue({ok:true,data:{in_cents:12000,out_cents:3500,balance_cents:999999,receivable_cents:0,avg_ticket_cents:12000,series:[{d:'2026-10-13',in:12000,out:3500}],top_products:[]}});const a=await CrmAssistantService.ask('resuma o financeiro');expect(a.metrics.find(m=>m.label==='Saldo do período')?.value).toBe(8500);expect(a.chart[0].value).toBe(8500);});
