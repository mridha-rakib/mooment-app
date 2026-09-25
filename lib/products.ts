import { api } from "@/lib/api";

export type Product = {
  id: string;
  userId: string;
  status: "published";
  name: string;
  description?: string | null;
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

export const getMyProduct = async (productId: string): Promise<Product> => {
  const response = await api.get(`/products/${encodeURIComponent(productId)}`);
  const product = response.data?.data?.product as Product | undefined;

  if (!product) {
    throw new Error("The product response was incomplete.");
  }

  return product;
};

export const getPublishedProduct = async (productId: string): Promise<Product> => {
  const response = await api.get(`/products/published/${encodeURIComponent(productId)}`);
  const product = response.data?.data?.product as Product | undefined;

  if (!product) {
    throw new Error("The product response was incomplete.");
  }

  return product;
};

export const getPublishedProductsByUser = async (userId: string): Promise<Product[]> => {
  const response = await api.get(`/products/users/${encodeURIComponent(userId)}/published`);

  return (response.data?.data?.products ?? []) as Product[];
};

export const updateProduct = async (productId: string, payload: CreateProductPayload): Promise<Product> => {
  const response = await api.patch(`/products/${encodeURIComponent(productId)}`, payload);
  const product = response.data?.data?.product as Product | undefined;

  if (!product) {
    throw new Error("The product response was incomplete.");
  }

  return product;
};

export const deleteProduct = async (productId: string): Promise<void> => {
  await api.delete(`/products/${encodeURIComponent(productId)}`);
};
