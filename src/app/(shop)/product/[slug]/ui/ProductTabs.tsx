"use client";

import { useState } from "react";
import { IoChevronDownOutline } from "react-icons/io5";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

const TABS: Tab[] = [
  {
    id: "sizes",
    label: "Guía de tallas",
    content: (
      <div className="space-y-4 text-sm text-kyzz-muted leading-relaxed">
        <p>Para encontrar tu talla perfecta, toma tus medidas con una cinta métrica:</p>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-kyzz-secondary">
              <th className="text-left py-2 pr-4 text-kyzz-dark font-medium">Talla</th>
              <th className="text-left py-2 pr-4">Busto (cm)</th>
              <th className="text-left py-2 pr-4">Cintura (cm)</th>
              <th className="text-left py-2">Cadera (cm)</th>
            </tr>
          </thead>
          <tbody>
            {[
              { t: "XS", b: "80–83",  w: "62–65",  h: "88–91"  },
              { t: "S",  b: "84–87",  w: "66–69",  h: "92–95"  },
              { t: "M",  b: "88–91",  w: "70–73",  h: "96–99"  },
              { t: "L",  b: "92–95",  w: "74–78",  h: "100–103"},
              { t: "XL", b: "96–99",  w: "79–83",  h: "104–107"},
              { t: "XXL",b: "100–104",w: "84–88",  h: "108–112"},
            ].map((row) => (
              <tr key={row.t} className="border-b border-kyzz-secondary/50">
                <td className="py-2 pr-4 text-kyzz-dark font-medium">{row.t}</td>
                <td className="py-2 pr-4">{row.b}</td>
                <td className="py-2 pr-4">{row.w}</td>
                <td className="py-2">{row.h}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs">Si estás entre dos tallas, te recomendamos elegir la más grande.</p>
      </div>
    ),
  },
  {
    id: "shipping",
    label: "Envíos",
    content: (
      <div className="space-y-3 text-sm text-kyzz-muted leading-relaxed">
        <p><span className="text-kyzz-dark font-medium">Colombia:</span> 5–8 días hábiles. Despacho el mismo día para órdenes antes de las 2:00 p.m.</p>
        <p><span className="text-kyzz-dark font-medium">Bogotá:</span> 2–3 días hábiles con servicio express disponible.</p>
        <p>Recibirás un correo de confirmación con número de seguimiento una vez despachado tu pedido.</p>
        <p className="text-xs">Los tiempos de entrega pueden variar durante temporadas de alta demanda.</p>
      </div>
    ),
  },
  {
    id: "returns",
    label: "Cambios y garantías",
    content: (
      <div className="space-y-3 text-sm text-kyzz-muted leading-relaxed">
        <p>Aceptamos cambios dentro de los <span className="text-kyzz-dark font-medium">30 días</span> siguientes a la recepción del pedido.</p>
        <p>La prenda debe estar en perfecto estado: sin uso, sin lavar, con todas las etiquetas originales intactas.</p>
        <p>Para iniciar un cambio, escríbenos a <span className="text-kyzz-dark">hola@kyzz.co</span> con tu número de orden.</p>
        <p className="text-xs">Nota: Los gastos de envío por cambio corren por cuenta del cliente, salvo en casos de defectos de fábrica.</p>
      </div>
    ),
  },
  {
    id: "payment",
    label: "Métodos de pago",
    content: (
      <div className="space-y-3 text-sm text-kyzz-muted leading-relaxed">
        <p>
          Procesamos todos los pagos a través de <span className="text-kyzz-dark">Wompi</span>,
          la pasarela oficial de Bancolombia. Elige el método que prefieras:
        </p>
        <ul className="space-y-2 list-none">
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-kyzz-muted shrink-0" />
            Tarjeta débito o crédito — Visa, Mastercard, American Express
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-kyzz-muted shrink-0" />
            PSE — débito directo desde tu banco
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-kyzz-muted shrink-0" />
            Nequi
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-kyzz-muted shrink-0" />
            DaviPlata
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-kyzz-muted shrink-0" />
            Transferencia Bancolombia
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-kyzz-muted shrink-0" />
            QR Interoperable
          </li>
        </ul>
      </div>
    ),
  },
];

export const ProductTabs = () => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className="divide-y divide-kyzz-secondary">
      {TABS.map((tab) => {
        const isOpen = openId === tab.id;
        return (
          <div key={tab.id}>
            <button
              onClick={() => toggle(tab.id)}
              className="w-full flex items-center justify-between py-4 text-left group"
              aria-expanded={isOpen}
            >
              <span className="text-xs tracking-widest uppercase text-kyzz-dark group-hover:text-kyzz-primary transition-colors">
                {tab.label}
              </span>
              <IoChevronDownOutline
                className={`text-kyzz-muted transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                size={14}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? "max-h-96 pb-5" : "max-h-0"
              }`}
            >
              {tab.content}
            </div>
          </div>
        );
      })}
    </div>
  );
};
