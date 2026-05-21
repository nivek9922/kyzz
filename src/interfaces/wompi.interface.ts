export type WompiTxStatus = 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED' | 'PENDING';

export interface WompiTransactionResponse {
  id:                  string;
  reference:           string;
  status:              WompiTxStatus;
  amount_in_cents:     number;
  currency:            string;
  payment_method_type: string;
  customer_email:      string;
  created_at:          string;
  finalized_at?:       string | null;
  payment_method?: {
    type:    string;
    extra?:  Record<string, unknown>;
  };
}

export interface WompiWebhookBody {
  event:     string;
  data: {
    transaction: {
      id:              string;
      reference:       string;
      status:          WompiTxStatus;
      amount_in_cents: number;
      currency:        string;
      payment_method_type?: string;
    };
  };
  signature: {
    properties: string[];
    checksum:   string;
  };
  timestamp: number;
  sent_at:   string;
}
