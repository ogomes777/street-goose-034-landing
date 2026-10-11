import { beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn() }));
vi.mock('../lib/supabase', () => ({ isSupabaseConfigured: true, supabase: { storage: { from: () => storage } } }));
import { AdminService } from './AdminService';
beforeEach(() => { vi.clearAllMocks(); storage.upload.mockResolvedValue({error:null}); storage.remove.mockResolvedValue({error:null}); });
describe('product cutout storage', () => {
  it('backs up the uncut image and returns only the cutout reference', async () => {
    const original=new Blob(['original'],{type:'image/jpeg'}), cutout=new Blob(['cutout'],{type:'image/webp'});
    const result=await AdminService.uploadProductImage('lupa-qa',cutout,original);
    expect(result.ok).toBe(true);
    if(!result.ok) return;
    expect(result.data).toMatch(/-cutout\.webp$/);
    expect(storage.upload.mock.calls[0][0]).toBe(result.data+'.original');
    expect(storage.upload.mock.calls[0][1]).toBe(original);
    expect(storage.upload.mock.calls[1][1]).toBe(cutout);
    expect(storage.upload.mock.calls[1][2]).toMatchObject({contentType:'image/webp',upsert:false});
  });
  it('does not upload a cutout if its original cannot be backed up', async () => {
    storage.upload.mockResolvedValueOnce({error:{message:'offline'}});
    const result=await AdminService.uploadProductImage('lupa-qa',new Blob(),new Blob());
    expect(result.ok).toBe(false); expect(storage.upload).toHaveBeenCalledTimes(1);
  });
  it('cleans up the paired backup when the cutout upload fails', async () => {
    storage.upload.mockResolvedValueOnce({error:null}).mockResolvedValueOnce({error:{message:'offline'}});
    const result=await AdminService.uploadProductImage('lupa-qa',new Blob(),new Blob());
    expect(result.ok).toBe(false);
    expect(storage.remove).toHaveBeenCalledWith([storage.upload.mock.calls[0][0]]);
  });
  it('preserves ordinary uploads and removes both files on product photo deletion', async () => {
    const result=await AdminService.uploadProductImage('lupa-qa',new Blob(['x'],{type:'image/png'}));
    expect(result.ok).toBe(true); expect(storage.upload).toHaveBeenCalledTimes(1);
    await AdminService.removeProductImages(['lupa-qa/a-cutout.webp']);
    expect(storage.remove).toHaveBeenCalledWith(['lupa-qa/a-cutout.webp','lupa-qa/a-cutout.webp.original']);
  });
});
