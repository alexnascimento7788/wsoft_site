import { Banner } from '@payloadcms/ui/elements/Banner'
import React from 'react'

import './index.css'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>Bem-vindo ao painel da WSoft</h4>
      </Banner>
      Edite os produtos, o global &quot;Configurações do Site&quot; e a biblioteca de mídia para
      atualizar o conteúdo do site.
    </div>
  )
}

export default BeforeDashboard
