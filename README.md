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

## Install from GitHub Packages

Add the Make Sales scope to the consuming project's `.npmrc`:

```ini
@make-sales:registry=https://npm.pkg.github.com
```

Then authenticate npm with a GitHub token that has `read:packages` access and
install both packages:

```bash
npm install @make-sales/client @make-sales/react
```

Publishing is automated. Creating a GitHub release whose tag matches the
version in `package.json` (for example, `v0.1.0`) runs the full check and
publishes the package to the Make Sales GitHub Packages registry.
