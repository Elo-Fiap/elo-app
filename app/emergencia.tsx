import { Folha, LinhasEmergencia } from '../src/components';

export default function TelaEmergencia() {
  return (
    <Folha titulo="Emergência" apoio="Abre o discador do telefone.">
      <LinhasEmergencia />
    </Folha>
  );
}
