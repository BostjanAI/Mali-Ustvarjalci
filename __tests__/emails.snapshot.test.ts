import { render } from '@react-email/render';
import OrderConfirmation from '@/mail/OrderConfirmation';
import ShippingUpdate from '@/mail/ShippingUpdate';

describe('email templates', () => {
  it('OrderConfirmation matches snapshot', () => {
    const html = render(OrderConfirmation({ orderId: 'TEST-1' } as any));
    expect(html).toMatchSnapshot();
  });
  it('ShippingUpdate matches snapshot', () => {
    const html = render(ShippingUpdate({ orderId: 'TEST-1', trackingNumber: 'TRK123' } as any));
    expect(html).toMatchSnapshot();
  });
});


