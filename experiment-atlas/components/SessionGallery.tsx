"use client";

import Link from "next/link";

import { formatDateTime, formatMemoryGb, formatMetric, titleCase, truncateText } from "@/lib/formatters";
import type { IterationNode, SessionGraph } from "@/lib/types";

type SessionGalleryProps = {
  sessions: SessionGraph[];
};

type SessionStateKind = "live" | "reconciled" | "historical" | "shadow";

export function SessionGallery({ sessions }: SessionGalleryProps) {
  const canonicalCount = sessions.filter((session) => session.source === "experiment_logs").length;
  const fallbackCount = sessions.filter((session) => session.source === "runpod").length;

  return (
    <main className="page-shell">
      <section className="hero-panel hero-panel-landing">
        <div className="hero-copy">
          <p className="eyebrow">Experiment Atlas</p>
          <h1>Transcend Fn Autoresearch</h1>
          <p className="lead">
            This explorer reads canonical constellations from <code>experiment_logs/</code> and falls back to grouped
            <code>runpod_runs/</code> traces when the deeper symbolic schema is not available yet.
          </p>
        </div>
        <div className="hero-metrics hero-metrics-landing">
          <div className="metric-card accent-thesis">
            <span className="metric-label">Constellations</span>
            <strong>{sessions.length}</strong>
            <span className="metric-detail">{canonicalCount} canonical psyches, {fallbackCount} shadow traces</span>
          </div>
          <div className="metric-card accent-synthesis">
            <span className="metric-label">Best Visible Signal</span>
            <strong>
              {formatMetric(
                [...sessions]
                  .map((session) => session.stats.bestValBpb)
                  .filter((value): value is number => value !== null)
                  .sort((left, right) => left - right)[0] ?? null,
                6,
              )}
            </strong>
            <span className="metric-detail">Across all currently readable constellations</span>
          </div>
        </div>
      </section>

      <section className="gallery-panel">
        <div className="section-heading">
          <div>
            <h2>Available research psyches</h2>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-state">
            <p>No experiment constellations were found.</p>
            <p className="muted">
              Add canonical logs under <code>experiment_logs/</code> or keep generating <code>runpod_runs/</code>
              artifacts for the fallback trace adapter.
            </p>
          </div>
        ) : (
          <div className="session-grid">
            {sessions.map((session) => (
              <Link key={session.id} href={`/session/${session.id}`} className={`session-card ${session.live?.isActive ? "session-card-live" : ""}`}>
                {(() => {
                  const stateKind = getSessionStateKind(session);
                  return (
                    <div className="session-card-top">
                      <div className="session-card-badge-cluster">
                        <span
                          className={`badge ${stateKind === "live" ? "badge-live" : stateKind === "reconciled" ? "badge-reconciled" : session.source === "experiment_logs" ? "badge-keep" : "badge-neutral"}`}
                        >
                          {stateKind === "live"
                            ? "Live"
                            : stateKind === "reconciled"
                              ? "Reconciled"
                              : session.source === "experiment_logs"
                                ? "Canonical"
                                : "Shadow Trace"}
                        </span>
                        {session.live?.phase ? <span className="badge badge-outline">{titleCase(session.live.phase)}</span> : null}
                      </div>
                      <span className="badge badge-outline session-card-mode-badge">{titleCase(session.runnerMode)}</span>
                    </div>
                  );
                })()}

                <div className="session-card-copy">
                  <h3 className="session-branch-heading">
                    {getBranchSegments(session).map((segment) => (
                      <span key={`${session.id}-${segment}`} className="session-branch-segment">
                        {segment}
                      </span>
                    ))}
                  </h3>
                  <p className="session-summary">{truncateText(session.notes, 110)}</p>
                </div>

                <SessionStateStrip session={session} />
                <SessionActivityPanel session={session} />
                <SessionKnowledgeStrip session={session} />

                <dl className="session-stats">
                  <div>
                    <dt>Moments</dt>
                    <dd>{session.stats.iterationCount}</dd>
                  </div>
                  <div>
                    <dt>Best signal</dt>
                    <dd>{formatMetric(session.stats.bestValBpb, 6)}</dd>
                  </div>
                  <div>
                    <dt>Latest memory</dt>
                    <dd>
                      {formatMemoryGb(
                        [...session.iterations]
                          .reverse()
                          .map((iteration) => iteration.metrics.peakVramMb)
                          .find((value): value is number => value !== null) ?? null,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Last constellated</dt>
                    <dd>{formatDateTime(session.updatedAt)}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function getSessionCurrentIteration(session: SessionGraph): IterationNode | null {
  if (session.live?.currentIterationLabel) {
    const current = session.iterations.find((iteration) => iteration.label === session.live?.currentIterationLabel);
    if (current) {
      return current;
    }
  }
  return session.iterations.at(-1) ?? null;
}

function getBranchSegments(session: SessionGraph): string[] {
  const source = (session.branch || session.title).trim();
  const segments = source
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.length > 0 ? segments : [source || "Unknown"];
}

function getSessionStateKind(session: SessionGraph): SessionStateKind {
  if (session.live?.isActive) {
    return "live";
  }
  if (session.source !== "experiment_logs") {
    return "shadow";
  }
  const current = getSessionCurrentIteration(session);
  if (session.live?.currentIterationLabel && current?.label === session.live.currentIterationLabel) {
    return "reconciled";
  }
  return "historical";
}

function getExecutionId(iteration: IterationNode | null): string {
  const metadata = iteration?.execution.metadata;
  const value = metadata?.execution_id;
  return typeof value === "string" ? value : "n/a";
}

function getGpuLabel(iteration: IterationNode | null): string {
  const metadata = iteration?.execution.metadata;
  const value = metadata?.selected_gpu_type;
  return typeof value === "string" && value ? value : "n/a";
}

function SessionStateStrip({ session }: { session: SessionGraph }) {
  const current = getSessionCurrentIteration(session);
  const stateKind = getSessionStateKind(session);
  const note =
    stateKind === "live"
      ? `Streaming into moment ${current?.label ?? session.live?.currentIterationLabel ?? "?"}`
      : stateKind === "reconciled"
        ? `Reconciled into moment ${current?.label ?? session.live?.currentIterationLabel ?? "?"}`
        : stateKind === "shadow"
          ? "Fallback trace without canonical psyche"
          : `Historical archive at moment ${current?.label ?? "?"}`;

  return (
    <dl className="session-state-strip">
      <div>
        <dt>State</dt>
        <dd>{titleCase(stateKind)}</dd>
      </div>
      <div>
        <dt>Moment</dt>
        <dd>{current?.label ?? "n/a"}</dd>
      </div>
      <div>
        <dt>Signal</dt>
        <dd>{formatMetric(current?.metrics.valBpb ?? null, 6)}</dd>
      </div>
      <div>
        <dt>Execution</dt>
        <dd>{truncateText(getExecutionId(current), 20)}</dd>
      </div>
      <div>
        <dt>GPU</dt>
        <dd>{truncateText(getGpuLabel(current), 20)}</dd>
      </div>
      <div>
        <dt>Reading</dt>
        <dd>{truncateText(note, 32)}</dd>
      </div>
    </dl>
  );
}

function SessionActivityPanel({ session }: { session: SessionGraph }) {
  if (!session.live?.isActive) {
    return <SessionJungianStrip session={session} />;
  }

  const currentProgress = getCurrentRunProgress(session);
  const overallProgress = getOverallProgress(session, currentProgress);
  const liveIteration = session.live?.currentIterationLabel
    ? session.iterations.find((iteration) => iteration.label === session.live?.currentIterationLabel) ?? null
    : session.iterations.at(-1) ?? null;

  return (
    <section className="session-focus-panel session-focus-panel-live">
      <div className="session-focus-top">
        <span className="session-focus-title">Live passage</span>
        <span className="session-focus-meta">{titleCase(session.live?.phase, "Preparing")}</span>
      </div>
      <div className="progress-stack">
        <div className="progress-row">
          <div className="progress-copy">
            <span className="progress-label">Current run</span>
            <strong>{Math.round(currentProgress)}%</strong>
          </div>
          <span className="progress-meta">
            {liveIteration
              ? `Moment ${liveIteration.label} • ${titleCase(liveIteration.moveType, "Attitude")}`
              : titleCase(session.live?.phase, "Preparing")}
          </span>
        </div>
        <div className="progress-bar">
          <span className="progress-fill" style={{ width: `${currentProgress}%` }} />
        </div>

        <div className="progress-row progress-row-compact">
          <div className="progress-copy">
            <span className="progress-label">Session scope</span>
            <strong>{Math.round(overallProgress)}%</strong>
          </div>
          <span className="progress-meta">
            {session.live?.experimentIndex && session.live?.experimentCount
              ? `Experiment ${session.live.experimentIndex}/${session.live.experimentCount}`
              : `${session.stats.iterationCount} archived moments`}
          </span>
        </div>
        <div className="progress-bar progress-bar-subtle">
          <span className="progress-fill progress-fill-scope" style={{ width: `${overallProgress}%` }} />
        </div>
      </div>
      {session.live?.progress ? <LiveTelemetryStrip session={session} /> : <p className="session-focus-note">Telemetry will appear here as the current vessel begins to report.</p>}
    </section>
  );
}

function LiveTelemetryStrip({ session }: { session: SessionGraph }) {
  const progress = session.live?.progress;
  if (!progress) {
    return null;
  }

  return (
    <dl className="live-metric-strip">
      <div>
        <dt>Loss</dt>
        <dd>{formatMetric(progress.trainLoss, 4)}</dd>
      </div>
      <div>
        <dt>Tok/s</dt>
        <dd>{formatMetric(progress.tokensPerSecond, 0)}</dd>
      </div>
      <div>
        <dt>MFU</dt>
        <dd>{formatMetric(progress.mfuPercent, 1)}%</dd>
      </div>
      <div>
        <dt>VRAM</dt>
        <dd>{formatMemoryGb(progress.currentVramMb)}</dd>
      </div>
    </dl>
  );
}

function SessionKnowledgeStrip({ session }: { session: SessionGraph }) {
  const anchor = session.knowledgeSummary?.latestAnchor;
  const opposing = session.knowledgeSummary?.latestOpposing;

  return (
    <dl className="session-knowledge-strip">
      <div>
        <dt>Anchor</dt>
        <dd>{anchor ? `${anchor.iterationLabel} • ${formatMetric(anchor.valBpb, 6)}` : session.source === "experiment_logs" ? "Forming" : "Shadow-only"}</dd>
      </div>
      <div>
        <dt>Counter-pole</dt>
        <dd>{opposing ? opposing.iterationLabel : session.source === "experiment_logs" ? "Not yet selected" : "No dialectic memory"}</dd>
      </div>
      <div>
        <dt>Lineage</dt>
        <dd>{session.incumbentLineage.length} retained memory{session.incumbentLineage.length === 1 ? "" : " traces"}</dd>
      </div>
      <div>
        <dt>Opposition</dt>
        <dd>{session.strongestCounterexamples.length} candidate{session.strongestCounterexamples.length === 1 ? "" : "s"}</dd>
      </div>
    </dl>
  );
}

function SessionJungianStrip({ session }: { session: SessionGraph }) {
  const anchor = session.knowledgeSummary?.latestAnchor;
  const opposing = session.knowledgeSummary?.latestOpposing;
  const complexes = Math.max(session.stats.activeTensionCount, session.tensions.length);
  const counterPoles = Math.max(
    session.strongestCounterexamples.length,
    session.knowledgeSummary?.defaultTensionPairsWithOpposition ?? 0,
  );

  return (
    <section className="session-focus-panel session-focus-panel-memory">
      <div className="session-focus-top">
        <span className="session-focus-title">Psychic contour</span>
        <span className="session-focus-meta">{session.source === "experiment_logs" ? "Historical psyche" : "Shadow trace"}</span>
      </div>
      <dl className="session-jungian-strip">
        <div>
          <dt>Complexes</dt>
          <dd>{complexes}</dd>
        </div>
        <div>
          <dt>Dissonances</dt>
          <dd>{session.stats.contradictionCount}</dd>
        </div>
        <div>
          <dt>Integrations</dt>
          <dd>{session.stats.keptCount}</dd>
        </div>
        <div>
          <dt>Counter-poles</dt>
          <dd>{counterPoles}</dd>
        </div>
      </dl>
      <p className="session-focus-note">
        {anchor
          ? `Anchor ${anchor.iterationLabel} at ${formatMetric(anchor.valBpb, 6)} remains the retained line${opposing ? ` against ${opposing.iterationLabel}.` : "."}`
          : session.source === "experiment_logs"
            ? "This constellation has memory, but no stable anchor has been retained yet."
            : "This shadow trace has no canonical dialectical memory yet."}
      </p>
    </section>
  );
}

function getCurrentRunProgress(session: SessionGraph): number {
  const progress = session.live?.progress?.progressPct;
  if (progress !== null && progress !== undefined) {
    return Math.max(0, Math.min(100, progress));
  }
  switch (session.live?.phase) {
    case "prepare":
      return 2;
    case "prepare_complete":
      return 5;
    case "deploy":
      return 8;
    case "reflect":
      return 98;
    case "reflect_complete":
    case "commit":
      return 100;
    default:
      return 100;
  }
}

function getOverallProgress(session: SessionGraph, currentRunProgress: number): number {
  const experimentIndex = session.live?.experimentIndex;
  const experimentCount = session.live?.experimentCount;
  if (!experimentIndex || !experimentCount) {
    return 100;
  }
  const completedBeforeCurrent = Math.max(experimentIndex - 1, 0);
  const overall = ((completedBeforeCurrent + currentRunProgress / 100) / experimentCount) * 100;
  return Math.max(0, Math.min(100, overall));
}
