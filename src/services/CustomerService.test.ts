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

it('rejects saving stale profile data after an account switch',async()=>{
 mocks.getUser.mockResolvedValue({data:{user:{id:'other-account'}}});
 expect(await CustomerService.saveMine({full_name:'Old account'},'expected-account')).toBe(false);
 expect(mocks.from).not.toHaveBeenCalled();
});

import {validPhone} from './CustomerService';
describe('phone validation (onboarding requires it)',()=>{
 it('accepts mobiles and landlines with DDD, with or without +55 and formatting',()=>{for(const phone of ['(34) 99999-1234','34999991234','+55 34 99999-1234','5534999991234','(34) 3333-1234','3433331234']) expect(validPhone(phone)).toBe(true);});
 it('rejects missing DDD, short numbers, 11-digit numbers not starting with 9 and empty input',()=>{for(const phone of ['','99999-1234','3499999','34899991234','(04) 99999-1234']) expect(validPhone(phone)).toBe(false);});
});
