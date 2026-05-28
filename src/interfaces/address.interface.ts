export interface Address {
  firstName: string;
  lastName: string;
  address: string;
  address2?: string;
  postalCode: string;
  city: string;
  state?: string;   // departamento (Colombia)
  country: string;
  phone: string;
}
