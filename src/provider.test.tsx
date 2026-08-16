import type { Customer } from "@make-sales/client";
import { act, create } from "react-test-renderer";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MakeSalesProvider, useMakeSales } from "./provider";

const customer: Customer = {
	id: "installation-1",
	name: "demo.myshopify.com",
	test: true,
	plans: [],
	features: {
		TRY_ON: {
			id: "TRY_ON",
			name: "Try on",
			type: "limit",
			value: 10,
			displayOrder: 0,
		},
	},
	usage: {},
	usageCredits: [],
	reviews: [],
	billingStatus: "none",
};

describe("MakeSalesProvider", () => {
	it("loads a Mantle-compatible customer and exposes cached feature checks", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () =>
			new Response(JSON.stringify(customer), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		let observed: ReturnType<typeof useMakeSales> | undefined;

		function Consumer() {
			observed = useMakeSales();
			return null;
		}

		try {
			await act(async () => {
				create(
					<MakeSalesProvider
						apiUrl="https://billing.example/v1"
						customerApiToken="customer-token"
					>
						<Consumer />
					</MakeSalesProvider>,
				);
			});
			assert.equal(observed?.customer?.id, customer.id);
			assert.equal(observed?.isFeatureEnabled("TRY_ON"), true);
			assert.equal(
				observed?.isFeatureEnabled({ featureKey: "TRY_ON", count: 10 }),
				false,
			);
			assert.equal(observed?.limitForFeature("TRY_ON"), 10);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
