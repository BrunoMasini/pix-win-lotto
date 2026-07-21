import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  checkIsAdmin,
  getSalesReport,
  listAllOrders,
  updateActiveRaffle,
  finalizeAndCreateRaffle,
  listAllRafflesAdmin,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  LogOut,
  DollarSign,
  Ticket,
  Clock,
  ShoppingBag,
  Trophy,
  Save,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Painel Admin - Rifas" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const check = useServerFn(checkIsAdmin);
  const fetchReport = useServerFn(getSalesReport);
  const fetchOrders = useServerFn(listAllOrders);
  const fetchAll = useServerFn(listAllRafflesAdmin);

  const { data: adminCheck, isLoading: checking } = useQuery({
    queryKey: ["admin-check"],
    queryFn: check,
  });

  const { data: report } = useQuery({
    queryKey: ["admin-report"],
    queryFn: fetchReport,
    enabled: adminCheck?.isAdmin,
    refetchInterval: 15000,
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: fetchOrders,
    enabled: adminCheck?.isAdmin,
  });

  const { data: allRaffles } = useQuery({
    queryKey: ["admin-all-raffles"],
    queryFn: fetchAll,
    enabled: adminCheck?.isAdmin,
  });

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Acesso negado
            </CardTitle>
            <CardDescription>
              Sua conta não tem permissão de administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="font-display text-xl font-bold">Painel Admin</h1>
            <p className="text-xs text-muted-foreground">
              Gerencie rifas, pedidos e sorteios
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6 grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="raffle">Rifa Ativa</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<DollarSign className="h-5 w-5" />}
                label="Arrecadado"
                value={report ? fmt(report.totalRevenue) : "—"}
                accent="text-green-600"
              />
              <StatCard
                icon={<Ticket className="h-5 w-5" />}
                label="Números Pagos"
                value={report ? String(report.totalSold) : "—"}
              />
              <StatCard
                icon={<Clock className="h-5 w-5" />}
                label="Pendentes"
                value={report ? String(report.totalPending) : "—"}
                sub={report ? `${fmt(report.pendingRevenue)}` : ""}
              />
              <StatCard
                icon={<ShoppingBag className="h-5 w-5" />}
                label="Disponíveis"
                value={report ? String(report.totalAvailable) : "—"}
              />
            </div>

            {report?.raffle && (
              <Card>
                <CardHeader>
                  <CardTitle>Rifa em andamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{report.raffle.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {report.raffle.total_numbers} números ×{" "}
                    {fmt(Number(report.raffle.price_per_number))}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="orders">
            <OrdersTable orders={orders ?? []} />
          </TabsContent>

          <TabsContent value="raffle">
            <ActiveRaffleForm />
          </TabsContent>

          <TabsContent value="history">
            <HistoryList raffles={allRaffles ?? []} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className={`mt-2 text-2xl font-bold ${accent || ""}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

type OrderRow = Awaited<ReturnType<typeof listAllOrders>>[number];

function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const statusColor: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    expired: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos ({orders.length})</CardTitle>
        <CardDescription>Últimos 500 pedidos, mais recentes primeiro.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="pb-2">Nome</th>
              <th className="pb-2">WhatsApp</th>
              <th className="pb-2">Números</th>
              <th className="pb-2">Valor</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="py-2 font-medium">{o.buyer_name}</td>
                <td className="py-2">{o.buyer_whatsapp}</td>
                <td className="py-2 font-mono text-xs">
                  {(o.numbers as number[])
                    .map((n) => String(n).padStart(2, "0"))
                    .join(", ")}
                </td>
                <td className="py-2">{fmt(Number(o.amount))}</td>
                <td className="py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${statusColor[o.status] || ""}`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="py-2 text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum pedido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ActiveRaffleForm() {
  const qc = useQueryClient();
  const fetchReport = useServerFn(getSalesReport);
  const update = useServerFn(updateActiveRaffle);
  const finalize = useServerFn(finalizeAndCreateRaffle);
  const fetchAll = useServerFn(listAllRafflesAdmin);

  const { data: report } = useQuery({
    queryKey: ["admin-report"],
    queryFn: fetchReport,
  });
  const { data: allRaffles } = useQuery({
    queryKey: ["admin-all-raffles"],
    queryFn: fetchAll,
  });

  const active = allRaffles?.find((r) => r.status === "active");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("25");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (active) {
      setTitle(active.title);
      setDescription(active.description);
      setImageUrl(active.image_url || "");
      setPrice(String(active.price_per_number));
    }
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMut = useMutation({
    mutationFn: (payload: {
      id: string;
      title: string;
      description: string;
      image_url: string | null;
      price_per_number: number;
    }) => update({ data: payload }),
    onSuccess: () => {
      setMsg({ type: "ok", text: "Rifa atualizada com sucesso." });
      qc.invalidateQueries();
    },
    onError: (e: Error) =>
      setMsg({ type: "err", text: e.message || "Erro ao salvar." }),
  });

  const [winnerNumber, setWinnerNumber] = useState("");
  const [showFinalize, setShowFinalize] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImg, setNewImg] = useState("");
  const [newPrice, setNewPrice] = useState("25");
  const [newTotal, setNewTotal] = useState("99");

  const finalizeMut = useMutation({
    mutationFn: (payload: {
      raffleId: string;
      winnerNumber: number;
      newTitle: string;
      newDescription: string;
      newImageUrl: string | null;
      newPrice: number;
      newTotalNumbers: number;
    }) => finalize({ data: payload }),
    onSuccess: () => {
      setMsg({ type: "ok", text: "Rifa finalizada e nova rifa criada!" });
      setShowFinalize(false);
      qc.invalidateQueries();
    },
    onError: (e: Error) =>
      setMsg({ type: "err", text: e.message || "Erro ao finalizar." }),
  });

  if (!active) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma rifa ativa.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Editar Rifa Ativa</CardTitle>
          <CardDescription>
            {report?.totalSold ?? 0} vendidos · {report?.totalAvailable ?? 0} disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMut.mutate({
                id: active.id,
                title,
                description,
                image_url: imageUrl,
                price_per_number: Number(price),
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>URL da imagem do prêmio</Label>
              <Input
                type="url"
                value={imageUrl}
                placeholder="https://... ou /air-fryer-prize.jpg"
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço por número (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            {msg && (
              <div
                className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                  msg.type === "ok"
                    ? "bg-green-50 text-green-700"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {msg.type === "ok" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {msg.text}
              </div>
            )}

            <Button type="submit" disabled={updateMut.isPending}>
              {updateMut.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              Salvar alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-raffle-gold" />
            Finalizar rifa e iniciar próxima
          </CardTitle>
          <CardDescription>
            Registra o ganhador, arquiva a rifa atual e cria uma nova rifa ativa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showFinalize ? (
            <Button variant="outline" onClick={() => setShowFinalize(true)}>
              Finalizar rifa
            </Button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                finalizeMut.mutate({
                  raffleId: active.id,
                  winnerNumber: Number(winnerNumber),
                  newTitle,
                  newDescription: newDesc,
                  newImageUrl: newImg,
                  newPrice: Number(newPrice),
                  newTotalNumbers: Number(newTotal),
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Número sorteado</Label>
                <Input
                  type="number"
                  min={1}
                  max={active.total_numbers}
                  value={winnerNumber}
                  onChange={(e) => setWinnerNumber(e.target.value)}
                  required
                />
              </div>
              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-semibold">Nova rifa</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Título</Label>
                    <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>URL da imagem</Label>
                    <Input type="url" value={newImg} onChange={(e) => setNewImg(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Preço (R$)</Label>
                      <Input type="number" step="0.01" min="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Total de números</Label>
                      <Input type="number" min="2" max="1000" value={newTotal} onChange={(e) => setNewTotal(e.target.value)} required />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={finalizeMut.isPending}>
                  {finalizeMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Finalizar e criar nova
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowFinalize(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type RaffleRow = Awaited<ReturnType<typeof listAllRafflesAdmin>>[number];

function HistoryList({ raffles }: { raffles: RaffleRow[] }) {
  const finished = raffles.filter((r) => r.status === "finished");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de rifas ({finished.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {finished.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma rifa finalizada ainda.
          </p>
        )}
        {finished.map((r) => (
          <div key={r.id} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-raffle-gold/20 text-raffle-gold">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{r.title}</p>
              <p className="text-sm text-muted-foreground">
                Ganhador: <span className="font-semibold">#{String(r.winner_number).padStart(2, "0")}</span>
                {r.winner_name ? ` · ${r.winner_name}` : ""}
              </p>
              {r.finished_at && (
                <p className="text-xs text-muted-foreground">
                  Finalizada em {new Date(r.finished_at).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}