import { Html, Head, Preview, Body, Container, Heading, Text } from '@react-email/components';

export function OrderConfirmation({ orderId }: { orderId: string }) {
  return (
    <Html>
      <Head />
      <Preview>Order {orderId} confirmation</Preview>
      <Body style={{ backgroundColor: '#f7f7f8' }}>
        <Container style={{ margin: '0 auto', padding: '24px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <Heading style={{ fontSize: 20, margin: 0 }}>Mali Ustvarjalci</Heading>
          <Text style={{ marginTop: 16 }}>Thank you for your order <b>{orderId}</b>. We are processing it now.</Text>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>This is an automated message. Please do not reply.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderConfirmation;


