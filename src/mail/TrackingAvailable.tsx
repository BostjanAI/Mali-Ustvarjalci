import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
} from '@react-email/components';
export function TrackingAvailable({
  orderId,
  trackingNumber,
}: {
  orderId: string;
  trackingNumber: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Podatki za sledenje naročilu {orderId}</Preview>
      <Body style={{ backgroundColor: '#f7f7f8' }}>
        <Container
          style={{
            margin: '0 auto',
            padding: 24,
            background: '#fff',
            borderRadius: 12,
          }}
        >
          <Heading>Mali Ustvarjalci</Heading>
          <Text>
            Za naročilo <b>{orderId}</b> smo prejeli številko za sledenje:{' '}
            <b>{trackingNumber}</b>.
          </Text>
          <Text>
            Sama dodelitev številke še ne potrjuje, da je prevoznik že prevzel
            pošiljko.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
