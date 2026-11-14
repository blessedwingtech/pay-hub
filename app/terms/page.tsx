import Link from "next/link";
import { ArrowLeft, ShieldCheck, Scale, RefreshCw, DollarSign, HelpCircle, Lock } from "lucide-react";

export const metadata = {
  title: "Conditions Générales & Politique de Change - BitTonik Pay-Hub",
  description: "Conditions d'utilisation, modalités de paiement et politique de change opérées par Blessed Wing Technology (BWT).",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à Pay-Hub
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Document Officiel BWT
          </div>
        </div>

        {/* Title banner */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Conditions Générales de Paiement & Politique de Change
          </h1>
          <p className="text-sm sm:text-base text-slate-400">
            Plateforme opérée par <strong className="text-amber-400">Blessed Wing Technology (BWT)</strong> • Dernière mise à jour : Novembre 2026
          </p>
        </div>

        {/* Introduction Box */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 space-y-3 text-sm leading-relaxed">
          <p>
            Les présentes Conditions Générales régissent l’utilisation de la plateforme de paiement unifiée <strong>BitTonik Pay-Hub</strong> (accessible via <code>pay.bittonik.com</code>) ainsi que l’ensemble des transactions financières, factures récurrentes, dons et règlements effectués pour le compte de <strong>Blessed Wing Technology (BWT)</strong> et de ses satellites écosystémiques (ex: ShopTonik, MemoTonik, PressTonik, etc.).
          </p>
          <p>
            En effectuant un règlement sur BitTonik Pay-Hub, l’acheteur, client ou donateur accepte sans réserve les présentes stipulations.
          </p>
        </div>

        {/* Main Content Sections */}
        <div className="space-y-8">

          {/* Section 1 : Opérateur */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-xl font-bold text-white">
              <Scale className="w-5 h-5 text-amber-400" />
              <h2>1. Opérateur Légal & Identité de l’Éditeur</h2>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed space-y-2 pl-7">
              <p>
                <strong>BitTonik Pay-Hub</strong> est le système financier et l'infrastructure d'encaissement propriétaire de la société technologique <strong>Blessed Wing Technology (BWT)</strong>.
              </p>
              <p>
                Pay-Hub agit comme passerelle unifiée sécurisée permettant l'encaissement via cartes bancaires internationales (Stripe), comptes vérifiés (PayPal), et portefeuilles mobiles locaux haïtiens (Digicel MonCash via la passerelle agréée Bazik.io).
              </p>
            </div>
          </section>

          {/* Section 2 : Politique de Change & Devises */}
          <section className="space-y-3 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2.5 text-xl font-bold text-amber-400">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <h2>2. Devises de Référence & Politique de Change (HTG / USD)</h2>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed space-y-3 pl-7">
              <p>
                <strong>Devise de base :</strong> Les prestations, contrats et dons sont initialement libellés en <strong>Dollars Américains (USD)</strong> ou en <strong>Euros (EUR)</strong>.
              </p>
              <p>
                <strong>Paiement en Gourdes Haïtiennes (MonCash / Natcash) :</strong>
                Lorsque le payeur sélectionne un moyen de paiement en monnaie locale haïtienne, le montant dû est converti dynamiquement en Gourdes (HTG) selon le <strong>Taux Effectif Appliqué</strong> au moment exact de l’initiation de la transaction.
              </p>
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <p className="font-semibold text-amber-300">Composition du Taux Effectif Appliqué :</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Cours de référence :</strong> Taux interbancaire officiel actualisé en continu.</li>
                  <li><strong>Marge de sécurisation & traitement :</strong> Une marge technique (ex: 3% à 5%) est appliquée afin de couvrir les frais de compensation des opérateurs locaux (frais de retrait opérateur, volatilité monétaire et frais de routage passerelle).</li>
                  <li><strong>Taux garanti ferme :</strong> Le montant en HTG affiché au client lors de la validation finale et transmis sur le guichet sécurisé Digicel MonCash est ferme et irrévocable. Aucune rétrocession ni réclamation fondée sur la fluctuation ultérieure des cours de change ne sera admise.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 : Contrats Récurrents & Facturation */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-xl font-bold text-white">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              <h2>3. Contrats Récurrents, Échéances & Période de Grâce</h2>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed space-y-3 pl-7">
              <p>
                Les contrats de services souscrits auprès de <strong>Blessed Wing Technology (BWT)</strong> (tels que l’hébergement cloud, la maintenance applicative, les abonnements logiciels ou VIP) sont renouvelables selon le cycle convenu (mensuel, trimestriel, semestriel ou annuel).
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Avis d'échéance :</strong> Un avis de renouvellement et une facture proforma numérique sont émis avant la date limite de règlement.</li>
                <li><strong>Période de grâce (3 jours) :</strong> Une période de grâce de 3 jours calendaires est accordée à compter de la date d'échéance. Durant cet intervalle, le service demeure actif et des rappels automatiques (Email / WhatsApp) sont notifiés au titulaire.</li>
                <li><strong>Suspension de service :</strong> À défaut de régularisation à l'issue de la période de grâce, le contrat bascule automatiquement en état de suspension jusqu’au paiement effectif.</li>
                <li><strong>Règlement Direct Cash certifié :</strong> En cas de paiement direct en espèces auprès d'un représentant accrédité de BWT, le contrat est immédiatement réactivé avec délivrance d'un reçu fiscal numérique signé portant l'identifiant unique de transaction.</li>
              </ul>
            </div>
          </section>

          {/* Section 4 : Sécurité & Confidentialité */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-xl font-bold text-white">
              <Lock className="w-5 h-5 text-amber-400" />
              <h2>4. Sécurité des Données Bancaires & Confidentialité</h2>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed space-y-2 pl-7">
              <p>
                BitTonik Pay-Hub applique les normes les plus strictes de sécurité financière :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Les numéros de carte de crédit et codes CVC sont traités exclusivement par l'infrastructure certifiée PCI-DSS Niveau 1 de <strong>Stripe</strong>.</li>
                <li>Les codes PIN et numéros MonCash sont saisis directement sur le guichet officiel crypté de <strong>Digicel MonCash</strong>. Aucun code secret ne transite ni n'est conservé sur nos serveurs.</li>
                <li>Toutes les notifications inter-serveurs (webhooks) sont vérifiées cryptographiquement par signatures HMAC SHA-256.</li>
              </ul>
            </div>
          </section>

          {/* Section 5 : Politique de Non-Remboursement */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-xl font-bold text-white">
              <Scale className="w-5 h-5 text-amber-400" />
              <h2>5. Rétractation, Annulation & Remboursements</h2>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed space-y-2 pl-7">
              <p>
                Conformément aux usages du commerce électronique de services numériques :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Les prestations immatérielles immédiatement exécutées (accès logiciels, licences activées, hébergements mis en production) et les dons financiers ne sont pas remboursables.</li>
                <li>En cas de défaillance technique majeure imputable à notre infrastructure entraînant un double débit, le client doit signaler l'incident sous 48 heures au service financier afin d'obtenir un avoir ou une compensation après vérification des journaux de transaction.</li>
              </ul>
            </div>
          </section>

          {/* Section 6 : Support & Contact */}
          <section className="space-y-3 p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2.5 text-xl font-bold text-white">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <h2>6. Assistance, Facturation & Réclamations</h2>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed space-y-2 pl-7">
              <p>
                Pour toute question relative à une facture, un paiement MonCash, un relevé de transaction ou un renouvellement de contrat BWT, notre équipe financière est à votre entière disposition :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block">Service Client BWT :</span>
                  <strong className="text-amber-400 text-sm">contact@bittonik.com</strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block">Direction Financière :</span>
                  <strong className="text-amber-400 text-sm">blessedwingtech@gmail.com</strong>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Blessed Wing Technology (BWT). Tous droits réservés. BitTonik Pay-Hub v2.0.
        </div>

      </div>
    </div>
  );
}
