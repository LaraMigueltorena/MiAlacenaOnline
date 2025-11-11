"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600"] });

type Product = {
  id: string;
  name: string;
  description?: string;
  expiresAt: string; // yyyy-mm-dd
  qty: number;
  category: string; // 👈 NUEVO
};

const LS_KEY = "mialacena_products";
const LS_CATS = "mialacena_categories";

// Límites
const NAME_MAX = 40;
const DESC_MAX = 100;
const QTY_MAX = 1_000_000;

// Días para considerar “por vencer”
const EXPIRY_SOON_DAYS = 7;

// Categorías por defecto (extensibles)
const DEFAULT_CATEGORIES = [
  "Alimentos",
  "Bebidas",
  "Limpieza",
  "Higiene",
  "Congelados",
  "Otros",
];

// Extiende el tipo del input date para usar showPicker sin "any"
type DateInputEl = HTMLInputElement & { showPicker?: () => void };

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Date local (evita TZ)
function parseISOToLocalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// Hoy (yyyy-mm-dd)
function todayISO() {
  const t = new Date();
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// días (dateB - dateA) en entero, sin horas
function diffDays(a: Date, b: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((db - da) / msPerDay);
}

// estado de vencimiento
type ExpiryState = "expired" | "today" | "soon" | "ok";

function getExpiryState(iso: string): { state: ExpiryState; daysLeft: number } {
  const today = parseISOToLocalDate(todayISO());
  const d = parseISOToLocalDate(iso);
  const daysLeft = diffDays(today, d);
  if (daysLeft < 0) return { state: "expired", daysLeft };
  if (daysLeft === 0) return { state: "today", daysLeft };
  if (daysLeft <= EXPIRY_SOON_DAYS) return { state: "soon", daysLeft };
  return { state: "ok", daysLeft };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [alertProduct, setAlertProduct] = useState<Product | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // modal resumen de vencimientos
  const [expiryModalOpen, setExpiryModalOpen] = useState(false);

  // filtros
  const [filter, setFilter] = useState<"all" | "soon" | "expired">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all"); // 👈 NUEVO
  const [orderBy, setOrderBy] = useState<"status" | "category">("status"); // 👈 NUEVO

  // búsqueda
  const [search, setSearch] = useState(""); // 👈 NUEVO

  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [qty, setQty] = useState<number | "">("");
  const [category, setCategory] = useState<string>("Otros"); // 👈 NUEVO
  const [newCategory, setNewCategory] = useState<string>(""); // 👈 NUEVO (alta rápida)

  // Validaciones
  const [nameError, setNameError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [qtyError, setQtyError] = useState<string | null>(null);
  const [qtyNote, setQtyNote] = useState<string | null>(null);

  // Ref date input
  const dateInputRef = useRef<DateInputEl | null>(null);

  // estado popup por color
  const [statusAlert, setStatusAlert] = useState<{ product: Product; state: ExpiryState } | null>(null);

  // Categorías en memoria (extensibles)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  // Cargar desde localStorage
  useEffect(() => {
    try {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    // tipo antiguo sin category (por compatibilidad)
    type ProductLegacy = Omit<Product, "category"> & { category?: string };

    const parsed = JSON.parse(raw) as ProductLegacy[];

    const sanitized: Product[] = parsed.map((p) => ({
      ...p,
      name: (p.name ?? "").slice(0, NAME_MAX),
      description: (p.description ?? "").slice(0, DESC_MAX),
      qty: Number.isFinite(p.qty as number) ? Number(p.qty) : 1,
      category: p.category ? String(p.category) : "Otros",
    }));

    setProducts(sanitized);
  }
} catch {}


    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed: Product[] = JSON.parse(raw);
        const sanitized = parsed.map((p) => ({
          ...p,
          name: (p.name ?? "").slice(0, NAME_MAX),
          description: (p.description ?? "").slice(0, DESC_MAX),
          qty: Number.isFinite(p.qty as number) ? Number(p.qty) : 1,
          category: (p as any).category ? String((p as any).category) : "Otros", // retrocompatibilidad
        }));
        setProducts(sanitized);
      }
    } catch {}
    setLoaded(true);
  }, []);

  // Persistir
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(products));
    } catch {}
  }, [products, loaded]);

  // Persistir categorías (sin duplicados, orden alfabético)
  useEffect(() => {
    const custom = categories.filter((c) => !DEFAULT_CATEGORIES.includes(c));
    try {
      localStorage.setItem(LS_CATS, JSON.stringify(custom.sort((a, b) => a.localeCompare(b))));
    } catch {}
  }, [categories]);

  // Abrir modal de vencimientos si hay algo relevante
  useEffect(() => {
    if (!loaded) return;
    const hasAttention = products.some((p) => {
      const { state } = getExpiryState(p.expiresAt);
      return state === "expired" || state === "today" || state === "soon";
    });
    if (hasAttention) setExpiryModalOpen(true);
  }, [loaded, products]);

  function resetForm() {
    setName("");
    setDescription("");
    setExpiresAt("");
    setQty("");
    setCategory("Otros");
    setNewCategory("");
    setNameError(null);
    setDateError(null);
    setQtyError(null);
    setQtyNote(null);
    setEditingId(null);
  }

  function handleOpen() {
    resetForm();
    setIsOpen(true);
  }

  function handleEdit(p: Product) {
    setEditingId(p.id);
    setName(p.name.slice(0, NAME_MAX));
    setDescription((p.description ?? "").slice(0, DESC_MAX));
    setExpiresAt(p.expiresAt);
    setQty(p.qty);
    setCategory(p.category || "Otros");
    const isPast = parseISOToLocalDate(p.expiresAt) < parseISOToLocalDate(todayISO());
    setDateError(isPast ? "La fecha no puede ser anterior a hoy." : null);
    setIsOpen(true);
  }

  function upsertCategory(raw: string) {
    const c = raw.trim();
    if (!c) return;
    if (!categories.includes(c)) {
      setCategories((prev) => [...prev, c]);
    }
  }

  function validateForm() {
    let valid = true;

    if (!name.trim()) {
      setNameError("Ingresá un nombre.");
      valid = false;
    } else if (name.trim().length > NAME_MAX) {
      setNameError(`Máximo ${NAME_MAX} caracteres.`);
      valid = false;
    } else {
      setNameError(null);
    }

    if (!expiresAt) {
      setDateError("Ingresá una fecha de vencimiento.");
      valid = false;
    } else {
      const isPast = parseISOToLocalDate(expiresAt) < parseISOToLocalDate(todayISO());
      if (isPast) {
        setDateError("La fecha no puede ser anterior a hoy.");
        valid = false;
      } else {
        setDateError(null);
      }
    }

    if (qty === "" || !Number.isFinite(Number(qty)) || Number(qty) < 1) {
      setQtyError("La cantidad debe ser mayor o igual a 1.");
      valid = false;
    } else if (!Number.isInteger(Number(qty))) {
      setQtyError("La cantidad debe ser un número entero.");
      valid = false;
    } else if (Number(qty) > QTY_MAX) {
      setQtyError(`La cantidad no puede superar ${QTY_MAX.toLocaleString()}.`);
      valid = false;
    } else {
      setQtyError(null);
    }

    if (!category.trim()) {
      // seguridad extra
      setCategory("Otros");
    }

    return valid;
  }

  function handleSave() {
    // Si se cargó nueva categoría, la damos de alta y la usamos
    const chosenCategory = (newCategory.trim() || category).trim();
    upsertCategory(chosenCategory);

    const safeName = name.trim().slice(0, NAME_MAX);
    const safeDesc = description.trim().slice(0, DESC_MAX);
    setName(safeName);
    setDescription(safeDesc);

    if (!validateForm()) return;

    if (editingId) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                name: safeName,
                description: safeDesc,
                expiresAt,
                qty: Number(qty),
                category: chosenCategory || "Otros",
              }
            : p
        )
      );
    } else {
      const newProduct: Product = {
        id: crypto.randomUUID(),
        name: safeName,
        description: safeDesc,
        expiresAt,
        qty: Number(qty),
        category: chosenCategory || "Otros",
      };
      setProducts((prev) => [...prev, newProduct]);
    }

    setIsOpen(false);
    resetForm();
  }

  function decQty(id: string) {
    setProducts((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qty: p.qty - 1 } : p))
        .filter((p) => p.qty > 0)
    );
  }

  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  // lista derivada con estado, búsqueda, filtros y orden
  const derived = useMemo(() => {
    const term = search.trim().toLowerCase();

    const withState = products.map((p) => {
      const info = getExpiryState(p.expiresAt);
      return { ...p, _expiry: info.state as ExpiryState, _daysLeft: info.daysLeft };
    });

    const filtered = withState
      .filter((p) => {
        // filtro por estado
        if (filter === "soon" && !(p._expiry === "soon" || p._expiry === "today")) return false;
        if (filter === "expired" && p._expiry !== "expired") return false;
        // filtro por categoría
        if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
        // búsqueda por nombre (parcial, case-insensitive)
        if (term && !p.name.toLowerCase().includes(term)) return false;
        return true;
      });

    // orden
    if (orderBy === "category") {
      return filtered.sort((a, b) => {
        const c = a.category.localeCompare(b.category);
        if (c !== 0) return c;
        // dentro de la categoría, por nombre
        const n = a.name.localeCompare(b.name);
        if (n !== 0) return n;
        // luego por fecha asc
        return parseISOToLocalDate(a.expiresAt).getTime() - parseISOToLocalDate(b.expiresAt).getTime();
      });
    }

    // default: por estado (expired, today, soon, ok), luego fecha, luego nombre
    const rank: Record<ExpiryState, number> = { expired: 0, today: 1, soon: 2, ok: 3 };
    return filtered.sort((a, b) => {
      if (rank[a._expiry] !== rank[b._expiry]) return rank[a._expiry] - rank[b._expiry];
      const da = parseISOToLocalDate(a.expiresAt).getTime();
      const db = parseISOToLocalDate(b.expiresAt).getTime();
      if (da !== db) return da - db;
      return a.name.localeCompare(b.name);
    });
  }, [products, filter, categoryFilter, orderBy, search]);

  function ExpiryChip({ iso }: { iso: string }) {
    const { state, daysLeft } = getExpiryState(iso);
    if (state === "expired")
      return (
        <span className="ml-2 inline-block rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs dark:bg-red-200/20 dark:text-red-300">
          VENCIDO
        </span>
      );
    if (state === "today")
      return (
        <span className="ml-2 inline-block rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs dark:bg-amber-200/20 dark:text-amber-300">
          VENCE HOY
        </span>
      );
    if (state === "soon")
      return (
        <span className="ml-2 inline-block rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs dark:bg-orange-200/20 dark:text-orange-300">
          PRÓX. A VENCER ({daysLeft} d)
        </span>
      );
    return null;
  }

  // símbolo clicable por color
  function StatusDot({
    state,
    onClick,
    name,
  }: {
    state: ExpiryState;
    onClick: () => void;
    name: string;
  }) {
    const color =
      state === "expired"
        ? "bg-red-500"
        : state === "today" || state === "soon"
        ? "bg-yellow-400"
        : "bg-green-500";
    const title =
      state === "expired"
        ? `Abrir alerta: ${name} vencido`
        : state === "today" || state === "soon"
        ? `Abrir alerta: ${name} próximo a vencer`
        : `Abrir alerta: ${name} en buen estado`;
    return (
      <button
        onClick={onClick}
        title={title}
        aria-label={title}
        className={`inline-flex h-4 w-4 rounded-full ${color} ring-2 ring-white dark:ring-zinc-800 shadow shrink-0`}
      />
    );
  }

  const expiringList = useMemo(
    () =>
      products
        .map((p) => ({ p, ...getExpiryState(p.expiresAt) }))
        .filter((x) => x.state === "expired" || x.state === "today" || x.state === "soon")
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [products]
  );

  return (
    <section className={`${poppins.className} mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-10 text-zinc-900 dark:text-zinc-100`}>
      {/* Título + controles (búsqueda arriba, filtros debajo) */}
<div className="mb-6">
  <h2 className="text-2xl md:text-3xl font-semibold mb-3">Lista de Productos</h2>

  {/* Fila 1: búsqueda + agregar */}
  <div className="grid grid-cols-12 gap-2 md:gap-3 items-center mb-2">
    <div className="col-span-9 md:col-span-10">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre…"
        className="w-full rounded-full bg-zinc-100 px-4 py-2 text-sm outline-none dark:bg-zinc-800"
      />
    </div>
    <div className="col-span-3 md:col-span-2 flex justify-end">
      <button
        onClick={handleOpen}
        className="h-9 rounded-full px-4 bg-zinc-900 text-white text-s font-medium shadow-md hover:shadow-lg hover:bg-zinc-800 active:scale-[0.98] transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        aria-label="Agregar producto"
      >
        Agregar Producto
      </button>
    </div>
  </div>

  {/* Fila 2: filtros (compactos) */}
  <div className="flex flex-wrap items-center gap-2 md:gap-3">
    {/* Estado (píldoras) */}
    <div className="inline-flex rounded-full bg-zinc-100 p-0.5 dark:bg-zinc-800">
      <button
        onClick={() => setFilter("all")}
        className={`h-8 px-3 text-[14px] rounded-full ${filter === "all" ? "bg-white shadow dark:bg-zinc-700" : "dark:text-zinc-200"}`}
        aria-pressed={filter === "all"}
      >
        Todos
      </button>
      <button
        onClick={() => setFilter("soon")}
        className={`h-8 px-3 text-[14px] rounded-full ${filter === "soon" ? "bg-white shadow dark:bg-zinc-700" : "dark:text-zinc-200"}`}
        aria-pressed={filter === "soon"}
      >
        Por vencer
      </button>
      <button
        onClick={() => setFilter("expired")}
        className={`h-8 px-3 text-[14px] rounded-full ${filter === "expired" ? "bg-white shadow dark:bg-zinc-700" : "dark:text-zinc-200"}`}
        aria-pressed={filter === "expired"}
      >
        Vencidos
      </button>
    </div>

    {/* Categoría (select corto) */}
    <select
      value={categoryFilter}
      onChange={(e) => setCategoryFilter(e.target.value)}
      className="min-w-[150px] h-8 rounded-full bg-zinc-100 px-3 text-[14px] outline-none dark:bg-zinc-800"
      title="Filtrar por categoría"
    >
      <option value="all">Todas las categorías</option>
      {categories.slice().sort((a, b) => a.localeCompare(b)).map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>

    {/* Orden (select corto) */}
    <select
  value={orderBy}
  onChange={(e) =>
    setOrderBy(e.target.value === "category" ? "category" : "status")
  }
  className="min-w-[140px] h-8 rounded-full bg-zinc-100 px-3 text-[14px] outline-none dark:bg-zinc-800"
  title="Ordenar por"
>
  <option value="status">Orden: Fecha de vencimiento</option>
  <option value="category">Orden: Categoría</option>
</select>

  </div>
</div>

      

      {/* Tabla */}
      <div className="rounded-2xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden dark:bg-zinc-900 dark:ring-white/10">
        <div className="grid grid-cols-12 px-6 py-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          <div className="col-span-1"></div>
          <div className="col-span-3">Nombre</div>
          <div className="col-span-2">Categoría</div>
          <div className="col-span-2">Descripción</div>
          <div className="col-span-3">Fecha de Vencimiento</div>
          <div className="col-span-1 text-right">Cant.</div>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {derived.length === 0 ? (
            <div className="px-6 py-10 text-center text-zinc-500 dark:text-zinc-400">No hay productos para este filtro/búsqueda.</div>
          ) : (
            derived.map((p) => {
              const status = getExpiryState(p.expiresAt).state;
              return (
                <div key={p.id} className="grid grid-cols-12 items-start px-6 py-3 text-sm text-zinc-800 dark:text-zinc-100">
                  {/* editar */}
                  <div className="col-span-1">
                    <button
                      onClick={() => handleEdit(p)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-zinc-100 transition dark:hover:bg-zinc-800"
                      title="Editar producto"
                      aria-label={`Editar ${p.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                        className="h-4 w-4" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.47-8.47.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                    </button>
                  </div>

                  {/* nombre + poco stock */}
                  <div className="col-span-3 flex items-center gap-2">
                    <span className="whitespace-pre-wrap break-all">{p.name}</span>
                    {p.qty === 1 && (
                      <button
                        onClick={() => setAlertProduct(p)}
                        className="flex items-center justify-center"
                        title="Producto con poco stock"
                        aria-label={`Alerta de poco stock para ${p.name}`}
                      >
                        <span className="inline-flex items-center justify-center h-5 w-5 text-lg">⚠️</span>
                      </button>
                    )}
                  </div>

                  {/* categoría */}
                  <div className="col-span-2 whitespace-pre-wrap break-all">{p.category || "—"}</div>

                  {/* descripción */}
                  <div className="col-span-2 whitespace-pre-wrap break-all">{p.description || "—"}</div>

                  {/* fecha + símbolo clicable + chip */}
                  <div className="col-span-3 flex items-center gap-2">
                    <span>{formatDate(p.expiresAt)}</span>
                    <StatusDot
                      state={status}
                      name={p.name}
                      onClick={() => setStatusAlert({ product: p, state: status })}
                    />
                    <ExpiryChip iso={p.expiresAt} />
                  </div>

                  {/* cantidad */}
                  <div className="col-span-1 flex items-center justify-end gap-2">
                    <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded bg-zinc-100 px-2 dark:bg-zinc-800">
                      {p.qty}
                    </span>
                    <button
                      onClick={() => decQty(p.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded bg-zinc-100 hover:bg-zinc-200 transition dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      aria-label={`Reducir cantidad de ${p.name}`} title="Reducir en 1">–</button>
                    <button
                      onClick={() => removeProduct(p.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded bg-zinc-100 hover:bg-red-100 transition dark:bg-zinc-800 dark:hover:bg-red-900/30"
                      aria-label={`Eliminar ${p.name}`} title="Eliminar">🗑️</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal alta/edición */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          aria-modal="true"
          role="dialog"
          onClick={() => { setIsOpen(false); resetForm(); }}
        >
          <div
            className={`${poppins.className} w-full max-w-lg rounded-xl bg-[#eef3f1] p-6 shadow-xl relative dark:bg-zinc-900`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setIsOpen(false); resetForm(); }}
              className="absolute right-3 top-3 text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white"
              aria-label="Cerrar" title="Cerrar"
            >
              ✕
            </button>

            <h3 className="mb-6 text-3xl text-center font-semibold text-zinc-900 dark:text-zinc-100">
              {editingId ? "Editar Producto" : "Agregar Producto"}
            </h3>

            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">Nombre Completo</label>
                <input
                  value={name}
                  onChange={(e) => {
                    const v = e.target.value.slice(0, NAME_MAX);
                    setName(v);
                    if (v.trim()) setNameError(null);
                  }}
                  maxLength={NAME_MAX}
                  className={`w-full rounded-full px-4 py-2 outline-none placeholder:text-zinc-600 dark:placeholder:text-zinc-400 ${
                    nameError ? "bg-red-100 border border-red-500 dark:bg-red-900/30 dark:border-red-700" : "bg-zinc-300/60 dark:bg-zinc-800"
                  }`}
                  placeholder="Nombre Completo"
                />
                <div className="flex items-center justify-between mt-1">
                  {nameError ? <p className="text-xs text-red-600 dark:text-red-400">{nameError}</p> : <div />}
                  <p className={`text-xs ${name.length >= NAME_MAX ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {`${name.length} / ${NAME_MAX}`}
                  </p>
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">Categoría</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-full bg-zinc-300/60 px-4 py-2 outline-none dark:bg-zinc-800"
                  >
                    {categories
                      .slice()
                      .sort((a, b) => a.localeCompare(b))
                      .map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                  </select>
                  <input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nueva categoría (opcional)"
                    className="w-full rounded-full bg-zinc-300/60 px-4 py-2 outline-none placeholder:text-zinc-600 dark:bg-zinc-800 dark:placeholder:text-zinc-400"
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Si completás “Nueva categoría”, se creará y se utilizará para este producto.
                </p>
              </div>

              {/* Descripción */}
              <div>
                <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">Descripción (opcional)</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                  maxLength={DESC_MAX}
                  className="w-full rounded-full bg-zinc-300/60 px-4 py-2 outline-none placeholder:text-zinc-600 dark:bg-zinc-800 dark:placeholder:text-zinc-400"
                  placeholder="Descripción"
                />
                <div className="flex justify-end mt-1">
                  <p className={`text-xs ${description.length >= DESC_MAX ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {`${description.length} / ${DESC_MAX}`}
                  </p>
                </div>
              </div>

              {/* Fecha */}
              <div
                className="cursor-pointer"
                onClick={() => {
                  const el = dateInputRef.current;
                  if (!el) return;
                  try { el.focus(); el.showPicker?.(); } catch { el.click(); }
                }}
              >
                <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">Fecha de Vencimiento</label>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={expiresAt}
                  min={todayISO()}
                  onChange={(e) => {
                    const value = e.target.value;
                    setExpiresAt(value);
                    if (!value) { setDateError("Ingresá una fecha de vencimiento."); return; }
                    const isPast = parseISOToLocalDate(value) < parseISOToLocalDate(todayISO());
                    setDateError(isPast ? "La fecha no puede ser anterior a hoy." : null);
                  }}
                  onFocus={(e) => (e.currentTarget as DateInputEl).showPicker?.()}
                  className={`w-full rounded-full px-4 py-2 outline-none ${
                    dateError ? "bg-red-100 border border-red-500 dark:bg-red-900/30 dark:border-red-700" : "bg-zinc-300/60 dark:bg-zinc-800"
                  }`}
                />
                {dateError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{dateError}</p>}
              </div>

              {/* Cantidad */}
              <div>
                <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">Cantidad</label>
                <input
                  type="number" inputMode="numeric" pattern="[0-9]*" step={1} min={1} max={QTY_MAX}
                  value={qty}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const normalized = raw.replace(",", ".");
                    const parsed = Number(normalized);
                    let n: number | "" = raw === "" ? "" : Number.isFinite(parsed) ? Math.floor(parsed) : "";
                    setQtyNote(null);
                    if (typeof n === "number") {
                      if (n > QTY_MAX) n = QTY_MAX;
                      if (n === QTY_MAX) setQtyNote(`Alcanzaste el máximo (${QTY_MAX.toLocaleString()}).`);
                    }
                    setQty(n);
                    if (n !== "" && n >= 1 && n <= QTY_MAX) setQtyError(null);
                  }}
                  className={`w-full rounded-full px-4 py-2 outline-none ${
                    qtyError ? "bg-red-100 border border-red-500 dark:bg-red-900/30 dark:border-red-700" : "bg-zinc-300/60 dark:bg-zinc-800"
                  }`}
                  placeholder="1"
                />
                {qtyError ? (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{qtyError}</p>
                ) : qtyNote ? (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">{qtyNote}</p>
                ) : null}
              </div>

              <button
                onClick={handleSave}
                className="mt-2 w-full rounded-full bg-zinc-900 py-2 text-white font-medium hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de alerta por poco stock */}
      {alertProduct && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          aria-modal="true"
          role="dialog"
          onClick={() => setAlertProduct(null)}
        >
          <div
            className={`${poppins.className} w-full max-w-md rounded-xl bg-white p-6 shadow-xl relative text-center dark:bg-zinc-900`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setAlertProduct(null)}
              className="absolute right-3 top-3 text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white"
              aria-label="Cerrar alerta"
            >
              ✕
            </button>

            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-yellow-100 text-yellow-500 text-3xl dark:bg-yellow-200/20 dark:text-yellow-300">
                ⚠️
              </span>
            </div>

            <p className="text-lg font-medium">
              El producto <span className="font-semibold">“{alertProduct.name}”</span> se encuentra con poco stock
            </p>
          </div>
        </div>
      )}

      {/* Modal resumen de vencimientos */}
      {expiryModalOpen && expiringList.length > 0 && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          aria-modal="true"
          role="dialog"
          onClick={() => setExpiryModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl relative dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpiryModalOpen(false)}
              className="absolute right-3 top-3 text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white"
              aria-label="Cerrar alerta"
            >
              ✕
            </button>

            <h3 className="text-xl font-semibold mb-4">Productos por vencer / vencidos</h3>

            <ul className="space-y-3 max-h-80 overflow-auto pr-1">
              {expiringList.map(({ p, state, daysLeft }) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Vence: {formatDate(p.expiresAt)} — Cant.: {p.qty}
                    </p>
                    {p.description && (
                      <p className="text-xs text-zinc-500 truncate dark:text-zinc-400">{p.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 ml-3">
                    {state === "expired" && (
                      <span className="inline-block rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs dark:bg-red-200/20 dark:text-red-300">VENCIDO</span>
                    )}
                    {state === "today" && (
                      <span className="inline-block rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs dark:bg-amber-200/20 dark:text-amber-300">VENCE HOY</span>
                    )}
                    {state === "soon" && (
                      <span className="inline-block rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs dark:bg-orange-200/20 dark:text-orange-300">
                        PRÓX. A VENCER ({daysLeft} d)
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setExpiryModalOpen(false)}
                className="rounded-full bg-zinc-900 text-white px-4 py-2 text-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup por símbolo rojo/amarillo/verde */}
      {statusAlert && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          aria-modal="true"
          role="dialog"
          onClick={() => setStatusAlert(null)}
        >
          <div
            className={`${poppins.className} w-full max-w-md rounded-xl bg-white p-6 shadow-xl relative text-center dark:bg-zinc-900`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setStatusAlert(null)}
              className="absolute right-3 top-3 text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white"
              aria-label="Cerrar alerta"
              title="Cerrar"
            >
              ✕
            </button>

            <div className="flex justify-center mb-4">
              {statusAlert.state === "expired" && (
                <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-red-100 text-red-600 text-3xl dark:bg-red-200/20 dark:text-red-300">⚠️</span>
              )}
              {(statusAlert.state === "soon" || statusAlert.state === "today") && (
                <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-yellow-100 text-yellow-500 text-3xl dark:bg-yellow-200/20 dark:text-yellow-300">⚠️</span>
              )}
              {statusAlert.state === "ok" && (
                <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-green-100 text-green-600 text-3xl dark:bg-green-200/20 dark:text-green-300">✔️</span>
              )}
            </div>

            <p className="text-lg font-medium">
              {statusAlert.state === "expired" && (
                <>El producto <span className="font-semibold">“{statusAlert.product.name}”</span> se encuentra vencido</>
              )}
              {(statusAlert.state === "soon" || statusAlert.state === "today") && (
                <>El producto <span className="font-semibold">“{statusAlert.product.name}”</span> se encuentra próximo a vencer</>
              )}
              {statusAlert.state === "ok" && (
                <>El producto <span className="font-semibold">“{statusAlert.product.name}”</span> se encuentra en buen estado</>
              )}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
