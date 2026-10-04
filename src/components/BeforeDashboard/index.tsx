import { Banner } from '@payloadcms/ui/elements/Banner'
import type { ServerProps } from 'payload'
import React from 'react'

import { canReadBudgetUser, isAdminUser } from '@/access/roles'

import './index.css'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC<ServerProps> = ({ user, payload }) => {
  const adminRoute = payload?.config.routes.admin ?? '/admin'

  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>Bem-vindo ao painel da WSoft</h4>
      </Banner>
      {isAdminUser(user) && (
        <p>
          Edite os produtos, o global &quot;Configurações do Site&quot; e a biblioteca de mídia
          para atualizar o conteúdo do site.
        </p>
      )}
      {canReadBudgetUser(user) && (
        <p>
          Orçamento: acompanhe os indicadores no{' '}
          <a href={`${adminRoute}/orcamento`}>
            <strong>Painel do orçamento</strong>
          </a>{' '}
          e lance os valores em &quot;Despesas&quot;.
        </p>
      )}
    </div>
  )
}

export default BeforeDashboard
