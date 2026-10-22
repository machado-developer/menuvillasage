import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MenuPage from "@/routes/index";

describe("App routing", () => {
  it("renders the menu and filters items by search", () => {
    render(<MenuPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Villa Sage" })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Pesquisar pratos ou bebidas…"), { target: { value: "lagosta" } });

    expect(screen.getByText("Lagosta Grelhada")).toBeInTheDocument();
  });

  it("adds a menu item to the cart and prepares a WhatsApp order", () => {
    render(<MenuPage />);
    fireEvent.change(screen.getByPlaceholderText("Pesquisar pratos ou bebidas…"), { target: { value: "lagosta" } });
    fireEvent.click(screen.getByRole("button", { name: "Encomendar Lagosta Grelhada pelo WhatsApp" }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }));

    fireEvent.click(screen.getByRole("button", { name: "Abrir carrinho com 1 item" }));
    expect(screen.getByRole("heading", { name: "Carrinho" })).toBeInTheDocument();
    expect(screen.getAllByText("Lagosta Grelhada")).toHaveLength(2);

    const orderLink = screen.getByRole("link", { name: "Enviar pedido pelo WhatsApp" });
    const message = new URL(orderLink.getAttribute("href")!).searchParams.get("text");
    expect(message).toContain("Lagosta Grelhada");
    expect(message).toContain("Total do pedido:");
  });

  it("adds products directly from their menu cards", () => {
    render(<MenuPage />);
    fireEvent.change(screen.getByPlaceholderText("Pesquisar pratos ou bebidas…"), { target: { value: "lagosta" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar Lagosta Grelhada ao carrinho" }));

    expect(screen.getByRole("button", { name: "Abrir carrinho com 1 item" })).toBeInTheDocument();
  });
});
