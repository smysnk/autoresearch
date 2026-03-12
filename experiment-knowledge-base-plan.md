# Experiment Knowledge Base Plan

## Goal

Add a durable knowledge base that distills every completed experiment into a small, queryable record so the runner and Codex can choose tensions from accumulated evidence instead of only from immediate judgment.

The target behavior is:

- every experiment produces a distilled takeaway
- one pole in the active tension is always the current best-known experiment
- the opposing pole is selected from prior experiments that are both relevant and meaningfully opposite
- the transcendent-function candidate is generated from the tension between those two records

This should strengthen the Jungian workflow without breaking the repo's core ground truth:

- `val_bpb` remains the objective metric
- the 5-minute run remains the evaluation budget
- keep/discard still matters
- the new layer adds memory and tension selection, not a replacement for reality

## Product Definition

The repo should gain a working memory that can answer:

- what is the current incumbent experiment?
- what did each prior experiment teach?
- which prior experiment most strongly opposes the incumbent on the same problem axis?
- what synthesis would combine the incumbent's strength with the opposing experiment's insight?

The important shift is from storing only run artifacts to storing distilled research knowledge.

## Current State

The repo already stores rich per-iteration data under `experiment_logs/<session-id>/`:

- metrics
- prediction
- contradiction
- keep/discard result
- tested `train.py`
- thesis / antithesis snapshots
- transcendent-function artifacts

This is enough to build a knowledge base, but there is no distilled layer yet:

- no canonical takeaway record per experiment
- no cross-session index
- no incumbent record
- no algorithm for selecting an opposing experiment
- no automatic tension synthesis from historical memory

At the moment, active tensions are still chosen by Codex during `prepare`.

## Design Principles

- Keep the experiment log as the canonical raw history.
- Add a separate distilled knowledge layer on top of it.
- Treat the knowledge record as a summary of what an experiment means, not just what it measured.
- Anchor one side of tension to the best-known experiment.
- Choose the opposite side from prior evidence using relevance plus opposition, not randomness.
- Preserve human legibility: the user should be able to inspect why a tension pair was chosen.

## New Knowledge Layer

Add a tracked root directory:

```text
knowledge_base/
```

This becomes the distilled memory across all sessions.

Recommended structure:

```text
knowledge_base/
  schema.json
  experiments.jsonl
  incumbents.json
  tensions.jsonl
  sessions/
    <session-id>.json
  experiments/
    <session-id>/
      001.json
      002.json
      ...
```

### `knowledge_base/experiments/<session-id>/<iteration>.json`

One distilled record per experiment.

Fields:

- `schema_version`
- `session_id`
- `iteration`
- `branch`
- `source_iteration_path`
- `val_bpb`
- `delta_vs_parent`
- `delta_vs_incumbent`
- `keep_discard_status`
- `outcome`
- `prediction`
- `summary_text`
- `contradicted_assumption`
- `framing_diagnosis`
- `takeaway`
- `mechanism_hypothesis`
- `contradiction_class`
- `mechanism_tags`
- `axis_tags`
- `polarity`
- `confidence`
- `evidence_strength`
- `is_incumbent_candidate`
- `incumbent_rank`
- `relevance_keys`
- `opposes_experiment_ids`
- `supports_experiment_ids`
- `transcendent_role`

This file is the unit the tension selector reasons over.

### `knowledge_base/experiments.jsonl`

Append-only flat index of all distilled experiment records.

Purpose:

- cheap global scanning
- cross-session search
- future analytics

### `knowledge_base/incumbents.json`

Tracks best-known anchors.

Fields:

- `global_best`
- `best_kept`
- `best_per_session`
- `best_per_axis`

Recommended definition for the main anchor:

- lowest `val_bpb` among successful completed experiments
- if multiple tie closely, prefer the one with `keep_discard_status=keep`
- if a lower raw run is marked confounded or crash-adjacent, store it separately but do not make it the default anchor

### `knowledge_base/tensions.jsonl`

Stores generated tension pairs.

Fields:

- `session_id`
- `iteration`
- `anchor_experiment_id`
- `opposing_experiment_id`
- `selection_reason`
- `shared_axes`
- `opposed_axes`
- `relevance_score`
- `opposition_score`
- `total_score`
- `transcendent_prediction`

This gives Atlas a direct artifact for visualizing why a given pair was chosen.

## Distilled Experiment Record

Each experiment should be reduced to a small knowledge card.

### Required fields

#### `takeaway`

One sentence in this form:

```text
<change> helped/hurt/was mixed because <mechanism>.
```

Example:

```text
Reducing window size improved short-run efficiency because more updates fit inside the fixed 5-minute budget.
```

#### `mechanism_tags`

Small controlled vocabulary, for example:

- `depth-up`
- `depth-down`
- `width-up`
- `batch-up`
- `batch-down`
- `lr-up`
- `lr-down`
- `warmup-up`
- `warmup-down`
- `context-shorter`
- `context-longer`
- `attention-local`
- `attention-global`
- `optimizer-aggressive`
- `optimizer-conservative`
- `simplicity-up`
- `novelty-up`

#### `axis_tags`

Dialectical axes such as:

- `capacity-vs-throughput`
- `novelty-vs-simplicity`
- `stability-vs-aggression`
- `memory-vs-quality`
- `short-context-vs-long-context`

#### `polarity`

Map from axis to side:

```json
{
  "capacity-vs-throughput": "throughput",
  "stability-vs-aggression": "aggression"
}
```

#### `confidence`

One of:

- `strong`
- `moderate`
- `weak`
- `confounded`
- `seed-sensitive`

This prevents one lucky run from dominating the dialectic.

## Tension Selection Algorithm

The runner or helper module should generate one default active tension pair for each new `prepare` phase.

### Step 1: choose the anchor experiment

The anchor is the best-known experiment.

Default rule:

1. collect all completed experiments with a numeric `val_bpb`
2. sort by lowest `val_bpb`
3. prefer `keep` over `discard` when scores are near-equal
4. demote `confounded` or `seed-sensitive` records unless no better alternative exists

Output:

- `anchor_experiment_id`

This becomes the thesis pole by default.

### Step 2: find relevant prior candidates

From all prior experiments, keep only those that:

- share at least one `axis_tag` with the anchor
- share at least one `relevance_key` or `mechanism_tag`
- are not the same experiment
- have enough evidence to be interpretable

### Step 3: score for opposition

For each candidate, compute:

#### `relevance_score`

Signal that the experiment is about the same problem:

- shared `axis_tags`
- shared subsystem or code region
- shared runtime regime
- shared prediction category

#### `opposition_score`

Signal that the experiment occupies the opposite side:

- opposite `polarity` on the same axis
- opposing mechanism tags such as `depth-up` vs `depth-down`
- contradiction that explicitly pushes against the anchor's mechanism

#### `total_score`

Weighted sum:

```text
total_score =
  relevance_score * 0.55 +
  opposition_score * 0.35 +
  evidence_strength * 0.10
```

Select the highest-scoring candidate as:

- `opposing_experiment_id`

This becomes the antithesis pole.

### Step 4: derive the transcendent prediction

Using the anchor and opposing record, produce:

- a one-sentence `transcendent_prediction`
- a concrete `train.py` change
- the expected preserved strength from each side

This becomes the runner-suggested initial tension state for Codex.

## Example Selection Flow

Suppose:

- incumbent says deeper model plus current schedule wins on quality
- prior opposite run says shallower model improved throughput enough to close the gap

Then the generated tension might be:

- thesis: incumbent depth/quality stack
- antithesis: throughput-biased shallower stack
- synthesis prediction: keep most of the incumbent depth signal but reclaim throughput by shortening context, adjusting batch, or simplifying one subsystem

The point is not "pick the second-best run."

The point is:

- start from the best known result
- oppose it with the most relevant counter-example
- test a third form

## Repo Changes

### 1. Add a knowledge-base builder

New file:

```text
scripts/knowledge_base.py
```

Responsibilities:

- read canonical `experiment_logs`
- distill each iteration into a knowledge record
- update `knowledge_base/experiments/...`
- rebuild `experiments.jsonl`
- rebuild `incumbents.json`
- generate default tension pairs into `tensions.jsonl`

This should be the only place where global historical reasoning is computed.

### 2. Extend the experiment log schema

Update:

- `scripts/experiment_log.py`

Add support for writing:

- `knowledge_ref`
- optional `knowledge_record_path`
- optional `selected_tension_pair`

The raw log remains canonical, but each iteration should point to its distilled knowledge record.

### 3. Extend the staged research state

Update:

- `research_state.example.json`
- `program.md`

Add optional fields:

- `knowledge_anchor_experiment_id`
- `knowledge_opposing_experiment_id`
- `knowledge_selection_reason`
- `knowledge_transcendent_prediction`

Codex should be allowed to accept the suggested pair or override it with justification.

### 4. Integrate into Codex prepare flow

Update:

- `scripts/codex_agent.py`

Before `prepare`, load the knowledge-base suggestion and include it in the phase prompt:

- current incumbent
- recommended opposing experiment
- why the pair was chosen
- suggested transcendent move

Codex then:

- stages the next experiment with awareness of the historical pair
- may refine the tension rather than inventing one from scratch

### 5. Runner integration

Update:

- `scripts/runpod_runner.py`
- `scripts/remote_runner.py`

After each completed `reflect` phase:

1. capture the final raw dialectical state
2. rebuild the knowledge base
3. attach knowledge refs to the completed iteration
4. use the new knowledge suggestion before the next `prepare`

### 6. Atlas integration

Update:

- `experiment-atlas/lib/types.ts`
- `experiment-atlas/lib/atlas-data.ts`
- relevant explorer/gallery components

New UI surfaces:

- `Takeaway`
- `Knowledge anchor`
- `Opposing experiment`
- `Why this pair`
- `Predicted transcendent image`

This should make the dialectical memory visible, not hidden inside runner logic.

## Program Changes

`program.md` should be revised so the Jungian process uses the knowledge base explicitly.

New instructions:

- the active tension list should include the knowledge-selected anchor and opposing experiment unless there is a strong reason not to
- Codex may override the suggestion, but it must say why
- every reflect phase must distill a takeaway, contradiction class, axis tags, polarity, and confidence
- the transcendent-function candidate should be described as a synthesis of the incumbent and the selected opposite

This moves the process from:

- immediate reflective judgment only

to:

- reflective judgment grounded in accumulated memory

## Rollout Plan

### Phase 1: schema and builder

Implement:

- `scripts/knowledge_base.py`
- `knowledge_base/` on-disk layout
- experiment distillation from existing `experiment_logs`

Success criteria:

- running the builder over existing sessions produces one distilled record per iteration
- `incumbents.json` resolves correctly

### Phase 2: tension selection

Implement:

- relevance and opposition scoring
- `tensions.jsonl`
- one default pair per iteration

Success criteria:

- for a known session, the selected opposite experiment is plausibly about the same axis but on the other side

### Phase 3: runner and Codex integration

Implement:

- runner rebuild after each experiment
- Codex prepare prompt includes incumbent/opposite suggestion
- staged state captures the chosen pair

Success criteria:

- the next experiment can be prepared using historical tension memory with no manual editing

### Phase 4: Atlas surfaces

Implement:

- knowledge cards in explorer
- tension-pair provenance
- filtered views of incumbent lineage and strongest counterexamples

Success criteria:

- a user can open a session and understand not only what happened, but what historical memory shaped the next move

### Phase 5: refinement

Implement:

- confidence weighting
- corroboration across multiple experiments
- optional per-axis incumbents

Success criteria:

- the incumbent is not destabilized by one anomalous run
- opposition selection improves over naive "pick any opposite"

## Acceptance Criteria

- Every completed experiment has a distilled knowledge record.
- The repo can identify the current best-known anchor automatically.
- The repo can select one relevant and opposite prior experiment automatically.
- The active tension in `prepare` can be seeded from the knowledge base.
- Atlas can show the chosen tension pair and predicted transcendent image.
- The system remains grounded in `val_bpb` while allowing transcendence to mean more than immediate local BPB gain.

## Risks And Mitigations

- Risk: the lowest-BPB experiment is a fluke.
  Mitigation: track `confidence` and prefer corroborated kept runs when scores are close.

- Risk: opposition selection becomes semantically noisy.
  Mitigation: require shared axes before scoring opposition.

- Risk: the tag vocabulary drifts into inconsistency.
  Mitigation: start with a small controlled vocabulary in the builder.

- Risk: the knowledge layer becomes detached from code reality.
  Mitigation: every record must link back to the exact iteration path and tested `train.py`.

- Risk: the process becomes too heavy for the 5-minute loop.
  Mitigation: make the builder incremental and run it only after completed experiments.

## Recommended First Patch

The first production change should be:

1. add `scripts/knowledge_base.py`
2. define the distilled experiment schema
3. rebuild a knowledge base from existing `experiment_logs`
4. surface the current incumbent and one auto-selected opposite
5. wire that suggestion into `prepare`

That is enough to make the Jungian process remember its own history instead of rediscovering it every round.
