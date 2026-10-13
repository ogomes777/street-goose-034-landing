import {beforeEach,describe,it,expect,vi} from 'vitest';
const auth=vi.hoisted(()=>({getUser:vi.fn(),updateUser:vi.fn()}));
vi.mock('../lib/supabase',()=>({supabase:{auth},isSupabaseConfigured:true}));
import {NotificationService} from './NotificationService';
beforeEach(()=>vi.resetAllMocks());
describe('notification consent',()=>{
 it('does not enable external channels or marketing by default',async()=>{auth.getUser.mockResolvedValue({data:{user:{user_metadata:{}}}});const p=await NotificationService.getMine();expect(p.emailEnabled).toBe(false);expect(p.pushEnabled).toBe(false);expect(p.newsletter).toBe(false);expect(p.inactivity).toBe(false);});
 it('accepts only boolean preferences',async()=>{auth.getUser.mockResolvedValue({data:{user:{user_metadata:{notification_prefs:{emailEnabled:'true',newsletter:'false',levelUp:false}}}}});const p=await NotificationService.getMine();expect(p.emailEnabled).toBe(false);expect(p.newsletter).toBe(false);expect(p.levelUp).toBe(false);});
 it('preserves opt-outs during a partial update and discards unrelated fields',async()=>{auth.getUser.mockResolvedValue({data:{user:{user_metadata:{notification_prefs:{emailEnabled:false,newsletter:false}}}}});auth.updateUser.mockResolvedValue({error:null});expect(await NotificationService.updateMine({orderUpdates:false,role:'admin'} as never)).toBe(true);const prefs=auth.updateUser.mock.calls[0][0].data.notification_prefs;expect(prefs.newsletter).toBe(false);expect(prefs.emailEnabled).toBe(false);expect(prefs.orderUpdates).toBe(false);expect(prefs.role).toBeUndefined();});
});
