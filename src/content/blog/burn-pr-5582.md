---
title: "Four backends, one missing op: Min/Max scatter in Burn"
date: 2026-09-14
excerpt: "Element-wise scatter and select_assign only supported Assign, Add, and Mul — Min and Max panicked on every backend. Closing the gap meant matching four architectures and getting the autodiff gradient right."
tags: [rust, open-source, burn, autodiff]
status: published
---

My earlier contributions to [tracel-ai/burn](https://github.com/tracel-ai/burn)
were validation fixes: a broadcast check for `matmul`, a rank check, a check for
five element-wise ops. They were small. This one was different — the issue asked
for a feature that was missing in four separate backends.

## The gap

Burn's tensor API has element-wise `scatter` and `select_assign`, both
parameterized by an `IndexingUpdateOp` — how to combine the scattered value with
whatever is already at the index. Five variants: `Assign`, `Add`, `Mul`, `Min`,
`Max`.

`scatter_nd` implemented all five. But the element-wise `scatter` /
`select_assign` path only handled `Assign`, `Add`, and `Mul`; `Min` and `Max`
hit `unimplemented!` on every backend. That is a silent inconsistency: the code
compiles fine and panics at runtime — exactly the class of bug the earlier
`TensorCheck` PRs were about eliminating.

Issue [#5522](https://github.com/tracel-ai/burn/issues/5522) tracked the gap. I
picked up the rest.

## Same operation, four architectures

The interesting part is that "implement Min/Max scatter" means something
different in each backend:

- **ndarray** — the reference implementation. A primitive per variant, doing a
  per-element compare with the same shape and index handling as the existing
  `_mul` variants.
- **flex** — Burn's portable CPU backend. `scatter_min` / `scatter_max` and
  `select_min` / `select_max` helpers that reuse the existing `scatter_update` /
  `select_update` walkers instead of reimplementing index traversal.
- **cubecl** — the GPU backend. I did not write new kernels; `BinaryMinOp` and
  `BinaryMaxOp` already existed for `scatter_nd`, so the new entries dispatch to
  them.
- **tch** — the libtorch binding. `scatter_reduce(..., "amin"/"amax")` and
  `index_reduce_(..., "amin"/"amax")`, mirroring the existing `"prod"` paths.

The lesson I keep re-learning on Burn: don't invent a mechanism when the
codebase already has one. The kernel, the walker, and the reduce string were all
there. The contribution was wiring the missing variants into infrastructure that
already knew how to do the work.

## The part that is actually hard: autodiff

Forward is a comparison. Backward is where you can get it subtly wrong.

For `Min` / `Max` scatter, the gradient flows only to the input that won the
comparison. So the backward pass builds a winner mask from the forward
comparison and routes the upstream gradient to the winning operand. The existing
`scatter_nd` Min/Max gradient already defined the convention, so I mirrored it:

- winner masks built from the comparison,
- ties credited to both operands (matching the `cummin` / `cummax` convention),
- unique indices required, the same as `scatter_nd`.

## Making the panic impossible

Both the forward and backward dispatch were `match`es over
`IndexingUpdateOp`. Previously they fell through a `_ =>` arm to
`unimplemented!`. Now every arm enumerates a real variant, so if someone adds a
sixth update op, the code will not compile until each backend handles it. A
runtime panic becomes a compile-time error — the same principle behind the
earlier `TensorCheck` PRs, applied to dispatch.

## Verification, and one honest caveat

- `cargo test -p burn-backend-tests --features ndarray`: 1839 tensor + 572
  autodiff tests pass.
- The new autodiff tests were checked to *fail* against the old
  `unimplemented!` when the Min/Max backward is removed — otherwise they would
  be passing for the wrong reason.
- clippy-clean across `burn-ndarray`, `burn-flex`, `burn-autodiff`, and
  `burn-cubecl`.

One caveat: `burn-tch` compiles against libtorch, which I do not have locally,
so I could not run its tests. The tch changes are a direct mirror of the existing
`"prod"` scatter / `index_reduce_` paths that already use `"amin"` / `"amax"` in
`scatter_nd` — but that is a static argument, not a test run, and I would rather
say so.

Merged as [PR #5582](https://github.com/tracel-ai/burn/pull/5582).

## What I would take to the next one

The validation PRs taught me *where* code belongs. This one taught me *how much*
of the work already exists. "Four backends" sounds like four times the work; it
is closer to four adapters around one idea. The real engineering was reading each
backend to find the primitive it already had, and getting the gradient convention
right.
