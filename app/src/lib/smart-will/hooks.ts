import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createSmartWillClient } from "./client";
import type { AddClauseInput } from "./types";

export function useWill(address: string | null, walletAddress?: string | null) {
  const client = useMemo(
    () => (address ? createSmartWillClient(address, walletAddress ?? undefined) : null),
    [address, walletAddress],
  );
  const qc = useQueryClient();
  const enabled = !!client;

  const status = useQuery({
    queryKey: ["will", address, "status"],
    queryFn: () => client!.getStatus(),
    enabled,
    refetchInterval: 5000,
  });

  const clauses = useQuery({
    queryKey: ["will", address, "clauses"],
    queryFn: () => client!.getAllClauses(),
    enabled,
    refetchInterval: 5000,
  });

  const evidence = useQuery({
    queryKey: ["will", address, "evidence"],
    queryFn: () => client!.getDeathEvidence(),
    enabled,
    refetchInterval: 8000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["will", address] });
  };

  const heartbeat = useMutation({
    mutationFn: () => client!.heartbeat(),
    onSuccess: invalidate,
  });
  const deposit = useMutation({
    mutationFn: (gen: number) => client!.depositFunds(gen),
    onSuccess: invalidate,
  });
  const addClause = useMutation({
    mutationFn: (input: AddClauseInput) => client!.addClause(input),
    onSuccess: invalidate,
  });
  const removeClause = useMutation({
    mutationFn: (id: string) => client!.removeClause(id),
    onSuccess: invalidate,
  });
  const triggerDeathCheck = useMutation({
    mutationFn: (urls: string[]) => client!.triggerDeathCheck(urls),
    onSuccess: invalidate,
  });
  const claimClause = useMutation({
    mutationFn: (vars: { id: string; url: string }) =>
      client!.claimClause(vars.id, vars.url),
    onSuccess: invalidate,
  });

  return {
    client,
    status,
    clauses,
    evidence,
    heartbeat,
    deposit,
    addClause,
    removeClause,
    triggerDeathCheck,
    claimClause,
  };
}
