"use client";

import React, { useEffect, useRef, useState } from "react";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600"],
});

type Product = {
  id: string;
  name: string;
  description?: string;
  expiresAt: string; // yyyy-mm-dd
  qty: number;
};

const LS_KEY = "mialacena_products";

// Extiende el tipo del input date para usar showPicker sin "any"
type DateInputEl = HTMLInputElement & {
  showPicker?: () => void;
};

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Date en hora local (evita TZ)
function parseISOToLocalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// Hoy (yyyy-mm-dd) en hora local
function todayISO() {
  const t = new Date();
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [alertProduct, setAlertProduct] = useState<Product | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [qty, setQty] = useState<number | "">("");

  // Validaciones
  const [nameError, setNameError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [qtyError, setQtyError] = useState<string | null>(null);

  // Ref date input
  const dateInputRef = useRef<DateInputEl | null>(null);

  // Cargar desde localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed: Product[] = JSON.parse(raw);
        setProducts(parsed);
      }
    } catch {
      // noop
    }
    setLoaded(true);
  }, []);

  // Persistir en localStorage (solo cuando ya cargamos)
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(products));
    } catch {
      // noop
    }
  }, [products, loaded]);

  function resetForm() {
    setName("");
    setDescription("");
    setExpiresAt("");
    setQty("");
    setNameError(null);
    setDateError(null);
    setQtyError(null);
    setEditingId(null);
  }

  function handleOpen() {
    resetForm();
    setIsOpen(true);
  }

  function handleEdit(p: Product) {
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description ?? "");
    setExpiresAt(p.expiresAt);
    setQty(p.qty);
    // Validación inicial de fecha (por si ya está vencida)
    const isPast = parseISOToLocalDate(p.expiresAt) < parseISOToLocalDate(todayISO());
    setDateError(isPast ? "La fecha no puede ser anterior a hoy." : null);
    setIsOpen(true);
  }

  function validateForm() {
    let valid = true;

    // Nombre requerido
    if (!name.trim()) {
      setNameError("Ingresá un nombre.");
      valid = false;
    } else {
      setNameError(null);
    }

    // Fecha requerida y no anterior a hoy
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

    // Cantidad >= 1
    if (qty === "" || Number(qty) < 1) {
      setQtyError("La cantidad debe ser mayor o igual a 1.");
      valid = false;
    } else {
      setQtyError(null);
    }

    return valid;
  }

  function handleSave() {
    if (!validateForm()) return;

    if (editingId) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                name: name.trim(),
                description: description.trim(), // opcional: puede quedar "" y está bien
                expiresAt,
                qty: Number(qty),
              }
            : p
        )
      );
    } else {
      const newProduct: Product = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(), // opcional
        expiresAt,
        qty: Number(qty),
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

  return (
    <section className={`${poppins.className} mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-10`}>
      {/* Título + botón agregar */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900">Lista de Productos</h2>

        <button
          onClick={handleOpen}
          className="rounded-full px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium 
                     shadow-md hover:shadow-lg hover:bg-zinc-800 active:scale-[0.98] transition"
          aria-label="Agregar producto"
        >
          Agregar Producto
        </button>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden">
        <div className="grid grid-cols-12 px-6 py-3 text-sm font-medium text-zinc-600">
          <div className="col-span-1"></div>
          <div className="col-span-3">Nombre</div>
          <div className="col-span-3">Descripción</div>
          <div className="col-span-3">Fecha de Vencimiento</div>
          <div className="col-span-2">Cantidad</div>
        </div>

        <div className="divide-y divide-zinc-100">
          {products.length === 0 ? (
            <div className="px-6 py-10 text-center text-zinc-500">
              Aún no hay productos en la alacena.
            </div>
          ) : (
            products
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-12 items-center px-6 py-3 text-sm text-zinc-800"
                >
                  {/* Lápiz negro (SVG) */}
                  <div className="col-span-1">
                    <button
                      onClick={() => handleEdit(p)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-zinc-100 transition"
                      title="Editar producto"
                      aria-label={`Editar ${p.name}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="h-4 w-4 text-black"
                        fill="currentColor"
                      >
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.47-8.47.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                    </button>
                  </div>

                  {/* Nombre + alerta bajo stock */}
                  <div className="col-span-3 flex items-center gap-2">
                    <span>{p.name}</span>
                    {p.qty === 1 && (
                      <button
                        onClick={() => setAlertProduct(p)}
                        className="flex items-center justify-center"
                        title="Producto con poco stock"
                        aria-label={`Alerta de poco stock para ${p.name}`}
                      >
                        <span className="inline-flex items-center justify-center h-5 w-5 text-lg">
                          ⚠️
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="col-span-3 truncate">{p.description}</div>
                  <div className="col-span-3">{formatDate(p.expiresAt)}</div>

                  <div className="col-span-2 flex items-center gap-3">
                    <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded bg-zinc-100 px-2">
                      {p.qty}
                    </span>

                    <button
                      onClick={() => decQty(p.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded bg-zinc-100 hover:bg-zinc-200 transition"
                      aria-label={`Reducir cantidad de ${p.name}`}
                      title="Reducir en 1"
                    >
                      –
                    </button>

                    <button
                      onClick={() => removeProduct(p.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded bg-zinc-100 hover:bg-red-100 transition"
                      aria-label={`Eliminar ${p.name}`}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* ───────────── Modal Agregar/Editar ───────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          aria-modal="true"
          role="dialog"
          onClick={() => {
            setIsOpen(false);
            resetForm();
          }}
        >
          <div
            className={`${poppins.className} w-full max-w-lg rounded-xl bg-[#eef3f1] p-6 shadow-xl relative`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              className="absolute right-3 top-3 text-zinc-700 hover:text-black"
              aria-label="Cerrar"
              title="Cerrar"
            >
              ✕
            </button>

            <h3 className="mb-6 text-3xl text-center font-semibold text-zinc-900">
              {editingId ? "Editar Producto" : "Agregar Productos"}
            </h3>

            <div className="space-y-4">
              {/* Nombre (requerido) */}
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Nombre Completo</label>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setNameError(null);
                  }}
                  className={`w-full rounded-full px-4 py-2 outline-none placeholder:text-zinc-600 ${
                    nameError ? "bg-red-100 border border-red-500" : "bg-zinc-300/60"
                  }`}
                  placeholder="Nombre Completo"
                />
                {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
              </div>

              {/* Descripción (opcional) */}
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Descripción (opcional)</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-full bg-zinc-300/60 px-4 py-2 outline-none placeholder:text-zinc-600"
                  placeholder="Descripción"
                />
              </div>

              {/* Fecha: abre calendario al clickear toda la fila */}
              <div
                className="cursor-pointer"
                onClick={() => {
                  const el = dateInputRef.current;
                  if (!el) return;
                  try {
                    el.focus(); // gesto de usuario sobre el input
                    el.showPicker?.();
                  } catch {
                    el.click(); // fallback
                  }
                }}
              >
                <label className="mb-1 block text-sm text-zinc-700">
                  Fecha de Vencimiento
                </label>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={expiresAt}
                  min={todayISO()}
                  onChange={(e) => {
                    const value = e.target.value;
                    setExpiresAt(value);
                    if (!value) {
                      setDateError("Ingresá una fecha de vencimiento.");
                      return;
                    }
                    const isPast =
                      parseISOToLocalDate(value) < parseISOToLocalDate(todayISO());
                    setDateError(isPast ? "La fecha no puede ser anterior a hoy." : null);
                  }}
                  onFocus={(e) => {
                    const el = e.currentTarget as DateInputEl;
                    el.showPicker?.();
                  }}
                  className={`w-full rounded-full px-4 py-2 outline-none ${
                    dateError ? "bg-red-100 border border-red-500" : "bg-zinc-300/60"
                  }`}
                />
                {dateError && (
                  <p className="mt-1 text-sm text-red-600">{dateError}</p>
                )}
              </div>

              {/* Cantidad (requerida >= 1) */}
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => {
                    const v = e.target.value;
                    const n = v === "" ? "" : Number(v);
                    setQty(n);
                    if (v !== "" && Number(v) >= 1) setQtyError(null);
                  }}
                  className={`w-full rounded-full px-4 py-2 outline-none ${
                    qtyError ? "bg-red-100 border border-red-500" : "bg-zinc-300/60"
                  }`}
                  placeholder="1"
                />
                {qtyError && <p className="mt-1 text-sm text-red-600">{qtyError}</ p>}
              </div>

              <button
                onClick={handleSave}
                className="mt-2 w-full rounded-full bg-zinc-900 py-2 text-white font-medium hover:bg-zinc-800 transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────── Modal de alerta por poco stock ───────────── */}
      {alertProduct && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          aria-modal="true"
          role="dialog"
          onClick={() => setAlertProduct(null)}
        >
          <div
            className={`${poppins.className} w-full max-w-md rounded-xl bg-white p-6 shadow-xl relative text-center`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setAlertProduct(null)}
              className="absolute right-3 top-3 text-zinc-700 hover:text-black"
              aria-label="Cerrar alerta"
            >
              ✕
            </button>

            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-yellow-100 text-yellow-500 text-3xl">
                ⚠️
              </span>
            </div>

            <p className="text-lg font-medium text-zinc-900">
              El producto <span className="font-semibold">“{alertProduct.name}”</span> se encuentra con poco stock
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
