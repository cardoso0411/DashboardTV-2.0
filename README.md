# Dashboard TV

Indicadores de acessos, pedidos e plataformas de aprendizagem em uma interface web com modo de apresentação para televisores.

## Sobre o projeto

Desenvolvi este dashboard durante meu estágio de programação na **Multifluência**, com o objetivo de reunir indicadores de diferentes canais da empresa em um único painel e facilitar seu acompanhamento pela equipe.

O projeto combina uma aplicação React com uma API Node.js. A interface apresenta gráficos, filtros por empresa e período, indicadores consolidados e um modo TV com alternância automática entre os painéis.

## Adaptação para este repositório

Por questões de segurança e em respeito às políticas da empresa, esta versão utiliza **clientes, nomes e dados fictícios**. As informações exibidas servem apenas para demonstrar o funcionamento do dashboard.

Na versão original, o backend consultava bancos **MySQL**, por meio do **MySQL2**, e integrava serviços como **Google Analytics**, **UptimeRobot** e APIs das plataformas acompanhadas. Para disponibilizar esta demonstração, substituí essas consultas por um módulo local que gera métricas em memória e simula a disponibilidade dos serviços.

Também removi as credenciais, as dependências dessas integrações e o fluxo de login e cadastro. A versão atual abre diretamente no painel, sem exigir banco de dados ou acesso aos sistemas da empresa. Os gráficos, filtros e a apresentação em TV foram preservados.

## Tecnologias utilizadas

| Tecnologia | Aplicação no projeto |
| --- | --- |
| **React** | Componentes, navegação e atualização da interface. |
| **TypeScript** | Tipagem dos dados e dos componentes do frontend. |
| **Vite** | Servidor de desenvolvimento e geração do build. |
| **Chart.js e react-chartjs-2** | Gráficos de acessos, pedidos e comparação de indicadores. |
| **CSS** | Layout responsivo, identidade visual e apresentação no modo TV. |
| **Node.js** | Execução do backend e geração dos dados demonstrativos. |
| **Express** | Rotas da API HTTP e entrega do frontend compilado. |
| **Node Test Runner** | Testes dos indicadores e dos contratos da API. |
| **Concurrently e cross-env** | Inicialização do ambiente de desenvolvimento. |
| **PM2 e script Batch** | Inicialização opcional do painel em modo quiosque no Windows. |

MySQL2 e as bibliotecas de integração com serviços externos fizeram parte da implementação original e foram removidos desta versão.

## O que é possível explorar

- **Visão Geral:** comparação de acessos e resumo da disponibilidade simulada.
- **Catálogos:** cinco canais fictícios, com filtros por empresa e períodos de 7, 15 e 30 dias.
- **Ambientes LMS:** indicadores de educandos, cursos, conclusões e acessos de duas instituições fictícias.
- **Plataforma Demo:** acompanhamento do site e do ambiente de aprendizagem.
- **Painel TV:** rotação automática dos painéis, com controles para pausar e avançar a apresentação.

Os valores são gerados de forma determinística por cliente e data: um mesmo dia apresenta os mesmos números entre páginas e períodos, inclusive após reiniciar a aplicação. O calendário usa o fuso `America/Sao_Paulo`, e os indicadores de ciclo representam os últimos 30 dias. A disponibilidade é simulada, sem monitoramento de serviços reais.

## Como executar

Requer **Node.js 22 ou superior** e **npm**. A instalação das dependências precisa de internet; depois disso, o dashboard funciona localmente sem conexão externa e sem arquivos de credenciais.

```bash
npm ci
npm run dev
```

Acesse [localhost:5173](http://localhost:5173). O frontend utiliza essa porta, e o backend funciona na porta `3339`. Encerre processos de versões anteriores antes de iniciar, pois o comando de desenvolvimento reutiliza um backend já ativo nessa porta.

Para gerar o build e executar a versão compilada:

```bash
npm start
```

Acesse [o dashboard](http://127.0.0.1:3339) ou abra diretamente [o Painel TV](http://127.0.0.1:3339/#painel-tv).

No Windows, o arquivo `abrir_painel_tv.bat` automatiza a compilação, a inicialização pelo PM2 e a abertura do Chrome em modo quiosque. Esse recurso opcional exige Google Chrome e PM2 instalado globalmente com `npm install --global pm2`.

## Organização do código

```text
backend/
  demo-data.js       Geração e consolidação dos dados fictícios
  server.js          API HTTP e entrega do frontend
  dev-server.js      Inicialização do backend em desenvolvimento
  *.test.js          Testes dos dados e das rotas
frontend/
  src/
    components/      Gráficos e componentes de layout
    pages/           Páginas e apresentação em TV
    styles/          Estilos e responsividade
    types/           Tipos dos dados do dashboard
    utils/           Utilitários de comunicação com a API
abrir_painel_tv.bat  Inicializador opcional para Windows
```

## Validação

```bash
npm test
npm run build
```

Os testes verificam os contratos HTTP, as respostas para rotas inexistentes, a consistência dos períodos e totais, a disponibilidade simulada e as mudanças de data no calendário. O build valida o TypeScript e gera os arquivos do frontend.
