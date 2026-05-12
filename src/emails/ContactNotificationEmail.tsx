import {
  Body, Container, Head, Heading, Hr, Html, Preview,
  Section, Text,
} from '@react-email/components';

interface Props {
  senderName:  string;
  senderEmail: string;
  subject:     string;
  message:     string;
}

export const ContactNotificationEmail = ({
  senderName,
  senderEmail,
  subject,
  message,
}: Props) => (
  <Html>
    <Head />
    <Preview>Nuevo mensaje de {senderName} — {subject}</Preview>
    <Body style={{ backgroundColor: '#FAF9F6', fontFamily: 'Georgia, serif', margin: 0, padding: 0 }}>
      <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '0 20px' }}>

        {/* Header */}
        <Section style={{ textAlign: 'center', paddingBottom: '32px', borderBottom: '1px solid #E3D5CA' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 'normal', color: '#3D2B1F', letterSpacing: '0.2em', margin: 0 }}>
            KYZZ
          </Heading>
          <Text style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#A89080', margin: '4px 0 0' }}>
            Formulario de contacto
          </Text>
        </Section>

        {/* Asunto */}
        <Section style={{ paddingTop: '32px', paddingBottom: '8px' }}>
          <Text style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#A89080', margin: '0 0 6px' }}>
            Asunto
          </Text>
          <Text style={{ fontSize: '15px', color: '#3D2B1F', margin: 0, fontWeight: 'bold' }}>
            {subject}
          </Text>
        </Section>

        <Hr style={{ borderColor: '#E3D5CA', marginTop: '20px' }} />

        {/* Datos del remitente */}
        <Section style={{ paddingTop: '20px', paddingBottom: '20px', display: 'flex', gap: '32px' }}>
          <div style={{ marginBottom: '12px' }}>
            <Text style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#A89080', margin: '0 0 4px' }}>
              Nombre
            </Text>
            <Text style={{ fontSize: '14px', color: '#3D2B1F', margin: 0 }}>{senderName}</Text>
          </div>
          <div>
            <Text style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#A89080', margin: '0 0 4px' }}>
              Email
            </Text>
            <Text style={{ fontSize: '14px', color: '#3D2B1F', margin: 0 }}>{senderEmail}</Text>
          </div>
        </Section>

        <Hr style={{ borderColor: '#E3D5CA' }} />

        {/* Mensaje */}
        <Section style={{ paddingTop: '24px', paddingBottom: '32px' }}>
          <Text style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#A89080', margin: '0 0 12px' }}>
            Mensaje
          </Text>
          <Text style={{
            fontSize: '14px',
            color: '#3D2B1F',
            lineHeight: '1.7',
            margin: 0,
            padding: '20px',
            backgroundColor: '#F5F0EB',
            borderLeft: '2px solid #C9A882',
            whiteSpace: 'pre-wrap',
          }}>
            {message}
          </Text>
        </Section>

        {/* Acción */}
        <Section style={{ backgroundColor: '#F5F0EB', padding: '16px 20px', marginBottom: '32px' }}>
          <Text style={{ fontSize: '12px', color: '#A89080', margin: 0, lineHeight: '1.5' }}>
            Responde directamente a este email — llegará a{' '}
            <strong style={{ color: '#3D2B1F' }}>{senderEmail}</strong>
          </Text>
        </Section>

        {/* Footer */}
        <Section style={{ borderTop: '1px solid #E3D5CA', paddingTop: '24px', textAlign: 'center' }}>
          <Text style={{ fontSize: '11px', color: '#A89080', letterSpacing: '0.15em' }}>
            © {new Date().getFullYear()} KYZZ · Panel interno
          </Text>
        </Section>

      </Container>
    </Body>
  </Html>
);
