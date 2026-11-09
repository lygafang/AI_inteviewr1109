"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_QUESTIONS,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  type ChatMessage,
  type Evaluation,
  type InterviewResponse,
} from "@/lib/interview-types";

type Stage = "setup" | "interview" | "result";

export default function Home() {
  const [stage, setStage] = useState<Stage>("setup");
  const [jobDescription, setJobDescription] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(DEFAULT_QUESTIONS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function callInterview(history: ChatMessage[]) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, totalQuestions, messages: history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "發生錯誤");

      const result = data as InterviewResponse;
      if (result.type === "question") {
        setMessages([...history, { role: "interviewer", content: result.question }]);
        setQuestionNumber(result.questionNumber);
      } else {
        setMessages(history);
        setEvaluation(result.evaluation);
        setStage("result");
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "發生錯誤");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function startInterview() {
    if (!jobDescription.trim()) return;
    setStage("interview");
    setMessages([]);
    const ok = await callInterview([]);
    if (!ok) setStage("setup");
  }

  async function submitAnswer() {
    const content = answer.trim();
    if (!content || loading) return;
    const history: ChatMessage[] = [...messages, { role: "candidate", content }];
    setMessages(history);
    setAnswer("");
    const ok = await callInterview(history);
    if (!ok) {
      // Roll back so the user can retry with the same answer.
      setMessages(messages);
      setAnswer(content);
    }
  }

  function restart() {
    setStage("setup");
    setMessages([]);
    setAnswer("");
    setQuestionNumber(0);
    setEvaluation(null);
    setError("");
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-10 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">AI 面試模擬器</h1>
          {stage === "interview" && (
            <span className="rounded-full bg-zinc-200 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              第 {questionNumber} / {totalQuestions} 題
            </span>
          )}
        </header>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {stage === "setup" && (
          <section className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
            <label htmlFor="jd" className="font-medium text-zinc-800 dark:text-zinc-200">
              貼上職缺描述
            </label>
            <textarea
              id="jd"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={10}
              maxLength={8000}
              placeholder="例如：前端工程師，熟悉 React、TypeScript，有 3 年以上開發經驗……"
              className="resize-y rounded-lg border border-zinc-300 bg-transparent p-3 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-100"
            />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <label className="flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
                面試題數
                <select
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  className="rounded-lg border border-zinc-300 bg-transparent px-3 py-1.5 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {Array.from({ length: MAX_QUESTIONS - MIN_QUESTIONS + 1 }, (_, i) => MIN_QUESTIONS + i).map(
                    (n) => (
                      <option key={n} value={n}>
                        {n} 題
                      </option>
                    ),
                  )}
                </select>
              </label>
              <button
                onClick={startInterview}
                disabled={!jobDescription.trim() || loading}
                className="rounded-full bg-zinc-900 px-6 py-2 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {loading ? "準備中…" : "開始面試"}
              </button>
            </div>
          </section>
        )}

        {stage !== "setup" && (
          <section className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 ${
                  m.role === "interviewer"
                    ? "self-start bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                    : "self-end bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                }`}
              >
                <p className="mb-1 text-xs opacity-60">{m.role === "interviewer" ? "面試官" : "你"}</p>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="self-start rounded-2xl bg-white px-4 py-3 text-zinc-500 shadow-sm dark:bg-zinc-900">
                {messages.filter((m) => m.role === "candidate").length === totalQuestions
                  ? "面試官正在評分…"
                  : "面試官思考中…"}
              </div>
            )}
            <div ref={bottomRef} />
          </section>
        )}

        {stage === "interview" && (
          <section className="sticky bottom-4 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-md dark:bg-zinc-900">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitAnswer();
              }}
              rows={4}
              maxLength={4000}
              disabled={loading}
              placeholder="輸入你的回答（Ctrl + Enter 送出）"
              className="resize-y rounded-lg border border-zinc-300 bg-transparent p-3 text-zinc-900 outline-none focus:border-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100"
            />
            <button
              onClick={submitAnswer}
              disabled={!answer.trim() || loading}
              className="self-end rounded-full bg-zinc-900 px-6 py-2 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              送出回答
            </button>
          </section>
        )}

        {stage === "result" && evaluation && (
          <EvaluationCard evaluation={evaluation} onRestart={restart} />
        )}
      </main>
    </div>
  );
}

function EvaluationCard({ evaluation, onRestart }: { evaluation: Evaluation; onRestart: () => void }) {
  return (
    <section className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">面試評分</h2>
        <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">{evaluation.overallScore}</span>
        <span className="text-zinc-500">/ 100</span>
      </div>
      <p className="text-zinc-700 dark:text-zinc-300">{evaluation.summary}</p>

      <div className="flex flex-col gap-3">
        {evaluation.questionScores.map((q, i) => (
          <div key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex justify-between gap-4">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                第 {i + 1} 題：{q.question}
              </p>
              <span className="shrink-0 font-semibold text-zinc-900 dark:text-zinc-100">{q.score} / 10</span>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{q.comment}</p>
            <div className="mt-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/40">
              <p className="mb-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">較佳回答示範</p>
              <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{q.suggestedAnswer}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <List title="優點" items={evaluation.strengths} />
        <List title="改進建議" items={evaluation.improvements} />
      </div>

      <button
        onClick={onRestart}
        className="self-end rounded-full bg-zinc-900 px-6 py-2 font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        重新開始
      </button>
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 font-medium text-zinc-900 dark:text-zinc-100">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
