import { titleFont } from '@/config/fonts';
import { AddressForm } from './ui/AddressForm';
import { getCountries, getUserAddress } from '@/actions';
import { auth } from '@/auth';

export default async function AddressPage() {
  const session  = await auth();
  const isGuest  = !session?.user;
  const countries = await getCountries();
  const userAddress = isGuest ? undefined : (await getUserAddress() ?? undefined);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 mb-24">
      <div className="mb-10">
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Dirección de entrega
        </h1>
        <div className="kyzz-divider-left" />
      </div>
      <AddressForm countries={countries} userStoredAddress={userAddress} isGuest={isGuest} />
    </div>
  );
}
