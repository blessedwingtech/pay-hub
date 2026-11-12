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
  Edit2,
  Trash2,
  Mail,
  Send,
  Share2,
  Sparkles,
} from "lucide-react";

interface NotificationBundle {
  whatsappUrl: string;
  whatsappText: string;
  emailSubject: string;
  emailBody: string;
  mailtoUrl: string;
}

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
  startDate?: string;
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
    notifications?: {
      serviceStart: NotificationBundle;
      renewalDue: NotificationBundle;
      gracePeriod: NotificationBundle;
      paymentConfirmation?: NotificationBundle;
    };
  } | null;
}

interface Invoice {
  id: string;
  contractId?: string;
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
  notifications?: {
    serviceStart: NotificationBundle;
    renewalDue: NotificationBundle;
    gracePeriod: NotificationBundle;
    paymentConfirmation?: NotificationBundle;
  };
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

  // Modal State: Create
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  // Modal State: Edit Contract
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editFormData, setEditFormData] = useState({
    serviceName: "",
    serviceDescription: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    amount: "0",
    currency: "USD",
    billingCycle: "MONTHLY",
    nextDueDate: "",
    status: "ACTIVE",
    gracePeriodDays: "3",
  });
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal State: Delete Contract
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal State: Communication / Relance
  const [commModalData, setCommModalData] = useState<{
    contract: Contract;
    invoice: any;
  } | null>(null);
  const [commType, setCommType] = useState<
    "serviceStart" | "renewalDue" | "gracePeriod" | "paymentConfirmation"
  >("serviceStart");
  const [commChannel, setCommChannel] = useState<"whatsapp" | "email">("whatsapp");

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

      setShowCreateModal(false);
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

  const openEditModal = (contract: Contract) => {
    setEditingContract(contract);
    setEditError(null);
    setEditFormData({
      serviceName: contract.serviceName,
      serviceDescription: contract.serviceDescription || "",
      clientName: contract.clientName,
      clientEmail: contract.clientEmail,
      clientPhone: contract.clientPhone || "",
      amount: String(contract.amount),
      currency: contract.currency,
      billingCycle: contract.billingCycle,
      nextDueDate: contract.nextDueDate ? contract.nextDueDate.slice(0, 10) : "",
      status: contract.status,
      gracePeriodDays: String(contract.gracePeriodDays || 3),
    });
  };

  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;
    setUpdating(true);
    setEditError(null);

    try {
      const res = await fetch("/api/recurring/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingContract.id,
          serviceName: editFormData.serviceName,
          serviceDescription: editFormData.serviceDescription,
          clientName: editFormData.clientName,
          clientEmail: editFormData.clientEmail,
          clientPhone: editFormData.clientPhone || null,
          amount: parseFloat(editFormData.amount),
          currency: editFormData.currency,
          billingCycle: editFormData.billingCycle,
          nextDueDate: editFormData.nextDueDate,
          status: editFormData.status,
          gracePeriodDays: parseInt(editFormData.gracePeriodDays, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }

      setEditingContract(null);
      fetchData();
    } catch (err: any) {
      setEditError(err.message || "Erreur inconnue");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteContract = async () => {
    if (!deletingContract) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/recurring/services?id=${deletingContract.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      setDeletingContract(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Impossible de supprimer ce contrat");
    } finally {
      setDeleting(false);
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

  const handleMarkPaid = async (
    invoiceId: string,
    clientName: string,
    amount: number,
    currency: string,
    contract?: Contract
  ) => {
    const ok = window.confirm(
      `Confirmer l'encaissement direct (Cash / Virement) de ${amount.toFixed(2)} ${currency} pour ${clientName} ?\n\n` +
      `Cette action va :\n` +
      `1. Marquer la facture comme RÉGLÉE\n` +
      `2. Renouveler l'abonnement et calculer automatiquement la prochaine échéance\n` +
      `3. Réactiver le service (si suspendu)\n` +
      `4. Préparer le reçu de paiement à transmettre par Email ou WhatsApp.`
    );
    if (!ok) return;

    try {
      const res = await fetch("/api/recurring/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, action: "MARK_PAID" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'encaissement");
      }

      await fetchData();

      const matchingContract =
        contract || contracts.find((c) => c.id === data.invoice?.contractId);

      if (matchingContract) {
        setCommModalData({
          contract: matchingContract,
          invoice: data.invoice,
        });
        setCommType("paymentConfirmation");
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'encaissement");
    }
  };

  const openCommModal = (
    contract: Contract,
    invoice?: any,
    defaultType?: "serviceStart" | "renewalDue" | "gracePeriod" | "paymentConfirmation"
  ) => {
    const targetInvoice = invoice || contract.latestUnpaidInvoice;
    if (!targetInvoice) {
      handleGenerateInvoice(contract.id);
      return;
    }
    setCommModalData({
      contract,
      invoice: targetInvoice,
    });
    setCommType(
      defaultType ||
        (targetInvoice.status === "PAID"
          ? "paymentConfirmation"
          : contract.status === "GRACE_PERIOD"
          ? "gracePeriod"
          : "serviceStart")
    );
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
            <CheckCircle2 className="w-3 h-3" />
            Actif
          </span>
        );
      case "PENDING_RENEWAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-800">
            <Clock className="w-3 h-3" />À renouveler
          </span>
        );
      case "GRACE_PERIOD":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800">
            <AlertTriangle className="w-3 h-3" />
            Grâce
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800">
            <XCircle className="w-3 h-3" />
            Suspendu
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800">
            Annulé
          </span>
        );
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Réglée
          </span>
        );
      case "UNPAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800">
            <Clock className="w-3 h-3" />
            En attente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800">
            {status}
          </span>
        );
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.clientEmail.toLowerCase().includes(search.toLowerCase()) ||
      c.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      c.contractNumber.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === "ALL" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Lock Screen if not authenticated
  if (isAuthenticated === false) {
    return (
      <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-md mx-auto w-full flex flex-col items-center justify-center min-h-[70vh]">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 w-full space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white">Espace Administrateur</h2>
            <p className="text-xs text-slate-400">
              Veuillez saisir votre clé d&apos;administration Pay-Hub pour gérer les contrats et relances.
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
            Gestion des contrats, hébergements Blessed Wing Technology (BWT), modifications & relances 1-clic.
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
            onClick={() => setShowCreateModal(true)}
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

      {/* Navigation Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("contracts")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === "contracts"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Services & Contrats ({contracts.length})
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === "invoices"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
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
                Créez votre premier contrat de service (ex: Hébergement Blessed Wing Technology) en cliquant sur &quot;Nouveau Service&quot;.
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
                    <th className="py-3.5 px-4 text-right">Actions & Gestion</th>
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
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Communication Button (WhatsApp / Email / Link) */}
                          <button
                            onClick={() => openCommModal(contract)}
                            className="px-2.5 py-1.5 rounded-lg font-semibold text-xs text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 transition flex items-center gap-1.5 shadow"
                            title="Ouvrir les options de communication client (Début de service, Rappel, Email, WhatsApp)"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Contacter</span>
                          </button>

                          {/* 1-Click Cash / Direct Settlement */}
                          {contract.latestUnpaidInvoice && (
                            <button
                              onClick={() =>
                                handleMarkPaid(
                                  contract.latestUnpaidInvoice!.id,
                                  contract.clientName,
                                  contract.latestUnpaidInvoice!.amount,
                                  contract.latestUnpaidInvoice!.currency,
                                  contract
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg font-semibold text-xs text-amber-300 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 transition flex items-center gap-1.5 shadow"
                              title="Encaisser en cash / virement direct et renouveler l'échéance"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                              <span>Encaisser</span>
                            </button>
                          )}

                          {/* Quick Copy Link */}
                          {contract.latestUnpaidInvoice?.paymentUrl && (
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  contract.latestUnpaidInvoice!.paymentUrl,
                                  contract.id
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
                              title="Copier le lien direct de paiement"
                            >
                              {copiedId === contract.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Edit Button */}
                          <button
                            onClick={() => openEditModal(contract)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-blue-400 transition"
                            title="Modifier ce service / contrat"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingContract(contract)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-400 transition"
                            title="Supprimer ce service"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
                          {inv.status !== "PAID" && (
                            <button
                              onClick={() =>
                                handleMarkPaid(
                                  inv.id,
                                  inv.clientName,
                                  inv.amount,
                                  inv.currency
                                )
                              }
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-300 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 transition flex items-center gap-1 shadow"
                              title="Encaisser en cash / règlement direct"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                              <span>Encaisser</span>
                            </button>
                          )}

                          {inv.status === "PAID" && (
                            <button
                              onClick={() => {
                                const parentContract =
                                  contracts.find((c) => c.id === (inv as any).contractId) || {
                                    id: (inv as any).contractId || inv.id,
                                    contractNumber: "CTR-AUTO",
                                    serviceName: inv.serviceName,
                                    sourceSite: inv.sourceSite,
                                    clientName: inv.clientName,
                                    clientEmail: inv.clientEmail,
                                    clientPhone: inv.clientPhone,
                                    amount: inv.amount,
                                    currency: inv.currency,
                                    billingCycle: "MONTHLY",
                                    nextDueDate: inv.dueDate,
                                    status: "ACTIVE" as any,
                                    gracePeriodDays: 3,
                                  };
                                openCommModal(parentContract, inv, "paymentConfirmation");
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 transition flex items-center gap-1 shadow"
                              title="Ouvrir le reçu de confirmation de paiement (Email / WhatsApp)"
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Reçu</span>
                            </button>
                          )}

                          {inv.status === "UNPAID" && inv.whatsappUrl && (
                            <a
                              href={inv.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 transition flex items-center gap-1 shadow"
                              title="WhatsApp Click-to-Chat direct"
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

      {/* Modal: Communication Client (WhatsApp, Email, Copie de message) */}
      {commModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-2xl w-full space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-emerald-400" />
                  <span>Communication Client</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {commModalData.contract.serviceName} • {commModalData.contract.clientName} (Facture {commModalData.invoice.invoiceNumber})
                </p>
              </div>
              <button
                onClick={() => setCommModalData(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Type de message selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Type de message à transmettre :
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setCommType("serviceStart")}
                  className={`p-3 rounded-xl border text-left transition ${
                    commType === "serviceStart"
                      ? "border-blue-500 bg-blue-950/40 text-white"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold text-xs text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Début Service</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Activation & facture initiale
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCommType("renewalDue")}
                  className={`p-3 rounded-xl border text-left transition ${
                    commType === "renewalDue"
                      ? "border-emerald-500 bg-emerald-950/40 text-white"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Rappel</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Échéance à venir
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCommType("gracePeriod")}
                  className={`p-3 rounded-xl border text-left transition ${
                    commType === "gracePeriod"
                      ? "border-amber-500 bg-amber-950/40 text-white"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Grâce</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Dernier rappel urgent
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCommType("paymentConfirmation")}
                  className={`p-3 rounded-xl border text-left transition ${
                    commType === "paymentConfirmation"
                      ? "border-emerald-500 bg-emerald-950/40 text-white"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Reçu Payé</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Confirmation & renouvellement
                  </div>
                </button>
              </div>
            </div>

            {/* Canal de diffusion (WhatsApp vs Email) */}
            <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setCommChannel("whatsapp")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  commChannel === "whatsapp"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp (Option A)</span>
              </button>
              <button
                type="button"
                onClick={() => setCommChannel("email")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  commChannel === "email"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Professionnel</span>
              </button>
            </div>

            {/* Message Preview Box */}
            {(() => {
              const notifs = commModalData.invoice.notifications;
              const activeNotif: NotificationBundle = notifs ? notifs[commType] : null;

              if (commChannel === "whatsapp") {
                return (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {activeNotif?.whatsappText || "Génération du texte en cours..."}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            activeNotif?.whatsappText || "",
                            "modal-wa-text"
                          )
                        }
                        className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2"
                      >
                        {copiedId === "modal-wa-text" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copier le texte</span>
                          </>
                        )}
                      </button>

                      {activeNotif?.whatsappUrl && (
                        <a
                          href={activeNotif.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20 text-xs flex items-center gap-2"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Ouvrir WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400">Objet de l&apos;email :</div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-medium">
                        {activeNotif?.emailSubject || ""}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400">Corps de l&apos;email :</div>
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                        {activeNotif?.emailBody || ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `Objet : ${activeNotif?.emailSubject}\n\n${activeNotif?.emailBody}`,
                            "modal-email-text"
                          )
                        }
                        className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2"
                      >
                        {copiedId === "modal-email-text" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Email copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copier l&apos;email</span>
                          </>
                        )}
                      </button>

                      {activeNotif?.mailtoUrl && (
                        <a
                          href={activeNotif.mailtoUrl}
                          className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 text-xs flex items-center gap-2"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Ouvrir dans Messagerie</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              }
            })()}

            {/* Direct Link Section */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate max-w-xs">{commModalData.invoice.paymentUrl}</span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(commModalData.invoice.paymentUrl, "modal-link")
                }
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 shrink-0"
              >
                {copiedId === "modal-link" ? "Lien copié !" : "Copier le lien direct"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Service / Contract */}
      {editingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-lg w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Modifier le Service</h3>
                <p className="text-xs text-slate-400">
                  {editingContract.contractNumber} • {editingContract.sourceSite}
                </p>
              </div>
              <button
                onClick={() => setEditingContract(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateContract} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom du Service
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.serviceName}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, serviceName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tarif Récurrent
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editFormData.amount}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, amount: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Devise</label>
                  <select
                    value={editFormData.currency}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, currency: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="HTG">HTG (Gourdes)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Cycle de Facturation
                  </label>
                  <select
                    value={editFormData.billingCycle}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, billingCycle: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="MONTHLY">Mensuel (1 mois)</option>
                    <option value="QUARTERLY">Trimestriel (3 mois)</option>
                    <option value="SEMIANNUAL">Semestriel (6 mois)</option>
                    <option value="YEARLY">Annuel (1 an)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Statut du Service
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVE">Actif</option>
                    <option value="PENDING_RENEWAL">À renouveler</option>
                    <option value="GRACE_PERIOD">Période de grâce</option>
                    <option value="SUSPENDED">Suspendu</option>
                    <option value="CANCELLED">Annulé</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prochaine Échéance
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.nextDueDate}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, nextDueDate: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jours de Grâce
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.gracePeriodDays}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, gracePeriodDays: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Client Associé
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom du Client
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.clientName}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, clientName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={editFormData.clientEmail}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, clientEmail: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={editFormData.clientPhone}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, clientPhone: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingContract(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  {updating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <span>Sauvegarder les modifications</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-900/50 max-w-md w-full space-y-5 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">Supprimer ce Service ?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer définitivement le service{" "}
                <strong className="text-white">{deletingContract.serviceName}</strong> (Contrat{" "}
                <code className="text-blue-400">{deletingContract.contractNumber}</code>) ?
                <br />
                Les factures impayées rattachées seront également supprimées.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingContract(null)}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteContract}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-lg shadow-rose-600/20 text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Suppression...</span>
                  </>
                ) : (
                  <span>Confirmer la suppression</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Recurring Contract */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-lg w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Nouveau Contrat de Service</h3>
                <p className="text-xs text-slate-400">
                  Création d&apos;un service récurrent (Hébergement BWT, PressTonik, etc.) avec facture initiale
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
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
                  Nom du Service * (ex: Hébergement Web UCS, Maintenance Pro)
                </label>
                <input
                  type="text"
                  required
                  value={formData.serviceName}
                  onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                  placeholder="Ex: Hébergement Blessed Wing Technology"
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
                    <option value="BWT">Blessed Wing Technology (BWT)</option>
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
                    placeholder="Ex: Junior Pierre / Entreprise"
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
                      placeholder="client@domaine.com"
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
                  onClick={() => setShowCreateModal(false)}
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
                    <span>Créer le Contrat & la Facture</span>
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
