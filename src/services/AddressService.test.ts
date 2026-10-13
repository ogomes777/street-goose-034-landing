import {afterEach,describe,expect,it,vi} from 'vitest';
import {lookupPostalCode,formatPostalCode} from './AddressService';
afterEach(()=>vi.unstubAllGlobals());
describe('postal address lookup',()=>{
 it('formats pasted CEPs without accepting letters',()=>{expect(formatPostalCode('01.001-000')).toBe('01001-000');expect(formatPostalCode('abc')).toBe('');});
 it('does not make a request for incomplete CEPs',async()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);await expect(lookupPostalCode('123')).rejects.toThrow('8 dígitos');expect(fetcher).not.toHaveBeenCalled();});
 it('maps a valid address while omitting number and apartment',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({logradouro:'Praça da Sé',bairro:'Sé',localidade:'São Paulo',uf:'SP',complemento:'lado ímpar'})}));expect(await lookupPostalCode('01001-000')).toEqual({street:'Praça da Sé',neighborhood:'Sé',city:'São Paulo',state:'SP'});});
 it('keeps general city CEPs usable without invented streets',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({localidade:'Cidade',uf:'MG',logradouro:'',bairro:''})}));expect((await lookupPostalCode('12345678')).street).toBe('');});
 it('rejects nonexistent CEPs and malformed responses',async()=>{const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({erro:true})}).mockResolvedValueOnce({ok:true,json:async()=>({localidade:'',uf:'??'})});vi.stubGlobal('fetch',fetcher);await expect(lookupPostalCode('99999999')).rejects.toThrow('não encontrado');await expect(lookupPostalCode('01001000')).rejects.toThrow('não disponível');});
 it('passes cancellation and never sends session credentials to the provider',async()=>{const fetcher=vi.fn().mockResolvedValue({ok:false});vi.stubGlobal('fetch',fetcher);const signal=new AbortController().signal;await expect(lookupPostalCode('01001000',signal)).rejects.toThrow('indisponível');expect(fetcher).toHaveBeenCalledWith('https://viacep.com.br/ws/01001000/json/',{signal,credentials:'omit',referrerPolicy:'no-referrer'});});
});
