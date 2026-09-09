---
title: "My first Burn PR got rejected. Here's what the maintainers taught me."
date: 2026-09-09
excerpt: "PR #5542 was closed because I put a check in the wrong layer. PR #5555 got merged because I finally understood the architecture. The difference was one question."
tags: [rust, open-source, burn, deep-learning]
status: published
---

When you contribute to a big framework for the first time, you expect the
rejection to be about your code. Mine wasn't. My first PR to
[tracel-ai/burn](https://github.com/tracel-ai/burn) was closed because I put a
check in the wrong *layer* of the framework.

This is the story of that rejection, and the question that turned the next PR
into a merge.

## The bug I wanted to fix

Burn is a Rust deep-learning framework. `TensorCheck` is the public validation
layer that runs *before* a tensor operation dispatches to a backend. When you
call something like `matmul(a, b)` with incompatible shapes, you want a
consistent `Tensor Operation Error` — not whatever each backend happens to do.

There was a gap: `TensorCheck::matmul` didn't verify that batch dimensions were
broadcastable. So on the `ndarray` backend you got one kind of panic, and on
another backend you got a different one. Inconsistent behavior across backends
for the same invalid input. A real bug.

## The wrong fix

My first attempt, PR #5542, added the batch-broadcast check directly inside the
`ndarray` backend. It worked. The tests passed. Then the maintainer closed it.

The reason: `ndarray` is deprecated in Burn. Fixing the bug only inside a
deprecated backend meant:

1. Every other backend kept the bug.
2. My fix ran a shape allocation on a hot path — a cost paid by *every* valid
   matmul, not just the invalid ones.

I had fixed the symptom in the one place I knew how to look, and made the
common case slower while I was at it.

## The question that changed everything

Instead of rejecting me, the maintainer redirected me: the check belongs on the
shared `TensorCheck` layer, which runs once for every backend before dispatch.
That way one code path covers all backends, and the validation cost sits where
it's already supposed to sit.

So I rewrote the fix. PR #5555 moved the batch-broadcast check into
`TensorCheck::matmul`, added a regression test that fails if the check is
removed, and — after review — narrowed that test so it exercises exactly the new
check instead of the pre-existing inner-dimension check.

Merged.

## What I actually learned

The technical fix was small. The lesson was about where code belongs:

- **Fix the layer that owns the behavior, not the layer that exhibits it.** A
  backend-specific fix is a workaround. A fix in the validation layer is a fix.
- **A rejected PR is a code review of your mental model.** "No" usually means
  "your map of the codebase is wrong", not "you can't contribute".
- **Regression tests should target the exact path you added.** If removing your
  check doesn't fail the test, the test is passing for the wrong reason. The
  maintainers made sure mine failed for the right one.

A week later I applied the same instinct to a follow-up
([#5564](https://github.com/tracel-ai/burn/pull/5564)): five element-wise ops
bypassed `TensorCheck` and fell through to backend-specific panics. This time I
knew exactly where to look.

Same lesson, same place, no rejection.