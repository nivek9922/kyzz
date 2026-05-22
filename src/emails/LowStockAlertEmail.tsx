import {
  Body, Container, Head, Heading, Hr, Html, Preview,
  Section, Text,
} from '@react-email/components';

interface LowStockProduct {
  title:   string;
  inStock: number;
}

interface Props {
  products: LowStockProduct[];
}

export const LowStockAlertEmail = ({ products }: Props) => {
  return (
    <Html>
      <Head />
      <Preview>{`Stock bajo: ${products.length} producto(s) requieren reposición`}</Preview>
      <Body style={{ backgroundColor: '#FAF9F6', fontFamily: 'Georgia, serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '0 20px' }}>

          <Section style={{ textAlign: 'center', paddingBottom: '32px', borderBottom: '1px solid #E3D5CA' }}>
            <Heading style={{ fontSize: '24px', fontWeight: 'normal', color: '#3D2B1F', letterSpacing: '0.2em', margin: 0 }}>
              KYZZ
            </Heading>
            <Text style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#A89080', margin: '4px 0 0' }}>
              Alerta de inventario
            </Text>
          </Section>

          <Section style={{ paddingTop: '32px', paddingBottom: '8px' }}>
            <Text style={{ fontSize: '16px', color: '#3D2B1F', margin: 0 }}>
              {products.length === 1
                ? 'Un producto cruzó el umbral de stock bajo'
                : `${products.length} productos cruzaron el umbral de stock bajo`}
            </Text>
            <Text style={{ fontSize: '14px', color: '#A89080', lineHeight: '1.6', marginTop: '8px' }}>
              Tras la última compra, estos productos quedaron con poco inventario. Considera reponerlos pronto.
            </Text>
          </Section>

          <Section style={{ paddingTop: '16px', paddingBottom: '24px' }}>
            {products.map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #F0E8DF',
                }}
              >
                <Text style={{ fontSize: '14px', color: '#3D2B1F', margin: 0 }}>{p.title}</Text>
                <Text
                  style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: p.inStock === 0 ? '#DC2626' : '#D97706',
                    margin: 0,
                  }}
                >
                  {p.inStock === 0 ? 'Sin stock' : `${p.inStock} uds.`}
                </Text>
              </div>
            ))}
          </Section>

          <Hr style={{ borderColor: '#E3D5CA' }} />
          <Section style={{ paddingTop: '24px', textAlign: 'center' }}>
            <Text style={{ fontSize: '11px', color: '#A89080', letterSpacing: '0.15em' }}>
              © {new Date().getFullYear()} KYZZ · Panel de administración
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};
