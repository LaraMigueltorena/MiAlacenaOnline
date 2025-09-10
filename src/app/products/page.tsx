"use client";

import React, { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  description: string;
  expiresAt: string; // yyyy-mm-dd
  qty: number;
};

const LS_KEY = "mialacena_products";

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [qty, setQty] = useState<number | "">("");

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setProducts(JSON.parse(raw));
    } catch {}
  }, []);

  // Persist changes
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(products));
  }, [products]);

  // Low stock flag (any product with qty === 1)
  const anyLowStock = useMemo(() => products.some((p) => p.qty === 1), [products]);

  function resetForm() {
    setName("");
    setDescription("");
    setExpiresAt("");
    setQty("");
  }

  function handleOpen() {
    resetForm();
    setIsOpen(true);
  }

  function handleSave() {
    if (!name.trim() || !description.trim() || !expiresAt || qty === "" || Number(qty) <= 0) {
      alert("Completá todos los campos. La cantidad debe ser mayor a 0.");
      return;
    }
    const newProduct: Product = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      expiresAt,
      qty: Number(qty),
    };
    setProducts((prev) => [...prev, newProduct]);
    setIsOpen(false);
    resetForm();
  }

  function decQty(id: string) {
    setProducts((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qty: p.qty - 1 } : p))
        .filter((p) => p.qty > 0) // si llega a 0, se elimina
    );
  }

  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <section className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900">Lista de Productos</h2>

        <button
          onClick={handleOpen}
          className="flex items-center gap-2 rounded-full px-4 py-2 bg-zinc-900 text-white text-sm shadow hover:bg-zinc-800 transition"
          aria-label="Agregar producto"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700">
            +
          </span>
          Agregar
        </button>
      </div>

      <div className="rounded-2xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden">
        <div className="grid grid-cols-12 px-6 py-3 text-sm font-medium text-zinc-600">
          <div className="col-span-3">Nombre</div>
          <div className="col-span-3">Descripción</div>
          <div className="col-span-3">Fecha de Vencimiento</div>
          <div className="col-span-3">Cantidad</div>
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
                  <div className="col-span-3 flex items-center gap-2">
                    <span>{p.name}</span>
                    {p.qty === 1 && (
                      <span
                        className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-orange-100 text-orange-700"
                        title="Producto con poco stock"
                      >
                        !
                      </span>
                    )}
                  </div>

                  <div className="col-span-3 truncate">{p.description}</div>
                  <div className="col-span-3">{formatDate(p.expiresAt)}</div>

                  <div className="col-span-3 flex items-center gap-3">
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

      {anyLowStock && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-600">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-700">
            !
          </span>
          <span>Producto con poco stock</span>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          aria-modal="true"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-xl bg-[#eef3f1] p-6 shadow-xl relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 text-zinc-700 hover:text-black"
              aria-label="Cerrar"
              title="Cerrar"
            >
              ✕
            </button>

            <h3 className="mb-6 text-3xl text-center font-semibold text-zinc-900">
              Agregar Productos
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Nombre Completo</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-full bg-zinc-300/60 px-4 py-2 outline-none placeholder:text-zinc-600"
                  placeholder="Nombre Completo"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-700">Descripción</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-full bg-zinc-300/60 px-4 py-2 outline-none placeholder:text-zinc-600"
                  placeholder="Descripción"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-700">Fecha de Vencimiento</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-full bg-zinc-300/60 px-4 py-2 outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-700">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQty(v === "" ? "" : Number(v));
                  }}
                  className="w-full rounded-full bg-zinc-300/60 px-4 py-2 outline-none"
                  placeholder="1"
                />
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
    </section>
  );
}
