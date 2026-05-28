import {
  Body, Container, Head, Heading, Hr, Html, Preview,
  Section, Text,
} from '@react-email/components';

interface Props {
  orderId:      string;
  firstName:    string;
  trackingCode?: string;
  trackingUrl?:  string;
  carrierName?:  string;
}

export const OrderShippedEmail = ({ orderId, firstName, trackingCode, trackingUrl, carrierName }: Props) => {
  const shortId = orderId.split('-').at(-1)?.toUpperCase() ?? '';

  return (
    <Html>
      <Head />
      <Preview>Tu pedido KYZZ #{shortId} está en camino</Preview>
      <Body style={{ backgroundColor: '#FAF9F6', fontFamily: 'Georgia, serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '0 20px' }}>

          <Section style={{ textAlign: 'center', paddingBottom: '32px', borderBottom: '1px solid #E3D5CA' }}>
            <Heading style={{ fontSize: '24px', fontWeight: 'normal', color: '#3D2B1F', letterSpacing: '0.2em', margin: 0 }}>
              KYZZ
            </Heading>
            <Text style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#A89080', margin: '4px 0 0' }}>
              Accessible Luxury
            </Text>
          </Section>

          <Section style={{ paddingTop: '32px', paddingBottom: '24px' }}>
            <Text style={{ fontSize: '16px', color: '#3D2B1F', margin: 0 }}>
              ¡Tu pedido está en camino, {firstName}!
            </Text>
            <Text style={{ fontSize: '14px', color: '#A89080', lineHeight: '1.6', marginTop: '8px' }}>
              Tu pedido <strong style={{ color: '#3D2B1F' }}>#{shortId}</strong> fue despachado
              y pronto estará en tu puerta.
            </Text>
          </Section>

          {trackingCode && (
            <>
              <Hr style={{ borderColor: '#E3D5CA' }} />
              <Section style={{ paddingTop: '24px', paddingBottom: '24px', textAlign: 'center' }}>
                <Text style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#A89080', margin: '0 0 8px' }}>
                  Código de rastreo{carrierName ? ` · ${carrierName}` : ''}
                </Text>
                <Text style={{ fontSize: '20px', fontFamily: 'monospace', color: '#3D2B1F', fontWeight: 'bold', margin: '0 0 16px' }}>
                  {trackingCode}
                </Text>
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    style={{ display: 'inline-block', backgroundColor: '#3D2B1F', color: '#FFFFFF', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', padding: '12px 28px' }}
                  >
                    Rastrear envío
                  </a>
                )}
              </Section>
            </>
          )}

          <Hr style={{ borderColor: '#E3D5CA' }} />
          <Section style={{ paddingTop: '24px', textAlign: 'center' }}>
            <Text style={{ fontSize: '11px', color: '#A89080', letterSpacing: '0.15em' }}>
              © {new Date().getFullYear()} KYZZ · Basics for every you
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};
