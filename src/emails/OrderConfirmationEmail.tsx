import {
  Body, Container, Head, Heading, Hr, Html, Preview,
  Section, Text, Row, Column,
} from '@react-email/components';
import { currencyFormat } from '@/utils';

interface OrderItem {
  title: string;
  size: string;
  quantity: number;
  price: number;
}

interface Props {
  orderId:    string;
  firstName:  string;
  items:      OrderItem[];
  subtotal:   number;
  tax:        number;
  total:      number;
  address:    string;
  city:       string;
}

export const OrderConfirmationEmail = ({
  orderId, firstName, items, subtotal, tax, total, address, city,
}: Props) => {
  const shortId = orderId.split('-').at(-1)?.toUpperCase() ?? '';

  return (
    <Html>
      <Head />
      <Preview>Tu pedido KYZZ #{shortId} fue recibido</Preview>
      <Body style={{ backgroundColor: '#FAF9F6', fontFamily: 'Georgia, serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '0 20px' }}>

          {/* Header */}
          <Section style={{ textAlign: 'center', paddingBottom: '32px', borderBottom: '1px solid #E3D5CA' }}>
            <Heading style={{ fontSize: '24px', fontWeight: 'normal', color: '#3D2B1F', letterSpacing: '0.2em', margin: 0 }}>
              KYZZ
            </Heading>
            <Text style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#A89080', margin: '4px 0 0' }}>
              Accessible Luxury
            </Text>
          </Section>

          {/* Saludo */}
          <Section style={{ paddingTop: '32px', paddingBottom: '24px' }}>
            <Text style={{ fontSize: '16px', color: '#3D2B1F', margin: 0 }}>Hola, {firstName}</Text>
            <Text style={{ fontSize: '14px', color: '#A89080', lineHeight: '1.6', marginTop: '8px' }}>
              Recibimos tu pedido <strong style={{ color: '#3D2B1F' }}>#{shortId}</strong> y lo estamos procesando.
              Te avisaremos cuando esté en camino.
            </Text>
          </Section>

          <Hr style={{ borderColor: '#E3D5CA' }} />

          {/* Productos */}
          <Section style={{ paddingTop: '24px', paddingBottom: '8px' }}>
            <Text style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#A89080', margin: '0 0 12px' }}>
              Resumen del pedido
            </Text>
            {items.map((item, i) => (
              <Row key={i} style={{ marginBottom: '10px' }}>
                <Column>
                  <Text style={{ fontSize: '13px', color: '#3D2B1F', margin: 0 }}>{item.title}</Text>
                  <Text style={{ fontSize: '11px', color: '#A89080', margin: '2px 0 0', letterSpacing: '0.1em' }}>
                    Talla {item.size} · ×{item.quantity}
                  </Text>
                </Column>
                <Column style={{ textAlign: 'right' }}>
                  <Text style={{ fontSize: '13px', color: '#3D2B1F', margin: 0 }}>
                    {currencyFormat(item.price * item.quantity)}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={{ borderColor: '#E3D5CA' }} />

          {/* Totales */}
          <Section style={{ paddingTop: '12px', paddingBottom: '12px' }}>
            <Row style={{ marginBottom: '6px' }}>
              <Column><Text style={{ fontSize: '12px', color: '#A89080', margin: 0 }}>Subtotal</Text></Column>
              <Column style={{ textAlign: 'right' }}><Text style={{ fontSize: '12px', color: '#A89080', margin: 0 }}>{currencyFormat(subtotal)}</Text></Column>
            </Row>
            <Row>
              <Column><Text style={{ fontSize: '13px', color: '#3D2B1F', fontWeight: 'bold', margin: 0 }}>Total</Text></Column>
              <Column style={{ textAlign: 'right' }}><Text style={{ fontSize: '13px', color: '#3D2B1F', fontWeight: 'bold', margin: 0 }}>{currencyFormat(total)}</Text></Column>
            </Row>
            <Row>
              <Column colSpan={2}><Text style={{ fontSize: '10px', color: '#A89080', margin: '4px 0 0' }}>Incluye {currencyFormat(tax)} de impuestos</Text></Column>
            </Row>
          </Section>

          <Hr style={{ borderColor: '#E3D5CA' }} />

          {/* Dirección */}
          <Section style={{ paddingTop: '20px', paddingBottom: '32px' }}>
            <Text style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#A89080', margin: '0 0 8px' }}>
              Dirección de entrega
            </Text>
            <Text style={{ fontSize: '13px', color: '#3D2B1F', margin: 0 }}>{address}</Text>
            <Text style={{ fontSize: '13px', color: '#A89080', margin: '2px 0 0' }}>{city}</Text>
          </Section>

          {/* Footer */}
          <Section style={{ borderTop: '1px solid #E3D5CA', paddingTop: '24px', textAlign: 'center' }}>
            <Text style={{ fontSize: '11px', color: '#A89080', letterSpacing: '0.15em' }}>
              © {new Date().getFullYear()} KYZZ · Basics for every you
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};
