import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),getMine:vi.fn()}));
vi.mock('../lib/supabase',()=>({supabase:{rpc:mocks.rpc}}));
vi.mock('./NotificationService',()=>({NotificationService:{getMine:mocks.getMine}}));
import {PushService} from './PushService';
beforeEach(()=>vi.resetAllMocks());
it('does not request a push test without explicit channel consent',async()=>{mocks.getMine.mockResolvedValue({pushEnabled:false,orderUpdates:true});expect((await PushService.test()).ok).toBe(false);expect(mocks.rpc).not.toHaveBeenCalled();});
it('does not report queued delivery when the server refuses the test',async()=>{mocks.getMine.mockResolvedValue({pushEnabled:true,orderUpdates:true});mocks.rpc.mockResolvedValue({data:false,error:null});expect((await PushService.test()).ok).toBe(false);});
it('describes an accepted test as queued rather than received',async()=>{mocks.getMine.mockResolvedValue({pushEnabled:true,orderUpdates:true});mocks.rpc.mockResolvedValue({data:true,error:null});const result=await PushService.test();expect(result.ok).toBe(true);expect(result.message).toContain('fila');expect(result.message).toContain('não comprova entrega');expect(mocks.rpc).toHaveBeenCalledWith('request_my_notification_test');});
