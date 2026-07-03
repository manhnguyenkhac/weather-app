#!/bin/sh
# Git guard hook (PreToolUse: Bash|PowerShell)
# - Cam commit/merge truc tiep tren main (main chi chua base)
# - Cam push khi dang o main
# - Chan git push khi HEAD chua co review dat: .claude/.review-passed phai chua SHA cua HEAD
#   (sau khi /code-review sach: git rev-parse HEAD > .claude/.review-passed)

input=$(cat)

case "$input" in
  *"git push"*|*"git commit"*|*"git merge"*) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"
  exit 0
}

case "$input" in
  *"git commit"*|*"git merge"*)
    if [ "$branch" = "main" ]; then
      deny "BLOCKED: dang o nhanh main - main chi chua base, khong commit/merge truc tiep. Checkout develop hoac feature/* roi lam tiep."
    fi
    ;;
esac

case "$input" in
  *"git push"*)
    if [ "$branch" = "main" ]; then
      deny "BLOCKED: khong push tu main. Lam viec tren develop hoac feature/*."
    fi
    case "$input" in
      *"git commit"*|*"git merge"*)
        deny "BLOCKED: khong gop git push chung voi git commit/git merge trong mot lenh - review gate phai kiem tra HEAD cuoi cung. Commit xong, review, ghi marker, roi push bang lenh rieng."
        ;;
    esac
    case "$input" in
      *"push --force"*|*"push -f"*|*"--force-with-lease"*)
        deny "BLOCKED: cam force push trong repo nay."
        ;;
    esac
    head=$(git rev-parse HEAD 2>/dev/null)
    ok=$(cat .claude/.review-passed 2>/dev/null)
    if [ -n "$head" ] && [ "$head" = "$ok" ]; then
      exit 0
    fi
    deny "REVIEW GATE: HEAD hien tai chua qua code review. Hay chay /code-review, sua het Critical/Warning (commit fix neu co), roi ghi dau review dat bang: git rev-parse HEAD > .claude/.review-passed - sau do push lai."
    ;;
esac

exit 0
