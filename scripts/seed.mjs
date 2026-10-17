/**
 * Seed script para Prisma Postgres com upload de imagens para Vercel Blob.
 *
 * - Carrega as variáveis de ambiente do .env.local.
 * - Cria todas as categorias e produtos do menu Villa Sage.
 * - Para cada produto que tenha uma fotografia em src/assets/, faz upload para
 *   o Vercel Blob com optimização via sharp (WebP, 1200×1200 máx., sem EXIF).
 * - Se já existirem registos, o seed é ignorado para evitar duplicados.
 *
 * Uso:
 *   npm run db:seed
 *
 * Pré-requisitos:
 *   - DATABASE_URL no .env.local
 *   - BLOB_READ_WRITE_TOKEN no .env.local (ou nas variáveis da Vercel)
 */

import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { put } from "@vercel/blob";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL não está configurada no .env.local.");
  process.exit(1);
}

const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
if (!hasBlobToken) {
  console.warn(
    "⚠️  BLOB_READ_WRITE_TOKEN não está configurada — as imagens NÃO serão carregadas para o Vercel Blob.",
  );
  console.warn(
    "   Adicione BLOB_READ_WRITE_TOKEN ao .env.local para activar o upload de imagens.",
  );
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Caminhos base para os assets locais
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "../src/assets");
const menuPhotosDir = path.join(assetsDir, "menu-photos");
const villasageDir = path.join(assetsDir, "villasage");

// ─────────────────────────────────────────────────────────────────────────────
// Mapeamento dos produtos → ficheiros de imagem locais
// Cada entrada: [categoriaId, índiceDoItem] → caminho relativo ao assetsDir
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, string>} chave: "catId-itemIndex" → caminho do ficheiro */
const itemImagePaths = {
  // Entradas
  "entradas-0": "menu-photos/appetizer-couvert.jpg",
  "entradas-1": "menu-photos/appetizer-frango-passarinho.jpg",
  "entradas-2": "menu-photos/appetizer-bread-rolls.jpg",
  "entradas-3": "menu-photos/appetizer-choco-fried-pieces.jpg",
  "entradas-4": "menu-photos/appetizer-chorizo.jpg",
  "entradas-5": "menu-photos/appetizer-garlic-shrimp.jpg",
  "entradas-6": "menu-photos/appetizer-tripe-curry.jpg",
  "entradas-7": "menu-photos/appetizer-beef-stew.jpg",
  "entradas-8": "villasage/a72f663e-7e6d-4b15-970d-ad2270b4b9b9.jpeg", // Gambas
  "entradas-9": "menu-photos/appetizer-olives.jpg",
  "entradas-10": "menu-photos/appetizer-peanuts.jpg",

  // Sopas
  "sopas-0": "menu-photos/soup-caldo-verde.jpg",
  "sopas-1": "menu-photos/soup-bean.jpg",
  "sopas-2": "menu-photos/soup-sopa-pedra.jpg",
  "sopas-3": "menu-photos/soup-fish-head.jpg",
  "sopas-4": "menu-photos/soup-fish-stew.jpg",

  // Pizzas
  "pizzas-0": "menu-photos/pizza-shrimp.jpg",
  "pizzas-1": "menu-photos/pizza-bacon-mushroom.jpg",
  "pizzas-2": "menu-photos/pizza-beef.jpg",
  "pizzas-3": "menu-photos/pizza-margherita.jpg",

  // Pequenos-almoços
  "pequenos-almocos-0": "menu-photos/breakfast-mixed-omelette.jpg",
  "pequenos-almocos-1": "menu-photos/breakfast-cheese-omelette.jpg",
  "pequenos-almocos-2": "menu-photos/breakfast-ham-toastie.jpg",
  "pequenos-almocos-3": "menu-photos/breakfast-cheese-toast.jpg",
  "pequenos-almocos-4": "menu-photos/breakfast-brie-sandwich.jpg",
  "pequenos-almocos-5": "menu-photos/breakfast-ham-egg-sandwich.jpg",
  "pequenos-almocos-6": "menu-photos/breakfast-steak-fries.jpg",
  "pequenos-almocos-7": "menu-photos/breakfast-steak-sandwich.jpg",
  "pequenos-almocos-8": "menu-photos/breakfast-bifana-plate.jpg",
  "pequenos-almocos-9": "menu-photos/breakfast-bifana-sandwich-alt.jpg",
  "pequenos-almocos-10": "menu-photos/breakfast-chicken-sandwich.jpg",
  "pequenos-almocos-11": "menu-photos/breakfast-tuna-sandwich.jpg",
  "pequenos-almocos-12": "villasage/e870dc12-7c86-4dbd-8217-4f47eb0effa5.jpeg", // Hambúrguer

  // Peixes e Mariscos
  "peixes-0": "menu-photos/fish-grilled.jpg",
  "peixes-1": "menu-photos/fish-grilled-whole-banana.jpg",
  "peixes-2": "villasage/177ee6b8-fb2c-48c7-bad2-97275c2fe22f.jpeg", // Lagosta Grelhada
  "peixes-3": "menu-photos/fish-whole-grilled.jpg",
  "peixes-4": "menu-photos/fish-bacalhau.jpg",
  "peixes-5": "menu-photos/fish-cuttlefish.jpg",
  "peixes-6": "menu-photos/rice-grouper.jpg",
  "peixes-7": "menu-photos/rice-seafood-lobster.jpg",

  // Carnes
  "carnes-0": "villasage/337ea99e-f8f8-4e7f-af2c-0f2281c82c0c.jpeg", // Bife Lombo
  "carnes-1": "menu-photos/steak.jpg",
  "carnes-2": "menu-photos/mixed-grill.jpg",
  "carnes-3": "menu-photos/steak-portuguese.jpg",
  "carnes-4": "menu-photos/steak-tbone.jpg",
  "carnes-5": "menu-photos/picanha.jpg",
  "carnes-6": "menu-photos/mixed-grill-platter.jpg",
  "carnes-7": "menu-photos/mixed-grill-iraqi.jpg",
  "carnes-8": "villasage/31b5b794-6061-4839-90c4-4b6a78623c00.jpeg", // Frango Grelhado
  "carnes-9": "menu-photos/chicken-piri-piri.jpg",
  "carnes-10": "menu-photos/chicken-whole-roasted.jpg",
  "carnes-11": "menu-photos/chicken-grilled-plate.jpg",

  // Guarnições
  "guarnicoes-0": "menu-photos/side-rice-white.jpg",
  "guarnicoes-1": "menu-photos/side-rice-beans.jpg",
  "guarnicoes-2": "menu-photos/side-rice-carrot.jpg",
  "guarnicoes-3": "menu-photos/side-fries.jpg",
  "guarnicoes-4": "menu-photos/side-feijoada.jpg",
  "guarnicoes-5": "menu-photos/side-cassava-sweet-potato.jpg",
  "guarnicoes-6": "menu-photos/side-plantain.jpg",
  "guarnicoes-7": "menu-photos/side-funge-corn.jpg",
  "guarnicoes-8": "menu-photos/side-funge-cassava.jpg",
  "guarnicoes-9": "menu-photos/side-tomato-sauce.jpg",
  "guarnicoes-10": "menu-photos/side-boiled-egg.jpg",

  // Saladas
  "saladas-0": "menu-photos/salad-seasonal.jpg",
  "saladas-1": "menu-photos/salad-caesar-plate.jpg",

  // Pastas
  "pastas-0": "menu-photos/pasta-seafood.jpg",
  "pastas-1": "menu-photos/pasta-squid-ink.jpg",
  "pastas-2": "menu-photos/pasta-bolognese.jpg",
  "pastas-3": "menu-photos/pasta-beef.jpg",

  // Sobremesas
  "sobremesas-0": "menu-photos/dessert-cheesecake.jpg",
  "sobremesas-1": "villasage/923f0577-59d3-4756-85af-92be88ef03c6.jpeg", // sobremesa chocolate
  "sobremesas-2": "menu-photos/dessert-icecream.jpg",
  "sobremesas-3": "menu-photos/dessert-fruit.jpg",

  // Espumantes / sangria
  "espumantes-7": "villasage/8f69b537-af1f-461c-b1af-af0c6168489f.jpeg", // Sangria
};

// ─────────────────────────────────────────────────────────────────────────────
// Dados completos do menu
// ─────────────────────────────────────────────────────────────────────────────

const seedData = [
  {
    id: "entradas",
    name: "Entradas",
    group: "Comida",
    items: [
      { name: "Pão, Patê, Azeitonas de alho e manteiga (Couvert)", price: 3500, description: null },
      { name: "Frango a Passarinho", price: 8950, description: null },
      { name: "Pão Extra", price: 650, description: null },
      { name: "Choco Frito com Molho Rosé", price: 10900, description: null },
      { name: "Chouriço Caseiro", price: 12650, description: null },
      { name: "Camarão ao alho", price: 15500, description: null },
      { name: "Dobradinha", price: 7650, description: null },
      { name: "Pica-Pau", price: 7900, description: null },
      { name: "Gambas ao Alho", price: 17950, description: null },
      { name: "Azeitonas ao alho", price: 1300, description: null },
      { name: "Ginguba torrada", price: 750, description: null },
    ],
  },
  {
    id: "sopas",
    name: "Sopas",
    group: "Comida",
    items: [
      { name: "Caldo Verde", price: 2600, description: null },
      { name: "Sopa de Feijão", price: 3500, description: null },
      { name: "Sopa da Pedra", price: 6500, description: null },
      { name: "Caldo de Garoupa (cabeça/rabo)", price: 15550, description: null },
      { name: "Caldo de Garoupa (posta)", price: 17550, description: null },
    ],
  },
  {
    id: "pizzas",
    name: "Pizzas",
    group: "Comida",
    note: "Todas as pizzas levam molho de tomate. Extras: Atum 4.000 Kz · Azeitonas 3.000 Kz · Chouriço 3.200 Kz · Bacon 4.100 Kz · Fiambre 3.000 Kz · Ovos 800 Kz · Camarão 9.900 Kz · Queijo 4.900 Kz",
    items: [
      { name: "Villa Sage", price: 15900, description: "Queijo, cebola, camarão, choco e oregão. Média 15.900 Kz · Familiar 25.500 Kz" },
      { name: "Bellas", price: 12500, description: "Queijo, bacon, fiambre, cogumelos, cebola e oregão. Média 12.500 Kz · Familiar 24.000 Kz" },
      { name: "Ramiros", price: 12000, description: "Queijo, carne moída e manjericão. Média 12.000 Kz · Familiar 23.500 Kz" },
      { name: "Artesanal", price: 8500, description: "Tomate e queijo. Média 8.500 Kz · Familiar 16.500 Kz" },
    ],
  },
  {
    id: "pequenos-almocos",
    name: "Pequenos-almoços",
    group: "Comida",
    items: [
      { name: "Omelete misto", price: 5000, description: null },
      { name: "Omelete de queijo ou fiambre", price: 4500, description: null },
      { name: "Tosta Mista", price: 3500, description: null },
      { name: "Tosta de queijo ou Fiambre", price: 2500, description: null },
      { name: "Sandes Mista", price: 2900, description: null },
      { name: "Sandes de queijo ou fiambre", price: 2450, description: null },
      { name: "Prego no prato", price: 9950, description: null },
      { name: "Prego no pão", price: 8950, description: null },
      { name: "Bifana no prato", price: 7900, description: null },
      { name: "Bifana no pão", price: 6900, description: null },
      { name: "Sandes Villa Sage", price: 4500, description: null },
      { name: "Sandes de atum", price: 4000, description: null },
      { name: "Hambúrguer", price: 7350, description: null },
    ],
  },
  {
    id: "peixes",
    name: "Peixes e Mariscos",
    group: "Comida",
    items: [
      { name: "Garoupa Posta Grelhada", price: 19950, description: "Com batata rena cozida e legumes salteados" },
      { name: "Garoupinha escalada 1 pax", price: 19650, description: "Guarnição à escolha" },
      { name: "Lagosta Grelhada", price: 35500, description: "Salada e batata frita" },
      { name: "Garoupa escalada 3 pax", price: 34950, description: "Guarnição à escolha" },
      { name: "Bacalhau à Lagareiro", price: 26900, description: "Com batatas a murro" },
      { name: "Choco Grelhado", price: 19800, description: "Com legumes salteados e batatas cozidas" },
      { name: "Arroz de Garoupa p/ 2 pax", price: 28350, description: null },
      { name: "Arroz de Garoupa c/ Lagosta p/ 2 pax", price: 38550, description: null },
    ],
  },
  {
    id: "carnes",
    name: "Carnes",
    group: "Comida",
    items: [
      { name: "Bife de Lombo Grelhado", price: 23950, description: "Com batatas cozidas e legumes salteados" },
      { name: "Bife da Vazia Grelhado", price: 18950, description: "Arroz de feijão e salada" },
      { name: "Mix Terra e Mar 2 pax", price: 63500, description: "Lagosta, choco, gambas, garoupa, carne de vaca, entremeada, linguiça, frango, costeleta, com batata rena frita, feijão preto, arroz branco, legumes salteados e batatas cozidas" },
      { name: "Bife à Portuguesa", price: 24050, description: null },
      { name: "T-Bone", price: 43650, description: "Legumes salteados e mandioca frita" },
      { name: "Picanha na Brasa", price: 23950, description: "Batata rena frita, linguiça, couve mineira, feijão preto e arroz branco" },
      { name: "Grelhada Mista da Terra 2 pax", price: 42850, description: "Carne de vaca, entremeada, linguiça, frango, costeleta, com batata rena frita, feijão preto e arroz branco" },
      { name: "Grelhada Mista da Terra 1 pax", price: 21500, description: "Carne de vaca, entremeada, linguiça, frango, costeleta, com batata rena frita, feijão preto e arroz branco" },
      { name: "Frango Inteiro", price: 17950, description: "Com batatas rena fritas e salada básica" },
      { name: "Frango Meio", price: 9000, description: "Com batatas rena fritas e salada básica" },
      { name: "Galo na Brasa Inteiro", price: 16950, description: "Mandioca frita e salada básica" },
      { name: "Galo na Brasa Meio", price: 8500, description: "Mandioca frita e salada básica" },
    ],
  },
  {
    id: "guarnicoes",
    name: "Guarnições",
    group: "Comida",
    items: [
      { name: "Arroz branco", price: 2000, description: null },
      { name: "Arroz de feijão", price: 3000, description: null },
      { name: "Arroz malandro / Arroz de cenoura", price: 2850, description: null },
      { name: "Batatas fritas / Feijão de banha", price: 2000, description: null },
      { name: "Feijão preto / Feijão de óleo de palma", price: 2500, description: null },
      { name: "Batata doce / Mandioca", price: 2000, description: null },
      { name: "Legumes salteados / Banana pão", price: 2000, description: null },
      { name: "Funge Milho", price: 2600, description: null },
      { name: "Funge Bombó", price: 2400, description: null },
      { name: "Molho de tomate", price: 2000, description: null },
      { name: "Ovo cozido / estrelado", price: 800, description: null },
    ],
  },
  {
    id: "saladas",
    name: "Saladas",
    group: "Comida",
    items: [
      { name: "Salada da Época", price: 3000, description: "Alface, tomate, cebola e cenoura" },
      { name: "Salada César", price: 5500, description: "Alface, bacon, frango, pão de forma, queijo, maionese de alho e coentro" },
    ],
  },
  {
    id: "pastas",
    name: "Pastas",
    group: "Comida",
    items: [
      { name: "Tagliatelle c/ Gambas", price: 22500, description: null },
      { name: "Linguini Negro com frutos do mar", price: 24950, description: "Garoupa, choco e camarão" },
      { name: "Esparguete Bolonhesa", price: 10950, description: null },
      { name: "Massada de carnes", price: 16900, description: null },
    ],
  },
  {
    id: "sobremesas",
    name: "Sobremesas",
    group: "Comida",
    items: [
      { name: "Tarte de Kitaba", price: 4300, description: null },
      { name: "Cheesecake com frutos silvestres", price: 4900, description: null },
      { name: "Gelado 1 bola", price: 4250, description: null },
      { name: "Fruta laminada", price: 2900, description: null },
    ],
  },
  {
    id: "chas-cafes",
    name: "Chás e Cafés",
    group: "Bebidas",
    items: [
      { name: "Chá natural", price: 1650, description: null },
      { name: "Chá pacote", price: 950, description: null },
      { name: "Café duplo", price: 2100, description: null },
      { name: "Galão", price: 1950, description: null },
      { name: "Café", price: 1900, description: null },
      { name: "Cappuccino", price: 2000, description: null },
      { name: "Café com cheirinho", price: 2200, description: null },
    ],
  },
  {
    id: "aguas",
    name: "Águas e Refrigerantes",
    group: "Bebidas",
    items: [
      { name: "Água mineral 0,50 L", price: 700, description: null },
      { name: "Água mineral 1,5 L", price: 1300, description: null },
      { name: "Água c/ Gás", price: 2600, description: null },
      { name: "Água tónica", price: 1350, description: null },
      { name: "Coca-Cola Zero", price: 1350, description: null },
      { name: "Coca-Cola lata", price: 1300, description: null },
      { name: "Sprite / Fanta", price: 1300, description: null },
      { name: "Speed", price: 1650, description: null },
      { name: "Sumol diversos", price: 1350, description: null },
      { name: "Compal lata", price: 1350, description: null },
    ],
  },
  {
    id: "cervejas",
    name: "Cervejas",
    group: "Bebidas",
    items: [
      { name: "Cerveja fino (lambreta)", price: 700, description: null },
      { name: "Cerveja fino (lambreta Tango)", price: 1100, description: null },
      { name: "Cerveja fino (caneca grande)", price: 2550, description: null },
      { name: "Cerveja fino (caneca média)", price: 1950, description: null },
      { name: "Cerveja fino (copo)", price: 1350, description: null },
      { name: "Eka garrafa", price: 1200, description: null },
      { name: "Cuca garrafa", price: 1200, description: null },
      { name: "Cuca lata", price: 1550, description: null },
      { name: "Nocal garrafa", price: 1200, description: null },
      { name: "Booster (Cider / Morango)", price: 1250, description: null },
      { name: "Smirnoff (Ice / Guaraná / Ananás)", price: 2050, description: null },
      { name: "Heineken", price: 2950, description: null },
      { name: "Hunters", price: 2150, description: null },
      { name: "Fino Tulipa", price: 1750, description: null },
    ],
  },
  {
    id: "sumos",
    name: "Sumos Naturais e Batidos",
    group: "Bebidas",
    items: [
      { name: "Sumo de Laranja", price: 4050, description: null },
      { name: "Sumo de Limão", price: 2950, description: null },
      { name: "Sumo de Melancia", price: 2900, description: null },
      { name: "Sumo de Ananás", price: 3500, description: null },
      { name: "Sumo de Ananás (hortelã e gengibre)", price: 3950, description: null },
      { name: "Sumo de Maracujá", price: 4200, description: null },
      { name: "Sumo de frutos vermelhos", price: 5050, description: null },
      { name: "Sumo tropical", price: 4850, description: null },
      { name: "Batido de Abacate", price: 3400, description: null },
      { name: "Batido de Banana", price: 3000, description: null },
      { name: "Batido de Tutti-frutti", price: 3800, description: null },
    ],
  },
  {
    id: "cocktails",
    name: "Cocktails",
    group: "Bebidas",
    items: [
      { name: "Granizado (sem álcool)", price: 3950, description: "Fruta à escolha" },
      { name: "Tropical (sem álcool)", price: 4550, description: null },
      { name: "Caipirinha (múcua / tamarindo / ananás / lima / limão)", price: 4950, description: null },
      { name: "Caipirinha (maracujá e laranja)", price: 5950, description: null },
      { name: "Caipiroska / Caipiríssima", price: 4900, description: null },
      { name: "Margarita", price: 5500, description: null },
      { name: "Piña Colada", price: 5000, description: null },
      { name: "Caipiblack", price: 4000, description: null },
      { name: "Caipirão", price: 6500, description: null },
      { name: "Mojito", price: 5500, description: null },
      { name: "Margarita com Frutos Vermelhos", price: 6500, description: null },
      { name: "Cuba Livre", price: 4000, description: null },
      { name: "Villa Sage", price: 5500, description: null },
    ],
  },
  {
    id: "vinhos",
    name: "Vinhos",
    group: "Bebidas",
    items: [
      { name: "Planalto (branco)", price: 21000, description: null },
      { name: "Casal Garcia (verde)", price: 15000, description: null },
      { name: "Silk Spice (branco)", price: 19900, description: null },
      { name: "Hectares Normal (tinto)", price: 22500, description: null },
      { name: "Carm (tinto)", price: 34000, description: null },
      { name: "Duas Quintas 0,75 (tinto)", price: 39950, description: null },
      { name: "Duas Quintas Reserva (tinto)", price: 123950, description: null },
      { name: "Marquês de Borba 0,75 (tinto)", price: 25000, description: null },
      { name: "Marquês de Borba 0,375 (tinto)", price: 17500, description: null },
      { name: "Pacheca (tinto)", price: 20500, description: null },
      { name: "Diálogo (tinto)", price: 39900, description: null },
      { name: "Chaminé (tinto)", price: 32950, description: null },
      { name: "Papa Figos (tinto)", price: 26950, description: null },
      { name: "Mariana (tinto)", price: 23900, description: null },
      { name: "Silk Spice (tinto)", price: 25500, description: null },
      { name: "Callabriga (tinto)", price: 59500, description: null },
      { name: "Castas Escondidas (tinto)", price: 133950, description: null },
      { name: "Quinta da Leda (tinto)", price: 177850, description: null },
      { name: "Mateus Rosé", price: 16900, description: null },
    ],
  },
  {
    id: "espumantes",
    name: "Espumantes, Champanhes e Sangrias",
    group: "Bebidas",
    items: [
      { name: "Diamante Espumante", price: 14500, description: null },
      { name: "Moscato Espumante", price: 18500, description: null },
      { name: "JC Leroux Espumante", price: 16500, description: null },
      { name: "Moët & Chandon Brut", price: 155000, description: null },
      { name: "Veuve Clicquot", price: 226500, description: null },
      { name: "Laurent-Perrier", price: 169600, description: null },
      { name: "Ruinart", price: 323600, description: null },
      { name: "Sangria tinto", price: 20000, description: null },
      { name: "Sangria branca", price: 19000, description: null },
      { name: "Sangria Espumante c/ frutos vermelhos", price: 26500, description: null },
    ],
  },
  {
    id: "gins",
    name: "Gins",
    group: "Bebidas",
    items: [
      { name: "Gin Gordon's Tónico", price: 5200, description: null },
      { name: "Gin Gordon's Rosé Tónico", price: 5800, description: null },
      { name: "Gin Especial Tónico", price: 7000, description: null },
      { name: "Gin c/ Adicional Tónico", price: 6500, description: null },
      { name: "Gin Tanqueray", price: 7200, description: null },
      { name: "Beefeater", price: 6000, description: null },
      { name: "Beefeater Rosé", price: 6800, description: null },
      { name: "Hendrick's Tónico", price: 14950, description: null },
      { name: "Bulldog", price: 10950, description: null },
    ],
  },
  {
    id: "whiskies",
    name: "Whiskies",
    group: "Bebidas",
    items: [
      { name: "Jameson", price: 4500, description: null },
      { name: "Red Label", price: 4300, description: null },
      { name: "Jameson Black", price: 6500, description: null },
      { name: "Black Label", price: 6400, description: null },
      { name: "Chivas", price: 6300, description: null },
      { name: "The Glenlivet", price: 18550, description: null },
    ],
  },
  {
    id: "licores",
    name: "Licores",
    group: "Bebidas",
    items: [
      { name: "Amarula", price: 5500, description: null },
      { name: "Licor Beirão", price: 5500, description: null },
      { name: "Tia Maria", price: 6000, description: null },
      { name: "Vinho do Porto", price: 4500, description: null },
      { name: "Martini Branco", price: 4000, description: null },
      { name: "Martini Rosso", price: 4000, description: null },
      { name: "Campari c/ laranja", price: 4500, description: null },
      { name: "Campari Tónico", price: 4000, description: null },
      { name: "Sheri Dans", price: 4000, description: null },
      { name: "Jägermeister", price: 6350, description: null },
    ],
  },
  {
    id: "aguardentes",
    name: "Aguardentes e Cognacs",
    group: "Bebidas",
    items: [
      { name: "CRF", price: 7900, description: null },
      { name: "CRF Reserva Extra (1895)", price: 14500, description: null },
      { name: "1920", price: 5500, description: null },
      { name: "Antiqua", price: 7000, description: null },
      { name: "São Domingos", price: 6500, description: null },
      { name: "Courvoisier (V.S)", price: 15500, description: null },
      { name: "Rémy Martin (V.S.O.P)", price: 17950, description: null },
      { name: "Calvet (X.O)", price: 29300, description: null },
      { name: "Rum Zacapa (X.O)", price: 41150, description: null },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de processamento e upload
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processa imagem com sharp e retorna o buffer WebP optimizado.
 * @param {Buffer} inputBuffer
 * @returns {Promise<Buffer>}
 */
async function optimiseImage(inputBuffer) {
  return sharp(inputBuffer, { failOn: "error" })
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();
}

/**
 * Faz upload de uma imagem local para o Vercel Blob e retorna o URL público.
 * @param {string} relativePath  Caminho relativo a assetsDir
 * @param {string} blobKey       Nome do ficheiro no Blob, ex: "menu/entradas-0.webp"
 * @returns {Promise<string|null>}
 */
async function uploadImage(relativePath, blobKey) {
  const fullPath = path.join(assetsDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`     ⚠️  Ficheiro não encontrado: ${relativePath}`);
    return null;
  }
  const rawBuffer = fs.readFileSync(fullPath);
  const optimised = await optimiseImage(rawBuffer);
  const blob = await put(blobKey, optimised, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
  });
  return blob.url;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed principal
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🔌 A ligar à base de dados via Prisma...");

  const existingCount = await prisma.menuCategory.count();
  if (existingCount > 0) {
    console.log(
      `⚠️  O banco de dados já contém ${existingCount} categoria(s). Seed ignorado para evitar duplicados.`,
    );
    console.log("   Para repor os dados, esvazie as tabelas primeiro:");
    console.log("   DELETE FROM menu_items; DELETE FROM menu_categories;");
    return;
  }

  const totalItems = seedData.reduce((acc, cat) => acc + cat.items.length, 0);
  const itemsWithImages = Object.keys(itemImagePaths).length;
  console.log(`🌱 A criar ${seedData.length} categorias e ${totalItems} produtos...`);
  if (hasBlobToken) {
    console.log(`📸 A fazer upload de ${itemsWithImages} imagens para o Vercel Blob (optimizadas com sharp)...`);
  }

  for (let catIndex = 0; catIndex < seedData.length; catIndex++) {
    const cat = seedData[catIndex];
    const created = await prisma.menuCategory.create({
      data: {
        name: cat.name,
        group: cat.group,
        sortOrder: catIndex,
        isActive: true,
      },
    });

    let uploadedCount = 0;

    for (let itemIndex = 0; itemIndex < cat.items.length; itemIndex++) {
      const item = cat.items[itemIndex];
      const imageKey = `${cat.id}-${itemIndex}`;
      const imageRelPath = itemImagePaths[imageKey];

      let imageUrl = null;

      if (hasBlobToken && imageRelPath) {
        try {
          const blobKey = `menu/${cat.id}-${itemIndex}.webp`;
          imageUrl = await uploadImage(imageRelPath, blobKey);
          if (imageUrl) uploadedCount++;
        } catch (err) {
          console.warn(`     ⚠️  Erro ao fazer upload de ${imageRelPath}:`, err.message);
        }
      }

      await prisma.menuItem.create({
        data: {
          categoryId: created.id,
          name: item.name,
          description: item.description ?? null,
          price: item.price,
          imageUrl,
          sortOrder: itemIndex,
          isActive: true,
        },
      });
    }

    const itemWord = cat.items.length === 1 ? "produto" : "produtos";
    const imgInfo = hasBlobToken
      ? ` · ${uploadedCount} imagem(ns) carregada(s)`
      : "";
    console.log(`  ✓ ${cat.name} (${cat.items.length} ${itemWord}${imgInfo})`);
  }

  console.log(`\n✅ Seed concluído!`);
  console.log(`   ${seedData.length} categorias e ${totalItems} produtos criados.`);
  if (hasBlobToken) {
    const totalUploaded = seedData.reduce((acc, cat) =>
      acc + cat.items.filter((_, i) => Boolean(itemImagePaths[`${cat.id}-${i}`])).length, 0);
    console.log(`   ${totalUploaded} imagens optimizadas e armazenadas no Vercel Blob.`);
  } else {
    console.log("   Para adicionar imagens, configure BLOB_READ_WRITE_TOKEN e re-execute o seed.");
    console.log("   Ou adicione imagens manualmente pelo painel em /admin.");
  }
}

seed()
  .catch((error) => {
    console.error("❌ Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
