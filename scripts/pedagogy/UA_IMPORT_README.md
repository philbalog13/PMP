# UA Rooms Import

This script imports UA PDFs into the new hierarchy:

`Cursus -> Modules -> Unites d'apprentissage (UA rooms)`

Script: `scripts/pedagogy/import_ua_rooms.py`

## 1) Import one UA PDF

```powershell
python scripts/pedagogy/import_ua_rooms.py "G:\Audit FInancier\UA_1_1.pdf" `
  --cursus-id "cursus-audit-financier" `
  --cursus-title "Cursus Audit Financier" `
  --module-id "mod-1-fondamentaux-comptables-financiers" `
  --module-title "Module 1 - Fondamentaux comptables et financiers" `
  --module-order 1
```

## 2) Import one module directory

Directory contains multiple `UA_*.pdf`:

```powershell
python scripts/pedagogy/import_ua_rooms.py "G:\Audit FInancier\Module_1" `
  --cursus-id "cursus-audit-financier" `
  --cursus-title "Cursus Audit Financier" `
  --module-id "mod-1-fondamentaux-comptables-financiers" `
  --module-title "Module 1 - Fondamentaux comptables et financiers" `
  --module-order 1
```

## 3) Import full cursus directory

Cursus dir contains module subdirectories, each containing `UA_*.pdf`:

```powershell
python scripts/pedagogy/import_ua_rooms.py "G:\Audit FInancier" `
  --cursus-id "cursus-audit-financier" `
  --cursus-title "Cursus Audit Financier"
```

## Notes

- Uses Docker PostgreSQL by default:
  - container: `pmp-postgres`
  - user: `pmp_user`
  - db: `pmp_db`
- Override with:
  - `--db-container`
  - `--db-user`
  - `--db-name`
- Use `--dry-run` to print SQL without writing to DB.
