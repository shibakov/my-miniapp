import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createDictProduct,
  deleteDictProduct,
  getMyProducts,
  patchDictProduct,
  type DictProduct
} from "@/lib/api";

interface EditState {
  id: string;
  product: string;
  kcal_100: string;
  protein_100: string;
  fat_100: string;
  carbs_100: string;
}

function formatNumber(value: number | null): string {
  if (value == null) return "—";
  return String(Math.round(value));
}

export default function MyProductsPage() {
  const [products, setProducts] = useState<DictProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createKcal, setCreateKcal] = useState("");
  const [createProtein, setCreateProtein] = useState("");
  const [createFat, setCreateFat] = useState("");
  const [createCarbs, setCreateCarbs] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [editing, setEditing] = useState<EditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await getMyProducts();
        setProducts(items);
      } catch (e) {
        console.error("Не удалось загрузить словарь продуктов", e);
        setError("Не удалось загрузить словарь продуктов");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.product.toLowerCase().includes(q));
  }, [products, query]);

  function parseNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(",", ".");
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  }

  const resetCreateForm = () => {
    setCreateName("");
    setCreateKcal("");
    setCreateProtein("");
    setCreateFat("");
    setCreateCarbs("");
    setCreateError(null);
  };

  const handleOpenCreate = () => {
    resetCreateForm();
    setCreating(true);
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      setCreateError("Укажи название продукта");
      return;
    }

    const kcal = parseNumber(createKcal);
    const protein = parseNumber(createProtein);
    const fat = parseNumber(createFat);
    const carbs = parseNumber(createCarbs);

    if (kcal == null || protein == null || fat == null || carbs == null) {
      setCreateError("Заполни все поля КБЖУ корректными числами");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      const created = await createDictProduct({
        product: name,
        kcal_100: kcal,
        protein_100: protein,
        fat_100: fat,
        carbs_100: carbs
      });
      setProducts((prev) => [created, ...prev]);
      setCreating(false);
    } catch (e: any) {
      console.error("Ошибка создания продукта", e);
      const apiError = e as { details?: any };
      const code = (apiError.details && (apiError.details as any).error) || "";
      if (code === "product_exists") {
        setCreateError("Такой продукт уже есть в словаре");
      } else {
        setCreateError("Не удалось создать продукт. Попробуй ещё раз.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEdit = (p: DictProduct) => {
    setEditError(null);
    setEditing({
      id: p.id,
      product: p.product,
      kcal_100: p.kcal_100 != null ? String(p.kcal_100) : "",
      protein_100: p.protein_100 != null ? String(p.protein_100) : "",
      fat_100: p.fat_100 != null ? String(p.fat_100) : "",
      carbs_100: p.carbs_100 != null ? String(p.carbs_100) : ""
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;

    const patch: Record<string, number | string> = {};

    const name = editing.product.trim();
    if (!name) {
      setEditError("Название не может быть пустым");
      return;
    }
    patch.product = name;

    const kcal = parseNumber(editing.kcal_100);
    const protein = parseNumber(editing.protein_100);
    const fat = parseNumber(editing.fat_100);
    const carbs = parseNumber(editing.carbs_100);

    if (kcal != null) patch.kcal_100 = kcal;
    if (protein != null) patch.protein_100 = protein;
    if (fat != null) patch.fat_100 = fat;
    if (carbs != null) patch.carbs_100 = carbs;

    setEditLoading(true);
    setEditError(null);
    try {
      const updated = await patchDictProduct(editing.id, patch);
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setEditing(null);
    } catch (e: any) {
      console.error("Ошибка обновления продукта", e);
      const apiError = e as { details?: any };
      const code = (apiError.details && (apiError.details as any).error) || "";
      if (code === "product_name_conflict") {
        setEditError("Продукт с таким названием уже существует");
      } else if (code === "product_not_found") {
        setEditError("Продукт не найден (возможно, был удалён)");
      } else {
        setEditError("Не удалось сохранить изменения. Попробуй ещё раз.");
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Удалить продукт из словаря?")) return;

    setDeletingId(id);
    try {
      await deleteDictProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      console.error("Ошибка удаления продукта", e);
      const apiError = e as { details?: any };
      const code = (apiError.details && (apiError.details as any).error) || "";
      if (code === "product_in_use") {
        alert("Нельзя удалить продукт: он уже используется в логах питания.");
      } else if (code === "product_not_found") {
        alert("Продукт уже удалён.");
      } else {
        alert("Не удалось удалить продукт. Попробуй ещё раз.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-16">
      <header className="px-4 pt-4 pb-3 bg-white shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight mb-1">
          Мои продукты
        </h1>
        <p className="text-[11px] text-slate-500">
          Личный словарь продуктов с КБЖУ. Здесь можно добавлять, править и
          удалять позиции.
        </p>
      </header>

      <main className="flex-1 px-4 pt-3 overflow-y-auto space-y-4">
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию…"
              className="h-9 text-sm rounded-2xl border-slate-200 bg-white"
            />
            <Button
              type="button"
              className="h-9 rounded-2xl text-xs font-semibold"
              onClick={handleOpenCreate}
            >
              + Добавить
            </Button>
          </div>
          {loading && (
            <Card className="px-3 py-2.5 text-[11px] text-slate-500">
              Загружаем словарь продуктов…
            </Card>
          )}
          {error && !loading && (
            <Card className="px-3 py-2.5 text-[11px] text-red-600">
              {error}
            </Card>
          )}
        </section>

        <section>
          {filteredProducts.length === 0 && !loading && !error && (
            <Card className="px-3 py-3 text-[11px] text-slate-500 bg-slate-50/80 border-dashed border-slate-300">
              В словаре пока нет продуктов или ничего не найдено по запросу.
            </Card>
          )}

          {filteredProducts.length > 0 && (
            <div className="space-y-2 pb-4">
              {filteredProducts.map((p) => (
                <Card
                  key={p.id}
                  className="border-slate-200 bg-white px-3 py-2.5 rounded-2xl shadow-sm flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {p.product}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {p.source || "manual"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 px-3 rounded-full text-[10px]"
                        onClick={() => handleOpenEdit(p)}
                      >
                        Редактировать
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-7 px-2 rounded-full text-[10px] text-red-600"
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                      >
                        {deletingId === p.id ? "Удаляем…" : "Удалить"}
                      </Button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <span className="font-semibold">Ккал:</span> {formatNumber(p.kcal_100)}
                    </span>
                    <span>
                      <span className="font-semibold">Б:</span> {formatNumber(p.protein_100)} г
                    </span>
                    <span>
                      <span className="font-semibold">Ж:</span> {formatNumber(p.fat_100)} г
                    </span>
                    <span>
                      <span className="font-semibold">У:</span> {formatNumber(p.carbs_100)} г
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Модалка создания продукта */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full bg-white rounded-t-3xl p-4 pb-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Новый продукт
              </h2>
              <button
                type="button"
                className="text-xs text-slate-500"
                onClick={() => setCreating(false)}
                disabled={createLoading}
              >
                Закрыть
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Название
                </label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Например, Творог 5%"
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Ккал / 100 г
                  </label>
                  <Input
                    value={createKcal}
                    onChange={(e) => setCreateKcal(e.target.value)}
                    inputMode="decimal"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Белки / 100 г
                  </label>
                  <Input
                    value={createProtein}
                    onChange={(e) => setCreateProtein(e.target.value)}
                    inputMode="decimal"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Жиры / 100 г
                  </label>
                  <Input
                    value={createFat}
                    onChange={(e) => setCreateFat(e.target.value)}
                    inputMode="decimal"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Углеводы / 100 г
                  </label>
                  <Input
                    value={createCarbs}
                    onChange={(e) => setCreateCarbs(e.target.value)}
                    inputMode="decimal"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {createError && (
                <div className="mt-1 text-[11px] text-red-600">
                  {createError}
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-9 rounded-full text-xs"
                onClick={() => setCreating(false)}
                disabled={createLoading}
              >
                Отмена
              </Button>
              <Button
                type="button"
                className="flex-1 h-9 rounded-full text-xs font-semibold"
                onClick={handleCreate}
                disabled={createLoading || !createName.trim()}
              >
                {createLoading ? "Создаём…" : "Сохранить"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка редактирования продукта */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full bg-white rounded-t-3xl p-4 pb-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Редактировать продукт
              </h2>
              <button
                type="button"
                className="text-xs text-slate-500"
                onClick={() => setEditing(null)}
                disabled={editLoading}
              >
                Закрыть
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Название
                </label>
                <Input
                  value={editing.product}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev
                        ? {
                            ...prev,
                            product: e.target.value
                          }
                        : prev
                    )
                  }
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Ккал / 100 г
                  </label>
                  <Input
                    value={editing.kcal_100}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev
                          ? {
                              ...prev,
                              kcal_100: e.target.value
                            }
                          : prev
                      )
                    }
                    inputMode="decimal"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Белки / 100 г
                  </label>
                  <Input
                    value={editing.protein_100}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev
                          ? {
                              ...prev,
                              protein_100: e.target.value
                            }
                          : prev
                      )
                    }
                    inputMode="decimal"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Жиры / 100 г
                  </label>
                  <Input
                    value={editing.fat_100}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev
                          ? {
                              ...prev,
                              fat_100: e.target.value
                            }
                          : prev
                      )
                    }
                    inputMode="decimal"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Углеводы / 100 г
                  </label>
                  <Input
                    value={editing.carbs_100}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev
                          ? {
                              ...prev,
                              carbs_100: e.target.value
                            }
                          : prev
                      )
                    }
                    inputMode="decimal"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {editError && (
                <div className="mt-1 text-[11px] text-red-600">
                  {editError}
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-9 rounded-full text-xs"
                onClick={() => setEditing(null)}
                disabled={editLoading}
              >
                Отмена
              </Button>
              <Button
                type="button"
                className="flex-1 h-9 rounded-full text-xs font-semibold"
                onClick={handleSaveEdit}
                disabled={editLoading}
              >
                {editLoading ? "Сохраняем…" : "Сохранить"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
