import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Transactions ──────────────────────────────────────────────
export const useTransactions = (limit?: number) =>
  useQuery({
    queryKey: ["transactions", limit],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("*, categories(id,name,icon,color,type), accounts(id,name,color,icon,type)")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAddTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      amount: number;
      type: "income" | "expense";
      description?: string;
      category_id?: string;
      account_id?: string;
      date?: string;
      installment_total?: number;
      installment_current?: number;
      recurrence?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // If installments, create all parcels
      if (payload.installment_total && payload.installment_total > 1) {
        const groupId = crypto.randomUUID();
        const rows = Array.from({ length: payload.installment_total }, (_, i) => {
          const baseDate = payload.date ? new Date(payload.date + "T12:00:00") : new Date();
          baseDate.setMonth(baseDate.getMonth() + i);
          return {
            user_id: user.id,
            amount: payload.amount,
            type: payload.type,
            description: payload.description
              ? `${payload.description} (${i + 1}/${payload.installment_total})`
              : `Parcela ${i + 1}/${payload.installment_total}`,
            category_id: payload.category_id ?? null,
            account_id: payload.account_id ?? null,
            date: baseDate.toISOString().split("T")[0],
            installment_group_id: groupId,
            installment_total: payload.installment_total,
            installment_current: i + 1,
            source: "manual",
          };
        });
        const { error } = await supabase.from("transactions").insert(rows);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").insert({
          user_id: user.id,
          amount: payload.amount,
          type: payload.type,
          description: payload.description ?? null,
          category_id: payload.category_id ?? null,
          account_id: payload.account_id ?? null,
          date: payload.date ?? new Date().toISOString().split("T")[0],
          recurrence: payload.recurrence ?? null,
          notes: payload.notes ?? null,
          source: "manual",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Lançamento adicionado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Lançamento removido.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ── Categories ────────────────────────────────────────────────
export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

// ── Accounts ──────────────────────────────────────────────────
export const useAccounts = () =>
  useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAddAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      type: string;
      balance?: number;
      credit_limit?: number;
      color?: string;
      icon?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("accounts").insert({
        user_id: user.id,
        name: payload.name,
        type: payload.type,
        balance: payload.balance ?? 0,
        credit_limit: payload.credit_limit ?? null,
        color: payload.color ?? "#10b981",
        icon: payload.icon ?? "Wallet",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Conta adicionada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Conta removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ── Budgets ───────────────────────────────────────────────────
export const useBudgets = (month: number, year: number) =>
  useQuery({
    queryKey: ["budgets", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*, categories(id,name,icon,color)")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      category_id: string;
      amount: number;
      month: number;
      year: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("budgets").upsert(
        { user_id: user.id, ...payload },
        { onConflict: "user_id,category_id,month,year" }
      );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["budgets", vars.month, vars.year] });
      toast.success("Orçamento salvo!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ── Goals ─────────────────────────────────────────────────────
export const useGoals = () =>
  useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

// ── Insights ──────────────────────────────────────────────────
export const useInsights = () =>
  useQuery({
    queryKey: ["insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

// ── Profile ───────────────────────────────────────────────────
export const useProfile = () =>
  useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
