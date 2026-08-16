import {
	MakeSalesClient,
	isMakeSalesError,
	type AppliedDiscountResponse,
	type Customer,
	type MakeSalesError,
	type Plan,
	type SubscribeParams,
	type Subscription,
	type SuccessResponse,
	type UsageEvent,
} from "@make-sales/client";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";

export type MakeSalesProviderProps = {
	appId?: string;
	customerApiToken: string;
	/** Make Sales Control API including its /v1 prefix. */
	apiUrl?: string;
	children: ReactNode;
	waitForCustomer?: boolean;
	loadingComponent?: ReactNode;
	throwOnError?: boolean;
};

export type FeatureCheck = string | { featureKey: string; count?: number };

export type MakeSalesContextValue = {
	client: MakeSalesClient;
	customer?: Customer;
	subscription?: Subscription;
	plans: Plan[];
	loading: boolean;
	error?: MakeSalesError;
	refetch: () => Promise<Customer | MakeSalesError>;
	subscribe: (
		input: Omit<SubscribeParams, "customerId">,
	) => Promise<Subscription | MakeSalesError>;
	cancelSubscription: () => Promise<Subscription | MakeSalesError>;
	sendUsageEvent: (
		input: Omit<UsageEvent, "customerId">,
	) => Promise<SuccessResponse | MakeSalesError>;
	applyDiscountCode: (input: {
		code: string;
		planId?: string;
	}) => Promise<AppliedDiscountResponse | MakeSalesError>;
	isFeatureEnabled: (input: FeatureCheck) => boolean;
	limitForFeature: (input: string | { featureKey: string }) => number;
};

const MakeSalesContext = createContext<MakeSalesContextValue | undefined>(
	undefined,
);

export function MakeSalesProvider({
	appId,
	customerApiToken,
	apiUrl = "/api/make-sales/v1",
	children,
	waitForCustomer = false,
	loadingComponent = null,
	throwOnError = false,
}: MakeSalesProviderProps) {
	const client = useMemo(
		() =>
			new MakeSalesClient({
				appId,
				customerApiToken,
				apiUrl,
			}),
		[appId, customerApiToken, apiUrl],
	);
	const [customer, setCustomer] = useState<Customer>();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<MakeSalesError>();
	const requestGeneration = useRef(0);

	const refetch = useCallback(async () => {
		const generation = ++requestGeneration.current;
		setLoading(true);
		const result = await client.getCustomer();
		if (generation !== requestGeneration.current) return result;
		if (isMakeSalesError(result)) {
			setError(result);
		} else {
			setCustomer(result);
			setError(undefined);
		}
		setLoading(false);
		return result;
	}, [client]);

	useEffect(() => {
		setCustomer(undefined);
		setError(undefined);
		void refetch();
		return () => {
			requestGeneration.current += 1;
		};
	}, [refetch]);

	const subscribe = useCallback(
		async (input: Omit<SubscribeParams, "customerId">) => {
			const result = await client.subscribe(input);
			if (!isMakeSalesError(result) && !result.confirmationUrl) {
				await refetch();
			}
			return result;
		},
		[client, refetch],
	);

	const cancelSubscription = useCallback(async () => {
		const result = await client.cancelSubscription();
		if (!isMakeSalesError(result)) await refetch();
		return result;
	}, [client, refetch]);

	const sendUsageEvent = useCallback(
		(input: Omit<UsageEvent, "customerId">) => client.sendUsageEvent(input),
		[client],
	);

	const applyDiscountCode = useCallback(
		async (input: { code: string; planId?: string }) => {
			const result = await client.applyDiscountCode(input);
			if (!isMakeSalesError(result)) {
				setCustomer((current) =>
					current
						? {
								...current,
								plans: mergeDiscountIntoPlans(current.plans, result),
							}
						: current,
				);
			}
			return result;
		},
		[client],
	);

	const isFeatureEnabled = useCallback(
		(input: FeatureCheck) => {
			const { featureKey, count = 0 } =
				typeof input === "string" ? { featureKey: input, count: 0 } : input;
			const feature = customer?.features[featureKey];
			if (!feature) return false;
			if (feature.type === "boolean") return feature.value === true;
			const limit = Number(feature.value);
			return limit === -1 || count < limit;
		},
		[customer],
	);

	const limitForFeature = useCallback(
		(input: string | { featureKey: string }) => {
			const featureKey = typeof input === "string" ? input : input.featureKey;
			const feature = customer?.features[featureKey];
			return feature?.type === "limit" || feature?.type === "limit_with_overage"
				? Number(feature.value)
				: -1;
		},
		[customer],
	);

	const value = useMemo<MakeSalesContextValue>(
		() => ({
			client,
			customer,
			subscription: customer?.subscription,
			plans: customer?.plans ?? [],
			loading,
			error,
			refetch,
			subscribe,
			cancelSubscription,
			sendUsageEvent,
			applyDiscountCode,
			isFeatureEnabled,
			limitForFeature,
		}),
		[
			client,
			customer,
			loading,
			error,
			refetch,
			subscribe,
			cancelSubscription,
			sendUsageEvent,
			applyDiscountCode,
			isFeatureEnabled,
			limitForFeature,
		],
	);

	if (throwOnError && error) throw new Error(error.error);
	if (waitForCustomer && loading && !customer) return loadingComponent;

	return (
		<MakeSalesContext.Provider value={value}>
			{children}
		</MakeSalesContext.Provider>
	);
}

export function useMakeSales(): MakeSalesContextValue {
	const value = useContext(MakeSalesContext);
	if (!value) throw new Error("useMakeSales must be used inside MakeSalesProvider");
	return value;
}

function mergeDiscountIntoPlans(
	plans: Plan[],
	result: AppliedDiscountResponse,
): Plan[] {
	const quoted = new Map(result.plans?.map((plan) => [plan.planId, plan]));
	return plans.map((plan) => {
		const price = quoted.get(plan.id);
		if (!price) return plan;
		const discount = {
			...result.discount,
			discountedAmount: price.discountedAmount,
			presentmentDiscountedAmount: price.discountedAmount,
		};
		return {
			...plan,
			discounts: [
				...plan.discounts.filter((candidate) => candidate.id !== discount.id),
				discount,
			],
		};
	});
}

/** Compatibility aliases for mechanical migration from @heymantle/react. */
export const MantleProvider = MakeSalesProvider;
export const useMantle = useMakeSales;
