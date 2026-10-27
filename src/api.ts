export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    ...(method !== "GET" ? { body: JSON.stringify(body ?? {}) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      result.error?.code || "ERROR",
      result.error?.message || "网络请求失败",
      response.status,
    );
  return result;
}
export const operationId = () => crypto.randomUUID();
export const money = (cents: number = 0) => (cents / 100).toFixed(2);
export const date = (time: number) =>
  new Date(time).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
export const labels: Record<string, string> = {
  pending_payment: "待付款",
  pending_shipment: "待发货",
  shipped: "待收货",
  completed: "已完成",
  cancelled: "已取消",
  requested: "待审核",
  approved: "待寄回",
  returning: "退货途中",
  refunded: "已退款",
  rejected: "已拒绝",
  paid: "已支付",
  partially_refunded: "部分退款",
  unpaid: "未支付",
};
