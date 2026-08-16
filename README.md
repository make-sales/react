# @make-sales/react

React bindings for Make Sales Control. The provider keeps the familiar Mantle
data contract: `customer`, `subscription`, `plans`, `loading`, `refetch`,
`subscribe`, `cancelSubscription`, feature checks and usage events.

```tsx
import { MakeSalesProvider } from "@make-sales/react";

export function BillingRoot({ customerApiToken }: { customerApiToken: string }) {
  return (
    <MakeSalesProvider
      appId="your-app-id"
      customerApiToken={customerApiToken}
      apiUrl="https://billing.example.com/v1"
    >
      <App />
    </MakeSalesProvider>
  );
}
```

```tsx
import { useMakeSales } from "@make-sales/react";

const { customer, plans, subscription, subscribe, loading } = useMakeSales();
```

For a mechanical first migration, `MantleProvider` and `useMantle` are exported
as aliases. Existing code can replace only the package import, then rename the
symbols at its own pace. Pass your Control API URL explicitly in production.

The browser receives only the short-lived `customerApiToken` returned by the
server-side `@make-sales/client#identify` call. Never pass an app API key to
React.
