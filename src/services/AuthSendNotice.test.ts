import {beforeEach, expect, it, vi} from 'vitest';
import {announceAuthRequest} from '../../js/auth-send-notice.js';
const toast=vi.fn(), showNotification=vi.fn(), getRegistration=vi.fn();
beforeEach(()=>{
 vi.resetAllMocks();
 vi.stubGlobal('window',{SG:{toast},Notification:{},location:{origin:'https://www.streetgoose034.com.br'}});
 vi.stubGlobal('Notification',{permission:'granted'});
 vi.stubGlobal('navigator',{serviceWorker:{getRegistration}});
 getRegistration.mockResolvedValue({showNotification});
 showNotification.mockResolvedValue(undefined);
});
it('announces accepted requests without exposing codes or asserting delivery',async()=>{
 await announceAuthRequest('Pedido aceito. Entrega ainda não confirmada.');
 expect(toast).toHaveBeenCalled();
 expect(showNotification).toHaveBeenCalledWith('Solicitação de acesso aceita',expect.objectContaining({body:'Pedido aceito. Entrega ainda não confirmada.',data:{url:'https://www.streetgoose034.com.br/'}}));
});
it('does not request permission or send an OS notice without prior permission',async()=>{
 vi.stubGlobal('Notification',{permission:'default'});
 await announceAuthRequest('Pedido aceito');
 expect(toast).toHaveBeenCalled();expect(getRegistration).not.toHaveBeenCalled();
});
it('keeps the visible status when system notifications fail',async()=>{
 showNotification.mockRejectedValue(new Error('unsupported'));
 await expect(announceAuthRequest('Pedido aceito')).resolves.toBeUndefined();
 expect(toast).toHaveBeenCalled();
});
