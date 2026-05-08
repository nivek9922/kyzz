import { titleFont } from '@/config/fonts';

interface Props {
  title: string;
  subtitle?: string;
  className?: string;
}

export const Title = ({ title, subtitle, className }: Props) => {
  return (
    <div className={className}>
      <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark leading-snug`}>
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-xs tracking-widest uppercase text-kyzz-muted">{subtitle}</p>
      )}
    </div>
  );
};