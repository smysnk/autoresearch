# Dialectical Research Plan

## Goal

Integrate cognitive dissonance and Jung's transcendent function into `autoresearch` without breaking the repo's core loop:

- `program.md` remains the human-authored "research org code"
- `train.py` remains the only file the agent edits during experiments
- `val_bpb` remains the ground-truth objective
- the 5-minute keep/discard loop stays intact

The intent is to improve the agent's research behavior, not to add more runtime machinery.

## Why `program.md` is the leverage point

This repo is intentionally minimal. The agent already has permission to modify only `train.py`, while the human shapes the process through `program.md`. That makes `program.md` the right place to add:

- a structured way to learn from contradiction
- explicit tensions the agent should keep active
- a synthesis cadence that prevents shallow hill-climbing

The implementation should start as instruction-layer changes, not Python changes.

## Design Principles

- Preserve the existing keep/discard discipline.
- Treat failed expectations as signal, not just noise.
- Keep the additions lightweight enough that they do not slow experiment throughput.
- Prefer a separate scratchpad over expanding the core result record unless there is a strong reason to couple them.
- Operationalize Jungian "transcendent function" as a concrete thesis/antithesis/synthesis step, not as abstract philosophy.

## Proposed Changes

### 1. Add a dissonance register to `program.md`

After each run, require the agent to note:

1. what it expected to happen
2. what actually happened
3. what assumption was contradicted
4. what tradeoff or tension the result exposed

This converts "bad" experiments into structured evidence. It should be added directly to the experimentation guidance, immediately before the keep/discard decision.

Recommended contradiction categories:

- capacity vs throughput
- novelty vs simplicity
- memory use vs quality
- optimizer speed vs stability
- short-run gain vs long-run extensibility

### 2. Maintain active polarity pairs

Require the agent to keep 2-4 live oppositions in mind at any given time. Examples:

- deeper model vs higher token throughput
- architectural novelty vs implementation simplicity
- aggressive optimization vs training stability
- inductive bias vs parameter efficiency

Each new experiment should explicitly do one of three things relative to an active polarity:

- exploit a promising side
- negate the current favored side
- synthesize both sides into a third option

This keeps search intentional instead of drifting through local tweaks.

### 3. Add a transcendent-function cadence

Every 3 experiments, the agent should stop and perform a synthesis step:

1. name the strongest current thesis
2. name the strongest current antithesis
3. propose one concrete synthesis experiment

The synthesis must be implementable in one edit to `train.py` and testable within one 5-minute run.

Examples of valid synthesis moves:

- reduce depth slightly, then reallocate saved compute to width or batch size
- keep a simpler attention pattern, but preserve a targeted expressivity gain elsewhere
- constrain an unstable but promising optimizer change instead of fully adopting or rejecting it

### 4. Distinguish bad ideas from bad framings

Add an explicit instruction that an unsuccessful run can mean either:

- the idea was weak
- the test framing handicapped the idea

Before discarding a direction entirely, the agent should ask whether the failure came from:

- an unfair comparison
- a confounded change set
- an over-scaled or under-scaled variant
- a mechanism mismatch with the 5-minute budget

This should reduce premature abandonment of ideas that were simply tested poorly.

### 5. Add prediction discipline before each edit

Before modifying `train.py`, require a one-sentence prediction in this form:

```text
Prediction: Changing <X> will improve/worsen <Y> because <mechanism>.
```

After the run, require:

```text
Outcome: confirmed / contradicted / mixed
Interpretation: <updated theory>
Next move: exploit / negate / synthesize
```

This turns the loop into explicit hypothesis testing rather than undirected mutation.

## Logging Strategy

Keep `results.tsv` unchanged at first:

```text
commit	val_bpb	memory_gb	status	description
```

That preserves compatibility with the current workflow and avoids turning the canonical results table into a reasoning dump.

Add a separate untracked scratchpad, recommended as `research_journal.tsv`:

```text
experiment	parent_commit	prediction	outcome	contradicted_assumption	tension	move_type	synthesis_note
```

Reasons to keep this separate:

- `results.tsv` stays compact and easy to scan
- the dialectical notes are useful even when the run is discarded
- the plan can be adopted without breaking any existing tooling or habits

If zero extra files is a hard constraint, the fallback is to compress the prediction and contradiction into the `description` field in `results.tsv`, but that is a worse option.

## File-Level Implementation

### `program.md`

Add four new instruction blocks:

- `Research method: productive contradiction`
- `Active tensions`
- `Transcendent-function mode`
- `Experiment proposal discipline`

Also revise the keep/discard section so it says:

- keep improvements
- usually discard flat or worse runs
- but extract the contradiction before moving on
- use that contradiction to drive a negation or synthesis follow-up

### Optional later change: `README.md`

Only after validating the approach, add a short note that the repo can support more dialectical agent programs where the human iterates on `program.md` to shape research behavior.

This should not be the first step.

## Rollout Plan

### Phase 1: Instruction-only pilot

Edit `program.md` and add the new sections without touching Python.

Success condition:

- the agent can follow the new process with no extra human intervention

### Phase 2: Short branch trial

Run a 10-20 experiment pilot on a fresh research branch.

Track:

- best `val_bpb`
- number of distinct mechanisms tried
- number of immediate repeats of the same local search move
- number of useful follow-up experiments generated from failed runs

### Phase 3: Evaluate research quality

Compare the pilot against the current baseline program along these dimensions:

- improvement rate per 10 experiments
- diversity of experiments
- reduction in repeated dead ends
- quality of explanations for why changes were kept or discarded

The purpose is not only better loss, but better search behavior.

### Phase 4: Tighten the prompt

If the dialectical framing causes too much overhead, compress it:

- reduce the number of active tensions
- shorten the required post-run notes
- run synthesis every 4-5 experiments instead of every 3

If it improves exploration quality without materially slowing throughput, keep the fuller version.

## Acceptance Criteria

- The autonomous loop still runs indefinitely without waiting on the human.
- Each experiment has an explicit prediction.
- Failed runs produce a usable contradiction note.
- Every 3 experiments include one synthesis proposal.
- The agent explores opposing ideas more deliberately instead of only making nearby tweaks.
- The additional process does not require code changes outside the existing experiment loop.

## Risks And Mitigations

- Risk: the prompt becomes too verbose and slows the agent down.
  Mitigation: keep the dissonance register to four short fields and defer any README change.

- Risk: the agent starts writing elaborate reflections instead of running experiments.
  Mitigation: tie every reflection step to the next concrete `train.py` change.

- Risk: synthesis becomes vague or decorative.
  Mitigation: require the synthesis to be a single concrete experiment that fits in one run.

- Risk: too many tensions create random search rather than disciplined search.
  Mitigation: cap active polarity pairs at 2-4.

## Recommended First Patch

The first production change should be a targeted rewrite of `program.md`, not a repo-wide documentation update. Specifically:

1. Insert a `Research method: productive contradiction` section under `## Experimentation`.
2. Add a thesis/antithesis/synthesis checkpoint to the experiment loop.
3. Keep `results.tsv` unchanged.
4. Introduce an untracked `research_journal.tsv` scratchpad in the instructions.
5. Pilot it on one branch before making the framing part of the default public story in `README.md`.

That sequence gives the idea a clean test inside the repo's existing operating model.
