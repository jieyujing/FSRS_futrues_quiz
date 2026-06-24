#!/usr/bin/env python3
"""Migrate question_type values to canonical forms.

Usage:
    python -m scripts.migrate_question_types [--db-path PATH]

Steps:
    1. Back up the database to {db_path}.bak (overwrite if exists).
    2. Within a single SQLite transaction:
       a. DELETE questions WHERE question_type IN ('单选|多选|判断', '多选|判断')
       b. UPDATE question_type='选择题' -> '单选题'
       c. UPDATE question_type='单选' -> '单选题'
       d. UPDATE question_type='多选' -> '多选题'
       e. UPDATE question_type='判断' -> '判断题'
       f. UPDATE question_type='综合' -> '综合题'
       g. For 判断题 rows with non-standard options:
          - If options has A/B/C/D with substantive content (not 正确/错误),
            reclassify as 单选题 or 多选题 based on correct_answer length.
          - Otherwise, fix options to standard {"A":"正确","B":"错误"} and
            remap correct_answer based on the original option semantics.
    3. COMMIT the transaction.
    4. Print a summary of changes.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
import sys

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

STANDARD_JUDGE_OPTIONS = json.dumps({"A": "正确", "B": "错误"}, ensure_ascii=False)

TRUE_VARIANTS = {"正确", "对", "是", "True", "true", "T", "t"}
FALSE_VARIANTS = {"错误", "错", "否", "不正确", "False", "false", "F", "f"}

# Types to delete (LLM parsing garbage)
DELETE_TYPES = ("单选|多选|判断", "多选|判断")

# Type rename mapping (old -> new)
RENAME_MAP = [
    ("选择题", "单选题"),
    ("单选", "单选题"),
    ("多选", "多选题"),
    ("判断", "判断题"),
    ("综合", "综合题"),
]

DEFAULT_DB_PATH = "backend/data/quiz.db"


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def _is_standard_judge_options(options_json: str | None) -> bool:
    """Return True if options are already the standard {"A":"正确","B":"错误"}."""
    if options_json is None:
        return False
    try:
        opts = json.loads(options_json)
    except (json.JSONDecodeError, TypeError):
        return False
    return opts == {"A": "正确", "B": "错误"}


def _options_has_substantive_abcd(options_json: str | None) -> bool:
    """Return True if options has A/B/C/D with substantive content
    (i.e. values that are NOT true/false variants)."""
    if options_json is None:
        return False
    try:
        opts = json.loads(options_json)
    except (json.JSONDecodeError, TypeError):
        return False

    substantive_keys = {"A", "B", "C", "D"}
    has_substantive = False
    for key in substantive_keys:
        if key in opts:
            val = opts[key]
            if val not in TRUE_VARIANTS and val not in FALSE_VARIANTS:
                has_substantive = True
                break
    return has_substantive


def _remap_judge_answer(options_json: str | None, correct_answer: str) -> str:
    """Determine the new correct_answer after standardizing options.

    For 判断题, the answer is always A or B. After standardization:
    - A always means "正确" (true)
    - B always means "错误" (false)

    If the original A option was a "true" variant, the answer stays the same.
    If the original A option was a "false" variant, we need to flip A<->B.
    """
    if options_json is None:
        return correct_answer

    try:
        opts = json.loads(options_json)
    except (json.JSONDecodeError, TypeError):
        return correct_answer

    a_text = opts.get("A", "")
    if a_text in FALSE_VARIANTS:
        # A was "false", B was "true" — after standardization A="正确", B="错误"
        # means the semantics flip. Swap the answer letter.
        if correct_answer == "A":
            return "B"
        elif correct_answer == "B":
            return "A"

    return correct_answer


def _fix_judge_noise_options(options_json: str | None, correct_answer: str) -> tuple[str, str]:
    """Fix options that have 正确/错误 plus extra noise options.

    Standardize to {"A":"正确","B":"错误"} and remap correct_answer.
    If correct_answer is already A or B, keep it (after semantic remapping).
    For C/D answers, map to closest: if C was a true variant -> A,
    if D was a false variant -> B. Otherwise default to B with a warning.
    """
    if options_json is None:
        return STANDARD_JUDGE_OPTIONS, correct_answer

    try:
        opts = json.loads(options_json)
    except (json.JSONDecodeError, TypeError):
        return STANDARD_JUDGE_OPTIONS, correct_answer

    # First, do the semantic remapping based on A's meaning
    new_answer = _remap_judge_answer(options_json, correct_answer)

    # If correct_answer was C or D (beyond A/B), try to map
    if correct_answer not in ("A", "B"):
        mapped = False
        for letter in correct_answer:
            if letter in opts:
                val = opts[letter]
                if val in TRUE_VARIANTS:
                    new_answer = "A"
                    mapped = True
                    break
                elif val in FALSE_VARIANTS:
                    new_answer = "B"
                    mapped = True
                    break
        if not mapped:
            new_answer = "B"
            print(
                f"WARNING: Could not map correct_answer={correct_answer!r} "
                f"for options with noise; defaulting to 'B' (错误)",
                file=sys.stderr,
            )

    return STANDARD_JUDGE_OPTIONS, new_answer


# ---------------------------------------------------------------------------
# Main migration
# ---------------------------------------------------------------------------


def migrate_question_types(db_path: str) -> dict:
    """Execute the question_type migration on the SQLite database at db_path.

    Returns a summary dict with counts of deletions, updates, and fixes.
    """
    # Step 1: Backup (overwrite if exists)
    backup_path = db_path + ".bak"
    shutil.copy2(db_path, backup_path)

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    cursor = conn.cursor()

    summary = {
        "deleted": 0,
        "renamed": {},  # old_type -> count
        "options_fixed": 0,
        "reclassified": 0,
    }

    try:
        # Step 2a: DELETE mixed-type garbage rows
        cursor.execute(
            "DELETE FROM questions WHERE question_type IN (?, ?)",
            DELETE_TYPES,
        )
        summary["deleted"] = cursor.rowcount

        # Step 2b-f: Rename legacy types to canonical forms
        for old_type, new_type in RENAME_MAP:
            cursor.execute(
                "UPDATE questions SET question_type = ? WHERE question_type = ?",
                (new_type, old_type),
            )
            count = cursor.rowcount
            if count > 0:
                summary["renamed"][old_type] = count

        # Step 2g: Fix non-standard 判断题 options
        cursor.execute(
            "SELECT id, options, correct_answer FROM questions WHERE question_type = ?",
            ("判断题",),
        )
        judge_rows = cursor.fetchall()

        for row_id, options_json, correct_answer in judge_rows:
            if _is_standard_judge_options(options_json):
                continue

            # Check if options has substantive A/B/C/D content
            if _options_has_substantive_abcd(options_json):
                # Reclassify as 单选题 or 多选题 based on correct_answer length
                if len(correct_answer) > 1:
                    new_type = "多选题"
                else:
                    new_type = "单选题"
                cursor.execute(
                    "UPDATE questions SET question_type = ? WHERE id = ?",
                    (new_type, row_id),
                )
                summary["reclassified"] += 1
            else:
                # Fix options to standard and remap answer
                new_options, new_answer = _fix_judge_noise_options(
                    options_json, correct_answer
                )
                cursor.execute(
                    "UPDATE questions SET options = ?, correct_answer = ? WHERE id = ?",
                    (new_options, new_answer, row_id),
                )
                summary["options_fixed"] += 1

        # Step 3: Commit
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return summary


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Migrate question_type values to canonical forms."
    )
    parser.add_argument(
        "--db-path",
        default=DEFAULT_DB_PATH,
        help=f"Path to the SQLite database (default: {DEFAULT_DB_PATH})",
    )
    args = parser.parse_args()

    db_path = args.db_path

    try:
        summary = migrate_question_types(db_path)
    except Exception as exc:
        print(f"ERROR: Migration failed, database rolled back: {exc}", file=sys.stderr)
        sys.exit(1)

    # Step 5: Print summary
    print("Migration completed successfully.")
    print(f"  Rows deleted: {summary['deleted']}")
    for old_type, count in summary["renamed"].items():
        print(f"  {old_type} -> renamed: {count} rows")
    print(f"  判断题 options fixed to standard: {summary['options_fixed']} rows")
    print(f"  判断题 reclassified to 单选题/多选题: {summary['reclassified']} rows")


if __name__ == "__main__":
    main()
