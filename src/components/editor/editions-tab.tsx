"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SerializedBook, SerializedPrintSettings } from "@/types";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { formatPrice, unitPriceFor } from "@/lib/utils";
import { BookCover } from "@/components/book-card";
import { Globe, Printer, Spinner, ExternalLink, Truck, CreditCard, Package, Sparkles } from "@/components/icons";

interface EditionsTabProps {
  book: SerializedBook;
  refreshBook: () => Promise<SerializedBook>;
  onPublish: () => void;
  publishing: boolean;
  isPublished: boolean;
}

const PAGE_SIZES = [
  { id: "5x8", label: "Trade (5x8 in)" },
  { id: "6x9", label: "Standard (6x9 in)" },
  { id: "8.5x11", label: "Letter (8.5x11 in)" },
];

interface Addr {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export function EditionsTab({ book, refreshBook, onPublish, publishing, isPublished }: EditionsTabProps) {
  const router = useRouter();
  const toast = useToast();
  const [translating, setTranslating] = useState(false);
  const [lang, setLang] = useState("Spanish");
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [addr, setAddr] = useState<Addr>({
    name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  const [printSettings, setPrintSettings] = useState<Partial<SerializedPrintSettings>>(book.printSettings || {
    pageSize: "6x9",
    margin: "0.5in",
    font: "serif",
    fontSize: 11,
    lineSpacing: 1.5,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const unit = unitPriceFor(book.price);
  const total = unit * quantity;
  const chapters = book.chapters ?? [];
  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);

  const setAddrField = (k: keyof Addr) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddr((a) => ({ ...a, [k]: e.target.value }));

  const updateSettings = async (key: keyof SerializedPrintSettings, value: any) => {
    const newSettings = { ...printSettings, [key]: value };
    setPrintSettings(newSettings);

    setSavingSettings(true);
    try {
      await apiFetch(`/api/books/${book.id}/print-settings`, {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      });
      toast("Print settings saved.", "success");
      await refreshBook();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to save settings", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const createEdition = async () => {
    setTranslating(true);
    toast("Starting AI translation pipeline... this may take a few minutes.", "info");
    try {
      await apiFetch(`/api/books/${book.id}/editions`, {
        method: "POST",
        body: JSON.stringify({ language: lang }),
      });
      toast(`${lang} edition created successfully!`, "success");
      await refreshBook();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create edition", "error");
    } finally {
      setTranslating(false);
    }
  };

  async function placeOrder() {
    if (!addr.name || !addr.street || !addr.city || !addr.zip) {
      toast("Please fill in your full shipping address", "error");
      return;
    }
    setOrdering(true);
    try {
      const res = await apiFetch<{ url: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          bookId: book.id,
          quantity,
          shippingAddr: JSON.stringify(addr),
        }),
      });
      window.location.href = res.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Order failed";
      if (msg.toLowerCase().includes("signed in")) router.push(`/login?callbackUrl=/books/${book.id}`);
      else toast(msg, "error");
      setOrdering(false);
    }
  }

  const isOriginal = !book.originalBookId;

  return (
    <div className="space-y-6 min-h-[800px]">

      {/* ── Publish Checklist / Hero ── */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-fuchsia-500/15 border-b border-white/10 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">All-in-One Publishing Hub</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Set up your print, publish to the store, order copies, and create translated editions — all in one place.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Status</p>
                <p className={`text-sm font-semibold ${isPublished ? "text-emerald-400" : "text-zinc-400"}`}>
                  {isPublished ? "✓ Live in store" : "Draft · Not published"}
                </p>
              </div>
              <button onClick={onPublish} disabled={publishing || isPublished} className={`btn-primary ${isPublished ? "!bg-emerald-600/80 !shadow-emerald-500/25" : ""}`}>
                {publishing ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                {publishing ? "Publishing…" : isPublished ? "Published" : "Publish to store"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid divide-y divide-white/10 sm:divide-y-0 sm:grid-cols-4 border-t border-white/5">
          {[
            { label: "Chapters", value: chapters.length, done: chapters.length > 0, icon: "1" },
            { label: "Words", value: totalWords.toLocaleString(), done: totalWords > 1000, icon: "2" },
            { label: "Cover", value: book.coverUrl ? "Set" : "Missing", done: !!book.coverUrl, icon: "3" },
            { label: "Price", value: `$${Number(book.price || 0).toFixed(2)}`, done: Number(book.price || 0) > 0, icon: "4" },
          ].map((s, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between sm:border-r sm:border-white/5 last:border-r-0">
              <div>
                <p className="text-xs text-zinc-500">{s.label}</p>
                <p className={`mt-0.5 text-lg font-bold ${s.done ? "text-white" : "text-zinc-500"}`}>{s.value}</p>
              </div>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${s.done ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-zinc-500 border border-white/10"}`}>
                {s.done ? "✓" : s.icon}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── COLUMN 1 (spans 2 on lg) ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* ── Print Settings ── */}
          <div className="card p-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
              <Printer className="h-6 w-6 text-indigo-400" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Print Setup</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Configure size, font, and layout for your physical paperback.
                </p>
              </div>
              {savingSettings && <span className="text-xs text-indigo-400 flex items-center gap-1.5"><Spinner className="h-3 w-3" /> Saving</span>}
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <label className="label">Book Size</label>
                  <select
                    value={printSettings.pageSize}
                    onChange={(e) => updateSettings("pageSize", e.target.value)}
                    className="input"
                  >
                    {PAGE_SIZES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Base Font</label>
                    <select
                      value={printSettings.font}
                      onChange={(e) => updateSettings("font", e.target.value)}
                      className="input"
                    >
                      <option value="serif">Serif (Georgia)</option>
                      <option value="sans">Sans-serif</option>
                      <option value="mono">Monospace</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Font Size (pt)</label>
                    <input
                      type="number"
                      value={printSettings.fontSize}
                      onChange={(e) => updateSettings("fontSize", Number(e.target.value))}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Line Spacing</label>
                    <input
                      type="number"
                      step="0.1"
                      value={printSettings.lineSpacing}
                      onChange={(e) => updateSettings("lineSpacing", Number(e.target.value))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Margins</label>
                    <input
                      type="text"
                      value={printSettings.margin}
                      onChange={(e) => updateSettings("margin", e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                <a href={`/api/books/${book.id}/pdf`} className="btn-secondary w-full justify-center" title="Download a PDF">
                  <Package className="h-4 w-4" /> Generate print-ready PDF
                </a>
              </div>

              <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-6 flex flex-col items-center justify-center text-center gap-4">
                <div className="flex gap-3">
                  <div className="h-36 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-lg shadow-indigo-500/20">
                    <BookCover book={book} />
                  </div>
                  <div className="h-36 w-24 shrink-0 rounded-lg border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center text-zinc-600 text-xs">
                    Spine
                  </div>
                  <div className="h-36 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-lg shadow-indigo-500/20 bg-[#f1ece0] flex flex-col p-2.5 gap-1.5 text-[8px] text-zinc-800">
                    <div className="h-1.5 w-full bg-zinc-800/80 rounded-full" />
                    <div className="h-1 w-3/4 bg-zinc-800/40 rounded-full" />
                    <div className="h-1 w-full bg-zinc-800/30 rounded-full mt-1" />
                    <div className="h-1 w-5/6 bg-zinc-800/30 rounded-full" />
                    <div className="h-1 w-4/6 bg-zinc-800/30 rounded-full" />
                    <div className="h-1 w-full bg-zinc-800/30 rounded-full mt-1" />
                    <div className="h-1 w-2/3 bg-zinc-800/30 rounded-full" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{book.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {printSettings.pageSize} · {chapters.length} ch · {totalWords.toLocaleString()} words
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Translated Editions ── */}
          {isOriginal && (
            <div className="card p-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                <Globe className="h-6 w-6 text-emerald-400" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">Translated Editions</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Use AI to translate your book into other languages. Each translation creates a separate editable edition.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-5 mb-8">
                <div className="flex-1 max-w-xs">
                  <label className="label text-emerald-400/80">Target Language</label>
                  <select value={lang} onChange={e => setLang(e.target.value)} className="input border-emerald-500/20 bg-emerald-500/5">
                    <option>Spanish</option>
                    <option>French</option>
                    <option>Hindi</option>
                    <option>Hinglish</option>
                    <option>German</option>
                    <option>Japanese</option>
                  </select>
                </div>
                <button
                  onClick={createEdition}
                  disabled={translating}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 border-0"
                >
                  {translating ? <><Spinner className="h-4 w-4 mr-2" /> Translating...</> : `Create ${lang} Edition`}
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Existing Editions</h4>
                {book.editions && book.editions.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {book.editions.map(ed => (
                      <div key={ed.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                        <div>
                          <p className="font-medium text-zinc-200">{ed.language} Edition</p>
                          <p className="text-xs text-zinc-500 mt-1">{ed.chapterCount} chapters</p>
                        </div>
                        <a href={`/books/${ed.id}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-zinc-400 hover:text-white">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 border border-dashed border-white/10 rounded-xl">
                    <p className="text-sm text-zinc-500">No translated editions yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── COLUMN 2 ── */}
        <div className="space-y-6">

          {/* ── Store & Publish Info ── */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4" /> Store Listing
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Price</p>
                <p className="text-2xl font-bold text-white">${Number(book.price || 0).toFixed(2)}</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">Set from the header of this page.</p>
              </div>
              <div className="h-24 w-16 mx-auto overflow-hidden rounded-md border border-white/10 shadow-md">
                <BookCover book={book} />
              </div>
              {isPublished ? (
                <a href={`/store/${book.id}`} className="btn-secondary w-full justify-center !text-emerald-300 border-emerald-500/20 bg-emerald-500/5">
                  <Globe className="h-4 w-4" /> View in store →
                </a>
              ) : (
                <button onClick={onPublish} disabled={publishing} className="btn-primary w-full justify-center">
                  {publishing ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                  {publishing ? "Publishing…" : "Publish now"}
                </button>
              )}
            </div>
          </div>

          {/* ── Order Printed Copies ── */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
              <Truck className="h-4 w-4" /> Order Printed Copies
            </h3>

            <div className="flex gap-3 mb-5 pb-5 border-b border-white/10">
              <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md border border-white/10">
                <BookCover book={book} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{book.title}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{printSettings.pageSize} trade paperback</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {chapters.length} chapters · {totalWords.toLocaleString()} words
                </p>
              </div>
            </div>

            <dl className="space-y-1.5 text-sm mb-5">
              <div className="flex justify-between text-zinc-400">
                <dt>Unit price</dt>
                <dd>{formatPrice(unit)}</dd>
              </div>
              <div className="flex justify-between text-zinc-400">
                <dt>Quantity</dt>
                <dd>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    className="inline w-16 !py-1 !px-2 text-right ml-2 bg-white/5 border border-white/10 rounded-md text-zinc-100 text-xs"
                  />
                </dd>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>

            <p className="label !mb-2">Shipping Address</p>
            <div className="space-y-2 mb-5">
              <input value={addr.name} onChange={setAddrField("name")} className="input !py-2 text-xs" placeholder="Full name" />
              <input value={addr.street} onChange={setAddrField("street")} className="input !py-2 text-xs" placeholder="Street address" />
              <div className="grid grid-cols-2 gap-2">
                <input value={addr.city} onChange={setAddrField("city")} className="input !py-2 text-xs" placeholder="City" />
                <input value={addr.state} onChange={setAddrField("state")} className="input !py-2 text-xs" placeholder="State" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={addr.zip} onChange={setAddrField("zip")} className="input !py-2 text-xs" placeholder="ZIP" />
                <input value={addr.country} onChange={setAddrField("country")} className="input !py-2 text-xs" placeholder="US" maxLength={2} />
              </div>
            </div>

            <button onClick={placeOrder} disabled={ordering} className="btn-primary w-full justify-center">
              {ordering ? <Spinner /> : <CreditCard className="h-4 w-4" />}
              {ordering ? "Preparing checkout…" : "Continue to payment"}
            </button>

            <p className="mt-3 text-center text-[10px] text-zinc-600">
              Secure checkout by Stripe · Print-on-demand via Lulu
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
