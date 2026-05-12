import {
  Body, Container, Head, Heading, Hr, Html, Preview,
  Section, Text,
} from '@react-email/components';

interface Props {
  firstName: string;
  subject:   string;
  message:   string;
}

export const ContactAutoReplyEmail = ({ firstName, subject, message }: Props) => (
  <Html>
    <Head />
    <Preview>Recibimos tu mensaje, {firstName} — te responderemos pronto</Preview>
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
        <Section style={{ paddingTop: '36px', paddingBottom: '8px' }}>
          <Text style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#A89080', margin: '0 0 16px' }}>
            ✦
          </Text>
          <Text style={{ fontSize: '16px', color: '#3D2B1F', margin: '0 0 12px' }}>
            Hola, {firstName}
          </Text>
          <Text style={{ fontSize: '14px', color: '#A89080', lineHeight: '1.7', margin: 0 }}>
            Recibimos tu mensaje y te responderemos en menos de{' '}
            <strong style={{ color: '#3D2B1F' }}>24 horas</strong>.
          </Text>
        </Section>

        <Hr style={{ borderColor: '#E3D5CA', marginTop: '28px' }} />

        {/* Resumen del mensaje */}
        <Section style={{ paddingTop: '24px', paddingBottom: '32px' }}>
          <Text style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#A89080', margin: '0 0 16px' }}>
            Tu mensaje
          </Text>

          <div style={{ marginBottom: '16px' }}>
            <Text style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#A89080', margin: '0 0 4px' }}>
              Asunto
            </Text>
            <Text style={{ fontSize: '13px', color: '#3D2B1F', margin: 0 }}>{subject}</Text>
          </div>

          <Text style={{
            fontSize: '13px',
            color: '#7A6558',
            lineHeight: '1.7',
            margin: 0,
            padding: '16px 20px',
            backgroundColor: '#F5F0EB',
            borderLeft: '2px solid #E3D5CA',
            whiteSpace: 'pre-wrap',
          }}>
            {message}
          </Text>
        </Section>

        <Hr style={{ borderColor: '#E3D5CA' }} />

        {/* Info de contacto */}
        <Section style={{ paddingTop: '24px', paddingBottom: '32px' }}>
          <Text style={{ fontSize: '13px', color: '#A89080', lineHeight: '1.7', margin: 0, textAlign: 'center' }}>
            Si tienes alguna duda adicional puedes escribirnos a{' '}
            <strong style={{ color: '#3D2B1F' }}>hola@kyzz.co</strong>
          </Text>
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
