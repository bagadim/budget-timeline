---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git push:*), Bash(git commit:*), Bash(git branch:*)
description: Commit and push on the current branch (no PR)
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`

## Your task

Based on the above changes:

1. Create a single commit with an appropriate message
2. Push the current branch to origin (use `git push -u origin HEAD` if it has no upstream)
3. Do NOT create a new branch and do NOT open a pull request — stay on the current branch.
4. You have the capability to call multiple tools in a single response. You MUST do all of the above in a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
