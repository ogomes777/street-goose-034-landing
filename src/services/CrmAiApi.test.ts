import {expect,it,vi} from 'vitest';
import handler from '../../api/crm-assistant.mjs';
it('disables every paid provider action without making network requests',()=>{const json=vi.fn();const res={setHeader:vi.fn(),status:vi.fn().mockReturnValue({json})};for(const action of ['chat','transcribe','speech','status'])handler({method:'POST',body:{action}},res);expect(res.status).toHaveBeenCalledWith(410);expect(json).toHaveBeenCalledWith(expect.objectContaining({error:'paid_ai_disabled'}));});
