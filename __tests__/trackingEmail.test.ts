import { render } from '@react-email/render';
import { TrackingAvailable } from '@/mail/TrackingAvailable';
test('tracking notice describes an available reference without asserting shipment', () => {
  const html = render(
    TrackingAvailable({
      orderId: 'TEST-ORDER',
      trackingNumber: 'TEST-TRACKING',
    }),
  );
  expect(html).toContain('TEST-TRACKING');
  expect(html).toContain('Sama dodelitev številke še ne potrjuje');
  expect(html).not.toContain('has shipped');
});
test('tracking references are escaped as text in email', () => {
  const html = render(
    TrackingAvailable({
      orderId: 'TEST',
      trackingNumber: '<script>TEST</script>',
    }),
  );
  expect(html).toContain('&lt;script&gt;TEST&lt;/script&gt;');
  expect(html).not.toContain('<script>TEST</script>');
});
