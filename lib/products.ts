import { api } from "@/lib/api";

export type Product = {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tag?: string | null;
  priceUsd: number;
  discountPercent: number;
  totalProduct: number;
  imageKeys: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateProductPayload = {
  name: string;
  description?: string | null;
  category?: string | null;
  tag?: string | null;
  priceUsd: number;
  discountPercent?: number;
  totalProduct: number;
  imageKeys?: string[];
};

export const createProduct = async (payload: CreateProductPayload): Promise<Product> => {
  const response = await api.post("/products", payload);
  const product = response.data?.data?.product as Product | undefined;

  if (!product) {
    throw new Error("The product response was incomplete.");
  }

  return product;
};

export const getMyProducts = async (): Promise<Product[]> => {
  const response = await api.get("/products/mine");

  return (response.data?.data?.products ?? []) as Product[];
};
