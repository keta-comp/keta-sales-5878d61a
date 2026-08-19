import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  deleteProduct,
  listCategories,
  listProducts,
  saveCategory,
  saveProduct,
} from "@/lib/catalog.functions";
import { formatMoney, stockState } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard/products")({
  head: () => ({
    meta: [
      { title: "Products — SalesPilot AI" },
      { name: "description", content: "The live product catalogue your AI sales agent quotes from." },
      { property: "og:title", content: "Products — SalesPilot AI" },
      { property: "og:description", content: "Catalogue and pricing powering the AI sales agent." },
    ],
  }),
  component: ProductsPage,
});

type Draft = {
  id?: string;
  sku: string;
  name: string;
  category_id: string;
  description: string;
  price: string;
  stock_quantity: string;
  low_stock_threshold: string;
  tags: string;
  is_active: boolean;
};

const EMPTY: Draft = {
  sku: "",
  name: "",
  category_id: "none",
  description: "",
  price: "0",
  stock_quantity: "0",
  low_stock_threshold: "3",
  tags: "",
  is_active: true,
};

function ProductsPage() {
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(listProducts);
  const fetchCategories = useServerFn(listCategories);
  const save = useServerFn(saveProduct);
  const remove = useServerFn(deleteProduct);
  const addCategory = useServerFn(saveCategory);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newCategory, setNewCategory] = useState("");

  const products = useQuery({
    queryKey: ["products", search, categoryId],
    queryFn: () => fetchProducts({ data: { search, categoryId } }),
  });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => fetchCategories() });

  const saveMutation = useMutation({
    mutationFn: (value: Draft) =>
      save({
        data: {
          ...(value.id ? { id: value.id } : {}),
          sku: value.sku,
          name: value.name,
          category_id: value.category_id === "none" ? null : value.category_id,
          description: value.description,
          price: Number(value.price),
          stock_quantity: Number(value.stock_quantity),
          low_stock_threshold: Number(value.low_stock_threshold),
          images: [],
          tags: value.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          specifications: {},
          is_active: value.is_active,
        },
      }),
    onSuccess: () => {
      toast.success("Product saved");
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Save failed"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Product deleted");
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Delete failed"),
  });

  const categoryMutation = useMutation({
    mutationFn: (name: string) => addCategory({ data: { name } }),
    onSuccess: () => {
      setNewCategory("");
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not add category"),
  });

  return (
    <>
      <PageHeader
        title="Products"
        description="The AI agent only sells what exists here, at these prices and stock levels."
        actions={<Button onClick={() => setDraft(EMPTY)}>New product</Button>}
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Label htmlFor="p-search">Search</Label>
          <Input
            id="p-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or SKU"
          />
        </div>
        <div className="w-52">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categories.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (newCategory.trim()) categoryMutation.mutate(newCategory.trim());
          }}
        >
          <div>
            <Label htmlFor="new-cat">New category</Label>
            <Input id="new-cat" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
          </div>
          <Button variant="outline" type="submit">
            Add
          </Button>
        </form>
      </div>

      {products.isPending ? (
        <LoadingState />
      ) : products.error ? (
        <ErrorState error={products.error} onRetry={() => void products.refetch()} />
      ) : products.data.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your catalogue so the AI agent can quote real prices and stock."
          action={<Button onClick={() => setDraft(EMPTY)}>New product</Button>}
        />
      ) : (
        <div className="surface-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.data.map((product) => {
                const category = product.categories as { id: string; name: string } | null;
                return (
                  <tr key={product.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{category?.name ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(product.price)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {product.stock_quantity}
                      <span className="text-xs text-muted-foreground"> ({product.reserved_quantity} reserved)</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        value={stockState(
                          product.stock_quantity,
                          product.reserved_quantity,
                          product.low_stock_threshold,
                        )}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setDraft({
                              id: product.id,
                              sku: product.sku,
                              name: product.name,
                              category_id: product.category_id ?? "none",
                              description: product.description ?? "",
                              price: String(product.price),
                              stock_quantity: String(product.stock_quantity),
                              low_stock_threshold: String(product.low_stock_threshold),
                              tags: (product.tags ?? []).join(", "),
                              is_active: product.is_active,
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(product.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={Boolean(draft)} onOpenChange={(open) => (open ? null : setDraft(null))}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{draft?.id ? "Edit product" : "New product"}</SheetTitle>
          </SheetHeader>
          {draft ? (
            <form
              className="space-y-3 px-4 pb-8"
              onSubmit={(event) => {
                event.preventDefault();
                saveMutation.mutate(draft);
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="d-sku">SKU</Label>
                  <Input
                    id="d-sku"
                    value={draft.sku}
                    onChange={(event) => setDraft({ ...draft, sku: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="d-name">Name</Label>
                  <Input
                    id="d-name"
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Category</Label>
                  <Select
                    value={draft.category_id}
                    onValueChange={(value) => setDraft({ ...draft, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {(categories.data ?? []).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="d-price">Price</Label>
                  <Input
                    id="d-price"
                    type="number"
                    min={0}
                    value={draft.price}
                    onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="d-stock">Stock</Label>
                  <Input
                    id="d-stock"
                    type="number"
                    min={0}
                    value={draft.stock_quantity}
                    onChange={(event) => setDraft({ ...draft, stock_quantity: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="d-threshold">Low stock alert</Label>
                  <Input
                    id="d-threshold"
                    type="number"
                    min={0}
                    value={draft.low_stock_threshold}
                    onChange={(event) => setDraft({ ...draft, low_stock_threshold: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="d-tags">Tags (comma separated)</Label>
                  <Input
                    id="d-tags"
                    value={draft.tags}
                    onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="d-desc">Description the AI can quote</Label>
                  <Textarea
                    id="d-desc"
                    rows={4}
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                Save product
              </Button>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}