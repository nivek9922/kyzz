import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview,
  Section, Text,
} from '@react-email/components';

export type ReturnEmailStatus = 'APPROVED' | 'REJECTED' | 'COMPLETED';

interface Props {
  customerName:    string;
  shortOrderId:    string;
  status:          ReturnEmailStatus;
  customerMessage?: string;
  orderUrl:        string;
}

const STATUS_CONFIG: Record<ReturnEmailStatus, { subject: string; headline: string; body: string; color: string }> = {
  APPROVED: {
    subject:  'Tu solicitud de devolución fue aprobada',
    headline: 'Solicitud aprobada',
    body:     'Hemos revisado tu solicitud y está aprobada. Nos pondremos en contacto contigo para coordinar los siguientes pasos.',
    color:    '#059669',
  },
  REJECTED: {
    subject:  'Actualización sobre tu solicitud de devolución',
    headline: 'Solicitud no aprobada',
    body:     'Hemos revisado tu solicitud y no podemos procesarla en este momento. Si tienes dudas, responde este correo y con gusto te ayudamos.',
    color:    '#DC2626',
  },
  COMPLETED: {
    subject:  'Tu devolución ha sido completada',
    headline: 'Devolución completada',
    body:     'El proceso de devolución ha sido completado exitosamente. Gracias por tu paciencia.',
    color:    '#8C7365',
  },
};

export const ReturnStatusEmail = ({ customerName, shortOrderId, status, customerMessage, orderUrl }: Props) => {
  const cfg = STATUS_CONFIG[status];

  return (
    <Html>
      <Head />
      <Preview>{cfg.subject} — Orden #{shortOrderId}</Preview>
      <Body style={{ backgroundColor: '#FAF9F6', fontFamily: 'Georgia, serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '0 20px' }}>

          <Section style={{ textAlign: 'center', paddingBottom: '32px', borderBottom: '1px solid #E3D5CA' }}>
            <Heading style={{ fontSize: '24px', fontWeight: 'normal', color: '#3D2B1F', letterSpacing: '0.2em', margin: 0 }}>
              KYZZ
            </Heading>
          </Section>

          <Section style={{ paddingTop: '40px', paddingBottom: '24px' }}>
            <div style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: cfg.color, marginBottom: '20px' }}>
              <Text style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#fff', margin: 0 }}>
                {cfg.headline}
              </Text>
            </div>

            <Text style={{ fontSize: '16px', color: '#3D2B1F', margin: '0 0 8px' }}>
              Hola {customerName},
            </Text>
            <Text style={{ fontSize: '14px', color: '#A89080', lineHeight: '1.7', margin: '0 0 4px' }}>
              Tu solicitud de devolución para la orden <strong style={{ color: '#3D2B1F' }}>#{shortOrderId}</strong>:
            </Text>
            <Text style={{ fontSize: '14px', color: '#A89080', lineHeight: '1.7', margin: 0 }}>
              {cfg.body}
            </Text>
          </Section>

          {customerMessage && (
            <Section style={{ paddingBottom: '24px' }}>
              <div style={{ borderLeft: '2px solid #E3D5CA', paddingLeft: '16px' }}>
                <Text style={{ fontSize: '12px', color: '#A89080', fontStyle: 'italic', margin: 0 }}>
                  {customerMessage}
                </Text>
              </div>
            </Section>
          )}

          <Section style={{ paddingBottom: '40px', textAlign: 'center' }}>
            <Button
              href={orderUrl}
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
              Ver mi orden
            </Button>
          </Section>

          <Hr style={{ borderColor: '#E3D5CA' }} />
          <Section style={{ paddingTop: '24px', textAlign: 'center' }}>
            <Text style={{ fontSize: '11px', color: '#A89080', letterSpacing: '0.15em', margin: 0 }}>
              © {new Date().getFullYear()} KYZZ · Este email es una notificación de tu solicitud de devolución.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};
