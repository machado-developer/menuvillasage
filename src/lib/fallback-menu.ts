import type { Category } from "@/data/menu";

export const fallbackMenu: Category[] = [
  {
    id: "entradas",
    name: "Entradas",
    group: "Comida",
    items: [
      {
        id: "entradas-1",
        name: "Pão com patê",
        description: "Pão fresco com patê caseiro e azeitonas.",
        price: 3500,
        image: "/logo.png",
      },
      {
        id: "entradas-2",
        name: "Frango a passarinho",
        description: "Porção crocante com molho de alho.",
        price: 8950,
        image: "/logo.png",
      },
    ],
  },
  {
    id: "pizzas",
    name: "Pizzas",
    group: "Comida",
    items: [
      {
        id: "pizzas-1",
        name: "Pizza Margherita",
        description: "Molho de tomate, mozzarella e manjericão.",
        price: 15500,
        image: "/logo.png",
      },
    ],
  },
  {
    id: "bebidas",
    name: "Bebidas",
    group: "Bebidas",
    items: [
      {
        id: "bebidas-1",
        name: "Água mineral",
        description: "500 ml.",
        price: 1500,
        image: "/logo.png",
      },
      {
        id: "bebidas-2",
        name: "Café expresso",
        description: "Café forte e aromático.",
        price: 2500,
        image: "/logo.png",
      },
    ],
  },
];
