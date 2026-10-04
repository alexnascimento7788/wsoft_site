import * as migration_20261004_200902_baseline from './20261004_200902_baseline';
import * as migration_20261004_201440_orcamento from './20261004_201440_orcamento';
import * as migration_20261004_204710_previsao from './20261004_204710_previsao';

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
    name: '20261004_204710_previsao'
  },
];
