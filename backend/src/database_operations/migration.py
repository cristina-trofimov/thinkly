from sqlalchemy import text

from db import SessionLocal

TABLE_NAME = "question_language_specific_properties"
LEGACY_COLUMNS = [
    "preset_code",
    "from_json_function",
    "to_json_function",
    "template_solution",
]
NEW_OPTIONAL_COLUMNS = [
    "imports",
    "preset_classes",
    "preset_functions",
    "main_function",
]
NEW_REQUIRED_COLUMN = "template_code"


def _get_existing_columns(db):
    result = db.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = :table_name
            """
        ),
        {"table_name": TABLE_NAME},
    )
    return {row[0] for row in result.fetchall()}


def _add_missing_columns(db, existing_columns):
    for column_name in NEW_OPTIONAL_COLUMNS:
        if column_name not in existing_columns:
            db.execute(
                text(
                    f"ALTER TABLE {TABLE_NAME} "
                    f"ADD COLUMN {column_name} TEXT"
                )
            )

    if NEW_REQUIRED_COLUMN not in existing_columns:
        db.execute(
            text(
                f"ALTER TABLE {TABLE_NAME} "
                f"ADD COLUMN {NEW_REQUIRED_COLUMN} TEXT DEFAULT ''"
            )
        )


def _migrate_legacy_data(db, existing_columns):
    has_legacy = any(column_name in existing_columns for column_name in LEGACY_COLUMNS)
    if not has_legacy:
        return

    has_template_solution = "template_solution" in existing_columns
    has_preset_code = "preset_code" in existing_columns
    has_from_json = "from_json_function" in existing_columns
    has_to_json = "to_json_function" in existing_columns

    template_solution_expr = "NULL"
    if has_template_solution:
        template_solution_expr = "NULLIF(template_solution, '')"

    preset_code_expr = "NULL"
    if has_preset_code:
        preset_code_expr = "NULLIF(preset_code, '')"

    from_json_expr = "NULL"
    if has_from_json:
        from_json_expr = "NULLIF(from_json_function, '')"

    to_json_expr = "NULL"
    if has_to_json:
        to_json_expr = "NULLIF(to_json_function, '')"

    db.execute(
        text(
            f"""
            UPDATE {TABLE_NAME}
            SET template_code = COALESCE(NULLIF(template_code, ''), {template_solution_expr}, ''),
                preset_functions = CONCAT_WS(
                    E'\n\n',
                    NULLIF(preset_functions, ''),
                    {preset_code_expr},
                    {from_json_expr},
                    {to_json_expr}
                )
            """
        )
    )


def _drop_legacy_columns(db, existing_columns):
    for column_name in LEGACY_COLUMNS:
        if column_name in existing_columns:
            db.execute(
                text(
                    f"ALTER TABLE {TABLE_NAME} "
                    f"DROP COLUMN {column_name}"
                )
            )


def migrate():
    db = SessionLocal()
    try:
        existing_columns = _get_existing_columns(db)
        _add_missing_columns(db, existing_columns)

        # Refresh metadata after potential column additions.
        existing_columns = _get_existing_columns(db)

        _migrate_legacy_data(db, existing_columns)
        _drop_legacy_columns(db, existing_columns)

        db.commit()
        print("Migration completed successfully.")
    except Exception as exc:
        db.rollback()
        print(f"Migration failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
