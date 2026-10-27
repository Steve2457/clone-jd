export type Data = Record<string, any>;
export type OrderStatus =
  | "pending_payment"
  | "pending_shipment"
  | "shipped"
  | "completed"
  | "cancelled";
export interface User {
  id: string;
  username: string;
  nickname: string;
}
export interface Category {
  id: string;
  name: string;
  description: string;
}
export interface Bootstrap {
  user: User | null;
  categories: Category[];
  promos: { image: string; sourceUrl: string }[];
  cartCount: number;
  now: number;
}
export interface Product extends Data {
  id: string;
  title: string;
  image: string;
  price: number;
  stock: number;
  shop_id: string;
  shop_name: string;
  brand: string;
  rating: number;
  review_count: number;
  sales: number;
  default_sku_id: string;
}
export interface Sku extends Data {
  id: string;
  product_id: string;
  label: string;
  price: number;
  stock: number;
  quantity?: number;
}
