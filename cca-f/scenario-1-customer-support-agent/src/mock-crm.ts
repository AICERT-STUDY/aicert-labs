// In-memory mock of the CRM/order system this scenario's tools sit on top of.
// A real deployment would replace this with calls to the actual CRM, order,
// and payments APIs; the tool contracts in mcp-server.ts would not need to change.

export interface Order {
  orderId: string;
  itemDescription: string;
  amountUsd: number;
  status: "delivered" | "shipped" | "processing";
  purchasedAt: string;
}

export interface Customer {
  customerId: string;
  name: string;
  email: string;
  supportTier: "standard" | "priority";
  orders: Order[];
  priorRefunds: number;
}

const customers: Record<string, Customer> = {
  "cust_1001": {
    customerId: "cust_1001",
    name: "Jamie Ortiz",
    email: "jamie.ortiz@example.com",
    supportTier: "standard",
    priorRefunds: 0,
    orders: [
      {
        orderId: "ord_9001",
        itemDescription: "Wireless mechanical keyboard",
        amountUsd: 79.0,
        status: "delivered",
        purchasedAt: "2026-06-28",
      },
    ],
  },
  "cust_1002": {
    customerId: "cust_1002",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    supportTier: "priority",
    priorRefunds: 2,
    orders: [
      {
        orderId: "ord_9002",
        itemDescription: "Noise-cancelling headphones",
        amountUsd: 219.0,
        status: "delivered",
        purchasedAt: "2026-07-01",
      },
    ],
  },
};

// Amounts at or below this are auto-approvable by the agent without a human.
// Above it, or for a customer with 2+ prior refunds, the tool refuses and the
// agent is expected to call escalate_to_human instead of retrying.
export const AUTO_APPROVE_LIMIT_USD = 100;
export const REPEAT_REFUND_ESCALATION_THRESHOLD = 2;

export function findCustomer(customerId: string): Customer | undefined {
  return customers[customerId];
}

export function findOrder(customerId: string, orderId: string): Order | undefined {
  return customers[customerId]?.orders.find((o) => o.orderId === orderId);
}

export function recordRefund(customerId: string): void {
  const customer = customers[customerId];
  if (customer) customer.priorRefunds += 1;
}
