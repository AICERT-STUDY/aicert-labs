#!/usr/bin/env node
// Custom MCP server exposing the three tools this scenario is graded on
// designing well: get_customer, process_refund, escalate_to_human.
//
// This is the "Tool Design & MCP Integration" half of the scenario: notice
// that process_refund does NOT just perform the refund — it enforces the
// business rule (auto-approve limit, repeat-refund threshold) and returns a
// structured "needs_escalation" result instead of an error string, so the
// calling agent can react programmatically instead of parsing prose.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  findCustomer,
  findOrder,
  recordRefund,
  AUTO_APPROVE_LIMIT_USD,
  REPEAT_REFUND_ESCALATION_THRESHOLD,
} from "./mock-crm.js";

const server = new McpServer({
  name: "customer-support-tools",
  version: "1.0.0",
});

server.tool(
  "get_customer",
  "Look up a customer's profile, support tier, and order history by customer ID. Always call this first to verify the customer and find the order in question.",
  { customerId: z.string().describe("Customer ID, e.g. cust_1001") },
  async ({ customerId }) => {
    const customer = findCustomer(customerId);
    if (!customer) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "customer_not_found" }) }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(customer) }] };
  }
);

server.tool(
  "process_refund",
  `Refund an order. Auto-approves refunds up to $${AUTO_APPROVE_LIMIT_USD} for customers with fewer than ${REPEAT_REFUND_ESCALATION_THRESHOLD} prior refunds. Otherwise returns needs_escalation: true instead of an error — call escalate_to_human when you see that field, do not retry this tool.`,
  {
    customerId: z.string(),
    orderId: z.string(),
    reason: z.string().describe("Why the customer is requesting a refund"),
  },
  async ({ customerId, orderId, reason }) => {
    const customer = findCustomer(customerId);
    const order = findOrder(customerId, orderId);
    if (!customer || !order) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "order_not_found" }) }],
        isError: true,
      };
    }

    const overLimit = order.amountUsd > AUTO_APPROVE_LIMIT_USD;
    const repeatOffender = customer.priorRefunds >= REPEAT_REFUND_ESCALATION_THRESHOLD;

    if (overLimit || repeatOffender) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              needs_escalation: true,
              reasonCode: overLimit ? "over_auto_approve_limit" : "repeat_refund_pattern",
              orderAmountUsd: order.amountUsd,
              priorRefunds: customer.priorRefunds,
            }),
          },
        ],
      };
    }

    recordRefund(customerId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            refunded: true,
            orderId,
            amountUsd: order.amountUsd,
            reason,
          }),
        },
      ],
    };
  }
);

server.tool(
  "escalate_to_human",
  "Hand off the conversation to a human agent when a request falls outside the agent's authority (refund over the auto-approve limit, repeat-refund pattern, or the customer explicitly asks for a person).",
  {
    customerId: z.string(),
    reason: z.string(),
    conversationSummary: z.string().describe("Short summary of what's been tried so far, for the human agent"),
  },
  async ({ customerId, reason, conversationSummary }) => {
    const ticketId = `esc_${Math.random().toString(36).slice(2, 8)}`;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            escalated: true,
            ticketId,
            customerId,
            reason,
            conversationSummary,
          }),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
