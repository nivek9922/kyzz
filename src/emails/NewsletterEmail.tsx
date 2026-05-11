import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Img, Preview, Row, Column, Section, Text,
} from '@react-email/components';

interface ProductItem {
  title: string;
  price: number;
  slug:  string;
  imageUrl: string;
}

interface Props {
  headline:       string;
  message:        string;
  products:       ProductItem[];
  subscriberId:   string;
  appUrl:         string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export const NewsletterEmail = ({ headline, message, products, subscriberId, appUrl }: Props) => (
  <Html lang="es">
    <Head />
    <Preview>{headline}</Preview>
    <Body style={{ backgroundColor: '#FAF9F6', fontFamily: 'Georgia, serif', margin: 0, padding: 0 }}>
      <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '0 20px' }}>

        {/* Header */}
        <Section style={{ textAlign: 'center', paddingBottom: '32px', borderBottom: '1px solid #E3D5CA' }}>
          <Heading style={{ fontSize: '22px', fontWeight: 'normal', color: '#3D2B1F', letterSpacing: '0.3em', margin: 0 }}>
            KYZZ
          </Heading>
          <Text style={{ fontSize: '9px', letterSpacing: '0.4em', textTransform: 'uppercase', color: '#A89080', margin: '4px 0 0' }}>
            Accessible Luxury
          </Text>
        </Section>

        {/* Headline */}
        <Section style={{ paddingTop: '40px', paddingBottom: '24px' }}>
          <Heading style={{ fontSize: '26px', fontWeight: 'normal', color: '#3D2B1F', letterSpacing: '0.05em', margin: '0 0 16px', textAlign: 'center' }}>
            {headline}
          </Heading>
          <Text style={{ fontSize: '14px', color: '#7A5C50', lineHeight: '1.7', textAlign: 'center', margin: 0 }}>
            {message}
          </Text>
        </Section>

        {/* Productos */}
        {products.length > 0 && (
          <Section style={{ paddingTop: '32px' }}>
            <Row>
              {products.slice(0, 3).map((p, i) => {
                const count      = Math.min(products.length, 3);
                const colWidth   = count === 1 ? 520 : count === 2 ? 250 : 160;
                const imgHeight  = Math.round(colWidth * 1.33);
                const isPublic   = p.imageUrl.startsWith('https://');
                const isLast     = i === products.length - 1;
                return (
                  <Column key={i} style={{ width: colWidth, paddingRight: isLast ? 0 : 10, verticalAlign: 'top' }}>
                    <a href={`${appUrl}/product/${p.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                      {isPublic ? (
                        <Img
                          src={p.imageUrl}
                          alt={p.title}
                          width={colWidth}
                          height={imgHeight}
                          style={{ display: 'block', objectFit: 'cover', backgroundColor: '#F0EBE5' }}
                        />
                      ) : (
                        <div style={{
                          width: colWidth,
                          height: imgHeight,
                          backgroundColor: '#EDE8E3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: '10px', color: '#A89080', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center', margin: 0 }}>
                            KYZZ
                          </Text>
                        </div>
                      )}
                      <Text style={{ fontSize: '12px', color: '#3D2B1F', letterSpacing: '0.05em', margin: '10px 0 2px', textAlign: 'center' }}>
                        {p.title}
                      </Text>
                      <Text style={{ fontSize: '11px', color: '#A89080', margin: 0, textAlign: 'center' }}>
                        {fmt(p.price)}
                      </Text>
                    </a>
                  </Column>
                );
              })}
            </Row>
          </Section>
        )}

        {/* CTA */}
        <Section style={{ textAlign: 'center', paddingTop: '40px', paddingBottom: '40px' }}>
          <Button
            href={`${appUrl}/products`}
            style={{
              display: 'inline-block',
              backgroundColor: '#3D2B1F',
              color: '#FAF9F6',
              fontSize: '10px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              padding: '14px 32px',
              textDecoration: 'none',
            }}
          >
            Ver colección
          </Button>
        </Section>

        {/* Footer */}
        <Hr style={{ borderColor: '#E3D5CA', margin: '0 0 24px' }} />
        <Section style={{ textAlign: 'center' }}>
          <Text style={{ fontSize: '10px', color: '#C4A99A', letterSpacing: '0.1em', margin: '0 0 8px' }}>
            © {new Date().getFullYear()} KYZZ · Accessible Luxury
          </Text>
          <Text style={{ fontSize: '10px', color: '#C4A99A', margin: 0 }}>
            Recibiste este email porque te suscribiste a nuestra lista.{' '}
            <a href={`${appUrl}/api/newsletter/unsubscribe?id=${subscriberId}`} style={{ color: '#A89080' }}>
              Cancelar suscripción
            </a>
          </Text>
        </Section>

      </Container>
    </Body>
  </Html>
);
