import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

type Word = {
  id: string;
  term: string;
  translation: string;
  note: string;
};

export default function Dictionary() {
  const [words, setWords] = useState<Word[]>([]);
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const isImageUrl = (url: string) => {
    return /^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)$/i.test(url);
  };

  const fetchWords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("words")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setWords(data);
    setLoading(false);
  };

  const addWord = async () => {
    if (!term.trim() || !translation.trim()) return;

    await supabase.from("words").insert([{ term, translation, note }]);

    setTerm("");
    setTranslation("");
    setNote("");
    fetchWords();
  };

  const deleteWord = async (id: string) => {
    await supabase.from("words").delete().eq("id", id);
    fetchWords();
  };

  useEffect(() => {
    fetchWords();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>📖 Můj slovník</h1>

        <div style={styles.form}>
          <input
            style={styles.input}
            placeholder="Slovo"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addWord()}
          />
          <input
            style={styles.input}
            placeholder="Překlad"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addWord()}
          />
          <input
            style={styles.input}
            placeholder="Poznámka"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addWord()}
          />

          <button style={styles.addBtn} onClick={addWord}>
            ➕ Přidat slovo
          </button>
        </div>
      </div>

      <div style={styles.list}>
        {loading && <p style={{ opacity: 0.6 }}>Načítám...</p>}

        {words.map((w) => (
          <div key={w.id} style={styles.wordCard}>
            <div>
              <div style={styles.word}>
                {isImageUrl(w.term) ? (
                  <img src={w.term} style={styles.image} />
                ) : (
                  <>
                    {w.term}
                    <span style={styles.arrow}>→</span>
                    {w.translation}
                  </>
                )}
              </div>

              {!isImageUrl(w.term) && w.note && (
                <div style={styles.note}>{w.note}</div>
              )}

              {isImageUrl(w.term) && (
                <div style={{ marginTop: 6 }}>
                  <span style={styles.arrow}>→</span> {w.translation}
                  {w.note && <div style={styles.note}>{w.note}</div>}
                </div>
              )}
            </div>

            <button
              style={styles.deleteBtn}
              onClick={() => deleteWord(w.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
    padding: 20,
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    maxWidth: 600,
    margin: "0 auto",
    background: "white",
    padding: 20,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  title: {
    marginBottom: 16,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    fontSize: 14,
    outline: "none",
  },
  addBtn: {
    marginTop: 6,
    padding: 12,
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
  },
  list: {
    maxWidth: 600,
    margin: "20px auto",
  },
  wordCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "white",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  },
  word: {
    fontSize: 16,
    fontWeight: 500,
  },
  arrow: {
    margin: "0 8px",
    opacity: 0.5,
  },
  note: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  deleteBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 16,
    opacity: 0.6,
  },
  image: {
    maxWidth: 120,
    borderRadius: 10,
    display: "block",
  },
};
