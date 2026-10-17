# Villa Sage Menu

Menu digital do restaurante Villa Sage com painel administrativo, gestão de categorias e produtos, autenticação no servidor e persistência PostgreSQL através do Prisma.

## Requisitos

- Node.js 20.9+
- npm
- Banco de dados PostgreSQL acessível pela aplicação

## Configuração rápida

1. Crie ou escolha uma base de dados PostgreSQL com ligação TLS, por exemplo Neon, Railway, Prisma Postgres ou outro serviço PostgreSQL.
2. Copie `.env.example` para `.env.local` e substitua os valores:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=uma-senha-forte-e-unica
ADMIN_SESSION_SECRET=segredo-aleatorio-com-pelo-menos-32-caracteres
```

Gere `ADMIN_SESSION_SECRET` com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Mantenha `.env.local` privado; nunca publique as credenciais.

3. Instale as dependências e gere o cliente Prisma:

```sh
npm install
npx prisma generate
```

4. Aplique as migrações à base de dados:

```sh
npm run db:deploy
```

O comando carrega `.env.local` antes de iniciar o Prisma CLI, tanto em Windows como em Linux/macOS.

O administrador inicial pode ser definido pelas variáveis `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env.local` ou criado directamente na base de dados com o comando `npm run admin:create`.

## Desenvolvimento

```sh
npm install
npm run dev
```

Abra http://localhost:3000.

## Autenticação e Painel Administrativo

Aceda a `/login` ou `/admin` para entrar no painel. O sistema suporta utilizadores na base de dados PostgreSQL (tabela `admin_users` com encriptação `scrypt`) e credenciais de fallback em `.env.local`. A sessão é assinada criptograficamente no servidor e enviada num cookie `HttpOnly` seguro (`villa_sage_admin`).

### Criar ou actualizar administrador na base de dados:

```sh
# Cria ou actualiza com as credenciais do .env.local
npm run admin:create

# Ou especifique email, senha e nome:
node scripts/create-admin.mjs admin@villasage.com MinhaSenhaForte2026! "Gestor Villa Sage"
```

### Funcionalidades do painel:

- adicionar e editar categorias
- adicionar e editar produtos
- reordenar categorias e produtos (botões ↑ e ↓)
- adicionar fotos
- ativar/desativar itens sem eliminar
- eliminar categorias e produtos
- ver o menu público actualizado imediatamente após cada operação (com revalidação de cache)

## Base de dados e Prisma

Os dados persistentes ficam em PostgreSQL (Prisma Postgres, Neon, Railway ou qualquer PostgreSQL). A ligação é realizada exclusivamente através da variável de ambiente `DATABASE_URL`. O schema Prisma em `prisma/schema.prisma` define os modelos:

- `MenuCategory` (tabela `menu_categories` com `id`, `name`, `group`, `is_active`, `sort_order`, `created_at`, `updated_at`)
- `MenuItem` (tabela `menu_items` com `id`, `category_id`, `name`, `description`, `price`, `image_url`, `is_active`, `sort_order`, `created_at`, `updated_at`)

Comandos disponíveis para gestão da base de dados:

```sh
# Aplicar migrações versionadas em produção
npm run db:deploy

# Sincronizar o schema diretamente (desenvolvimento)
npm run db:push

# Semear dados iniciais de demonstração (se a base estiver vazia)
npm run db:seed
```

As fotografias carregadas pelo painel administrativo são processadas no servidor com `sharp` (redimensionamento máx. 1200×1200 px mantendo proporção, conversão para WebP a 80% de qualidade e remoção de metadados EXIF) e guardadas de forma persistente no **Vercel Blob**. O URL HTTPS resultante é armazenado no campo `image_url` do PostgreSQL.

## Verificações

```sh
npm run lint
npm run build
```

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Adicione a integração **Vercel Blob** no dashboard do projecto (Storage → Blob → Create Database) para disponibilizar automaticamente a variável `BLOB_READ_WRITE_TOKEN`.
3. Configure `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_SESSION_SECRET` como variáveis de ambiente no dashboard da Vercel.
4. Execute `npx prisma migrate deploy` durante o deploy (ou execute `npm run db:deploy`).
5. Publique o deploy. O build gera o cliente Prisma via `postinstall`.
6. A página pública lê o menu do PostgreSQL e o painel administrativo permite gerir categorias, produtos e fotografias em Vercel Blob.
# menuvillasage
