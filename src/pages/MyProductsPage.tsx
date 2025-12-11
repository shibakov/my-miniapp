import { useEffect, useState, useCallback } from "react";
import { MyProductsScreen } from "@/new-ui/MyProductsScreen";
import {
  getMyProducts,
  createDictProduct,
  patchDictProduct,
  deleteDictProduct,
  type DictProduct
} from "@/lib/api";
import type { FoodItem } from "@/new-ui/types";

function mapDictToFood(item: DictProduct): FoodItem {
  return {
    id: item.id,
    name: item.product,
    // У текущего backend-типа нет brand, поэтому оставляем его undefined
    brand: undefined,
    calories: item.kcal_100 ?? 0,
    protein: item.protein_100 ?? 0,
    fats: item.fat_100 ?? 0,
    carbs: item.carbs_100 ?? 0
  };
}

export default function MyProductsPage() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getMyProducts();
      setFoods(items.map(mapDictToFood));
    } catch (e) {
      console.error("Не удалось загрузить словарь продуктов", e);
      setError("Не удалось загрузить словарь продуктов");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = useCallback(
    async (payload: Omit<FoodItem, "id">): Promise<void> => {
      // brand пока не сохраняем, так как её нет в DictProduct
      const created = await createDictProduct({
        product: payload.name,
        kcal_100: payload.calories,
        protein_100: payload.protein,
        fat_100: payload.fats,
        carbs_100: payload.carbs
      });

      setFoods((prev) => [mapDictToFood(created), ...prev]);
    },
    []
  );

  const handleUpdate = useCallback(
    async (id: string, payload: Omit<FoodItem, "id">): Promise<void> => {
      const patch: Parameters<typeof patchDictProduct>[1] = {
        product: payload.name,
        kcal_100: payload.calories,
        protein_100: payload.protein,
        fat_100: payload.fats,
        carbs_100: payload.carbs
      };

      const updated = await patchDictProduct(id, patch);
      setFoods((prev) =>
        prev.map((f) => (f.id === updated.id ? mapDictToFood(updated) : f))
      );
    },
    []
  );

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    const deleted = await deleteDictProduct(id);
    setFoods((prev) => prev.filter((f) => f.id !== deleted.id));
  }, []);

  return (
    <MyProductsScreen
      foods={foods}
      loading={loading}
      error={error}
      onReload={load}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  );
}
