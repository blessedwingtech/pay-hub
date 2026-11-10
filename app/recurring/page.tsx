"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  PlusCircle,
  Search,
  MessageCircle,
  Copy,
  Check,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldAlert,
  DollarSign,
  FileText,
  User,
  Lock,
  KeyRound,
  LogOut,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

interface Contract {
  id: string;
  contractNumber: string;
  serviceName: string;
  serviceDescription?: string;
  sourceSite: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  amount: number;
  currency: string;
  billingCycle: string;
  nextDueDate: string;
  status: "ACTIVE" | "PENDING_RENEWAL" | "GRACE_PERIOD" | "SUSPENDED" | "CANCELLED";
  gracePeriodDays: number;
  latestUnpaidInvoice?: {
    id: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    dueDate: string;
    paymentUrl: string;
    whatsappUrl: string;
  } | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  serviceName: string;
  sourceSite: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: "DRAFT" | "UNPAID" | "PAID" | "OVERDUE" | "CANCELLED";
  paymentUrl: string;
  whatsappUrl: string;
  paidAt?: string;
}

export default function RecurringServicesPage() {
  // Admin Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"contracts" | "invoices">("contracts");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    serviceName: "",
    serviceDescription: "",
    sourceSite: "BWT",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    amount: "15.00",
    currency: "USD",
    billingCycle: "MONTHLY",
    gracePeriodDays: "3",
  });

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/check").then((r) => r.json());
      if (res.authenticated) {
        setIsAuthenticated(true);
        fetchData();
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    } catch {
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthenticating(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKeyInput }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Clé d'administration invalide");
      }

      setIsAuthenticated(true);
      setAdminKeyInput("");
      fetchData();
    } catch (err: any) {
      setAuthError(err.message || "Erreur de connexion");
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setIsAuthenticated(false);
      setContracts([]);
      setInvoices([]);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resContracts, resInvoices] = await Promise.all([
        fetch("/api/recurring/services").then((r) => r.json()),
        fetch("/api/recurring/invoices").then((r) => r.json()),
      ]);

      if (resContracts.success) setContracts(resContracts.contracts || []);
      if (resInvoices.success) setInvoices(resInvoices.invoices || []);
    } catch (err) {
      console.error("Failed to load recurring services:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError(null);

    try {
      const res = await fetch("/api/recurring/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          gracePeriodDays: parseInt(formData.gracePeriodDays, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la création du contrat");
      }

      setShowModal(false);
      setFormData({
        serviceName: "",
        serviceDescription: "",
        sourceSite: "BWT",
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        amount: "15.00",
        currency: "USD",
        billingCycle: "MONTHLY",
        gracePeriodDays: "3",
      });
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateInvoice = async (contractId: string) => {
    try {
      const res = await fetch("/api/recurring/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || "Impossible de générer la facture");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Actif
          </span>
        );
      case "PENDING_RENEWAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800">
            <Clock className="w-3.5 h-3.5" /> À renouveler
          </span>
        );
      case "GRACE_PERIOD":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-950 text-orange-400 border border-orange-800 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> Période de grâce
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800">
            <ShieldAlert className="w-3.5 h-3.5" /> Suspendu
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800">
            <XCircle className="w-3.5 h-3.5" /> Résilié
          </span>
        );
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <Check className="w-3.5 h-3.5" /> Payée
          </span>
        );
      case "UNPAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800">
            <Clock className="w-3.5 h-3.5" /> En attente
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" /> En retard
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.clientEmail.toLowerCase().includes(search.toLowerCase()) ||
      c.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      c.sourceSite.toLowerCase().includes(search.toLowerCase()) ||
      c.contractNumber.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === "ALL" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (isAuthenticated === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-16">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Vérification des droits d&apos;accès...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800 max-w-md w-full space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
            <Lock className="w-8 h-8" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Espace Administration</h2>
            <p className="text-xs text-slate-400">
              Veuillez saisir votre clé <code className="text-blue-400">PAYHUB_ADMIN_KEY</code> pour gérer les contrats, hébergements et relances.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs text-center flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Clé d&apos;Administration
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={adminKeyInput}
                  onChange={(e) => setAdminKeyInput(e.target.value)}
                  placeholder="Entrez votre mot de passe admin..."
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authenticating}
              className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {authenticating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Vérification...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Déverrouiller l&apos;Administration</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <span>Abonnements & Services Récurrents</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800">
              Multi-Satellites
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestion universelle des contrats récurrents, hébergements BWT, abonnements et relances WhatsApp 1-clic.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center gap-2 text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nouveau Service</span>
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 hover:border-rose-800/80 transition"
            title="Déconnexion Administrateur"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Contrats Actifs</div>
          <div className="text-2xl font-extrabold text-white">
            {contracts.filter((c) => c.status === "ACTIVE").length}
          </div>
          <div className="text-xs text-slate-500">Services hébergés & souscrits</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-xs font-medium text-amber-400 uppercase tracking-wider">À Relancer (Échéances)</div>
          <div className="text-2xl font-extrabold text-amber-400">
            {contracts.filter((c) => c.status === "PENDING_RENEWAL" || c.status === "GRACE_PERIOD").length}
          </div>
          <div className="text-xs text-slate-500">Prêts pour relance WhatsApp & Email</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-xs font-medium text-rose-400 uppercase tracking-wider">Services Suspendus</div>
          <div className="text-2xl font-extrabold text-rose-400">
            {contracts.filter((c) => c.status === "SUSPENDED").length}
          </div>
          <div className="text-xs text-slate-500">Grâce expirée sans paiement</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Factures Réglées</div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {invoices.filter((i) => i.status === "PAID").length}
          </div>
          <div className="text-xs text-slate-500">Renouvellements confirmés</div>
        </div>
      </div>

      {/* Controls: Search, Tabs & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("contracts")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "contracts"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Contrats ({contracts.length})
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "invoices"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Factures & Liens ({invoices.length})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher client, service, BWT..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {activeTab === "contracts" && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Tous statuts</option>
              <option value="ACTIVE">Actifs</option>
              <option value="PENDING_RENEWAL">À renouveler</option>
              <option value="GRACE_PERIOD">Période de grâce</option>
              <option value="SUSPENDED">Suspendus</option>
            </select>
          )}
        </div>
      </div>

      {/* Contracts Tab Content */}
      {activeTab === "contracts" && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          {filteredContracts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-base font-semibold text-slate-300">Aucun contrat trouvé</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Créez votre premier contrat de service (ex: Hébergement web Junior chez BWT) en cliquant sur &quot;Nouveau Service&quot;.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Contrat & Service</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Satellite</th>
                    <th className="py-3.5 px-4">Tarif & Cycle</th>
                    <th className="py-3.5 px-4">Prochaine Échéance</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Actions Relance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm">{contract.serviceName}</div>
                        <div className="text-xs text-slate-500 font-mono">{contract.contractNumber}</div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-200">{contract.clientName}</div>
                        <div className="text-xs text-slate-400">{contract.clientEmail}</div>
                        {contract.clientPhone && (
                          <div className="text-xs text-emerald-400 font-mono mt-0.5">
                            {contract.clientPhone}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-block text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-blue-400">
                          {contract.sourceSite}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-white">
                          {contract.amount.toFixed(2)} {contract.currency}
                        </div>
                        <div className="text-xs text-slate-500">
                          {contract.billingCycle === "MONTHLY"
                            ? "Mensuel"
                            : contract.billingCycle === "YEARLY"
                            ? "Annuel"
                            : contract.billingCycle}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono text-xs">
                        {new Intl.DateTimeFormat("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(contract.nextDueDate))}
                      </td>

                      <td className="py-4 px-4">{getStatusBadge(contract.status)}</td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Option A: 1-Click WhatsApp Button */}
                          {contract.latestUnpaidInvoice?.whatsappUrl ? (
                            <a
                              href={contract.latestUnpaidInvoice.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg font-semibold text-xs text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 transition flex items-center gap-1.5 shadow"
                              title="Ouvrir WhatsApp avec message prérempli et lien de paiement"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Relancer WhatsApp</span>
                            </a>
                          ) : (
                            <button
                              onClick={() => handleGenerateInvoice(contract.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition flex items-center gap-1"
                              title="Générer une facture pour activer le lien de paiement"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-400" />
                              <span>Créer Facture</span>
                            </button>
                          )}

                          {/* Copy Payment Link */}
                          {contract.latestUnpaidInvoice?.paymentUrl && (
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  contract.latestUnpaidInvoice!.paymentUrl,
                                  contract.id
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
                              title="Copier le lien direct de paiement Pay-Hub"
                            >
                              {copiedId === contract.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoices Tab Content */}
      {activeTab === "invoices" && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400">Aucune facture enregistrée</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Facture N°</th>
                    <th className="py-3.5 px-4">Service & Satellite</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Montant</th>
                    <th className="py-3.5 px-4">Échéance</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Lien & Relance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-4 px-4 font-mono font-bold text-white text-xs">
                        {inv.invoiceNumber}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-200">{inv.serviceName}</div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {inv.sourceSite}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-white text-xs font-semibold">{inv.clientName}</div>
                        <div className="text-[11px] text-slate-400">{inv.clientEmail}</div>
                        {inv.clientPhone && (
                          <div className="text-[11px] text-emerald-400 font-mono">
                            {inv.clientPhone}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 font-bold text-white">
                        {inv.amount.toFixed(2)} {inv.currency}
                      </td>

                      <td className="py-4 px-4 font-mono text-xs">
                        {new Intl.DateTimeFormat("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(inv.dueDate))}
                      </td>

                      <td className="py-4 px-4">{getStatusBadge(inv.status)}</td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === "UNPAID" && inv.whatsappUrl && (
                            <a
                              href={inv.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 transition flex items-center gap-1 shadow"
                              title="Option A: WhatsApp Click-to-Chat (0$ coût)"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>WhatsApp</span>
                            </a>
                          )}

                          <a
                            href={inv.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
                            title="Ouvrir la page de paiement"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                          </a>

                          <button
                            onClick={() => copyToClipboard(inv.paymentUrl, inv.id)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
                            title="Copier le lien de paiement"
                          >
                            {copiedId === inv.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Recurring Contract */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-lg w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Nouveau Contrat de Service</h3>
                <p className="text-xs text-slate-400">
                  Création dynamique d&apos;abonnement récurrent (Hébergement BWT, PressTonik, etc.)
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateContract} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom du Service * (ex: Hébergement Web Pro, Maintenance Annuelle)
                </label>
                <input
                  type="text"
                  required
                  value={formData.serviceName}
                  onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                  placeholder="Ex: Hébergement BWT Cloud Starter"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Satellite / Prestataire *
                  </label>
                  <select
                    value={formData.sourceSite}
                    onChange={(e) => setFormData({ ...formData, sourceSite: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="BWT">BWT (Hébergement & Projets)</option>
                    <option value="PRESSTONIK">PressTonik</option>
                    <option value="SHOPTONIK">ShopTonik</option>
                    <option value="ACADEMY">BitTonik Academy</option>
                    <option value="MEMOTONIK">MemoTonik</option>
                    <option value="CUSTOM">Autre Prestataire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Cycle de Facturation *
                  </label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="MONTHLY">Mensuel (1 mois)</option>
                    <option value="QUARTERLY">Trimestriel (3 mois)</option>
                    <option value="SEMIANNUAL">Semestriel (6 mois)</option>
                    <option value="YEARLY">Annuel (1 an)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Montant Récurrent *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Devise *</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="HTG">HTG (Gourdes Haïti)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-4 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Informations du Client
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom Complet du Client *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Ex: Junior Pierre"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      placeholder="junior@exemple.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Téléphone (WhatsApp / MonCash)
                    </label>
                    <input
                      type="tel"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      placeholder="+509 3701 2345"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <span>Créer le Contrat</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
