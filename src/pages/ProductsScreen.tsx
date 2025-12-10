import { useEffect, useMemo, useState } from "react";
import { MyProductsScreen } from "@/new-ui/MyProductsScreen";
import {
  createDictProduct,
  deleteDictProduct,
  getMyProducts,
  patchDictProduct,
  type DictProduct
} from "@/lib/api";
import type { FoodItem } from "@/new-ui/types";

function dictToFood(p: DictProduct): FoodItem {
  return {
    id: p.id,
    name: p.product,
    // Показываем source как подпись под продуктом (manual / usda и т.п.)
    brand: p.source ?? undefined,
    calories: p.kcal_100 ?? 0,
    protein: p.protein_100 ?? 0,
    fats: p.fat_100 ?? 0,
    carbs: p.carbs_100 ?? 0
  };
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<DictProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void load();
  }, []);

  const foods: FoodItem[] = useMemo(
    () => products.map(dictToFood),
    [products]
  );

  const handleCreate = async (payload: Omit<FoodItem, "id">) => {
    const { name, calories, protein, fats, carbs } = payload;

    try {
      const created = await createDictProduct({
        product: name.trim(),
        kcal_100: calories,
        protein_100: protein,
        fat_100: fats,
        carbs_100: carbs
      });
      setProducts((prev) => [created, ...prev]);
    } catch (e: any) {
      console.error("Ошибка создания продукта", e);
      const apiError = e as { details?: any };
      const code = (apiError.details && (apiError.details as any).error) || "";
      if (code === "product_exists") {
        throw new Error("Такой продукт уже есть в словаре");
      }
      throw new Error("Не удалось создать продукт. Попробуй ещё раз.");
    }
  };

  const handleUpdate = async (id: string, payload: Omit<FoodItem, "id">) => {
    const patch: Record<string, number | string> = {};

    const name = payload.name.trim();
    if (!name) {
      throw new Error("Название не может быть пустым");
    }

    patch.product = name;
    patch.kcal_100 = payload.calories;
    patch.protein_100 = payload.protein;
    patch.fat_100 = payload.fats;
    patch.carbs_100 = payload.carbs;

    try {
      const updated = await patchDictProduct(id, patch);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e: any) {
      console.error("Ошибка обновления продукта", e);
      const apiError = e as { details?: any };
      const code = (apiError.details && (apiError.details as any).error) || "";
      if (code === "product_name_conflict") {
        throw new Error("Продукт с таким названием уже существует");
      } else if (code === "product_not_found") {
        throw new Error("Продукт не найден (возможно, был удалён)");
      } else {
        throw new Error("Не удалось сохранить изменения. Попробуй ещё раз.");
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDictProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      console.error("Ошибка удаления продукта", e);
      const apiError = e as { details?: any };
      const code = (apiError.details && (apiError.details as any).error) || "";
      if (code === "product_in_use") {
        throw new Error("Нельзя удалить продукт: он уже используется в логах питания.");
      } else if (code === "product_not_found") {
        throw new Error("Продукт уже удалён.");
      } else {
        throw new Error("Не удалось удалить продукт. Попробуй ещё раз.");
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-ios-bg pb-20">
      <MyProductsScreen
        foods={foods}
        loading={loading}
        error={error}
        onReload={load}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
