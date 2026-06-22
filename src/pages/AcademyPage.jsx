import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from "react-easy-crop";
import {
  Plus, Users, Trash2, X, Search, Eye, EyeOff,
  GraduationCap, Star, Phone, Mail, Calendar,
  ChevronRight, Link2, UserCheck, BookOpen, BarChart2,
  Upload, Check, AlertCircle, ZoomIn, ZoomOut, Clock,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import {
  getCoaches, createCoach, deleteCoach,
  getProfiles, getProfilesByAcademy, createProfile, deleteProfile,
  getBatches, getBatchesByAcademy, getBatchesForStudent,
  getAcademies, updateAcademy,
  searchCoachProfiles, inviteCoachToAcademy, getAcademyInvitations,
} from "../lib/db";

// ── constants ─────────────────────────────────────────────────────────────────

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Open"];

const LEVEL_CHIP = {
  Beginner:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  Intermediate: "bg-blue-50 text-blue-700 border-blue-200",
  Advanced:     "bg-orange-50 text-orange-700 border-orange-200",
  Open:         "bg-violet-50 text-violet-700 border-violet-200",
};

const inputCls =
  "w-full h-12 rounded-2xl border border-gray-200 bg-white px-4 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500";

// ── shared: Field label ───────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">{label}</p>
      {children}
    </div>
  );
}

// ── shared: Drawer shell ──────────────────────────────────────────────────────

function Drawer({ open, onClose, title, width = "max-w-[480px]", children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end"
        >
          <motion.aside
            initial={{ x: 600 }} animate={{ x: 0 }} exit={{ x: 600 }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className={cn("w-full bg-[#f6f8fc] h-full flex flex-col overflow-hidden shadow-2xl", width)}
          >
            <div className="flex items-center justify-between px-7 py-5 bg-white border-b border-gray-200 shrink-0">
              <h2 className="font-black text-[16px] text-gray-900">{title}</h2>
              <button onClick={onClose}
                className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X size={17} />
              </button>
            </div>
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Logo cropper helpers ──────────────────────────────────────────────────────

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

async function cropToDataUrl(imageSrc, pixelCrop, outputSize = 400) {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(
    img,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0, outputSize, outputSize
  );
  return canvas.toDataURL("image/jpeg", 0.92);
}

// ── Crop modal ────────────────────────────────────────────────────────────────

function CropperModal({ src, onDone, onCancel }) {
  const [crop,   setCrop]   = useState({ x: 0, y: 0 });
  const [zoom,   setZoom]   = useState(1);
  const [pixels, setPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setPixels(croppedPixels);
  }, []);

  async function handleDone() {
    if (!pixels) return;
    setSaving(true);
    const dataUrl = await cropToDataUrl(src, pixels);
    onDone(dataUrl);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <h3 className="text-white font-bold text-[15px]">Crop Logo</h3>
        <button onClick={onCancel}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Cropper area */}
      <div className="relative flex-1 mx-4 rounded-2xl overflow-hidden bg-black">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Zoom slider */}
      <div className="px-5 pt-5 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <ZoomOut size={15} className="text-white/60 shrink-0" />
          <input
            type="range"
            min={1} max={3} step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#f97316]"
          />
          <ZoomIn size={15} className="text-white/60 shrink-0" />
        </div>
        <p className="text-center text-[11px] text-white/40 mt-1.5">Drag to reposition · Scroll or slide to zoom</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-5 pb-6 pt-3 shrink-0">
        <button onClick={onCancel}
          className="flex-1 h-12 rounded-2xl border border-white/20 text-white text-[14px] font-semibold hover:bg-white/10 transition-colors">
          Cancel
        </button>
        <button onClick={handleDone} disabled={saving}
          className="flex-1 h-12 rounded-2xl bg-[#f97316] hover:bg-[#ea6c0f] text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
          {saving
            ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            : <Check size={15} />
          }
          {saving ? "Cropping…" : "Crop & Save"}
        </button>
      </div>
    </div>
  );
}

// ── Academy tab ───────────────────────────────────────────────────────────────

const MAX_LOGO_BYTES = 500 * 1024 // 500 KB

function AcademyTab() {
  const { user } = useAuth();
  const fileRef   = useRef();

  const [academy,   setAcademy]   = useState(null);
  const [name,      setName]      = useState("");
  const [logo,      setLogo]      = useState(null);   // base64 data URL or null
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [fileError, setFileError] = useState("");
  const [cropSrc,   setCropSrc]   = useState(null);  // raw src before crop

  useEffect(() => {
    getAcademies().then(all => {
      let ac = null;
      if (user?.role === "coach" || user?.role === "academy")
        ac = all.find(a => String(a.mainCoachId) === String(user.id));
      else if (user?.role === "student")
        ac = all.find(a => String(a.id) === String(user.academyId));
      else
        ac = all[0]; // admin: first academy
      if (ac) {
        setAcademy(ac);
        setName(ac.name || "");
        setLogo(ac.logo || null);
        broadcastAcademy(ac.name, ac.logo);
      }
    }).finally(() => setLoading(false));
  }, [user]);

  function broadcastAcademy(name, logoDataUrl) {
    if (name       !== undefined) localStorage.setItem("ca_academy_name",  name       || "");
    if (logoDataUrl !== undefined) localStorage.setItem("ca_academy_logo", logoDataUrl || "");
    window.dispatchEvent(new CustomEvent("ca-logo-update"));
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setFileError(`File is ${(file.size / 1024).toFixed(0)} KB — max allowed is 500 KB.`);
      return;
    }
    setFileError("");
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target.result); // open cropper
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!academy) return;
    setSaving(true); setSaved(false);
    try {
      const updated = await updateAcademy(academy.id, { name: name.trim(), logo });
      setAcademy(updated);
      broadcastAcademy(name.trim(), logo);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setFileError("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  function removeLogo() { setLogo(null); setCropSrc(null); setFileError(""); broadcastAcademy(undefined, null); }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <span className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />
    </div>
  );

  if (!academy) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <GraduationCap size={34} className="text-gray-300 mb-3" />
      <p className="text-[14px] font-semibold text-gray-500">No academy found for your account.</p>
      <p className="text-[12px] text-gray-400 mt-1">Ask an admin to create and link an academy.</p>
    </div>
  );

  return (
    <>
    {cropSrc && (
      <CropperModal
        src={cropSrc}
        onDone={dataUrl => { setLogo(dataUrl); setCropSrc(null); }}
        onCancel={() => setCropSrc(null)}
      />
    )}
    <div className="max-w-lg space-y-5">

      {/* Logo upload card */}
      <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">Academy Logo</p>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center gap-5">
            {/* Logo preview / click target */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "w-24 h-24 rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0 transition-all",
                logo
                  ? "border-brand-300 hover:opacity-80"
                  : "border-dashed border-gray-300 bg-gray-50 hover:border-brand-400"
              )}
            >
              {logo
                ? <img src={logo} alt="Academy logo" className="w-full h-full object-cover" />
                : <Upload size={22} className="text-gray-400" />
              }
            </button>

            <div className="min-w-0">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="h-9 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold transition-colors"
              >
                {logo ? "Change Logo" : "Upload Logo"}
              </button>
              <p className="text-[11px] text-gray-400 mt-2">PNG, JPG, SVG · Max 500 KB</p>
              {logo && (
                <button
                  type="button"
                  onClick={removeLogo}
                  className="text-[11px] text-red-500 hover:underline mt-1 block"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>

          {fileError && (
            <div className="mt-4 flex items-start gap-2 text-[12px] text-red-600 bg-red-50 border border-red-200 px-3.5 py-3 rounded-xl">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {fileError}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>

      {/* Academy name */}
      <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">Academy Name</p>
        </div>
        <div className="px-6 py-5">
          <input
            className={inputCls}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Spark Chess Academy"
          />
        </div>
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className={cn(
          "flex items-center gap-2 h-12 px-6 rounded-2xl font-semibold text-[14px] transition-all disabled:opacity-50",
          saved
            ? "bg-emerald-600 text-white"
            : "bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20"
        )}
      >
        {saving && <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
        {saved   && <Check size={15} />}
        {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
      </button>
    </div>
    </>
  );
}

// ── Add Coach drawer ──────────────────────────────────────────────────────────

function AddCoachDrawer({ open, onClose, onSave }) {
  const blank = { name: "", rating: "", levels: [], dob: "", phone: "", email: "" };
  const [form, setForm] = useState(blank);

  function toggleLevel(l) {
    setForm(f => ({
      ...f,
      levels: f.levels.includes(l) ? f.levels.filter(x => x !== l) : [...f.levels, l],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSave(form);
    setForm(blank);
    onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add Coach">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <Field label="Full Name">
            <input className={inputCls} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Coach full name" autoFocus required />
          </Field>
          <Field label="Rating">
            <input type="number" min="0" max="3500" className={inputCls} value={form.rating}
              onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}
              placeholder="e.g. 2100" />
          </Field>
          <Field label="Level Expertise">
            <div className="flex flex-wrap gap-2">
              {LEVELS.map(l => (
                <button key={l} type="button" onClick={() => toggleLevel(l)}
                  className={cn("px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all",
                    form.levels.includes(l)
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Date of Birth">
            <input type="date" className={inputCls} value={form.dob}
              onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 99999 00000" />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="coach@email.com" />
          </Field>
        </div>
        <div className="px-6 py-5 bg-white border-t border-gray-200 shrink-0 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors">
            Add Coach
          </button>
        </div>
      </form>
    </Drawer>
  );
}

// ── Coach detail drawer ───────────────────────────────────────────────────────

function CoachDetailDrawer({ coach, open, onClose }) {
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    if (!coach) return;
    getBatches().then(all =>
      setBatches(all.filter(b => b.coach?.toLowerCase() === coach.name?.toLowerCase()))
    );
  }, [coach]);

  if (!coach) return null;

  const age = coach.dob
    ? Math.floor((Date.now() - new Date(coach.dob)) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <Drawer open={open} onClose={onClose} title={coach.name}>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <div className="bg-gradient-to-br from-brand-600 to-violet-600 rounded-[24px] p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[18px] bg-white/20 flex items-center justify-center text-2xl font-black">
              {coach.avatar}
            </div>
            <div>
              <h3 className="text-[18px] font-black">{coach.name}</h3>
              {coach.rating && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Star size={13} className="text-yellow-300 fill-yellow-300" />
                  <span className="text-[13px] text-white/80">Rating {coach.rating}</span>
                </div>
              )}
            </div>
          </div>
          {coach.levels?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {coach.levels.map(l => (
                <span key={l} className="px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold text-white">{l}</span>
              ))}
            </div>
          )}
        </div>

        {(age !== null || coach.phone || coach.email) && (
          <div className="bg-white rounded-[20px] border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {age !== null && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Calendar size={14} className="text-gray-400 shrink-0" />
                <span className="text-[13px] text-gray-600">{coach.dob} · {age} yrs</span>
              </div>
            )}
            {coach.phone && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Phone size={14} className="text-gray-400 shrink-0" />
                <span className="text-[13px] text-gray-600">{coach.phone}</span>
              </div>
            )}
            {coach.email && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <span className="text-[13px] text-gray-600">{coach.email}</span>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Batches in this Academy ({batches.length})
          </p>
          {batches.length === 0 ? (
            <div className="bg-white rounded-[20px] border border-gray-200 py-10 flex flex-col items-center text-center">
              <BookOpen size={24} className="text-gray-300 mb-2" />
              <p className="text-[13px] text-gray-400">No batches assigned to this coach</p>
            </div>
          ) : (
            <div className="space-y-2">
              {batches.map(b => (
                <div key={b.id} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-gray-900 truncate">{b.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{b.id} · {b.level}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[12px] text-gray-500 shrink-0">
                    <Users size={12} />{b.studentCount || 0}
                  </span>
                  <span className={cn("w-2 h-2 rounded-full shrink-0",
                    b.isActive !== false ? "bg-emerald-500" : "bg-red-400")} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

// ── Coaches tab ───────────────────────────────────────────────────────────────

function CoachesTab() {
  const { user } = useAuth();
  const [academy,     setAcademy]     = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [searchQ,     setSearchQ]     = useState("");
  const [searchRes,   setSearchRes]   = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [inviting,    setInviting]    = useState(null);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    async function load() {
      const all = await getAcademies();
      let ac = null;
      if (user?.role === "coach" || user?.role === "academy")
        ac = all.find(a => String(a.mainCoachId) === String(user.id));
      else if (user?.role === "admin") ac = all[0];
      if (!ac) { setLoading(false); return; }
      setAcademy(ac);
      const invs = await getAcademyInvitations(ac.id);
      setInvitations(invs);
      setLoading(false);
    }
    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function search() {
    if (!searchQ.trim()) return;
    setSearching(true);
    setSearchRes([]);
    const res = await searchCoachProfiles(searchQ);
    setSearchRes(res);
    setSearching(false);
  }

  async function invite(coach) {
    if (!academy) return;
    setInviting(coach.id);
    setInviteError("");
    try {
      await inviteCoachToAcademy(academy.id, coach.id);
      setInvitations(prev => [
        {
          id: Date.now(), academyId: academy.id, coachId: coach.id,
          status: "pending", invitedAt: new Date().toISOString(),
          coachName: coach.name, coachUsername: coach.username,
          coachAvatar: coach.avatar, coachRating: coach.rating,
        },
        ...prev.filter(i => i.coachId !== coach.id),
      ]);
      setSearchRes(prev => prev.filter(r => r.id !== coach.id));
    } catch (err) {
      setInviteError(err?.message || "Failed to send invite");
    } finally {
      setInviting(null);
    }
  }

  const invitedIds = new Set(invitations.map(i => String(i.coachId)));
  const accepted   = invitations.filter(i => i.status === "accepted");
  const pending    = invitations.filter(i => i.status === "pending");

  return (
    <>
      {/* ── Invite section ── */}
      <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-6 mb-6">
        <h3 className="text-[14px] font-bold text-gray-900 mb-1">Invite a Coach</h3>
        <p className="text-[12px] text-gray-400 mb-4">Search by username or name — coach must have a coach account to be invited.</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setSearchRes([]); }}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Search username or name…"
              className="w-full h-11 pl-9 pr-4 rounded-2xl border border-gray-200 bg-white text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <button onClick={search} disabled={searching || !searchQ.trim()}
            className="h-11 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold transition-all disabled:opacity-50 shrink-0 flex items-center gap-2">
            {searching ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />Searching</> : <><Search size={13} />Search</>}
          </button>
        </div>

        {inviteError && (
          <p className="mt-2 text-[12px] text-red-500 flex items-center gap-1">
            <AlertCircle size={11} />{inviteError}
          </p>
        )}

        {searchRes.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchRes.map(coach => {
              const alreadyInvited = invitedIds.has(String(coach.id));
              return (
                <motion.div key={coach.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-violet-600 text-white font-black text-[13px] flex items-center justify-center shrink-0">
                    {coach.avatar || coach.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 truncate">{coach.name}</p>
                    <p className="text-[11px] text-gray-400">@{coach.username}{coach.rating ? ` · ♟ ${coach.rating}` : ""}</p>
                  </div>
                  <button
                    onClick={() => invite(coach)}
                    disabled={alreadyInvited || inviting === coach.id}
                    className={cn(
                      "h-8 px-4 rounded-xl text-[12px] font-bold shrink-0 transition-all",
                      alreadyInvited ? "bg-gray-100 text-gray-400 cursor-default" : "bg-brand-600 hover:bg-brand-700 text-white"
                    )}>
                    {inviting === coach.id ? "…" : alreadyInvited ? "Invited" : "Invite"}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {searchQ && !searching && searchRes.length === 0 && (
          <p className="mt-3 text-[12px] text-gray-400 flex items-center gap-1.5">
            <AlertCircle size={12} />No coach accounts found for &quot;{searchQ}&quot;.
          </p>
        )}
      </div>

      {/* ── Coach list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
      ) : invitations.length === 0 ? (
        <div className="rounded-[28px] bg-white border border-gray-200 py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-[18px] bg-brand-50 flex items-center justify-center mb-4">
            <UserCheck size={24} className="text-brand-400" />
          </div>
          <h3 className="text-[15px] font-bold text-gray-800">No coaches yet</h3>
          <p className="text-[12px] text-gray-400 mt-1.5 max-w-xs">Search above to invite coach accounts to your academy.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {accepted.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 px-1">Active Coaches</p>
              <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
                {accepted.map((inv, i) => (
                  <div key={inv.id}
                    className={cn("flex items-center gap-4 px-5 py-4", i < accepted.length - 1 && "border-b border-gray-100")}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-black text-[15px] flex items-center justify-center shrink-0">
                      {inv.coachAvatar || inv.coachName?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-gray-900 truncate">{inv.coachName}</p>
                      <p className="text-[11px] text-gray-400">@{inv.coachUsername}</p>
                    </div>
                    {inv.coachRating && (
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-[13px] font-semibold text-gray-700">{inv.coachRating}</span>
                      </div>
                    )}
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
                      <Check size={10} strokeWidth={3} />Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 px-1">Pending Invitations</p>
              <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
                {pending.map((inv, i) => (
                  <div key={inv.id}
                    className={cn("flex items-center gap-4 px-5 py-4", i < pending.length - 1 && "border-b border-gray-100")}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 font-black text-[15px] flex items-center justify-center shrink-0">
                      {inv.coachAvatar || inv.coachName?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-gray-800 truncate">{inv.coachName}</p>
                      <p className="text-[11px] text-gray-400">@{inv.coachUsername}</p>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full shrink-0">
                      <Clock size={10} />Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Add Student drawer ────────────────────────────────────────────────────────

const LEVEL_PREFIX = { Beginner: "BEG", Intermediate: "INT", Advanced: "ADV", Open: "OPN" };

function AddStudentDrawer({ open, onClose, onSave, existingUsernames, students = [], batches = [] }) {
  const blank = { name: "", phone: "", email: "", username: "", password: "", level: "", batchCode: "" };
  const [form,    setForm]   = useState(blank);
  const [showPw,  setShowPw] = useState(false);
  const [error,   setError]  = useState("");

  const autoCode = useMemo(() => {
    if (!form.level) return "";
    const count = students.filter(s => s.level === form.level).length;
    return `${LEVEL_PREFIX[form.level] || form.level.slice(0, 3).toUpperCase()}${count + 1}`;
  }, [form.level, students]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setError("Name, username and password are required."); return;
    }
    if (existingUsernames.includes(form.username.trim().toLowerCase())) {
      setError("Username already taken."); return;
    }
    setError("");
    const batchCode = form.batchCode.trim() || (form.level ? autoCode : "");
    await onSave({ ...form, batchCode });
    setForm(blank);
    onClose();
  }

  function handleClose() { setError(""); setForm(blank); onClose(); }

  return (
    <Drawer open={open} onClose={handleClose} title="Add Student">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] font-semibold text-red-700">
              {error}
            </div>
          )}
          <Field label="Full Name">
            <input className={inputCls} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Arjun Kumar" autoFocus required />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 99999 00000" />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="student@email.com" />
          </Field>
          <Field label="Username">
            <input className={inputCls} value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="e.g. arjun_k" required />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input type={showPw ? "text" : "password"} className={cn(inputCls, "pr-12")} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Create password" required />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Field label="Level">
            <div className="flex flex-wrap gap-2">
              {LEVELS.map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, level: f.level === lvl ? "" : lvl }))}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-[12px] font-bold transition-all",
                    form.level === lvl
                      ? "border-[#1a140f] bg-[#1a140f] text-white shadow-[0_3px_0_#6b4c2a]"
                      : `${LEVEL_CHIP[lvl]} hover:opacity-80`
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Batch">
            {batches.length > 0 ? (
              <select
                className={cn(inputCls, "cursor-pointer")}
                value={form.batchCode}
                onChange={e => setForm(f => ({ ...f, batchCode: e.target.value }))}
              >
                <option value="">— Select batch —</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}{b.level ? ` (${b.level})` : ""}</option>
                ))}
              </select>
            ) : (
              <div className="relative">
                <input
                  className={inputCls}
                  value={form.batchCode}
                  onChange={e => setForm(f => ({ ...f, batchCode: e.target.value }))}
                  placeholder={autoCode || "e.g. BEG3"}
                />
                {!form.batchCode && autoCode && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400 pointer-events-none">
                    auto → {autoCode}
                  </span>
                )}
              </div>
            )}
          </Field>
        </div>
        <div className="px-6 py-5 bg-white border-t border-gray-200 shrink-0 flex gap-3">
          <button type="button" onClick={handleClose}
            className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors">
            Add Student
          </button>
        </div>
      </form>
    </Drawer>
  );
}

// ── Student profile drawer ────────────────────────────────────────────────────

function StudentProfileDrawer({ student, open, onClose }) {
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    if (!student) return;
    getBatchesForStudent(student.id).then(setBatches);
  }, [student?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!student) return null;

  return (
    <Drawer open={open} onClose={onClose} title="Student Profile" width="max-w-[560px]">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-violet-600 rounded-[24px] p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[18px] bg-white/20 flex items-center justify-center text-2xl font-black">
              {student.avatar || student.name?.[0]?.toUpperCase() || "S"}
            </div>
            <div>
              <h3 className="text-[18px] font-black">{student.name}</h3>
              <p className="text-[13px] text-white/70 mt-0.5">@{student.username}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-[20px] bg-white border border-gray-200 p-5 text-center shadow-sm">
            <p className="text-2xl font-black text-brand-600 leading-none mb-1.5">{batches.length}</p>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Batches</p>
          </div>
        </div>

        {(student.phone || student.email) && (
          <div className="bg-white rounded-[20px] border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {student.phone && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Phone size={14} className="text-gray-400 shrink-0" />
                <span className="text-[13px] text-gray-600">{student.phone}</span>
              </div>
            )}
            {student.email && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <span className="text-[13px] text-gray-600">{student.email}</span>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Connected Accounts</p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-xs font-black text-gray-200 shrink-0">L</div>
                <div>
                  <p className="text-[13px] font-bold text-gray-700">Lichess</p>
                  {student.lichessId
                    ? <p className="text-[11px] text-emerald-600 mt-0.5">@{student.lichessId}</p>
                    : <p className="text-[11px] text-gray-400 mt-0.5">Not connected</p>}
                </div>
              </div>
              {student.lichessId && (
                <a href={`https://lichess.org/@/${student.lichessId}`} target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                  <Link2 size={13} />
                </a>
              )}
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-800 flex items-center justify-center text-xs font-black text-white shrink-0">C</div>
                <div>
                  <p className="text-[13px] font-bold text-gray-700">Chess.com</p>
                  {student.chessComId
                    ? <p className="text-[11px] text-emerald-600 mt-0.5">@{student.chessComId}</p>
                    : <p className="text-[11px] text-gray-400 mt-0.5">Not connected</p>}
                </div>
              </div>
              {student.chessComId && (
                <a href={`https://chess.com/member/${student.chessComId}`} target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                  <Link2 size={13} />
                </a>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Batches Assigned ({batches.length})
          </p>
          {batches.length === 0 ? (
            <div className="bg-white rounded-[20px] border border-gray-200 py-10 flex flex-col items-center text-center">
              <BookOpen size={24} className="text-gray-300 mb-2" />
              <p className="text-[13px] text-gray-400">Not assigned to any batch yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {batches.map(b => (
                <div key={b.id} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-gray-900 truncate">{b.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{b.id} · {b.coach || "—"} · {b.level}</p>
                  </div>
                  <span className={cn("w-2 h-2 rounded-full shrink-0",
                    b.isActive !== false ? "bg-emerald-500" : "bg-red-400")} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Drawer>
  );
}

// ── Students tab ──────────────────────────────────────────────────────────────

function StudentsTab() {
  const { user }                = useAuth();
  const [academyId, setAcademyId] = useState(null);
  const [users,    setUsers]    = useState([]);
  const [showAdd,  setShowAdd]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter,   setFilter]   = useState("");
  const [academyBatches, setAcademyBatches] = useState([]);

  useEffect(() => {
    getAcademies().then(all => {
      let ac = null;
      if (user?.role === "coach" || user?.role === "academy")
        ac = all.find(a => String(a.mainCoachId) === String(user?.id));
      else if (user?.role === "admin")
        ac = all[0] || null;
      const id = ac?.id || null;
      setAcademyId(id);
      if (id) {
        getProfilesByAcademy(id).then(setUsers);
        getBatchesByAcademy(id).then(setAcademyBatches);
      } else {
        getProfiles().then(setUsers);
      }
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const students = useMemo(() =>
    users.filter(u => u.role === "student" &&
      (!filter ||
        u.name?.toLowerCase().includes(filter.toLowerCase()) ||
        u.username?.toLowerCase().includes(filter.toLowerCase()))
    ),
    [users, filter]
  );

  const existingUsernames = useMemo(() => users.map(u => u.username?.toLowerCase()), [users]);

  async function handleSave(form) {
    const created = await createProfile({ ...form, role: "student", academyId });
    setUsers(prev => [...prev, created]);
    setShowAdd(false);
  }

  async function handleDelete(id) {
    await deleteProfile(id);
    setUsers(prev => prev.filter(u => u.id !== id));
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by name…"
            className="w-full h-10 pl-9 pr-4 rounded-2xl border border-gray-200 bg-white text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-brand-500 transition-colors" />
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold shadow-lg shadow-brand-500/20 transition-all shrink-0">
          <Plus size={15} />Add Student
        </button>
      </div>

      {students.length === 0 ? (
        <div className="rounded-[28px] bg-white border border-gray-200 py-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-[20px] bg-brand-50 flex items-center justify-center mb-4">
            <Users size={28} className="text-brand-400" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-800">{filter ? "No matches" : "No students yet"}</h3>
          <p className="text-[13px] text-gray-400 mt-1.5 max-w-xs">
            {filter ? "Try a different name." : "Add your first student to get started."}
          </p>
          {!filter && (
            <button onClick={() => setShowAdd(true)} className="mt-5 h-10 px-5 rounded-xl bg-brand-600 text-white text-[13px] font-semibold">
              Add Student
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/80">
            <p className="flex-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Student</p>
            <p className="hidden sm:block w-32 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Username</p>
            <p className="hidden md:block w-32 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Phone</p>
            <p className="hidden lg:block flex-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Email</p>
            <span className="w-14 shrink-0" />
          </div>

          {students.map(s => (
            <div key={s.id} onClick={() => setSelected(s)}
              className="group flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white font-black text-[14px] flex items-center justify-center shrink-0">
                  {s.avatar || s.name?.[0]?.toUpperCase()}
                </div>
                <p className="text-[14px] font-bold text-gray-900 truncate">{s.name}</p>
              </div>
              <p className="hidden sm:block w-32 shrink-0 font-mono text-[12px] text-gray-500 truncate">{s.username}</p>
              <p className="hidden md:block w-32 shrink-0 text-[12px] text-gray-400 truncate">{s.phone || "—"}</p>
              <p className="hidden lg:block flex-1 text-[12px] text-gray-400 truncate">{s.email || "—"}</p>
              <div className="flex items-center gap-1 shrink-0">
                <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                <button onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                  className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddStudentDrawer
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleSave}
        existingUsernames={existingUsernames}
        students={users.filter(u => u.role === "student")}
        batches={academyBatches}
      />
      <StudentProfileDrawer
        student={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AcademyPage() {
  const [tab, setTab] = useState("coaches");

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">

        <div className="flex items-center border-b-2 border-gray-200 mb-7">
          {[["academy", "Academy"], ["coaches", "Coaches"], ["students", "Students"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                "relative px-5 py-3 text-[14px] font-bold transition-colors",
                tab === id ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
              )}>
              {label}
              {tab === id && (
                <motion.span
                  layoutId="academy-tab-line"
                  className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-brand-600 rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {tab === "academy"  && <AcademyTab />}
        {tab === "coaches"  && <CoachesTab />}
        {tab === "students" && <StudentsTab />}
      </div>
    </div>
  );
}
