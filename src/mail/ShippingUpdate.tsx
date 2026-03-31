import { Html, Head, Preview, Body, Container, Heading, Text } from '@react-email/components';

export function ShippingUpdate({ orderId, trackingNumber }: { orderId: string; trackingNumber?: string }) {
  return (
    <Html>
      <Head />
      <Preview>Your order {orderId} has shipped</Preview>
      <Body style={{ backgroundColor: '#f7f7f8' }}>
        <Container style={{ margin: '0 auto', padding: '24px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <Heading style={{ fontSize: 20, margin: 0 }}>Mali Ustvarjalci</Heading>
          <Text style={{ marginTop: 16 }}>Your order <b>{orderId}</b> is on the way.{trackingNumber ? ` Tracking number: ${trackingNumber}.` : ''}</Text>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>This is an automated message. Please do not reply.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ShippingUpdate;


