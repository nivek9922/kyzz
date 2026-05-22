import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview,
  Section, Text,
} from '@react-email/components';

interface CartItem {
  title:    string;
  price:    number;
  quantity: number;
  size:     string;
}

interface Props {
  items:        CartItem[];
  recoveryUrl:  string;
  total:        number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export const AbandonedCartEmail = ({ items, recoveryUrl, total }: Props) => (
  <Html>
    <Head />
    <Preview>{`Tu carrito KYZZ te espera — ${items.length} ${items.length === 1 ? 'pieza' : 'piezas'} guardadas`}</Preview>
    <Body style={{ backgroundColor: '#FAF9F6', fontFamily: 'Georgia, serif', margin: 0, padding: 0 }}>
      <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '0 20px' }}>

        <Section style={{ textAlign: 'center', paddingBottom: '32px', borderBottom: '1px solid #E3D5CA' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 'normal', color: '#3D2B1F', letterSpacing: '0.2em', margin: 0 }}>
            KYZZ
          </Heading>
        </Section>

        <Section style={{ paddingTop: '40px', paddingBottom: '24px', textAlign: 'center' }}>
          <Text style={{ fontSize: '22px', fontWeight: 'normal', color: '#3D2B1F', margin: '0 0 12px' }}>
            Olvidaste algo
          </Text>
          <Text style={{ fontSize: '14px', color: '#A89080', lineHeight: '1.7', margin: 0 }}>
            Dejaste {items.length === 1 ? 'una pieza' : `${items.length} piezas`} en tu carrito.
            Siguen aquí, esperándote.
          </Text>
        </Section>

        <Section style={{ paddingBottom: '24px' }}>
          {items.slice(0, 4).map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid #F0E8DF',
              }}
            >
              <div>
                <Text style={{ fontSize: '14px', color: '#3D2B1F', margin: '0 0 2px' }}>{item.title}</Text>
                <Text style={{ fontSize: '12px', color: '#A89080', margin: 0 }}>
                  Talla {item.size} · Cant. {item.quantity}
                </Text>
              </div>
              <Text style={{ fontSize: '14px', color: '#8C7365', margin: 0, whiteSpace: 'nowrap' }}>
                {fmt(item.price * item.quantity)}
              </Text>
            </div>
          ))}

          {items.length > 4 && (
            <Text style={{ fontSize: '12px', color: '#A89080', margin: '8px 0 0', textAlign: 'right' }}>
              +{items.length - 4} {items.length - 4 === 1 ? 'pieza más' : 'piezas más'}
            </Text>
          )}
        </Section>

        <Section style={{ paddingBottom: '8px', borderTop: '1px solid #E3D5CA', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: '14px', color: '#3D2B1F', margin: 0 }}>Total estimado</Text>
            <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#3D2B1F', margin: 0 }}>
              {fmt(total)}
            </Text>
          </div>
        </Section>

        <Section style={{ paddingTop: '32px', paddingBottom: '40px', textAlign: 'center' }}>
          <Button
            href={recoveryUrl}
            style={{
              backgroundColor: '#3D2B1F',
              color: '#FAF9F6',
              padding: '14px 40px',
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Recuperar mi carrito
          </Button>
        </Section>

        <Hr style={{ borderColor: '#E3D5CA' }} />
        <Section style={{ paddingTop: '24px', textAlign: 'center' }}>
          <Text style={{ fontSize: '11px', color: '#A89080', letterSpacing: '0.15em', margin: 0 }}>
            © {new Date().getFullYear()} KYZZ · Si no eres tú quien hizo esta compra, ignora este mensaje.
          </Text>
        </Section>

      </Container>
    </Body>
  </Html>
);
