import * as migration_20261004_200902_baseline from './20261004_200902_baseline';
import * as migration_20261004_201440_orcamento from './20261004_201440_orcamento';
import * as migration_20261004_204710_previsao from './20261004_204710_previsao';
import * as migration_20261108_151454_perfis from './20261108_151454_perfis';
import * as migration_20261108_151500_bloquear_api_rest from './20261108_151500_bloquear_api_rest';
import * as migration_20261108_162624_crm from './20261108_162624_crm';
import * as migration_20261111_204039_crm_meu_dia from './20261111_204039_crm_meu_dia';
import * as migration_20261111_211329_crm_aguardando_retorno from './20261111_211329_crm_aguardando_retorno';
import * as migration_20261111_235906_crm_canal_ruim from './20261111_235906_crm_canal_ruim';
import * as migration_20261117_114045_crm_virada_do_dia from './20261117_114045_crm_virada_do_dia';
import * as migration_20261120_200453_crm_automacao from './20261120_200453_crm_automacao';
import * as migration_20261121_003405_crm_automacao_provedores from './20261121_003405_crm_automacao_provedores';
import * as migration_20261121_005308_crm_email_vendedor_catalogo from './20261121_005308_crm_email_vendedor_catalogo';

export const migrations = [
  {
    up: migration_20261004_200902_baseline.up,
    down: migration_20261004_200902_baseline.down,
    name: '20261004_200902_baseline',
  },
  {
    up: migration_20261004_201440_orcamento.up,
    down: migration_20261004_201440_orcamento.down,
    name: '20261004_201440_orcamento',
  },
  {
    up: migration_20261004_204710_previsao.up,
    down: migration_20261004_204710_previsao.down,
    name: '20261004_204710_previsao',
  },
  {
    up: migration_20261108_151454_perfis.up,
    down: migration_20261108_151454_perfis.down,
    name: '20261108_151454_perfis',
  },
  {
    up: migration_20261108_151500_bloquear_api_rest.up,
    down: migration_20261108_151500_bloquear_api_rest.down,
    name: '20261108_151500_bloquear_api_rest',
  },
  {
    up: migration_20261108_162624_crm.up,
    down: migration_20261108_162624_crm.down,
    name: '20261108_162624_crm',
  },
  {
    up: migration_20261111_204039_crm_meu_dia.up,
    down: migration_20261111_204039_crm_meu_dia.down,
    name: '20261111_204039_crm_meu_dia',
  },
  {
    up: migration_20261111_211329_crm_aguardando_retorno.up,
    down: migration_20261111_211329_crm_aguardando_retorno.down,
    name: '20261111_211329_crm_aguardando_retorno',
  },
  {
    up: migration_20261111_235906_crm_canal_ruim.up,
    down: migration_20261111_235906_crm_canal_ruim.down,
    name: '20261111_235906_crm_canal_ruim',
  },
  {
    up: migration_20261117_114045_crm_virada_do_dia.up,
    down: migration_20261117_114045_crm_virada_do_dia.down,
    name: '20261117_114045_crm_virada_do_dia',
  },
  {
    up: migration_20261120_200453_crm_automacao.up,
    down: migration_20261120_200453_crm_automacao.down,
    name: '20261120_200453_crm_automacao',
  },
  {
    up: migration_20261121_003405_crm_automacao_provedores.up,
    down: migration_20261121_003405_crm_automacao_provedores.down,
    name: '20261121_003405_crm_automacao_provedores',
  },
  {
    up: migration_20261121_005308_crm_email_vendedor_catalogo.up,
    down: migration_20261121_005308_crm_email_vendedor_catalogo.down,
    name: '20261121_005308_crm_email_vendedor_catalogo'
  },
];
