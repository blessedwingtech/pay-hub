# 💳 BitTonik Pay-Hub (`pay.bittonik.com`)

> **Le centre névralgique financier universel, multi-tenant et modulaire de l'écosystème BitTonik.**

Pay-Hub unifie l'encaissement (**Pay-In**), la gestion d'abonnements récurrents et les reversements / retraits de vendeurs (**Pay-Out**) pour l'ensemble des plateformes satellites : **MemoTonik**, **ShopTonik**, **BitTonik Academy**, **BitTonik World Trust (BWT)**, **PressTonik**, et **n'importe quel nouveau projet satellite en 5 minutes**.

---

## 🌟 Vue d'ensemble de l'Architecture Universelle

```
                               ┌────────────────────────────────┐
                               │       BitTonik Pay-Hub         │
                               │    (https://pay.bittonik.com)  │
                               └───────────────┬────────────────┘
                                               │
             ┌─────────────────────────────────┼─────────────────────────────────┐
             │                                 │                                 │
             ▼                                 ▼                                 ▼
   ┌───────────────────┐             ┌───────────────────┐             ┌───────────────────┐
   │      STRIPE       │             │      PAYPAL       │             │      MONCASH      │
   │  • CB, Apple Pay  │             │ • PayPal Wallet   │             │  • Digicel Haïti  │
   │  • Stripe Billing │             │ • Payouts API     │             │  • Gourdes (HTG)  │
   │  • Stripe Connect │             │                   │             │  • B2C Cash-Out   │
   └───────────────────┘             └───────────────────┘             └───────────────────┘
             ▲                                 ▲                                 ▲
             └─────────────────────────────────┼─────────────────────────────────┘
                                               │ Webhooks signés HMAC-SHA256 (Dynamiques)
                                               ▼
      ┌───────────────┬────────────────┬───────────────┬───────────────┬────────────────────────┐
      │   MemoTonik   │   ShopTonik    │    Academy    │      BWT      │ PressTonik / N'importe  │
      │  (Abonnements)│(Achats+Payouts)│ (Formations)  │(Dons & Reçus) │ quel nouveau satellite │
      └───────────────┴────────────────┴───────────────┴───────────────┴────────────────────────┘
```

---

## ⚡ Intégration d'un Nouveau Satellite en 5 Minutes

Pay-Hub est **100% dé-hardcodé** :
- **Aucun enum figé** : `sourceSite` accepte n'importe quelle chaîne (ex: `"PRESSTONIK"`, `"EDUTONIK"`, `"EVENTSTONIK"`).
- **Zéro crash** : Si un satellite n'a pas de configuration préalable, Pay-Hub génère automatiquement une interface élégante aux couleurs de BitTonik avec les initiales et le nom fourni.
- **Branding dynamique à la volée** : Le satellite peut transmettre ses couleurs, nom et logo directement dans la requête de checkout.
- **Webhook dynamique sans configuration serveur** : Le satellite peut fournir son propre endpoint `webhook_url` directement lors de la session de paiement.

### Option A : Redirection directe avec Branding à la volée

```typescript
import { buildPayCheckoutUrl } from "@/packages/pay-client";

// Depuis PressTonik (ou tout nouveau satellite) :
const checkoutUrl = buildPayCheckoutUrl({
  baseUrl: "https://pay.bittonik.com",
  userId: "usr_press_9921",
  email: "journaliste@presstonik.com",
  fullName: "Valérie M.",
  amount: 4.99,
  currency: "USD",
  sourceSite: "PRESSTONIK",
  siteName: "PressTonik Investigation",
  accentColor: "#ec4899", // Rose fuchsia personnalisé
  logoText: "PT",
  description: "Abonnement Mensuel PressTonik - Édition Premium",
  returnUrl: "https://press.bittonik.com/account?status=success",
  cancelUrl: "https://press.bittonik.com/articles/123",
  webhookUrl: "https://press.bittonik.com/api/webhooks/pay-hub", // 👈 Webhook dynamique direct !
});

window.location.href = checkoutUrl;
```

### Option B : Utilisation du composant React `<PayButton />`

```tsx
import { PayButton } from "@/packages/pay-client";

export function SubscribeButton() {
  return (
    <PayButton
      label="S'abonner via Pay-Hub"
      variant="custom"
      checkoutParams={{
        userId: "user_7712",
        email: "user@edutonik.com",
        amount: 19.99,
        currency: "USD",
        sourceSite: "EDUTONIK",
        siteName: "EduTonik Learning",
        accentColor: "#06b6d4",
        logoText: "ET",
        webhookUrl: "https://edutonik.com/api/webhooks/pay-hub",
        returnUrl: "https://edutonik.com/dashboard",
      }}
    />
  );
}
```

### Option C : Enregistrement préalable via l'API `/api/satellites` (Optionnel)

Vous pouvez pré-enregistrer un satellite dans la base de données de Pay-Hub :

```bash
curl -X POST https://pay.bittonik.com/api/satellites \
  -H "Authorization: Bearer <PAY_HUB_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PRESSTONIK",
    "name": "PressTonik",
    "description": "Plateforme média et presse indépendante BitTonik",
    "accentColor": "#ec4899",
    "logoText": "PT",
    "webhookUrl": "https://press.bittonik.com/api/webhooks/pay-hub"
  }'
```

---

## 🔒 Webhooks Standardisés & Signature HMAC-SHA256

### 1. Payload Standardisé Reçu par le Satellite

Le payload envoyé à l'endpoint du satellite (`/api/webhooks/pay-hub`) est normalisé pour offrir une compatibilité universelle :

```json
{
  "eventId": "evt_1776249123000_a9z8x7c",
  "eventType": "payment.completed",
  "event": "payment.completed",
  "timestamp": "2026-10-15T13:45:00.000Z",
  "sourceSite": "PRESSTONIK",
  "data": {
    "transactionId": "tx_cuid...",
    "satelliteUserId": "usr_press_9921",
    "amount": 4.99,
    "currency": "USD",
    "status": "COMPLETED",
    "provider": "STRIPE",
    "type": "SUBSCRIPTION",
    "planId": "monthly-supporter",
    "metadata": {
      "stripeSessionId": "cs_test_..."
    }
  }
}
```

### 2. Headers HTTP Envoyés

```http
Content-Type: application/json
User-Agent: BitTonik-PayHub/1.0
X-PayHub-Signature: sha256=1289cf...
X-PayHub-Timestamp: 1775638400
X-PayHub-Event: payment.completed
X-PayHub-Site: PRESSTONIK
```

### 3. Handler Type dans un Satellite (Next.js / Node.js)

```typescript
// app/api/webhooks/pay-hub/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyPayHubWebhookSignature } from "@/packages/pay-client";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-payhub-signature");
  const secret = process.env.PAY_HUB_WEBHOOK_SECRET!;

  // Vérification cryptographique sécurisée
  const isValid = await verifyPayHubWebhookSignature(rawBody, signature, secret);
  if (!isValid) {
    return NextResponse.json({ error: "Signature HMAC invalide" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const { eventType, event, data } = payload;
  const currentEvent = eventType || event;

  if (currentEvent === "payment.completed" || currentEvent === "subscription.created") {
    // Activer l'abonnement de l'utilisateur data.satelliteUserId
    console.log(`Paiement validé pour l'utilisateur ${data.satelliteUserId} : ${data.amount} ${data.currency}`);
  }

  return NextResponse.json({ received: true });
}
```

---

## 🛠️ Schéma de Données Prisma

- **`Satellite`** : Table dynamique (`code`, `name`, `accentColor`, `logoText`, `logoUrl`, `webhookUrl`, `secretKey`, `isActive`).
- **`Customer`** : Liaison universelle (`satelliteUserId`, `sourceSite: String`, `stripeCustomerId`, `paypalPayerId`, `moncashPhone`).
- **`Transaction`** : Transactions multi-devises (`sourceSite: String`, `webhookUrl: String?`, `amount`, `currency`, `provider`, `status`).
- **`Subscription`** : Gestion récurrente (`sourceSite: String`, `webhookUrl: String?`, `planId`, `status`, `currentPeriodEnd`).
- **`Payout`** : Retraits créateurs / vendeurs (`sourceSite: String`, `sellerId`, `channel`, `destination`, `status`).
- **`WebhookEvent`** : Journal d'audit complet (`direction: INBOUND|OUTBOUND`, `sourceSite`, `eventType`, `status`, `attempts`).

---

## 💻 Commandes de Maintenance

- `npm run dev` : Lance le serveur en mode développement sur le port 3000.
- `npm run type-check` : Validation stricte TypeScript (`tsc --noEmit`).
- `npm run build` : Compilation de production Next.js avec génération du client Prisma.
- `npx prisma studio` : Interface visuelle pour consulter les transactions et satellites enregistrés.
