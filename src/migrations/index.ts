import * as migration_20261004_200902_baseline from './20261004_200902_baseline';
import * as migration_20261004_201440_orcamento from './20261004_201440_orcamento';
import * as migration_20261004_204710_previsao from './20261004_204710_previsao';
import * as migration_20261108_151454_perfis from './20261108_151454_perfis';
import * as migration_20261108_151500_bloquear_api_rest from './20261108_151500_bloquear_api_rest';
import * as migration_20261108_162624_crm from './20261108_162624_crm';

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
    name: '20261108_162624_crm'
  },
];
