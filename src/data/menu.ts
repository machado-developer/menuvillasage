import entradas from "@/assets/entradas.jpg";
import pizzas from "@/assets/pizzas.jpg";
import carnes from "@/assets/carnes.jpg";
import peixes from "@/assets/peixes.jpg";
import pequenoAlmoco from "@/assets/pequeno-almoco.jpg";
import sobremesas from "@/assets/sobremesas.jpg";
import bebidas from "@/assets/bebidas.jpg";
import lagostaGrelhada from "@/assets/villasage/177ee6b8-fb2c-48c7-bad2-97275c2fe22f.jpeg";
import frangoGrelhado from "@/assets/villasage/31b5b794-6061-4839-90c4-4b6a78623c00.jpeg";
import bifeLombo from "@/assets/villasage/337ea99e-f8f8-4e7f-af2c-0f2281c82c0c.jpeg";
import sangria from "@/assets/villasage/8f69b537-af1f-461c-b1af-af0c6168489f.jpeg";
import sobremesaChocolate from "@/assets/villasage/923f0577-59d3-4756-85af-92be88ef03c6.jpeg";
import gambas from "@/assets/villasage/a72f663e-7e6d-4b15-970d-ad2270b4b9b9.jpeg";
import hamburguer from "@/assets/villasage/e870dc12-7c86-4dbd-8217-4f47eb0effa5.jpeg";
import type { StaticImageData } from "next/image";

export const WHATSAPP_NUMBER = "244931544912";
export const WHATSAPP_DISPLAY = "+244 931 544 912";
export const ADDRESS = "Morro dos Veados, entrada do Matadouro, Benfica, Angola";

export type Variant = { label: string; price: number };
export type MenuItem = { id: string; name: string; description?: string; price?: number; variants?: Variant[]; image?: StaticImageData };
export type Category = { id: string; name: string; group: "Comida" | "Bebidas"; image?: StaticImageData; note?: string; items: MenuItem[] };

// Each line: "Nome|preço|descrição opcional"
function parse(catId: string, block: string): MenuItem[] {
  return block
    .trim()
    .split("\n")
    .map((l, i) => {
      const [name = "", price = "0", description] = l.split("|").map((s) => s.trim());
      const item: MenuItem = { id: `${catId}-${i}`, name, price: Number(price) };
      if (description) item.description = description;
      return item;
    });
}

function cat(id: string, name: string, group: Category["group"], block: string, extra: Partial<Category> = {}): Category {
  return { id, name, group, items: parse(id, block), ...extra };
}

export const categories: Category[] = [
  cat("entradas", "Entradas", "Comida", `
Pão, Patê, Azeitonas de alho e manteiga (Couvert)|3500
Frango a Passarinho|8950
Pão Extra|650
Choco Frito com Molho Rosé|10900
Chouriço Caseiro|12650
Camarão ao alho|15500
Dobradinha|7650
Pica-Pau|7900
Gambas ao Alho|17950
Azeitonas ao alho|1300
Ginguba torrada|750`, { image: entradas }),
  cat("sopas", "Sopas", "Comida", `
Caldo Verde|2600
Sopa de Feijão|3500
Sopa da Pedra|6500
Caldo de Garoupa (cabeça/rabo)|15550
Caldo de Garoupa (posta)|17550`),
  {
    id: "pizzas",
    name: "Pizzas",
    group: "Comida",
    image: pizzas,
    note: "Todas as pizzas levam molho de tomate. Extras: Atum 4.000 Kz · Azeitonas 3.000 Kz · Chouriço 3.200 Kz · Bacon 4.100 Kz · Fiambre 3.000 Kz · Ovos 800 Kz · Camarão 9.900 Kz · Queijo 4.900 Kz",
    items: [
      ["Villa Sage", "Queijo, cebola, camarão, choco e oregão", 15900, 25500],
      ["Bellas", "Queijo, bacon, fiambre, cogumelos, cebola e oregão", 12500, 24000],
      ["Ramiros", "Queijo, carne moída e manjericão", 12000, 23500],
      ["Artesanal", "Tomate e queijo", 8500, 16500],
    ].map(([name, description, m, f], i) => ({
      id: `pizzas-${i}`,
      name: name as string,
      description: description as string,
      variants: [
        { label: "Média", price: m as number },
        { label: "Familiar", price: f as number },
      ],
    })),
  },
  cat("pequenos-almocos", "Pequenos-almoços", "Comida", `
Omelete misto|5000
Omelete de queijo ou fiambre|4500
Tosta Mista|3500
Tosta de queijo ou Fiambre|2500
Sandes Mista|2900
Sandes de queijo ou fiambre|2450
Prego no prato|9950
Prego no pão|8950
Bifana no prato|7900
Bifana no pão|6900
Sandes Villa Sage|4500
Sandes de atum|4000
Hambúrguer|7350`, { image: pequenoAlmoco }),
  cat("peixes", "Peixes e Mariscos", "Comida", `
Garoupa Posta Grelhada|19950|Com batata rena cozida e legumes salteados
Garoupinha escalada 1 pax|19650|Guarnição à escolha
Lagosta Grelhada|35500|Salada e batata frita
Garoupa escalada 3 pax|34950|Guarnição à escolha
Bacalhau à Lagareiro|26900|Com batatas a murro
Choco Grelhado|19800|Com legumes salteados e batatas cozidas
Arroz de Garoupa p/ 2 pax|28350
Arroz de Garoupa c/ Lagosta p/ 2 pax|38550`, { image: peixes }),
  cat("carnes", "Carnes", "Comida", `
Bife de Lombo Grelhado|23950|Com batatas cozidas e legumes salteados
Bife da Vazia Grelhado|18950|Arroz de feijão e salada
Mix Terra e Mar 2 pax|63500|Lagosta, choco, gambas, garoupa, carne de vaca, entremeada, linguiça, frango, costeleta, com batata rena frita, feijão preto, arroz branco, legumes salteados e batatas cozidas
Bife à Portuguesa|24050
T-Bone|43650|Legumes salteados e mandioca frita
Picanha na Brasa|23950|Batata rena frita, linguiça, couve mineira, feijão preto e arroz branco
Grelhada Mista da Terra 2 pax|42850|Carne de vaca, entremeada, linguiça, frango, costeleta, com batata rena frita, feijão preto e arroz branco
Grelhada Mista da Terra 1 pax|21500|Carne de vaca, entremeada, linguiça, frango, costeleta, com batata rena frita, feijão preto e arroz branco
Frango Inteiro|17950|Com batatas rena fritas e salada básica
Frango Meio|9000|Com batatas rena fritas e salada básica
Galo na Brasa Inteiro|16950|Mandioca frita e salada básica
Galo na Brasa Meio|8500|Mandioca frita e salada básica`, { image: carnes }),
  cat("guarnicoes", "Guarnições", "Comida", `
Arroz branco|2000
Arroz de feijão|3000
Arroz malandro / Arroz de cenoura|2850
Batatas fritas / Feijão de banha|2000
Feijão preto / Feijão de óleo de palma|2500
Batata doce / Mandioca|2000
Legumes salteados / Banana pão|2000
Funge Milho|2600
Funge Bombó|2400
Molho de tomate|2000
Ovo cozido / estrelado|800`),
  cat("saladas", "Saladas", "Comida", `
Salada da Época|3000|Alface, tomate, cebola e cenoura
Salada César|5500|Alface, bacon, frango, pão de forma, queijo, maionese de alho e coentro`),
  cat("pastas", "Pastas", "Comida", `
Tagliatelle c/ Gambas|22500
Linguini Negro com frutos do mar|24950|Garoupa, choco e camarão
Esparguete Bolonhesa|10950
Massada de carnes|16900`),
  cat("sobremesas", "Sobremesas", "Comida", `
Tarte de Kitaba|4300
Cheesecake com frutos silvestres|4900
Gelado 1 bola|4250
Fruta laminada|2900`, { image: sobremesas }),
  cat("chas-cafes", "Chás e Cafés", "Bebidas", `
Chá natural|1650
Chá pacote|950
Café duplo|2100
Galão|1950
Café|1900
Cappuccino|2000
Café com cheirinho|2200`),
  cat("aguas", "Águas e Refrigerantes", "Bebidas", `
Água mineral 0,50 L|700
Água mineral 1,5 L|1300
Água c/ Gás|2600
Água tónica|1350
Coca-Cola Zero|1350
Coca-Cola lata|1300
Sprite / Fanta|1300
Speed|1650
Sumol diversos|1350
Compal lata|1350`),
  cat("cervejas", "Cervejas", "Bebidas", `
Cerveja fino (lambreta)|700
Cerveja fino (lambreta Tango)|1100
Cerveja fino (caneca grande)|2550
Cerveja fino (caneca média)|1950
Cerveja fino (copo)|1350
Eka garrafa|1200
Cuca garrafa|1200
Cuca lata|1550
Nocal garrafa|1200
Booster (Cider / Morango)|1250
Smirnoff (Ice / Guaraná / Ananás)|2050
Heineken|2950
Hunters|2150
Fino Tulipa|1750`),
  cat("sumos", "Sumos Naturais e Batidos", "Bebidas", `
Sumo de Laranja|4050
Sumo de Limão|2950
Sumo de Melancia|2900
Sumo de Ananás|3500
Sumo de Ananás (hortelã e gengibre)|3950
Sumo de Maracujá|4200
Sumo de frutos vermelhos|5050
Sumo tropical|4850
Batido de Abacate|3400
Batido de Banana|3000
Batido de Tutti-frutti|3800`),
  cat("cocktails", "Cocktails", "Bebidas", `
Granizado (sem álcool)|3950|Fruta à escolha
Tropical (sem álcool)|4550
Caipirinha (múcua / tamarindo / ananás / lima / limão)|4950
Caipirinha (maracujá e laranja)|5950
Caipiroska / Caipiríssima|4900
Margarita|5500
Piña Colada|5000
Caipiblack|4000
Caipirão|6500
Mojito|5500
Margarita com Frutos Vermelhos|6500
Cuba Livre|4000
Villa Sage|5500`, { image: bebidas }),
  cat("vinhos", "Vinhos", "Bebidas", `
Planalto (branco)|21000
Casal Garcia (verde)|15000
Silk Spice (branco)|19900
Hectares Normal (tinto)|22500
Carm (tinto)|34000
Duas Quintas 0,75 (tinto)|39950
Duas Quintas Reserva (tinto)|123950
Marquês de Borba 0,75 (tinto)|25000
Marquês de Borba 0,375 (tinto)|17500
Pacheca (tinto)|20500
Diálogo (tinto)|39900
Chaminé (tinto)|32950
Papa Figos (tinto)|26950
Mariana (tinto)|23900
Silk Spice (tinto)|25500
Callabriga (tinto)|59500
Castas Escondidas (tinto)|133950
Quinta da Leda (tinto)|177850
Mateus Rosé|16900`),
  cat("espumantes", "Espumantes, Champanhes e Sangrias", "Bebidas", `
Diamante Espumante|14500
Moscato Espumante|18500
JC Leroux Espumante|16500
Moët & Chandon Brut|155000
Veuve Clicquot|226500
Laurent-Perrier|169600
Ruinart|323600
Sangria tinto|20000
Sangria branca|19000
Sangria Espumante c/ frutos vermelhos|26500`),
  cat("gins", "Gins", "Bebidas", `
Gin Gordon's Tónico|5200
Gin Gordon's Rosé Tónico|5800
Gin Especial Tónico|7000
Gin c/ Adicional Tónico|6500
Gin Tanqueray|7200
Beefeater|6000
Beefeater Rosé|6800
Hendrick's Tónico|14950
Bulldog|10950`),
  cat("whiskies", "Whiskies", "Bebidas", `
Jameson|4500
Red Label|4300
Jameson Black|6500
Black Label|6400
Chivas|6300
The Glenlivet|18550`),
  cat("licores", "Licores", "Bebidas", `
Amarula|5500
Licor Beirão|5500
Tia Maria|6000
Vinho do Porto|4500
Martini Branco|4000
Martini Rosso|4000
Campari c/ laranja|4500
Campari Tónico|4000
Sheri Dans|4000
Jägermeister|6350`),
  cat("aguardentes", "Aguardentes e Cognacs", "Bebidas", `
CRF|7900
CRF Reserva Extra (1895)|14500
1920|5500
Antiqua|7000
São Domingos|6500
Courvoisier (V.S)|15500
Rémy Martin (V.S.O.P)|17950
Calvet (X.O)|29300
Rum Zacapa (X.O)|41150`),
];

const itemImages: Record<string, StaticImageData> = {
  "entradas-8": gambas,
  "peixes-2": lagostaGrelhada,
  "carnes-0": bifeLombo,
  "carnes-8": frangoGrelhado,
  "sobremesas-1": sobremesaChocolate,
  "espumantes-7": sangria,
  "pequenos-almocos-12": hamburguer,
};

for (const category of categories) {
  category.items = category.items.map((item) => {
    const image = itemImages[item.id];
    return image ? { ...item, image } : item;
  });
}

export const formatKz = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " Kz";

export function buildWhatsAppUrl(o: { name: string; qty: number; variant?: string | undefined; unit: number }) {
  const lines = [
    "Olá, Villa Sage! Gostaria de encomendar:",
    "",
    `Prato: ${o.name}`,
    `Quantidade: ${o.qty}`,
    ...(o.variant ? [`Variante: ${o.variant}`] : []),
    `Preço unitário: ${formatKz(o.unit)}`,
    `Total: ${formatKz(o.unit * o.qty)}`,
    "",
    "Aguardo a confirmação. Obrigado!",
  ];
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}
