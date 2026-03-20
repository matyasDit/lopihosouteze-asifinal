import { useState } from "react";

type Item = {
  label: string;
  done: boolean;
};

type Section = {
  title: string;
  color: string;
  items: Item[];
};

export default function SrazChecklist() {
  const [sections, setSections] = useState<Section[]>([
    {
      title: "📍 Základní info",
      color: "#4facfe",
      items: [
        { label: "Název srazu", done: false },
        { label: "Datum", done: false },
        { label: "Město", done: false },
        { label: "Místo srazu (přesně)", done: false },
        { label: "Čas", done: false },
      ],
    },
    {
      title: "🗺️ Program",
      color: "#00b894",
      items: [
        { label: "Základní plán", done: false },
        { label: "Zajímavá místa", done: false },
        { label: "Jídlo", done: false },
        { label: "Možnosti navíc", done: false },
        { label: "Zmínka o rozpravě", done: false },
      ],
    },
    {
      title: "👥 Organizace",
      color: "#a29bfe",
      items: [
        { label: "Pořadatel", done: false },
        { label: "Kontakt", done: false },
        { label: "Doprovod info", done: false },
      ],
    },
    {
      title: "📌 Povinné části",
      color: "#fd7e14",
      items: [
        { label: "Srazová sekce", done: false },
        { label: "Odkaz na rozpravu", done: false },
      ],
    },
    {
      title: "⚠️ Důležité",
      color: "#e74c3c",
      items: [
        { label: "Vlastní zodpovědnost", done: false },
        { label: "Oblečení", done: false },
        { label: "Peníze", done: false },
        { label: "Možná změna programu", done: false },
      ],
    },
    {
      title: "🔍 Kontrola",
      color: "#00cec9",
      items: [
        { label: "Dává smysl", done: false },
        { label: "Nechybí info", done: false },
        { label: "Odkaz funguje", done: false },
        { label: "Bez chyb", done: false },
      ],
    },
  ]);

  const toggleItem = (sectionIndex: number, itemIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].items[itemIndex].done =
      !newSections[sectionIndex].items[itemIndex].done;
    setSections(newSections);
  };

  const total = sections.reduce((acc, s) => acc + s.items.length, 0);
  const done = sections.reduce(
    (acc, s) => acc + s.items.filter((i) => i.done).length,
    0
  );
  const progress = Math.round((done / total) * 100);

  return (
    <div className="max-w-2xl mx-auto mt-10 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white p-6">
        <h2 className="text-2xl font-bold">📝 Pozvánka na sraz</h2>
        <p className="opacity-90">Checklist, ať na nic nezapomeneš 😉</p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-3 bg-white/30 rounded-full">
            <div
              className="h-3 bg-white rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm mt-1">
            Hotovo: {done}/{total} ({progress}%)
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="bg-white p-6 space-y-6">
        {sections.map((section, sIndex) => (
          <div key={sIndex}>
            <h3
              className="font-semibold text-lg mb-2"
              style={{ color: section.color }}
            >
              {section.title}
            </h3>

            <div className="space-y-2">
              {section.items.map((item, iIndex) => (
                <label
                  key={iIndex}
                  className={`flex items-center gap-2 cursor-pointer transition ${
                    item.done ? "line-through opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleItem(sIndex, iIndex)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
