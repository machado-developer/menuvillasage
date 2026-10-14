# Villa Sage Menu

Menu digital do restaurante Villa Sage, desenvolvido com Next.js e App Router.

## Requisitos

- Node.js 24 LTS (ou 20.9 ou superior)
- npm

## Desenvolvimento

```sh
npm install
npm run dev
```

Abra http://localhost:3000.

## Verificações

```sh
npm test
npm run lint
npm run build
```

## Deploy na Vercel

O projecto usa Next.js com App Router e pode ser importado directamente na Vercel:

1. Importe o repositório em [vercel.com/new](https://vercel.com/new).
2. Mantenha a pasta raiz do projecto como **Root Directory**.
3. Deixe a configuração de framework, comando de build e pasta de saída em automático. A Vercel detecta Next.js e usa `npm run build`.
4. Publique o deploy. Não são necessárias variáveis de ambiente: o menu e os dados de contacto estão definidos no projecto.

Antes de publicar alterações, confirme localmente com `npm test`, `npm run lint` e `npm run build`. A página `/qr` gera o código com o endereço da página aberta; para o QR definitivo, abra-a no domínio de produção da Vercel ou no domínio personalizado já associado.
# menuvillasage
