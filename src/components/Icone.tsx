import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudRain,
  LifeBuoy,
  MapPin,
  Phone,
  Search,
  Users,
  Waves,
} from 'lucide-react-native';

const ICONES = {
  agora: CloudRain,
  bairro: Users,
  plano: MapPin,
  registro: Clock,
  tudoBem: Check,
  aguaSubindo: Waves,
  precisoAjuda: LifeBuoy,
  ligar: Phone,
  voltar: ChevronLeft,
  abrir: ChevronRight,
  trocar: ChevronDown,
  buscar: Search,
  marcado: Check,
} as const;

export type NomeIcone = keyof typeof ICONES;

interface Props {
  nome: NomeIcone;
  cor: string;
  tamanho?: number;
}

/** Ícone só enfeita: o significado sempre vem escrito ao lado, por isso fica fora da leitura de tela. */
export function Icone({ nome, cor, tamanho = 24 }: Props) {
  const Desenho = ICONES[nome];
  return (
    <Desenho
      color={cor}
      size={tamanho}
      strokeWidth={1.5}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
