# 📘 Guide d'Intégration Satellite - BitTonik Pay-Hub

Ce document est la référence technique officielle pour tout développeur ou architecte souhaitant connecter un service satellite (ex: **PressTonik**, **ShopTonik**, **MemoTonik**, **EduTonik**, etc.) au hub financier universel **BitTonik Pay-Hub** (`https://pay.bittonik.com`).

---

## 📑 Sommaire
1. [Principe de Fonctionnement](#1-principe-de-fonctionnement)
2. [Flux de Paiement (Checkout SSO)](#2-flux-de-paiement-checkout-sso)
3. [Dépêche et Validation des Webhooks](#3-dépêche-et-validation-des-webhooks)
4. [Gestion Multi-Devises & Passerelles](#4-gestion-multi-devises--passerelles)
5. [Reversements & Payouts Vendeurs](#5-reversements--payouts-vendeurs)
6. [Portail Client Stripe Billing](#6-portail-client-stripe-billing)
7. [Checklist de Déploiement en Production](#7-checklist-de-déploiement-en-production)

---

## 1. Principe de Fonctionnement

Pay-Hub fonctionne comme un **fournisseur de services de paiement multi-tenant**.
Le satellite n'a pas besoin de manipuler de clés API Stripe, PayPal ou MonCash secrètes. Il délègue l'encaissement et le traitement récurrent à Pay-Hub, puis reçoit des notifications d'événements cryptographiquement signées par **HMAC-SHA256**.

```
[Utilisateur sur Satellite]
          │
          │ 1. Clic "Payer" ou "S'abonner"
          ▼
[Redirection vers Pay-Hub /checkout] ──(Paramètres SSO + webhook_url)──► [BitTonik Pay-Hub]
                                                                                │
                                                                  2. Choix passerelle (Stripe, PP, MonCash)
                                                                                │
                                                                                ▼
                                                                     [Passerelle Bancaire]
                                                                                │
                                                                  3. Confirmation de paiement
                                                                                │
[Endpoint Satellite] ◄── 4. Webhook signé (X-PayHub-Signature) ─────────────────┘
(/api/webhooks/pay-hub)
          │
          │ 5. Déblocage du service / abonnement dans la DB locale
          ▼
[Utilisateur redirigé sur return_url]
```

---

## 2. Flux de Paiement (Checkout SSO)

### A. Construction de l'URL de Paiement
Le satellite génère une URL de redirection vers `https://pay.bittonik.com/checkout` avec les query parameters suivants :

| Paramètre | Type | Requis | Exemple | Description |
|---|---|---|---|---|
| `user_id` | `string` | **Oui** | `"usr_102"` | Identifiant de l'utilisateur sur le satellite. |
| `email` | `string` | Recommandé | `"user@domaine.com"` | Email prérempli pour la facture. |
| `full_name` | `string` | Non | `"Jean Dupont"` | Nom complet de l'acheteur. |
| `amount` | `number` | **Oui** | `19.99` | Montant dans la devise choisie. |
| `currency` | `string` | Non | `"USD"` | Devise (`USD`, `EUR`, `HTG`). Défaut: `"USD"`. |
| `source_site` | `string` | **Oui** | `"PRESSTONIK"` | Identifiant unique de votre satellite en majuscules. |
| `type` | `string` | Non | `"ONE_TIME"` | `ONE_TIME`, `SUBSCRIPTION` ou `DONATION`. |
| `plan_id` | `string` | Si abonnement | `"pro-monthly"` | Identifiant du forfait souscrit. |
| `description` | `string` | Non | `"Abonnement PressTonik"` | Libellé sur la facture et l'écran de paiement. |
| `return_url` | `string` | **Oui** | `"https://site.com/success"` | URL de redirection automatique après succès. |
| `cancel_url` | `string` | Non | `"https://site.com/cancel"` | URL de retour en cas d'abandon. |
| `webhook_url` | `string` | Recommandé | `"https://site.com/api/webhooks/pay-hub"` | **URL de votre endpoint webhook** (priorité maximale). |
| `site_name` | `string` | Non | `"PressTonik"` | Nom d'affichage pour le branding. |
| `accent_color` | `string` | Non | `"#ec4899"` | Couleur hexadécimale du bouton et des badges. |
| `logo_text` | `string` | Non | `"PT"` | Initiales du badge (si pas d'image de logo). |
| `logo_url` | `string` | Non | `"https://site.com/logo.png"` | URL de l'image de logo du satellite. |
| `metadata` | `string (JSON)` | Non | `'{"articleId": "77"}'` | Données métiers arbitraires renvoyées dans le webhook. |

### B. Exemple TypeScript (Navigateur ou Serveur)

```typescript
const params = new URLSearchParams({
  user_id: user.id,
  email: user.email,
  full_name: user.name,
  amount: "4.99",
  currency: "USD",
  source_site: "PRESSTONIK",
  site_name: "PressTonik Investigation",
  accent_color: "#ec4899",
  logo_text: "PT",
  description: "Accès Article Exclusif",
  return_url: `${window.location.origin}/articles/10?success=true`,
  cancel_url: `${window.location.origin}/articles/10`,
  webhook_url: `${window.location.origin}/api/webhooks/pay-hub`,
  metadata: JSON.stringify({ articleId: 10 }),
});

window.location.href = `https://pay.bittonik.com/checkout?${params.toString()}`;
```

---

## 3. Dépêche et Validation des Webhooks

### A. Headers HTTP Transmis

```http
POST /api/webhooks/pay-hub HTTP/1.1
Content-Type: application/json
User-Agent: BitTonik-PayHub/1.0
X-PayHub-Signature: sha256=a8f5c3...
X-PayHub-Timestamp: 1776249123
X-PayHub-Event: payment.completed
X-PayHub-Site: PRESSTONIK
```

### B. Payload JSON Reçu

```json
{
  "eventId": "evt_1776249123000_x8z9",
  "eventType": "payment.completed",
  "event": "payment.completed",
  "timestamp": "2026-10-15T14:00:00.000Z",
  "sourceSite": "PRESSTONIK",
  "data": {
    "transactionId": "clxx89abcdef1234567890",
    "satelliteUserId": "usr_102",
    "amount": 4.99,
    "currency": "USD",
    "status": "COMPLETED",
    "provider": "STRIPE",
    "type": "ONE_TIME",
    "planId": "",
    "metadata": {
      "articleId": 10,
      "stripeSessionId": "cs_test_..."
    }
  }
}
```

### C. Vérification de la Signature HMAC-SHA256 (Node.js)

```typescript
import crypto from "crypto";

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  try {
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const providedSig = signatureHeader.replace(/^sha256=/, "");
    return crypto.timingSafeEqual(
      Buffer.from(providedSig),
      Buffer.from(expectedSig)
    );
  } catch {
    return false;
  }
}
```

---

## 4. Gestion Multi-Devises & Passerelles

### MonCash (Haïti - Digicel)
- **Monnaie acceptée** : Gourdes haïtiennes (`HTG`).
- **Conversion** : Si le satellite envoie `USD`, Pay-Hub convertit avec le ratio officiel (1 USD = 132 HTG). Si le satellite envoie directement `currency: "HTG"`, le montant exact est prélevé.
- **Support mobile** : Les acheteurs règlent directement via leur portefeuille MonCash sur smartphone.

### Stripe
- **Moyens gérés** : Cartes Bancaires (Visa, Mastercard, Amex), Apple Pay, Google Pay, abonnements récurrents Stripe Billing.
- **Prélèvement** : Réalisé en centimes d'unités (`amount * 100`).

### PayPal
- **Moyens gérés** : Solde PayPal, compte bancaire lié, cartes enregistrées.
- **Processus** : Approbation OAuth 2.0 suivie d'une capture serveur automatique par Pay-Hub.

---

## 5. Reversements & Payouts Vendeurs (ShopTonik / Créateurs)

Les satellites ayant des vendeurs tiers ou des créateurs de contenu peuvent déclencher des retraits programmatiques via l'API interne Pay-Hub :

`POST https://pay.bittonik.com/api/payouts/create`

Headers :
```http
Content-Type: application/json
Authorization: Bearer <PAY_HUB_WEBHOOK_SECRET>
```

Corps JSON :
```json
{
  "sellerId": "seller_7781",
  "sourceSite": "SHOPTONIK",
  "amount": 150.00,
  "currency": "USD",
  "channel": "STRIPE", // "STRIPE" | "PAYPAL" | "MONCASH"
  "destination": "acct_1NJ2kx...", // Stripe Connect ID, email PayPal ou N° téléphone MonCash
  "webhookUrl": "https://shop.bittonik.com/api/webhooks/pay-hub",
  "metadata": {
    "withdrawalId": "wd_9912"
  }
}
```

---

## 6. Portail Client Stripe Billing

Pour permettre à vos abonnés de mettre à jour leur carte bancaire, télécharger leurs factures PDF officielles ou gérer leur formule d'abonnement :

`POST https://pay.bittonik.com/api/portal/session`

```json
{
  "userId": "usr_102",
  "sourceSite": "MEMOTONIK",
  "returnUrl": "https://memotonik.bittonik.com/dashboard"
}
```

**Réponse (HTTP 200)** :
```json
{
  "url": "https://billing.stripe.com/p/session/test_..."
}
```
Redirigez l'utilisateur vers cette URL pour ouvrir sa session Stripe Billing Customer Portal.

---

## 7. Checklist de Déploiement en Production

- [ ] La variable `NEXT_PUBLIC_PAY_HUB_URL` pointe bien sur `https://pay.bittonik.com`.
- [ ] La variable `PAY_HUB_WEBHOOK_SECRET` est synchronisée entre Pay-Hub et votre satellite.
- [ ] L'endpoint `/api/webhooks/pay-hub` de votre satellite lit le corps en texte brut (`req.text()`) pour calculer le HMAC avant tout parsing JSON.
- [ ] L'endpoint webhook retourne un code HTTP `200` avec `{ "received": true }` pour acquitter la livraison.
- [ ] Vos URLs de redirection `return_url` et de webhook `webhook_url` sont accessibles en `HTTPS`.
