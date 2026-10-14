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
});
