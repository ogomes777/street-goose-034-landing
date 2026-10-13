import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({getUser:vi.fn(),upsert:vi.fn(),from:vi.fn()}));
vi.mock('../lib/supabase',()=>({supabase:{auth:{getUser:mocks.getUser},from:mocks.from}}));
import {CustomerService} from './CustomerService';
beforeEach(()=>{vi.resetAllMocks();mocks.from.mockReturnValue({upsert:mocks.upsert});});
describe('private customer information',()=>{
 it('never writes without a signed-in customer',async()=>{mocks.getUser.mockResolvedValue({data:{user:null}});expect(await CustomerService.saveMine({full_name:'Teste'})).toBe(false);expect(mocks.from).not.toHaveBeenCalled();});
 it('uses the authenticated identity and ignores injected ownership',async()=>{mocks.getUser.mockResolvedValue({data:{user:{id:'current-customer'}}});mocks.upsert.mockResolvedValue({error:null});expect(await CustomerService.saveMine({full_name:'  Cliente  ',birthday:'',user_id:'other-customer'} as never)).toBe(true);expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({user_id:'current-customer',full_name:'Cliente',birthday:null}));});
 it('reports persistence errors',async()=>{mocks.getUser.mockResolvedValue({data:{user:{id:'current-customer'}}});mocks.upsert.mockResolvedValue({error:{message:'denied'}});expect(await CustomerService.saveMine({})).toBe(false);});
});

import {validCpf} from './CustomerService';
describe('CPF validation',()=>{
 it('accepts formatted and unformatted check digits',()=>{expect(validCpf('529.982.247-25')).toBe(true);expect(validCpf('52998224725')).toBe(true);});
 it('rejects repeated digits, invalid checks and incomplete numbers',()=>{for(const cpf of ['11111111111','52998224726','123']) expect(validCpf(cpf)).toBe(false);});
});
