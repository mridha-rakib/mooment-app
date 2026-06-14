import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import type { Product } from "@/lib/products";

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPriceUsd: number;
  lineTotalUsd: number;
  stockQuantity: number;
  product: Product;
  createdAt: string;
  updatedAt: string;
};

export type Cart = {
  items: CartItem[];
  totalQuantity: number;
  subtotalUsd: number;
};

const getCartFromResponse = (response: { data?: { data?: { cart?: Cart } } }) => {
  const cart = response.data?.data?.cart;

  if (!cart) {
    throw new Error("The cart response was incomplete.");
  }

  return cart;
};

const normalizeCartError = (error: unknown): Error => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string" && message.trim()) {
      return new Error(message);
    }
  }

  return error instanceof Error ? error : new Error("Please try again.");
};

export const getCart = async (): Promise<Cart> => {
  try {
    const response = await api.get("/cart");

    return getCartFromResponse(response);
  } catch (error) {
    throw normalizeCartError(error);
  }
};

export const addCartItem = async (productId: string, quantity = 1): Promise<Cart> => {
  try {
    const response = await api.post("/cart/items", { productId, quantity });

    return getCartFromResponse(response);
  } catch (error) {
    throw normalizeCartError(error);
  }
};

export const updateCartItemQuantity = async (productId: string, quantity: number): Promise<Cart> => {
  try {
    const response = await api.patch(`/cart/items/${encodeURIComponent(productId)}`, { quantity });

    return getCartFromResponse(response);
  } catch (error) {
    throw normalizeCartError(error);
  }
};

export const removeCartItem = async (productId: string): Promise<Cart> => {
  try {
    const response = await api.delete(`/cart/items/${encodeURIComponent(productId)}`);

    return getCartFromResponse(response);
  } catch (error) {
    throw normalizeCartError(error);
  }
};

export const clearCart = async (): Promise<Cart> => {
  try {
    const response = await api.delete("/cart");

    return getCartFromResponse(response);
  } catch (error) {
    throw normalizeCartError(error);
  }
};
