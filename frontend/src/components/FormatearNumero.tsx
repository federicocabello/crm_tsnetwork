type Props = {
  numero: number;
};

export default function FormatearNumero({ numero }: Props) {
  const formatear = (num: number) => {
    return num.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return <span>$ {formatear(numero)}</span>;
}
